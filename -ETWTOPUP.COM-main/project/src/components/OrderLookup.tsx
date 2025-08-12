import React, { useState, useEffect } from 'react';
import { Search, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface OrderLookupProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OrderDetails {
  transaction: string;
  game: string;
  amount: string;
  item: string;
  userId: string;
  serverId: string;
  orderId: string;
  orderDate: string;
}

export function OrderLookup({ isOpen, onClose }: OrderLookupProps) {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);

  // Authenticate the Supabase client
  useEffect(() => {
    const authenticate = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Authentication error:', error);
        setError('Failed to authenticate. Please try again.');
      }
    };

    authenticate();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;

    setLoading(true);
    setError(null);
    setOrderDetails(null);

    try {
      // Remove 'S' prefix if present and search by the numeric ID
      const searchId = orderId.trim().replace(/^S/, '');
      console.log('Searching for orderId:', searchId); // Debugging log

      // Query the payment_tokens table
      const { data, error: searchError } = await supabase
        .from('payment_tokens')
        .select('order_data')
        .eq('order_data->>orderId', searchId);

      if (searchError) {
        throw searchError;
      }

      console.log('Query result:', data); // Debugging log

      // Check if data is empty or contains multiple rows
      if (!data || data.length === 0) {
        setError('Order not found');
        return;
      }

      if (data.length > 1) {
        setError('Multiple orders found. Please contact support.');
        return;
      }

      // Extract the first (and only) order
      const orderData = data[0].order_data;

      // Format the order details
      const details: OrderDetails = {
        transaction: orderData.transactionId,
        game: orderData.game === 'mlbb' ? 'Mobile Legends' : 'Free Fire',
        amount: `${orderData.amount} $`,
        item: orderData.item,
        userId: orderData.userId,
        serverId: orderData.serverId,
        orderId: `S${orderData.orderId}`,
        orderDate: orderData.orderDate,
      };

      setOrderDetails(details);
    } catch (err) {
      console.error('Error searching order:', err);
      setError('Failed to search order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ×
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-4">Check Order Status</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-1">
              Order ID
            </label>
            <div className="relative">
              <input
                type="text"
                id="orderId"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter Order ID (e.g., S1742562960620)"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !orderId.trim()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              'Check Order'
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {orderDetails && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Order Found!</span>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Transaction:</span> {orderDetails.transaction}</p>
              <p><span className="font-medium">Game:</span> {orderDetails.game}</p>
              <p><span className="font-medium">Amount:</span> {orderDetails.amount}</p>
              <p><span className="font-medium">Item:</span> {orderDetails.item}</p>
              <p><span className="font-medium">User ID:</span> {orderDetails.userId}</p>
              <p><span className="font-medium">Server ID:</span> {orderDetails.serverId}</p>
              <p><span className="font-medium">Order ID:</span> {orderDetails.orderId}</p>
              <p><span className="font-medium">Order Date:</span> {orderDetails.orderDate}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
