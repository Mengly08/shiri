import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { X, Check, AlertCircle, CheckCircle, Download, Loader2 } from 'lucide-react';
import { TopUpForm } from '../types';
import axios from 'axios';
import { getConfig, getPaymentConfig } from '../lib/config';
import { supabase } from '../lib/supabase';
import html2canvas from 'html2canvas';

interface Props {
  form: TopUpForm;
  orderFormat: string;
  onClose: () => void;
  discountPercent?: number;
}

export function PaymentModal({ form, orderFormat, onClose, discountPercent = 0 }: Props) {
  const config = getConfig();
  const paymentConfig = getPaymentConfig();

  const [status, setStatus] = useState<'pending' | 'success' | 'checking' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [qrCode, setQrCode] = useState<string>('');
  const [md5Hash, setMd5Hash] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');
  const [lastQrGeneration, setLastQrGeneration] = useState<number>(0);
  const [qrCooldown, setQrCooldown] = useState(0);
  const [showMessage, setShowMessage] = useState(true);
  const [qrExpired, setQrExpired] = useState(false);
  const [payNowCooldown, setPayNowCooldown] = useState(1);
  const [timeLeft, setTimeLeft] = useState<string>('5:00');

  const QR_COOLDOWN_PERIOD = 180;
  const POLL_INTERVAL = 2000;
  const QR_EXPIRY_PERIOD = 5 * 60 * 1000;

  const qrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const payNowCooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const productName = useMemo(() => 
    form.product?.diamonds ? `${form.product.diamonds} diamond` : form.product?.name || '',
    [form.product]
  );

  const finalAmount = useMemo(() => {
    if (!form.product?.price) return 0;
    const discount = (form.product.price * discountPercent) / 100;
    const amount = form.product.price - discount;
    return Math.round(amount * 100) / 100;
  }, [form.product?.price, discountPercent]);

  const cleanup = useCallback(() => {
    if (qrTimeoutRef.current) clearTimeout(qrTimeoutRef.current);
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (expiryTimeoutRef.current) clearTimeout(expiryTimeoutRef.current);
    if (payNowCooldownRef.current) clearInterval(payNowCooldownRef.current);
    qrTimeoutRef.current = null;
    cooldownIntervalRef.current = null;
    pollIntervalRef.current = null;
    expiryTimeoutRef.current = null;
    payNowCooldownRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (payNowCooldown > 0) {
      payNowCooldownRef.current = setInterval(() => {
        setPayNowCooldown(prev => {
          if (prev <= 1) {
            clearInterval(payNowCooldownRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [payNowCooldown]);

  const startQrCooldown = () => {
    setQrCooldown(QR_COOLDOWN_PERIOD);
    const interval = setInterval(() => {
      setQrCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    cooldownIntervalRef.current = interval;
  };

  const verifyCurrentPrice = async () => {
    try {
      let tableName: string;
      switch (form.game) {
        case 'mlbb': tableName = 'mlbb_products'; break;
        case 'mlbb_ph': tableName = 'mlbb_ph_products'; break;
        case 'freefire': tableName = 'freefire_products'; break;
        case 'freefire_th': tableName = 'freefire_th_products'; break;
        default: tableName = 'freefire_products';
      }

      const { data: product, error } = await supabase
        .from(tableName)
        .select('id, price')
        .eq('id', form.product?.id)
        .single();

      if (error || !product) throw new Error('Failed to fetch product');

      const isReseller = localStorage.getItem('jackstore_reseller_auth') === 'true';
      if (isReseller) {
        const { data: resellerPrice, error: resellerError } = await supabase
          .from('reseller_prices')
          .select('price')
          .eq('product_id', form.product?.id)
          .eq('game', form.game)
          .single();
        if (resellerError || !resellerPrice) {
          console.warn('No reseller price found, using standard price');
          return product.price;
        }
        return resellerPrice.price;
      }
      return product.price;
    } catch (error) {
      console.error('Error verifying current price:', error);
      return null;
    }
  };

  const storePayment = async (md5: string) => {
    try {
      console.log('Starting storePayment with MD5:', md5);
      const currentPrice = await verifyCurrentPrice();
      console.log('Current price:', currentPrice);
      if (currentPrice === null) throw new Error('Failed to verify current price');

      const expectedFinalAmount = Math.round((currentPrice * (100 - discountPercent)) / 100 * 100) / 100;
      console.log('Expected final amount:', expectedFinalAmount, 'Actual final amount:', finalAmount);

      if (Math.abs(expectedFinalAmount - finalAmount) > 0.01)
        throw new Error('Price has changed. Please refresh and try again.');

      const txId = `tb${Math.floor(100000 + Math.random() * 900000)}`;
      setTransactionId(txId);
      console.log('Generated transaction ID:', txId);

      const orderId = Date.now().toString();
      const orderDate = new Date().toLocaleString('km-KH', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'Asia/Phnom_Penh'
      });

      const mainMessage = `${form.userId} ${form.game === 'freefire' || form.game === 'freefire_th' ? '0' : form.serverId} ${form.product?.code || form.product?.diamonds || form.product?.name}`;
      const orderMessage = `Top up successful✅\n\n- Transaction: ${txId}\n- Game: ${
        form.game === 'mlbb' ? 'Mobile Legends' :
        form.game === 'mlbb_ph' ? 'Mobile Legends PH' :
        form.game === 'freefire' ? 'Free Fire' :
        'Free Fire TH'
      }\n- Amount: ${finalAmount} $\n- Item: ${form.product?.name}\n- User ID: ${form.userId}\n- Server ID: ${form.game === 'freefire' || form.game === 'freefire_th' ? '0' : form.serverId}\n- Order ID: S${orderId}\n- Order Date: ${orderDate}`;

      const orderData = {
        transaction_id: txId, order_id: orderId, game: form.game, amount: finalAmount, item: form.product?.name,
        user_id: form.userId, server_id: form.game === 'freefire' || form.game === 'freefire_th' ? '0' : form.serverId,
        order_date: orderDate, main_message: mainMessage, order_message: orderMessage, nickname: form.nickname || null
      };
      console.log('Order data to be sent:', orderData);

      const { data, error } = await supabase
        .rpc('create_payment_token', { p_md5: md5, p_status: 'pending', p_order_info: orderData })
        .select('token')
        .single();

      console.log('create_payment_token result:', { data, error });
      if (error || !data) throw new Error('Failed to store payment: ' + (error?.message || 'Unknown error'));

      console.log('Payment stored with token:', data.token);
      return data.token;
    } catch (error) {
      console.error('Error storing payment:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to store payment. Please try again.');
      setStatus('error');
      return null;
    }
  };

 const verifyPayment = async () => {
  if (qrExpired) return;

  try {
    const response = await axios.post('/api/verify-payment', { md5: md5Hash });
    const data = response.data;

    if (data.responseCode === 0) {
      setStatus('success');
      setShowSuccessAnimation(true);
      cleanup();
    } else if (data.responseCode === 1) {
      console.log('Payment still pending for MD5:', md5Hash);
    } else {
      setStatus('error');
      setErrorMessage(data.error || 'Payment verification failed. Please try again or contact support.');
      cleanup();
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    setStatus('error');
    setErrorMessage('Failed to verify payment. Please try again or contact support.');
    cleanup();
  }
};

  useEffect(() => {
    const generateKHQR = async () => {
      if (isProcessing || finalAmount < 0.01 || qrCode || qrCooldown > 0 || showMessage) return;

      const now = Date.now();
      if (now - lastQrGeneration < QR_COOLDOWN_PERIOD * 1000) {
        const remainingCooldown = Math.ceil((QR_COOLDOWN_PERIOD * 1000 - (now - lastQrGeneration)) / 1000);
        setQrCooldown(remainingCooldown);
        startQrCooldown();
        return;
      }

      setStatus('checking');
      setErrorMessage('');
      setIsProcessing(true);

      try {
        if (finalAmount < 0.01) throw new Error('Amount must be at least 0.01 USD. Please remove the promo code for small purchases.');

        const payload = {
          bakongAccountID: paymentConfig.khqr.accountId,
          accName: paymentConfig.khqr.accountName,
          accountInformation: paymentConfig.khqr.accountInformation,
          currency: paymentConfig.khqr.currency,
          amount: finalAmount,
          address: paymentConfig.khqr.address
        };

        const response = await axios.post('/api/khqr', payload);

        if (response.status === 200 || response.status === 201) {
          const { success, qrImage, md5 } = response.data;
          if (success && qrImage && md5) {
            setQrCode(qrImage);
            setMd5Hash(md5);
            setLastQrGeneration(now);
            setQrExpired(false);
            setTimeLeft('5:00');

            await storePayment(md5);

            expiryTimeoutRef.current = setTimeout(() => {
              setQrExpired(true);
              setStatus('error');
              setErrorMessage('QR code has expired. Please generate a new one.');
              cleanup();
              if (md5Hash) {
                supabase
                  .from('payment_tokens')
                  .update({ status: 'unsuccessful', used: true, order_data: { ...form.order_data, updated_at: new Date().toISOString(), error: 'QR code expired' } })
                  .eq('md5', md5Hash);
              }
            }, QR_EXPIRY_PERIOD);
          } else throw new Error('Invalid response from QR code generator');
        } else throw new Error(`Server returned status ${response.status}`);
      } catch (error) {
        let errorMessage = 'Failed to generate QR code';
        if (axios.isAxiosError(error)) errorMessage = error.response?.data?.message || 'Network error. Please try again.';
        else if (error instanceof Error) errorMessage = error.message;
        setStatus('error');
        setErrorMessage(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    };

    generateKHQR();
  }, [finalAmount, isProcessing, lastQrGeneration, paymentConfig.khqr, qrCode, qrCooldown, showMessage]);

  useEffect(() => {
    if (!md5Hash || showMessage || status === 'success' || status === 'error' || qrExpired) return;

    const pollPaymentStatus = () => verifyPayment();
    pollIntervalRef.current = setInterval(pollPaymentStatus, POLL_INTERVAL);

    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [md5Hash, showMessage, status, qrExpired]);

  useEffect(() => {
    let countdown: ReturnType<typeof setInterval>;
    if (qrCode && !qrExpired) {
      countdown = setInterval(() => {
        const startTime = lastQrGeneration;
        const remainingTime = Math.max(0, QR_EXPIRY_PERIOD - (Date.now() - startTime));
        const minutes = Math.floor(remainingTime / (60 * 1000));
        const seconds = Math.floor((remainingTime % (60 * 1000)) / 1000);
        const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setTimeLeft(formattedTime);

        if (remainingTime <= 0) {
          setQrExpired(true);
          setStatus('error');
          setErrorMessage('QR code has expired. Please generate a new one.');
          cleanup();
          if (md5Hash) {
            supabase
              .from('payment_tokens')
              .update({ status: 'unsuccessful', used: true, order_data: { ...form.order_data, updated_at: new Date().toISOString(), error: 'QR code expired' } })
              .eq('md5', md5Hash);
          }
          clearInterval(countdown);
        }
      }, 1000);
    }

    return () => { if (countdown) clearInterval(countdown); };
  }, [qrCode, qrExpired, lastQrGeneration, md5Hash, form.order_data]);

  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  const handleContinueShopping = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleDownloadQrCode = useCallback(() => {
    if (!qrCode || qrExpired) return;
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `KHQR_Payment_${transactionId || 'QR'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrCode, transactionId, qrExpired]);

  const handleDownloadReceipt = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { backgroundColor: '#f9fafb', scale: 2 });
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Receipt_${transactionId || 'Transaction'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error generating receipt image:', error);
      setErrorMessage('Failed to download receipt. Please try again.');
    }
  }, [transactionId]);

  const handleContinue = () => {
    setShowMessage(false);
    setPayNowCooldown(7);
  };

  const successReceipt = useMemo(() => (
    <div ref={receiptRef} className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-green-700">ការទិញរបស់អ្នកត្រូវបានជោគជ័យ</h3>
      </div>
      <div className="space-y-3 text-gray-700 text-sm">
        <div className="flex justify-between border-b border-gray-200 pb-2">
          <h4 className="font-semibold">Product</h4>
          <p>{productName}</p>
        </div>
        <div className="flex justify-between border-b border-gray-200 pb-2">
          <h4 className="font-semibold">USER ID</h4>
          <p>{form.userId}</p>
        </div>
        {(form.game === 'mlbb' || form.game === 'mlbb_ph') && (
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <h4 className="font-semibold">SERVER ID</h4>
            <p>{form.serverId}</p>
          </div>
        )}
        {form.nickname && (
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <h4 className="font-semibold">NICKNAME</h4>
            <p>{form.nickname}</p>
          </div>
        )}
        <div className="flex justify-between border-b border-gray-200 pb-2">
          <h4 className="font-semibold">PAYMENT</h4>
          <p>KHQR</p>
        </div>
        <div className="flex justify-between border-b border-gray-200 pb-2">
          <h4 className="font-semibold">PRICE</h4>
          <p>{finalAmount.toFixed(2)} USD</p>
        </div>
        <div className="flex justify-between border-b border-gray-200 pb-2">
          <h4 className="font-semibold">TRANSACTION ID</h4>
          <p>{transactionId}</p>
        </div>
      </div>
      <div className="text-center text-xs text-gray-500 pt-2">
        <p>សូមថតវិក័យបត្រទុកដើម្បីផ្ទៀងផ្ទាត់</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleDownloadReceipt}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-all duration-300 text-sm font-medium transform hover:scale-105"
        >
          <div className="flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            <span>Download Receipt</span>
          </div>
        </button>
        <button
          onClick={handleContinueShopping}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-all duration-300 text-sm font-medium transform hover:scale-105"
        >
          ទិញបន្តទៀត
        </button>
      </div>
    </div>
  ), [form.userId, form.serverId, form.nickname, form.game, productName, finalAmount, transactionId, handleContinueShopping, handleDownloadReceipt]);

  return (
<div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
  <div className="bg-white rounded-xl p-4 max-w-md w-full relative shadow-2xl border border-gray-200 transform transition-all duration-300 max-h-[90vh] overflow-y-auto">
    <div className="text-black rounded-t-xl p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img
          src={
            showMessage
              ? 'https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/8a24cdafb9b0870455dc549adf2ee2008b65bb30/Exclamation_yellow_flat_icon.svg'
              : form.game === 'mlbb' || form.game === 'mlbb_ph'
              ? 'https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1324.JPG'
              : form.game === 'freefire' || form.game === 'freefire_th'
              ? 'https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1225.JPG'
              : 'https://play-lh.googleusercontent.com/ABNDYwddbqTFpqp809iNq3r9LjrE2qTZ8xFqWmc-iLfHe2vyPAPwZrN_4S1QCFaLDYE=w240-h480-rw'
          }
          alt={showMessage ? 'Warning Icon' : `${form.game} Logo`}
          className="w-6 h-6"
        />
        <span className="font-semibold text-sm">
          {showMessage ? 'Order Summary' : 'KHQR'}
        </span>
      </div>
      <button onClick={handleClose} className="text-black/80 hover:text-white transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>

    <style jsx>{`
      @keyframes slideLeft { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(10px); } }
      @keyframes slideRight { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(-10px); } }
      .animate-slide-left { animation: slideLeft 1s ease-in-out infinite; }
      .animate-slide-right { animation: slideRight 1s ease-in-out infinite; }
      @keyframes uk-fade { 0% { opacity: 0; } 100% { opacity: 1; } }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .animate-spin { animation: spin 1s linear infinite; }
    `}</style>

    <div className="relative z-10 space-y-4 pt-4">
      {showMessage ? (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <img
              src={
                form.game === 'mlbb' || form.game === 'mlbb_ph'
                ? 'https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1324.JPG'
                : form.game === 'freefire' || form.game === 'freefire_th'
                ? 'https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1225.JPG'
                : 'https://play-lh.googleusercontent.com/ABNDYwddbqTFpqp809iNq3r9LjrE2qTZ8xFqWmc-iLfHe2vyPAPwZrN_4S1QCFaLDYE=w240-h480-rw'
              }
              alt={`${form.game} Logo`}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h3 className="font-semibold text-lg">{typeof form.nickname === 'string' ? form.nickname : 'Unknown'}</h3>
              <p className="text-sm text-gray-500">{
                form.game === 'mlbb' ? 'Mobile Legends' :
                form.game === 'mlbb_ph' ? 'Mobile Legends PH' :
                form.game === 'freefire' ? 'Free Fire' :
                'Free Fire TH'
              }</p>
            </div>
          </div>
          <div className="space-y-3 text-gray-700 text-sm">
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <h4 className="font-semibold">ID</h4>
              <p>{typeof form.userId === 'string' ? form.userId : 'N/A'}</p>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <h4 className="font-semibold">SERVER ID</h4>
              <p>{typeof form.serverId === 'string' ? form.serverId : 'N/A'}</p>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <h4 className="font-semibold">Item</h4>
              <p>{typeof productName === 'string' ? form.product.code || form.product.diamonds || form.product.name : 'Unknown Item'}</p>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-2">
              <h4 className="font-semibold">Price</h4>
              <p>{typeof finalAmount === 'number' ? finalAmount.toFixed(2) : '0.00'} USD</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="w-full text-black py-2 px-4 rounded-lg hover:bg-gray-200 transition-all duration-300 text-sm font-medium transform hover:scale-105 bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleContinue}
              className={`w-full py-2 px-4 rounded-lg text-sm font-medium transform hover:scale-105 transition-all duration-300 ${
                payNowCooldown > 0
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-yellow-400 text-black hover:bg-yellow-500'
              }`}
              disabled={payNowCooldown > 0}
            >
              {payNowCooldown > 0 ? `Pay Now (${payNowCooldown}s)` : 'Pay Now'}
            </button>
          </div>
        </div>
      ) : status === 'success' ? (
        successReceipt
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg p-4 space-y-3">
            {qrCode && !qrExpired ? (
              <>
                <div style={{ marginTop: '18px', justifyContent: 'center', display: 'flex' }}>
                  <div style={{ flexDirection: 'column', display: 'flex', borderRadius: '21px', boxShadow: 'rgba(0, 0, 0, 0.08) 0px 12px 24px 0px', height: '355.5px', width: '244.5px' }}>
                    <div>
                      <div style={{ alignItems: 'center', justifyContent: 'center', display: 'flex', background: 'rgb(226, 26, 26)', borderTopLeftRadius: '21px', borderTopRightRadius: '21px', height: '42.65625px' }}>
                      <svg width="60" height="14" viewBox="0 0 60 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M39.006 5.19439V9.59764H34.5318C34.0729 9.59764 33.7288 9.2307 33.7288 8.80731V5.22264C33.7288 4.77103 34.1016 4.43231 34.5318 4.43231H38.1743C38.6619 4.40408 39.006 4.74278 39.006 5.19439Z" fill="white"/>
                      <path d="M59.9717 6.97176H57.7345C57.7345 4.34676 55.5548 2.20159 52.8875 2.20159C50.7651 2.20159 48.9008 3.55645 48.2699 5.53225C48.1265 6.01209 48.0404 6.49192 48.0404 6.97176V13.9718H47.9831C46.7785 13.9718 45.8033 13.0121 45.8033 11.8266V6.97176H45.832C45.832 5.05241 46.6351 3.21773 48.0691 1.89112C49.3884 0.677406 51.1093 0 52.9162 0C56.8168 0 59.9717 3.13305 59.9717 6.97176Z" fill="white"/>
                      <path d="M59.9999 13.9718L56.845 14L56.0706 13.2379L54.3497 11.5444L51.9692 9.20166H55.1241L59.9999 13.9718Z" fill="white"/>
                      <path d="M39.7517 11.7702H33.0117C32.1799 11.7702 31.5203 11.121 31.5203 10.3024V3.66936C31.5203 2.85081 32.1799 2.20159 33.0117 2.20159H39.7517C40.5834 2.20159 41.2431 2.85081 41.2431 3.66936V10.3024L43.4802 12.504V2.14515C43.4802 0.959671 42.505 0 41.3005 0H31.4629C30.2583 0 29.2832 0.959671 29.2832 2.14515V11.8266C29.2832 13.0121 30.2583 13.9718 31.4629 13.9718H41.9888L39.7517 11.7702Z" fill="white"/>
                      <path d="M12.3614 14H9.20656L2.60996 7.47984V14H0V0H2.60996V6.2379L8.94843 0H12.046L5.16255 6.71772L12.3614 14Z" fill="white"/>
                      <path d="M24.1492 0H26.7018V14H24.1492V7.93145H16.8643V14H14.3117V0H16.8643V5.84273H24.1492V0Z" fill="white"/>
                      </svg>
                      </div>
                      <div style={{ justifyContent: 'flex-end', display: 'flex' }}>
                        <div style={{ borderLeft: '19.5px solid rgba(0, 0, 0, 0)', borderTop: '19.5px solid rgb(226, 26, 26)', height: '0px', width: '0px' }}></div>
                      </div>
                      <div style={{ backgroundImage: 'linear-gradient(90deg, rgba(128, 128, 128, 0.85) 65%, rgba(255, 255, 255, 0) 0px)', backgroundPosition: '50% 100%', backgroundRepeat: 'repeat-x', backgroundSize: '15px 1.5px', padding: '0px 12px 15px 42px' }}>
                        <span style={{ fontSize: '10px', fontFamily: "'Nunito Sans'" }}>{paymentConfig.khqr.accountName}</span>
                        <div style={{ marginTop: '4px', fontFamily: "'Nunito Sans'" }}>
                          <span>
                            <div style={{ alignItems: 'center', display: 'flex', fontSize: '14px', fontWeight: 700, marginBottom: '0px', width: '100%' }}>
                              {typeof finalAmount === 'number' ? finalAmount.toFixed(2) : '0.00'} 
                              <span style={{ fontSize: '8px', fontWeight: 400, marginLeft: '8px' }}>USD</span>
                            </div>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ alignItems: 'center', justifyContent: 'center', display: 'flex', height: '227.343px', boxSizing: 'border-box', animationName: 'uk-fade', animationDuration: '0.8s', animationTimingFunction: 'linear', animationFillMode: 'both', position: 'relative' }}>
                      <svg viewBox="0 0 148 149" xmlns="http://www.w3.org/2000/svg" style={{ width: '45px', height: '45px', position: 'absolute', maxWidth: '100%', boxSizing: 'border-box', verticalAlign: 'middle', zIndex: 10 }}>
                        <circle cx="74.0625" cy="74.3535" r="73.9375" fill="white" />
                        <circle cx="74.0609" cy="74.3522" r="62.3392" fill="black" />
                        <path d="M74.2514 101.046C69.3109 101.046 65.2023 100.34 61.9254 98.9283C58.6486 97.4663 56.1784 95.4246 54.5147 92.8031C52.8511 90.1312 52.0193 87.0056 52.0193 83.4263H63.1354C63.1354 84.8379 63.5135 86.1738 64.2696 87.4341C65.0258 88.6441 66.2357 89.6271 67.8994 90.3833C69.563 91.0891 71.6803 91.442 74.2514 91.442C77.6795 91.442 80.301 90.837 82.1158 89.6271C83.9811 88.4172 84.9137 86.804 84.9137 84.7875C84.9137 83.023 84.1323 81.5863 82.5695 80.4772C81.0067 79.3177 78.5113 78.5615 75.0832 78.2086L71.2266 77.9061C65.8324 77.402 61.5473 75.7888 58.3713 73.0665C55.1953 70.2938 53.6073 66.3868 53.6073 61.3455C53.6073 57.867 54.3887 54.9682 55.9515 52.6492C57.5143 50.2798 59.7577 48.5154 62.6816 47.3559C65.6056 46.146 69.1093 45.541 73.1927 45.541C77.5787 45.541 81.2588 46.2216 84.2332 47.5827C87.2075 48.9439 89.4509 50.91 90.9633 53.481C92.5261 56.0521 93.3075 59.1777 93.3075 62.8578H82.1914C82.1914 61.3959 81.8386 60.1103 81.1328 59.0013C80.4774 57.8418 79.4944 56.9091 78.1836 56.2033C76.8729 55.4976 75.2093 55.1447 73.1927 55.1447C71.4283 55.1447 69.9159 55.3967 68.6556 55.9009C67.3952 56.405 66.4374 57.136 65.782 58.0938C65.1267 59.0013 64.799 60.0851 64.799 61.3455C64.799 62.9083 65.3787 64.3198 66.5382 65.5801C67.6977 66.7901 69.6134 67.5463 72.2853 67.8487L76.1419 68.1512C82.1914 68.6553 87.0311 70.2938 90.6608 73.0665C94.2905 75.8392 96.1054 79.7462 96.1054 84.7875C96.1054 88.266 95.2484 91.2151 93.5344 93.6349C91.8203 96.0548 89.3249 97.8948 86.048 99.1552C82.8216 100.415 78.8894 101.046 74.2514 101.046ZM68.8824 110.498V99.4576H78.7886V110.498H68.8824ZM68.58 49.2464V38.2059H78.4861V49.2464H68.58Z" fill="white"/>
                      </svg>
                      <img src={qrCode} alt="KHQR Code" style={{ width: '177px', height: '177px', maxWidth: '100%', boxSizing: 'border-box', verticalAlign: 'middle' }} />
                    </div>
                    <div style={{ alignItems: 'center', justifyContent: 'center', display: 'flex', height: 'auto', padding: '10px 0' }}></div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', justifyContent: 'center', display: 'flex', height: 'auto', padding: '10px 0' }}>
                  <svg width="22" height="24" viewBox="0 0 22 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-spin">
                    <circle cx="11" cy="12" r="9" stroke="#E8EEF1" stroke-width="4"/>
                    <circle cx="11" cy="12" r="9" stroke="url(#paint0_linear)" stroke-width="4"/>
                    <path d="M11.2001 2.70005C16.4801 2.70005 20.0001 6.63995 20.0001 11.5001C20.0001 16.3602 16.4801 21.1801 11.2001 21.1801" stroke="url(#paint1_linear)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                    <defs>
                      <linearGradient id="paint0_linear" x1="25.08" y1="14.2" x2="11" y2="12" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#28B4C3"/>
                        <stop offset="1" stop-color="#E8EEF1"/>
                      </linearGradient>
                      <linearGradient id="paint1_linear" x1="15.8401" y1="20.3601" x2="12.8663" y2="4.9307" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#0BBCD4"/>
                        <stop offset="1" stop-color="#0BBCD4" stop-opacity="0"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: 'rgb(40, 40, 40)', fontFamily: "Roboto, 'Khmer OS Dangrek'" }}>
                    {timeLeft}
                  </span>
                </div>
              </>
            ) : qrCooldown > 0 ? (
              <div data-v-d3366962="" style={{ fontFamily: "SF_Pro_Display, 'SF Pro Display', Battambang", textAlign: 'center', boxSizing: 'border-box' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Scan to Pay</p>
                <p style={{ margin: 0 }}>or</p>
                <div className="text-center py-4">
                  <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-2 animate-pulse" />
                  <p className="text-sm text-gray-600">Please wait {typeof qrCooldown === 'number' ? qrCooldown : 0}s before generating a new QR code</p>
                </div>
              </div>
            ) : (
              <div data-v-d3366962="" style={{ fontFamily: "SF_Pro_Display, 'SF Pro Display', Battambang", textAlign: 'center', boxSizing: 'border-box' }}>
                <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Scan to Pay</p>
                <p style={{ margin: 0 }}>or</p>
                <div className="flex justify-center py-4">
                  <svg width="22" height="24" viewBox="0 0 22 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="11" cy="12" r="9" stroke="#E8EEF1" stroke-width="4"/>
                    <circle cx="11" cy="12" r="9" stroke="url(#paint0_linear)" stroke-width="4"/>
                    <path d="M11.2001 2.70005C16.4801 2.70005 20.0001 6.63995 20.0001 11.5001C20.0001 16.3602 16.4801 21.1801 11.2001 21.1801" stroke="url(#paint1_linear)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
                    <defs>
                      <linearGradient id="paint0_linear" x1="25.08" y1="14.2" x2="11" y2="12" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#28B4C3"/>
                        <stop offset="1" stop-color="#E8EEF1"/>
                      </linearGradient>
                      <linearGradient id="paint1_linear" x1="15.8401" y1="20.3601" x2="12.8663" y2="4.9307" gradientUnits="userSpaceOnUse">
                        <stop stop-color="#0BBCD4"/>
                        <stop offset="1" stop-color="#0BBCD4" stop-opacity="0"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            )}
            {qrCode && !qrExpired && (
              <button
                onClick={handleDownloadQrCode}
                className="mt-2 text-[#00BCD4] py-1 px-3 rounded-lg hover:bg-gray-100 transition-all duration-300 text-sm font-medium w-full flex items-center justify-center gap-2"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', verticalAlign: 'middle' }}>
                  <rect x="2.75" y="6.75" width="18.5" height="14.5" rx="3.25" stroke="#00BCD4" stroke-width="1.5"/>
                  <rect x="7" y="6" width="10" height="2" fill="#F6F6F6"/>
                  <path d="M12 3V14L15 10.8571" stroke="#00BCD4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M12 14L9 11" stroke="#00BCD4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Download QR Code</span>
              </button>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '12px' }}>
            <p style={{ fontSize: '14px', color: 'rgb(151, 151, 151)', lineHeight: '18px', maxWidth: '220px', margin: 0 }}>
              and upload to Mobile Banking app supporting KHQR
            </p>
          </div>
          {status === 'error' && !showMessage && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{typeof errorMessage === 'string' ? errorMessage : 'An error occurred'}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
</div>
  );
}
