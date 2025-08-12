import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Search, Loader2, CheckCircle2, XCircle, ArrowLeft, Users } from 'lucide-react';
import axios from 'axios';
import { GameSelector } from './components/GameSelector';
import { ProductList } from './components/ProductList';
import { PaymentModal } from './components/PaymentModal';
import { TopUpForm, GameProduct } from './types';
import { supabase } from './lib/supabase';
import storeConfig from './lib/config';
import { BannerSlider } from './components/BannerSlider';
import { PopupBanner } from './components/PopupBanner';

const AdminPage = lazy(() => import('./pages/AdminPage').then(module => ({ default: module.AdminPage })));
const ResellerPage = lazy(() => import('./pages/ResellerPage').then(module => ({ default: module.ResellerPage })));

interface MLBBValidationResponse {
  status?: 'success' | 'invalid';
  success?: boolean;
  message?: string;
  data?: {
    userName: string;
  };
}

function App() {
  const [form, setForm] = useState<TopUpForm>(() => {
    const savedForm = localStorage.getItem('customerInfo');
    return savedForm ? JSON.parse(savedForm) : {
      userId: '',
      serverId: '',
      product: null,
      game: 'mlbb',
      nickname: undefined
    };
  });
  const [selectionMessage, setSelectionMessage] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [orderFormat, setOrderFormat] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<MLBBValidationResponse | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [formErrors, setFormErrors] = useState<{ userId?: string; serverId?: string }>({});
  const [products, setProducts] = useState<GameProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isResellerRoute, setIsResellerRoute] = useState(false);
  const [isResellerLoggedIn, setIsResellerLoggedIn] = useState(false);
  const [showPopupBanner, setShowPopupBanner] = useState(true);
  const [paymentCooldown, setPaymentCooldown] = useState(0);
  const [cooldownInterval, setCooldownInterval] = useState<NodeJS.Timeout | null>(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    return () => {
      if (cooldownInterval) clearInterval(cooldownInterval);
    };
  }, [cooldownInterval]);

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      setIsAdminRoute(path === '/adminlogintopup');
      setIsResellerRoute(path === '/reseller');
      const resellerAuth = localStorage.getItem('jackstore_reseller_auth');
      setIsResellerLoggedIn(resellerAuth === 'true');
    };
    checkRoute();
    window.addEventListener('popstate', checkRoute);
    return () => window.removeEventListener('popstate', checkRoute);
  }, []);

  useEffect(() => {
    if (!isAdminRoute && !isResellerRoute) {
      fetchProducts(form.game);
    }
  }, [form.game, isAdminRoute, isResellerRoute]);

  useEffect(() => {
    if (form.userId || form.serverId || form.nickname) {
      localStorage.setItem('customerInfo', JSON.stringify({
        userId: form.userId,
        serverId: form.serverId,
        game: form.game,
        product: null,
        nickname: form.nickname
      }));
    }
  }, [form.userId, form.serverId, form.game, form.nickname]);

  const startPaymentCooldown = () => {
    setPaymentCooldown(7);
    if (cooldownInterval) clearInterval(cooldownInterval);
    const interval = setInterval(() => {
      setPaymentCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setCooldownInterval(interval);
  };

  const handleNotify = (message: string) => {
    setSelectionMessage(message);
    setTimeout(() => setSelectionMessage(null), 3000);
  };

  const fetchProducts = async (game: 'mlbb' | 'mlbb_ph' | 'freefire') => {
    setLoading(true);
    try {
      let data;
      let error;
      const isReseller = localStorage.getItem('jackstore_reseller_auth') === 'true';
      const table = game === 'mlbb' ? 'mlbb_products' : game === 'mlbb_ph' ? 'mlbb_ph_products' : 'freefire_products';
      const response = await supabase.from(table).select('*').order('id', { ascending: true });
      data = response.data;
      error = response.error;

      if (error) throw error;
      let transformedProducts: GameProduct[] = data.map(product => ({
        id: product.id,
        name: product.name,
        diamonds: product.diamonds || undefined,
        price: product.price,
        currency: product.currency,
        type: product.type as 'diamonds' | 'subscription' | 'special',
        game: game,
        image: product.image || undefined,
        code: product.code || undefined,
        tagname: product.tagname || undefined
      }));

      if (isReseller) {
        const resellerPricesResponse = await supabase
          .from('reseller_prices')
          .select('*')
          .eq('game', game);
        if (!resellerPricesResponse.error && resellerPricesResponse.data) {
          const resellerPrices = resellerPricesResponse.data;
          transformedProducts = transformedProducts.map(product => {
            const resellerPrice = resellerPrices.find(rp => rp.product_id === product.id && rp.game === product.game);
            return resellerPrice ? { ...product, price: resellerPrice.price, resellerPrice: resellerPrice.price } : product;
          });
        }
      }
      setProducts(transformedProducts);
      if (form.product) {
        const updatedProduct = transformedProducts.find(p => p.id === form.product?.id);
        if (updatedProduct && updatedProduct.price !== form.product.price) {
          setForm(prev => ({ ...prev, product: updatedProduct }));
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      alert('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateAccount = async () => {
    if (!form.userId || !form.serverId || (form.game !== 'mlbb' && form.game !== 'mlbb_ph')) return;
    setValidating(true);
    setValidationResult(null);
    try {
      const apiUrl = form.game === 'mlbb_ph'
        ? `https://api.isan.eu.org/nickname/ml?id=${form.userId}&zone=${form.serverId}`
        : `https://api.vibolshop.com/api_reseller/checkid_mlbb.php?userid=${form.userId}&zoneid=${form.serverId}`;
      const response = await axios.get(apiUrl, { responseType: 'json' });
      let validationResult: MLBBValidationResponse;

      if (form.game === 'mlbb_ph') {
        const jsonResponse = response.data as { success: boolean; name?: string; message?: string };
        if (jsonResponse.success) {
          validationResult = {
            status: 'success',
            success: true,
            data: { userName: jsonResponse.name },
          };
          setForm(prev => ({ ...prev, nickname: jsonResponse.name }));
        } else {
          validationResult = {
            status: 'invalid',
            success: false,
            message: jsonResponse.message || 'Invalid user ID or zone ID',
          };
        }
      } else {
        const jsonResponse = response.data as MLBBValidationResponse;
        if (jsonResponse.status === 'success') {
          validationResult = jsonResponse;
          setForm(prev => ({ ...prev, nickname: jsonResponse.data?.userName }));
        } else {
          validationResult = {
            status: 'invalid',
            success: false,
            message: jsonResponse.message || 'Invalid user ID or server ID',
          };
        }
      }
      setValidationResult(validationResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      console.error('Failed to validate account:', errorMessage);
      setValidationResult({ success: false, message: 'Failed to validate account. Please try again.' });
    } finally {
      setValidating(false);
    }
  };

  const handleProductSelect = (product: GameProduct) => {
    setForm(prev => ({ ...prev, product }));
    handleNotify(`${product.diamonds || product.name} = $${product.price.toFixed(2)} Selected`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentCooldown > 0) {
      alert(`Please wait ${paymentCooldown} seconds before making another payment`);
      return;
    }
    const errors: { userId?: string; serverId?: string } = {};
    if (!form.userId?.trim()) errors.userId = 'User ID is required';
    const isMLBB = form.game === 'mlbb' || form.game === 'mlbb_ph';
    if (isMLBB && !form.serverId?.trim()) errors.serverId = 'Server ID is required';
    if (!form.product) {
      alert('Please select a product');
      return;
    }
    if (!termsAccepted) {
      alert('You must accept the terms and conditions to proceed.');
      return;
    }

    const currentProduct = products.find(p => p.id === form.product?.id);
    if (currentProduct && currentProduct.price !== form.product.price) {
      setForm(prev => ({ ...prev, product: currentProduct }));
      alert(`Product price has been updated from ${form.product.price} to ${currentProduct.price}. Please review before continuing.`);
      return;
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (isMLBB) {
      if (!validationResult) {
        alert('Please verify your Mobile Legends account first');
        return;
      }
      if (validationResult.status !== 'success') {
        alert(validationResult.message || 'Account verification failed. Please check your User ID and Server ID.');
        return;
      }
    }
    const productIdentifier = form.product.code || form.product.diamonds || form.product.name;
    const format = isMLBB ? `${form.userId} ${form.serverId} ${productIdentifier}` : `${form.userId} 0 ${productIdentifier}`;
    setOrderFormat(format);
    setShowCheckout(true);
  };

  const clearSavedInfo = () => {
    localStorage.removeItem('customerInfo');
    setForm({ userId: '', serverId: '', product: null, game: form.game, nickname: undefined });
    setValidationResult(null);
  };

  const handleClosePayment = () => {
    setShowCheckout(false);
    setShowPayment(false);
    startPaymentCooldown();
  };

  const handleGameSelect = (game: 'mlbb' | 'mlbb_ph' | 'freefire') => {
    if (!storeConfig.games[game].enabled) {
      alert(storeConfig.games[game].maintenanceMessage || 'This game is currently unavailable');
      return;
    }
    setForm(prev => ({ ...prev, game }));
    setShowTopUp(true);
  };

  if (isAdminRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <span className="ml-2 text-white">Loading admin panel...</span>
        </div>
      }>
        <AdminPage />
      </Suspense>
    );
  }

  if (isResellerRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
          <Loader2 className="w-10 h-10 animate-spin text-white" />
          <span className="ml-2 text-white">Loading reseller panel...</span>
        </div>
      }>
        <ResellerPage onLogin={() => {
          setIsResellerLoggedIn(true);
          window.location.href = '/';
        }} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 font-khmer">
      <style>
        {`
          .khmer-font {
            font-family: 'Siemreap', sans-serif;
          }
          .header {
            background: linear-gradient(135deg, #1e40af, #3b82f6, #60a5fa);
            padding: 12px 16px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }
          .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            max-width: 1200px;
            margin: 0 auto;
          }
          .logo {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            object-fit: cover;
            border: 3px solid rgba(255,255,255,0.3);
            transition: transform 0.3s ease;
          }
          .logo:hover {
            transform: scale(1.1);
          }
          .menu-button {
            background: rgba(255,255,255,0.2);
            border: none;
            padding: 10px;
            border-radius: 12px;
            color: white;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
          }
          .menu-button:hover {
            background: rgba(255,255,255,0.3);
            transform: scale(1.05);
          }
          .banner-container {
            position: relative;
            height: 200px;
            overflow: hidden;
            border-radius: 0 0 24px 24px;
            margin-bottom: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          }
          .banner-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .game-center-section {
            margin-bottom: 24px;
            padding: 0 16px;
          }
          .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
          }
          .section-title {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 20px;
            font-weight: bold;
            color: #bfdbfe;
          }
          .gamepad-icon {
            color: #bfdbfe;
            animation: pulse 2s infinite;
          }
          .game-center-grid {
            display: flex;
            gap: 16px;
            justify-content: center;
            margin-top: 16px;
            flex-wrap: nowrap;
            max-width: 464px;
            margin-left: auto;
            margin-right: auto;
          }
          .game-center-card-container {
            display: flex;
            flex-direction column;
            align-items: center;
            gap: 4px;
          }
          .game-center-card {
            width: 140px;
            height: 202px;
            background: white;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            transition: all 0.3s ease;
            cursor: pointer;
            border: 3px solid transparent;
            position: relative;
            display: flex;
            flex-direction: column;
          }
          .game-center-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
            border-color: #3b82f6;
          }
          .game-center-image {
            width: 100%;
            height: 120px;
            object-fit: cover;
            flex-shrink: 0;
          }
          .game-center-info {
            padding: 12px;
            text-align: center;
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .game-center-name {
            font-size: 14px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 6px;
            line-height: 1.2;
          }
          .game-center-status {
            font-size: 11px;
            color: #6b7280;
            margin-bottom: 8px;
          }
          .game-center-button {
            width: 140px;
            padding: 8px 12px;
            border: none;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            color: white;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          .game-center-button:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
          }
          .game-center-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: linear-gradient(135deg, #3b82f6, #60a5fa);
            color: white;
            font-size: 10px;
            padding: 4px 10px;
            border-radius: 15px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }
          .form-section {
            padding: 20px;
            background: linear-gradient(135deg, rgba(30, 64, 175, 0.1), rgba(59, 130, 246, 0.05));
            border-radius: 16px;
            margin-bottom: 16px;
            border: 2px solid rgba(59, 130, 246, 0.2);
          }
          .form-section.user-info {
            min-height: 300px;
            max-width: 600px;
            margin: 0 auto 16px;
            padding: 24px;
          }
          .form-section.products-info {
            background: linear-gradient(135deg, rgba(30, 64, 175, 0.15), rgba(59, 130, 246, 0.1));
            border: 2px solid rgba(59, 130, 246, 0.3);
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
          }
          .topup-container {
            background: linear-gradient(135deg, rgba(30, 64, 175, 0.2), rgba(59, 130, 246, 0.1));
            border-radius: 20px;
            margin: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            overflow: hidden;
            border: 2px solid rgba(59, 130, 246, 0.1);
          }
          .topup-header {
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            padding: 20px;
            color: white;
            text-align: center;
          }
          .topup-title {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 6px;
          }
          .topup-subtitle {
            font-size: 14px;
            opacity: 0.9;
          }
          .section-number {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            color: white;
            border-radius: 8px;
            font-size: 14px;
            font-weight: bold;
            margin-right: 12px;
          }
          .section-title-text {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
          }
          .input-group {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 16px 0;
          }
          .input-field {
            width: 100%;
            padding: 12px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 16px;
            transition: all 0.3s ease;
            background: #f9fafb;
          }
          .input-field:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
            background: white;
          }
          .check-button {
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          }
          .check-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
          }
          .check-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          .validation-success {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #10b981;
            font-size: 14px;
            margin-top: 12px;
            padding: 8px 12px;
            background: #ecfdf5;
            border-radius: 8px;
          }
          .validation-error {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ef4444;
            font-size: 14px;
            margin-top: 12px;
            padding: 8px 12px;
            background: #fee2e2;
            border-radius: 8px;
          }
          .checkout-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.3);
            z-index: 1000;
          }
          .checkout-info, .order-info {
            color: white;
          }
          .checkout-total {
            font-size: 14px;
            opacity: 0.9;
          }
          .checkout-price {
            font-size: 20px;
            font-weight: bold;
          }
          .checkout-button {
            background: white;
            color: #1e40af;
            border: none;
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
          }
          .checkout-button:hover {
            transform: scale(1.05);
            box-shadow: 0 6px 16px rgba(255, 255, 255, 0.4);
          }
          .checkout-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }
          .back-button {
            background: rgba(255,255,255,0.2);
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 12px;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s ease;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
          }
          .back-button:hover {
            background: rgba(255,255,255,0.3);
            transform: translateX(-4px);
          }
          .features-section {
            padding: 24px 16px;
            background: linear-gradient(135deg, #1e40af, #3b82f6, #60a5fa);
            margin: 20px 16px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          }
          .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
          .feature-card {
            background: rgba(255,255,255,0.2);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.3);
            transition: all 0.3s ease;
          }
          .feature-card:hover {
            transform: translateY(-4px);
            background: rgba(255,255,255,0.3);
          }
          .feature-icon {
            width: 48px;
            height: 48px;
            object-fit: contain;
            margin: 0 auto 12px;
            filter: brightness(0) invert(1);
          }
          .feature-text {
            color: white;
            font-size: 14px;
            font-weight: bold;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
          }
          .support-button {
            position: fixed;
            bottom: 120px;
            right: 24px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 1000;
            animation: pulse 2s infinite;
          }
          .support-button:hover {
            transform: scale(1.1);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
          }
          .support-icon {
            width: 28px;
            height: 28px;
            object-fit: contain;
            filter: brightness(0) invert(1);
          }
          .frame-cover {
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            padding: 16px;
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
          }
          .frame {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
            gap: 12px;
          }
          .index {
            background: #1e40af;
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
          }
          .frame-title {
            color: white;
            font-size: 18px;
            font-weight: 400;
            margin: 0;
            font-family: 'Siemreap', sans-serif;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            letter-spacing: 0.5px;
          }
          .terms-checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 16px 0;
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .fade-in {
            animation: fadeIn 0.6s ease-out;
          }
          @media (max-width: 640px) {
            .game-center-grid {
              flex-direction: row;
              gap: 12px;
              max-width: 424px;
            }
            .game-center-card {
              width: 120px;
              height: 180px;
            }
            .game-center-image {
              height: 100px;
            }
            .game-center-button {
              width: 120px;
            }
            .form-section.user-info,
            .form-section.products-info {
              max-width: 100%;
              padding: 16px;
            }
            .checkout-bar {
              padding: 12px 16px;
            }
            .checkout-price {
              font-size: 18px;
            }
            .checkout-button {
              padding: 10px 20px;
              font-size: 14px;
            }
          }
        `}
      </style>
      <header className="header">
        <div className="header-content">
          <img
            src={storeConfig.logoUrl}
            alt="ETW Store Logo"
            className="logo"
          />
          <div className="flex-1 text-center">
            <h1 className="text-white text-xl font-bold">{storeConfig.storeName}</h1>
            {isResellerLoggedIn && (
              <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-medium">Reseller Mode</span>
            )}
          </div>
          <button
            onClick={() => setShowLeaderboard(true)}
            className="menu-button"
            title="View Leaderboard"
          >
            <Users className="w-6 h-6" />
          </button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto">
        {!showTopUp ? (
          <main>
            <div className="banner-container">
              <BannerSlider banners={storeConfig.banners} />
            </div>
            <div className="game-center-section">
              <div className="section-header">
                <div className="section-title">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="gamepad-icon"
                  >
                    <line x1="6" x2="10" y1="11" y2="11"></line>
                    <line x1="8" x2="8" y1="9" y2="13"></line>
                    <line x1="15" x2="15.01" y1="12" y2="12"></line>
                    <line x1="18" x2="18.01" y1="10" y2="10"></line>
                    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"></path>
                  </svg>
                  <span>Game Center</span>
                </div>
              </div>
              <div className="game-center-grid">
                <div className="game-center-card-container fade-in">
                  <div
                    className="game-center-card"
                    onClick={() => handlestru handleGameSelect('mlbb')}
                  >
                    <div className="relative">
                      <img
                        src="https://play-lh.googleusercontent.com/M9_okpLdBz0unRHHeX7FcZxEPLZDIQNCGEBoql7MxgSitDL4wUy4iYGQxfvqYogexQ"
                        alt="Mobile Legends"
                        className="game-center-image"
                      />
                      <div className="game-center-badge khmer-font">ពេញនិយម</div>
                    </div>
                    <div className="game-center-info">
                      <div className="game-center-name">Mobile Legends</div>
                      <div className="game-center-status khmer-font">មូបាយល៍ លេជេន</div>
                    </div>
                  </div>
                  <button
                    className="game-center-button"
                    onClick={() => handleGameSelect('mlbb')}
                  >
                    TOP UP NOW
                  </button>
                </div>
                <div className="game-center-card-container fade-in">
                  <div
                    className="game-center-card"
                    onClick={() => handleGameSelect('mlbb_ph')}
                  >
                    <div className="relative">
                      <img
                        src="https://play-lh.googleusercontent.com/M9_okpLdBz0unRHHeX7FcZxEPLZDIQNCGEBoql7MxgSitDL4wUy4iYGQxfvqYogexQ"
                        alt="Mobile Legends PH"
                        className="game-center-image"
                      />
                      <div className="game-center-badge khmer-font">ហ្វីលីពីន</div>
                    </div>
                    <div className="game-center-info">
                      <div className="game-center-name">Mobile Legends PH</div>
                      <div className="game-center-status khmer-font">មូបាយល៍ ហ្វីលីពីន</div>
                    </div>
                  </div>
                  <button
                    className="game-center-button"
                    onClick={() => handleGameSelect('mlbb_ph')}
                  >
                    TOP UP NOW
                  </button>
                </div>
                <div className="game-center-card-container fade-in">
                  <div
                    className="game-center-card"
                    onClick={() => handleGameSelect('freefire')}
                  >
                    <div className="relative">
                      <img
                       versal
                        src="https://play-lh.googleusercontent.com/WWcssdzTZvx7Fc84lfMpVuyMXg83_PwrfpgSBd0IID_IuupsYVYJ34S9R2_5x57gHQ"
                        alt="Free Fire"
                        className="game-center-image"
                      />
                      <div className="game-center-badge khmer-font">រហ័ស</div>
                    univer</div>
                    <div className="game-center-info">
                      <div className="game-center-name">Free Fire</div>
                      <div className="game-center-status khmer-font">ហ្វ្រី ហ្ឫាយ</div>
                    </div>
                  </div>
                  <button
                    className="game-center-button"
                    onClick={() => handleGameSelect('freefire')}
                  >
                    TOP UP NOW
                  </button>
                </div>
              </div>
            </div>
            <div className="features-section">
              <div className="features-grid">
                <div className="feature-card">
                  <img
                    src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/48_-Protected_System-_Yellow-512-removebg-preview.png"
                    alt="Security"
                    className="feature-icon"
                  />
                  <div className="feature-text khmer-font">សុវត្ថិភាព</div>
                </div>
                <div className="feature-card">
                  <img
                    src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1820.PNG"
                    alt="Fast"
                    className="feature-icon"
                  />
                  <div className="feature-text khmer-font">បញ្ចូលពេជ្រលឿន</div>
                </div>
              </div>
            </div>
          </main>
        ) : (
          <main className="px-4 py-8">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowTopUp(false);
                    setShowCheckout(false);
                    setSelectionMessage(null);
                    setValidationResult(null);
                  }}
                  className="back-button"
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                {(form.userId || form.serverId) && (
                  <button
                    onClick={clearSavedInfo}
                    className="back-button"
                  >
                    <XCircle className="w-4 h-4" /> Clear
                  </button>
                )}
              </div>
              <div className="topup-container">
                <div className="topup-header">
                  <h1 className="topup-title">
                    {form.game === 'mlbb' || form.game === 'mlbb_ph' ? 'Mobile Legends' : 'Free Fire'}
                  </h1>
                  <p className="topup-subtitle khmer-font">បញ្ចូលពេជ្រដោយសុវត្ថិភាព និងរហ័ស</p>
                </div>
                {selectionMessage && (
                  <div className="fixed top-32 right-4 z-50 animate-slide-in sm:right-[calc(50%-384px+1rem)]">
                    <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium khmer-font">{selectionMessage}</span>
                    </div>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-6 p-4">
                  <section className="form-section user-info">
                    <div className="frame">
                      <div className="section-number">1</div>
                      <h3 className="section-title-text khmer-font">បញ្ចូល ID របស់អ្នក</h3>
                    </div>
                    <div className="input-group">
                      <div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="number"
                            value={form.userId}
                            onChange={(e) => {
                              const value = e.target.value.trim().replace(/[^0-9]/g, '');
                              setForm(prev => ({ ...prev, userId: value, nickname: undefined }));
                              setValidationResult(null);
                              setFormErrors(prev => ({ ...prev, userId: undefined }));
                            }}
                            className="input-field pl-10"
                            placeholder={`Enter your ${form.game === 'mlbb' || form.game === 'mlbb_ph' ? 'User ID' : 'Free Fire ID'}`}
                          />
                        </div>
                        {formErrors.userId && <p className="text-red-400 text-xs mt-1">{formErrors.userId}</p>}
                      </div>
                      {(form.game === 'mlbb' || form.game === 'mlbb_ph') && (
                        <div>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="number"
                              value={form.serverId}
                              onChange={(e) => {
                                const value = e.target.value.trim().replace(/[^0-9]/g, '');
                                setForm(prev => ({ ...prev, serverId: value, nickname: undefined }));
                                setValidationResult(null);
                                setFormErrors(prev => ({ ...prev, serverId: undefined }));
                              }}
 
                             className="input-field pl-10"
                              placeholder="Enter your Server ID"
                            />
                            {formErrors.serverId && <p className="text-red-400 text-xs mt-1">{formErrors.serverId}</p>}
                          </div>
                        )}
                      </div>
                      {(form.game === 'mlbb' || form.game === 'mlbb_ph') && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={validateAccount}
                            disabled={!form.userId || !form.serverId || validating}
                            className="check-button"
                          >
                            {validating ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Checking...
                              </>
                            ) : (
                              <>
                                <Search className="w-4 h-4" />
                                Check ID
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      {validationResult && validationResult.status === 'success' && (
                        <div className="validation-success">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Account found: {validationResult.data?.userName}</span>
                        </div>
                      )}
                      {validationResult && validationResult.status === 'invalid' && (
                        <div className="validation-error">
                          <XCircle className="w-4 h-4" />
                          <span>{validationResult.message || 'Invalid user ID or server ID'}</span>
                        </div>
                      )}
                      <p className="khmer-font text-sm text-gray-600 mt-4">
                        ដើម្បីឃើញ UserID សូមចូលទៅក្នុងហ្គេម ហើយចុចរូបភាព Avatar នៅខាងឆ្វេងអេក្រង់កញ្ចក់
                        ហើយចុចទៅកាន់"Check ID" ពេលនោះ User ID នឹងបង្ហាញឲ្យឃើញ បន្ទាប់មកសូមយក User ID
                        នោះមកបំពេញ។ ឧទាហរណ៍: User ID: 123456789, Zone ID: 1234។
                      </p>
                    </section>
                    <section className="form-section products-info">
                      <div className="frame">
                        <div className="section-number">2</div>
                        <h3 className="section-title-text khmer-font">ជ្រើសរើសកញ្ចប់</h3>
                      </div>
                      {loading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-white" />
                          <span className="ml-2 text-white khmer-font">កំពុងផ្ទុក...</span>
                        </div>
                      ) : (
                        <ProductList
                          products={products}
                          selectedProduct={form.product}
                          onSelect={handleProductSelect}
                          game={form.game}
                        />
                      )}
                    </section>
                    {form.product && (
                      <section className="form-section order-info">
                        <div className="frame">
                          <div className="section-number">3</div>
                          <h3 className="section-title-text khmer-font">សង្ខេបការបញ្ជាទិញ</h3>
                        </div>
                        <div className="space-y-2 font-mono text-sm text-white">
                          <div className="flex items-center gap-2">
                            <span className="text-[#F57F17]">ID:</span>
                            <span>{form.userId}</span>
                          </div>
                          {(form.game === 'mlbb' || form.game === 'mlbb_ph') && (
                            <div className="flex items-center gap-2">
                              <span className="text-[#F57F17]">SERVER ID:</span>
                              <span>{form.serverId}</span>
                            </div>
                          )}
                          {form.game === 'freefire' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[#F57F17]">SERVER ID:</span>
                              <span>0</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-[#F57F17]">ITEM:</span>
                            <span>{form.product.code || form.product.diamonds || form.product.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#F57F17]">PRICE:</span>
                            <span>${form.product.price.toFixed(2)} USD</span>
                          </div>
                        </div>
                      </section>
                    )}
                    <div className="terms-checkbox">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="w-4 h-4 border-2 border-white rounded"
                      />
                      <label htmlFor="terms" className="text-white text-sm khmer-font">
                        ខ្ញុំយល់ព្រមតាម <a href="#terms-modal" className="underline" onClick={() => document.getElementById('terms-modal').classList.remove('hidden')}>លក្ខខណ្ឌ</a>
                      </label>
                    </div>
                    <div className="checkout-bar">
                      <div className="checkout-info">
                        <p className="checkout-total khmer-font">
                          សរុប: <span>{form.product ? (form.product.diamonds || form.product.name) : 'None'}</span> 💎
                        </p>
                        <p className="checkout-price">${form.product ? form.product.price.toFixed(2) : '0.00'}</p>
                      </div>
                      <button
                        type="submit"
                        disabled={
                          !form.product ||
                          paymentCooldown > 0 ||
                          ((form.game === 'mlbb' || form.game === 'mlbb_ph') && validationResult?.status !== 'success') ||
                          !termsAccepted
                        }
                        className="checkout-button"
                      >
                        {paymentCooldown > 0 ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin text-blue-300 inline-block mr-2" />
                            <span className="khmer-font">សូមរង់ចាំ {paymentCooldown} វិនាទី</span>
                          </>
                        ) : (
                          <span className="khmer-font">បន្តទៅកាន់ការទូទាត់</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </main>
          )}
          <div className="support-button">
            <a href={storeConfig.supportUrl} target="_blank" rel="noopener noreferrer">
              <img
                src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1820.PNG"
                alt="Support"
                className="support-icon"
              />
            </a>
          </div>
          <footer className="container text-white py-3">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
              <divcardi
                className="flex flex-col items-center lg:items-start gap-1"
              >
                <p className="font-bold khmer-font">ទំនាក់ទំនង:</p>
                <ul className="flex gap-2 items-center list-none">
                  <li>
                    <a href={storeConfig.fb} target="_blank" rel="noopener noreferrer">
                      <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" width="32" height="32" color="#ffffff">
                        <path d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H141.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.2 3.2 55.7 6.4V172c-6-.6-16.5-1-29.6-1c-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H287V510.1C413.8 494.8 512 386.9 512 256h0z"></path>
                      </svg>
                    </a>
                  </li>
                  <li>
                    <a href={storeConfig.channelUrl} target="_blank" rel="noopener noreferrer">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.94-.65-.33-1.01.21-1.59c.14-.15 2.71-2.48 2.76-2.69c.01-.05.01-.1-.02-.14c-.04-.05-.1-.03-.14-.02c-.06.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.20-1.55-.37c-.63-.2-1.13-.31-1.09-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.12.27"></path>
                      </svg>
                    </a>
                  </li>
                </ul>
              </div>
              <div className="text-center text-sm">
                <ul className="list-none">
                  <li>
                    <button
                      onClick={() => document.getElementById('terms-modal').classList.remove('hidden')}
                      className="text-white underline underline-offset-4"
                    >
                      <span className="font-bold">Privacy Policy</span> |{' '}
                      <span className="font-bold">Terms and Condition</span>
                    </button>
                  </li>
                  <li>{storeConfig.footer.copyright}</li>
                </ul>
              </div>
              <div className="flex flex-col items-center lg:items-end gap-1">
                <p className="font-bold text-white khmer-font">ទទួលបង់ប្រាក់:</p>
                <img
                  alt="KHQR"
                  src="https://raw.githubusercontent.com/Cheagjihvg/svg/aee1480802998cec595324cb335444a14b4a48ea/khqr.svg"
                  className="h-8"
                />
              </div>
            </div>
          </footer>
          {showCheckout && (
            <PaymentModal
              form={form}
              orderFormat={orderFormat}
              onClose={handleClosePayment}
              discountPercent={discountPercent}
            />
          )}
          {storeConfig.popupBanner.enabled && showPopupBanner && (
            <PopupBanner
              image={storeConfig.popupBanner.image}
              onClose={() => setShowPopupBanner(false)}
            />
          )}
          <div id="terms-modal" className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto khmer-font">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Terms & Conditions</h2>
              <div className="text-gray-300 text-sm md:text-base space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">1. Payment Agreement</h3>
                  <p>By choosing to make a payment, you acknowledge and agree to the following terms:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Agreement Acceptance:</strong> When you initiate a payment, it is understood that you fully accept and abide by the terms and policies outlined here.</li>
                    <li><strong>No Refunds for Diamond Top-ups Success:</strong> We do not offer refunds for diamond top-ups success. If your top-up is in pending status for under 5 hours, we will refund the money.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">2. Refund Policy</h3>
                  <p>In the event of a refund request, please be aware of the following conditions:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Refund Eligibility:</strong> Refunds are available only for top-ups that are not successful or are pending for under 5 hours, under specific circumstances, and eligibility will be determined on a case-by-case basis.</li>
                    <li><strong>Processing Time:</strong> Refund processing may take up to 3 business days from the date of approval.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">3. Fraud Prevention</h3>
                  <p>We take fraud prevention seriously to ensure a secure environment for all users. If there are suspicions of scam or cheating:</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Verification Process:</strong> To address potential fraudulent activities, you may be required to verify your identity by providing an ID and recording a video explaining the issue.</li>
                    <li><strong>Resolution Time:</strong> The resolution process for fraud-related cases may extend up to 48 hours.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">4. Changes to Terms and Conditions</h3>
                  <p>Any changes will be effective immediately upon posting on the website.</p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>User Acknowledgment:</strong> Continued use of our services after any changes constitutes acceptance of the new terms and conditions. Users are encouraged to review the terms regularly.</li>
                    <li><strong>Discontinuation of Services:</strong> We reserve the right to discontinue any aspect of our services at any time, including the sale of diamonds, without prior notice.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">5. Privacy Policy</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Data Collection:</strong> We collect and store personal information provided by users during registration and transactions. This information is used solely for providing and improving our services.</li>
                    <li><strong>Data Security:</strong> We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</li>
                    <li><strong>Third-Party Services:</strong> Our website may contain links to third-party services. We are not responsible for the privacy practices or content of these services.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">6. Governing Law and Dispute Resolution</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Governing Law:</strong> These terms and conditions shall be governed by and construed in accordance with the laws of the jurisdiction in which our company is registered.</li>
                    <li><strong>Dispute Resolution:</strong> Any disputes arising from or relating to these terms and conditions shall be resolved through binding arbitration in accordance with the rules of the relevant arbitration body. The arbitration decision shall be final and binding on both parties.</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">7. Contact Information</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Customer Support:</strong> For any questions or concerns regarding these terms and conditions, users can contact our customer support team via the contact details provided on the website.</li>
                    <li><strong>Business Hours:</strong> Our customer support team is available during business hours as listed on the website. Responses to inquiries may take up to 48 hours.</li>
                  </ul>
                </div>
                <p>Thank you for your understanding and cooperation.</p>
              </div>
              <button
                onClick={() => document.getElementById('terms-modal').classList.add('hidden')}
                className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-full transition-all duration-300 khmer-font"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  export default App;
