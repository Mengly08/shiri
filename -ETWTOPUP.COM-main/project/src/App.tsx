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
      game: 'mlbb'
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
  const [priceRefreshInterval, setPriceRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    return () => {
      if (priceRefreshInterval) clearInterval(priceRefreshInterval);
      if (cooldownInterval) clearInterval(cooldownInterval);
    };
  }, [priceRefreshInterval, cooldownInterval]);

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
      const interval = setInterval(() => fetchProducts(form.game), 3600000);
      setPriceRefreshInterval(interval);
      return () => clearInterval(interval);
    }
  }, [form.game, isAdminRoute, isResellerRoute]);

  useEffect(() => {
    if (form.userId || form.serverId) {
      localStorage.setItem('customerInfo', JSON.stringify({
        userId: form.userId,
        serverId: form.serverId,
        game: form.game,
        product: null
      }));
    }
  }, [form.userId, form.serverId, form.game]);

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

      if (game === 'mlbb') {
        const response = await supabase.from('mlbb_products').select('*').order('id', { ascending: true });
        data = response.data;
        error = response.error;
      } else if (game === 'mlbb_ph') {
        const response = await supabase.from('mlbb_ph_products').select('*').order('id', { ascending: true });
        data = response.data;
        error = response.error;
      } else {
        const response = await supabase.from('freefire_products').select('*').order('id', { ascending: true });
        data = response.data;
        error = response.error;
      }

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
    } finally {
      setLoading(false);
    }
  };

const validateAccount = async () => {
  if (!form.userId || !form.serverId || (form.game !== 'mlbb' && form.game !== 'mlbb_ph')) return;

  setValidating(true);
  setValidationResult(null);

  try {
    // Select API endpoint based on game type
    const apiUrl =
      form.game === 'mlbb_ph'
        ? `https://api.isan.eu.org/nickname/ml?id=${form.userId}&zone=${form.serverId}`
        : `https://api.vibolshop.com/api_reseller/checkid_mlbb.php?userid=${form.userId}&zoneid=${form.serverId}`;

    // Make the API request
    const response = await axios.get(apiUrl, {
      responseType: 'json', // Both endpoints return JSON
    });

    let validationResult: MLBBValidationResponse;

    if (form.game === 'mlbb_ph') {
      // Handle JSON response for mlbb_ph
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
      // Handle JSON response for mlbb
      const jsonResponse = response.data as MLBBValidationResponse;
      if (jsonResponse.status === 'success') {
        validationResult = jsonResponse;
        setForm(prev => ({ ...prev, nickname: jsonResponse.data?.userName }));
      } else if (jsonResponse.status === 'invalid') {
        validationResult = {
          status: 'invalid',
          success: false,
          message: jsonResponse.message || 'Invalid user ID or server ID',
        };
      } else {
        validationResult = {
          status: 'error',
          success: false,
          message: 'Unexpected response from server',
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
    setForm({ userId: '', serverId: '', product: null, game: form.game });
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
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <Loader2 className="w-10 h-10 animate-spin text-green-500" />
          <span className="ml-2 text-gray-700">Loading admin panel...</span>
        </div>
      }>
        <AdminPage />
      </Suspense>
    );
  }

  if (isResellerRoute) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <Loader2 className="w-10 h-10 animate-spin text-green-500" />
          <span className="ml-2 text-gray-700">Loading reseller panel...</span>
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
    <div className="min-h-screen bg-fixed bg-cover bg-center" style={{ backgroundColor: '#000000' }}>
      <div className="min-h-screen bg-transparent">
        <nav className="text-white p-4 shadow-lg backdrop-blur-md sticky top-0 z-50" style={{ backgroundColor: 'rgba(245, 127, 23)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={storeConfig.logoUrl} alt="Logo" className="w-20 h-20 rounded-full" />
              <div>
                <h1 className="text-3xl font-black text-white tracking-tight whitespace-nowrap">
                  {storeConfig.storeName}
                </h1>
                <p className="text-xs text-white/80">{storeConfig.storeTagline}</p>
                {isResellerLoggedIn && (
                  <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded-full font-medium">Reseller Mode</span>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowLeaderboard(true)}
              className="text-white hover:text-purple-300 transition-colors p-2 rounded-full bg-white/10"
              title="View Leaderboard"
            >
              <Users className="w-6 h-6" />
            </button>
          </div>
        </nav>

        <div className="container mx-auto px-4 py-8">
          <div className={`bg-gradient-to-r from-${storeConfig.colors.primary}-900 to-${storeConfig.colors.secondary}-900 rounded-lg shadow-2xl overflow-hidden`}>
            <BannerSlider banners={storeConfig.banners} />
          </div>
        </div>

        {!showTopUp ? (
          <main className="container mx-auto px-4 py-8">
            <GameSelector onSelect={handleGameSelect} />
          </main>
        ) : (
          <main className="container mx-auto px-4 py-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setShowTopUp(false);
                    setShowCheckout(false);
                    setSelectionMessage(null);
                  }}
                  className="text-white hover:text-green-200 transition-colors text-sm flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Games
                </button>
                {(form.userId || form.serverId) && (
                  <button
                    onClick={clearSavedInfo}
                    className="text-red-300 hover:text-red-200 transition-colors text-sm flex items-center gap-2 bg-red-500/10 px-3 py-1.5 rounded-lg"
                  >
                    <XCircle className="w-4 h-4" /> Clear Saved Info
                  </button>
                )}
              </div>

              <div className="bg-[#1f2138] border border-white/10 rounded-xl p-6 text-white shadow-xl">
                {selectionMessage && (
                  <div className="fixed top-32 right-4 z-50 animate-slide-in sm:right-[calc(50%-384px+1rem)]">
                    <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium dangrek">{selectionMessage}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col space-y-4">
                  <div className="flex items-start gap-4">
                    <img
                      src={
                        form.game === 'mlbb' || form.game === 'mlbb_ph'
                          ? "https://play-lh.googleusercontent.com/M9_okpLdBz0unRHHeX7FcZxEPLZDIQNCGEBoql7MxgSitDL4wUy4iYGQxfvqYogexQ"
                          : "https://play-lh.googleusercontent.com/WWcssdzTZvx7Fc84lfMpVuyMXg83_PwrfpgSBd0IID_IuupsYVYJ34S9R2_5x57gHQ"
                      }
                      alt={form.game === 'mlbb' || form.game === 'mlbb_ph' ? "Mobile Legends" : "Free Fire"}
                      className="w-16 h-16 rounded-xl"
                    />
                    <div className="flex-1">
                      <h2 className="text-xl font-bold">
                        {form.game === 'mlbb' || form.game === 'mlbb_ph' ? 'Mobile Legends' : 'Free Fire'}
                      </h2>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-2">
                          <img
                            src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/48_-Protected_System-_Yellow-512-removebg-preview.png"
                            alt="Safety Guarantee"
                            className="w-5 h-5"
                          />
                          <span className="text-sm text-yellow-300">Safety Guarantees</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img
                            src="https://raw.githubusercontent.com/Cheagjihvg/feliex-assets/refs/heads/main/IMG_1820.PNG"
                            alt="Instant Delivery"
                            className="w-5 h-5"
                          />
                          <span className="text-sm text-yellow-300">Instant Delivery</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className={`grid ${(form.game === 'mlbb' || form.game === 'mlbb_ph') ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          {form.game === 'mlbb' || form.game === 'mlbb_ph' ? 'User ID' : 'Free Fire ID'}
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white-300 w-4 h-4" />
                          <input
                            type="number"
                            value={form.userId}
                            onChange={(e) => {
                              setForm(prev => ({ ...prev, userId: e.target.value, nickname: undefined }));
                              setValidationResult(null);
                              setFormErrors(prev => ({ ...prev, userId: undefined }));
                            }}
                            className="pl-9 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-[#F57F17] placeholder-[#F57F17] text-sm"
                            placeholder={`Enter your ${form.game === 'mlbb' || form.game === 'mlbb_ph' ? 'User ID' : 'Free Fire ID'}`}
                          />
                          {formErrors.userId && (
                            <p className="text-red-400 text-xs mt-1">{formErrors.userId}</p>
                          )}
                        </div>
                      </div>
                      {(form.game === 'mlbb' || form.game === 'mlbb_ph') && (
                        <div>
                          <label className="block text-sm font-medium mb-1">Server ID</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white-300 w-4 h-4" />
                            <input
                              type="number"
                              value={form.serverId}
                              onChange={(e) => {
                                setForm(prev => ({ ...prev, serverId: e.target.value, nickname: undefined }));
                                setValidationResult(null);
                                setFormErrors(prev => ({ ...prev, serverId: undefined }));
                              }}
                              className="pl-9 w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 text-[#F57F17] placeholder-[#F57F17] text-sm"
                              placeholder="Enter your Server ID"
                            />
                            {formErrors.serverId && (
                              <p className="text-red-400 text-xs mt-1">{formErrors.serverId}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {(form.game === 'mlbb' || form.game === 'mlbb_ph') && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={validateAccount}
                            disabled={!form.userId || !form.serverId || validating}
                           className="w-full max-w-[3000px] bg-[#F57F17] text-white px-4 py-2 rounded-lg hover:bg-[#F57F17] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm justify-center"
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

            {validationResult && 'status' in validationResult && validationResult.status === 'success' && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <span>{validationResult.data?.userName}</span>
              </div>
            )}

            {validationResult && 'status' in validationResult && validationResult.status === 'invalid' && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                <span>{validationResult.message || 'Invalid user ID or server ID'}</span>
              </div>
            )}

            {validationResult && 'error' in validationResult && validationResult.error && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                <span>{validationResult.message || 'Invalid Free Fire ID'}</span>
              </div>
            )}

            {validationResult && 'error' in validationResult && !validationResult.error && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <span>{validationResult.username}</span>
              </div>
            )}
          </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        Select Package
                      </h3>
                      {loading ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-white" />
                          <span className="ml-2 text-white">Loading products...</span>
                        </div>
                      ) : (
                        <ProductList
                          products={products}
                          selectedProduct={form.product}
                          onSelect={handleProductSelect}
                          game={form.game}
                        />
                      )}
                    </div>

                      {form.product && (
                      <div className="bg-white/10 rounded-lg p-4 border border-white/20">
                        <h4 className="text-sm font-medium mb-2 text-white">Order Summary</h4>
                        <div className="space-y-2 font-mono text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-[#F57F17]">ID:</span>
                            <span className="text-white">{form.userId}</span>
                          </div>
                          {form.game === 'mlbb' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[#F57F17]">SERVER ID:</span>
                              <span className="text-white">{form.serverId}</span>
                            </div>
                          )}
                          {form.game === 'freefire' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[#F57F17]">SERVER ID:</span>
                              <span className="text-white">0</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-[#F57F17]">ITEM:</span>
                            <span className="text-white">{form.product.code || form.product.diamonds || form.product.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#F57F17]">PRICE:</span>
                            <span className="text-white">${form.product.price.toFixed(2)} USD</span>
                          </div>
                        </div>
                      </div>
                    )}


    <div className="space-y-6">
      <div className="flex items-start gap-4 group relative">
        {/* Checkbox */}
        <div className="relative flex-shrink-0">
          <input
            type="checkbox"
            id="terms"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="appearance-none w-7 h-7 bg-gray-900 border-2 border-[#147A9C] rounded-lg focus:ring-2 focus:ring-[#1A9ED6]/50 focus:outline-none cursor-pointer transition-all duration-300 peer checked:border-[#1A9ED6] checked:bg-[#1A9ED6]/20 group-hover:border-[#4AB3E0] focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            aria-label="Accept Navi Store Terms and Conditions"
            aria-checked={termsAccepted}
          />
          <svg
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 text-[#1A9ED6] pointer-events-none transition-all duration-200 ${termsAccepted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Label */}
        <label
          htmlFor="terms"
          className="text-base text-white/95 leading-relaxed bg-gradient-to-r from-[#1A9ED6]/10 to-[#147A9C]/10 px-4 py-3 rounded-2xl transition-all duration-300 cursor-pointer hover:bg-gradient-to-r hover:from-[#1A9ED6]/20 hover:to-[#147A9C]/20 hover:shadow-lg hover:shadow-[#1A9ED6]/10 flex items-center gap-4 w-full dangrek"
        >
          <span className="flex-1">
            ខ្ញុំបានយល់ព្រមជាមួយលក្ខខណ្ឌរបស់ ETW Store
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                document.getElementById('terms-modal').classList.toggle('hidden');
              }}
              className="inline-flex items-center gap-2 text-[#1A9ED6] hover:text-[#4AB3E0] transition-all duration-300 group/link ml-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A9ED6] rounded"
            >
              <span className="text-sm font-medium group-hover/link:underline decoration-[#1A9ED6] decoration-2 underline-offset-4">
                View Terms & Conditions
              </span>
              <svg
                className="w-4 h-4 opacity-70 group-hover/link:opacity-100 transition-all duration-300"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M11 3a1 1 0 100 2h2.586l-6.693 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              </svg>
            </button>
          </span>
          <svg
            className="w-6 h-6 text-[#1A9ED6] flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </label>

        {/* Tooltip */}
        <div className="absolute -top-10 left-0 w-full opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none">
          <div className="bg-[#147A9C] text-white text-xs rounded-lg py-2 px-3 text-center dangrek relative shadow-lg shadow-[#1A9ED6]/20">
            សូមអានដោយប្រុងប្រយ័ត្នមុនពេលយល់ព្រម
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-[#147A9C]"></div>
          </div>
        </div>
    </div>
                    
                        <div className="sticky bottom-6 rounded-xl p-4 mt-8 bg-gradient-to-b from-transparent to-gray-900/50">
                          <button
                            type="submit"
                            disabled={
                              !form.product ||
                              paymentCooldown > 0 ||
                              ((form.game === 'mlbb' || form.game === 'mlbb_ph') && validationResult?.status !== 'success') ||
                              ((form.game === 'freefire' || form.game === 'freefire_th') && validationResult?.error) ||
                              !termsAccepted
                            }
                            className="w-full bg-gradient-to-r from-[#2AC1F8] to-[#1A9ED6] text-white py-3 px-6 rounded-lg hover:from-[#1A9ED6] hover:to-[#0F7FB2] transition-all duration-300 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-[#2AC1F8] disabled:hover:to-[#1A9ED6] hover:shadow-lg hover:shadow-[#2AC1F8]/20 transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                          >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-150%] group-hover/button:translate-x-[150%] transition-transform duration-700 ease-out pointer-events-none" />
                            {paymentCooldown > 0 ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin text-blue-300" />
                                <span className="relative z-10">សូមរង់ចាំ {paymentCooldown} វិនាទី</span>
                              </>
                            ) : (
                              <span className="relative z-10">បន្តទៅកាន់ការទូទាត់</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                </div>
              </div>
            </div>
          </main>
        )}

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
      </div>




<div className="relative w-full h-[90px] overflow-hidden">
  <svg
    width="100%"
    className="hero-waves absolute top-0 left-0 z-10"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    viewBox="0 24 150 28"
    preserveAspectRatio="none"
  >
    <defs>
      <path
        id="wave-path"
        d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
      ></path>
    </defs>
    <g className="wave1">
      <use xlinkHref="#wave-path" x="50" y="3" fill="rgba(245, 127, 23, .1)" />
    </g>
    <g className="wave2">
      <use xlinkHref="#wave-path" x="50" y="0" fill="rgba(245, 127, 23, .2)" />
    </g>
    <g className="wave3">
      <use xlinkHref="#wave-path" x="50" y="4" fill="#F57F17" />
    </g>
  </svg>
</div>

      
<footer className="relative text-white py-12 md:py-16 overflow-hidden" style={{ backgroundColor: '#F57F17' }}>
  <div className="container mx-auto px-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="space-y-8">
        <div>
          <img alt="logo" src={storeConfig.logoUrl} className="h-16 mb-4 rounded-full" />
          <p className="text-gray-300">
            Experience seamless online game top-up services at ETW , offering unbeatable deals on popular titles like Mobile Legends, Free Fire, and more. Enjoy fast, secure, and reliable transactions.
          </p>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
          <div className="space-y-2 text-gray-300">
            <p>For inquiries, please contact us via Telegram (Chat only)</p>
            <a
              href={storeConfig.supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Visit our support
            </a>
          </div>
        </div>
        {isResellerLoggedIn && (
          <button
            onClick={() => {
              localStorage.removeItem('jackstore_reseller_auth');
              localStorage.removeItem('jackstore_reseller_username');
              window.location.reload();
            }}
            className="flex items-center gap-2 bg-red-500/80 hover:bg-red-600/80 px-4 py-2 rounded-full transition-all duration-300"
          >
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        )}
      </div>
      <div className="space-y-8">
        <div>
          <h4 className="text-lg font-semibold mb-4">Connect With Us</h4>
          <div className="flex space-x-4 mb-6">
            <a
              href={storeConfig.fb}
              target="_blank"
              rel="noreferrer noopener"
              className="text-gray-300 hover:text-blue-400 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.04c-5.5 0-10 4.49-10 10.02c0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89c1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02"></path>
              </svg>
            </a>
            <a
              href=""
              target="_blank"
              rel="noreferrer noopener"
              className="text-gray-300 hover:text-pink-500 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"></path>
              </svg>
            </a>
            <a
              href=""
              target="_blank"
              rel="noreferrer noopener"
              className="text-gray-300 hover:text-black transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.321 5.562a5 5 0 0 1-.443-.258a6.2 6.2 0 0 1-1.137-.966c-.849-.971-1.166-1.956-1.282-2.645h.004c-.097-.573-.057-.943-.05-.943h-3.865v14.943q.002.3-.008.595l-.004.073q0 .016-.003.033v.009a3.28 3.28 0 0 1-1.65 2.604a3.2 3.2 0 0 1-1.6.422c-1.8 0-3.26-1.468-3.26-3.281s1.46-3.282 3.26-3.282c.341 0 .68.054 1.004.16l.005-3.936a7.18 7.18 0 0 0-5.532 1.62a7.6 7.6 0 0 0-1.655 2.04c-.163.281-.779 1.412-.853 3.246c-.047 1.04.266 2.12.415 2.565v.01c.093.262.457 1.158 1.049 1.913a7.9 7.9 0 0 0 1.674 1.58v-.01l.009.01c1.87 1.27 3.945 1.187 3.945 1.187c.359-.015 1.562 0 2.928-.647c1.515-.718 2.377-1.787 2.377-1.787a7.4 7.4 0 0 0 1.296-2.153c.35-.92.466-2.022.466-2.462V8.273c.047.028.672.441.672.441s.9.577 2.303.952c1.006.267 2.363.324 2.363.324V6.153c-.475.052-1.44-.098-2.429-.59"></path>
              </svg>
            </a>
            <a
              href={storeConfig.channelUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-gray-300 hover:text-blue-400 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2m4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19c-.14.75-.42 1-.68 1.03c-.58.05-1.02-.38-1.58-.75c-.88-.58-1.38-.94-2.23-1.5c-.94-.65-.33-1.01.21-1.59c.14-.15 2.71-2.48 2.76-2.69c.01-.05.01-.1-.02-.14c-.04-.05-.1-.03-.14-.02c-.06.02-1.49.95-4.22 2.79c-.4.27-.76.41-1.08.4c-.36-.01-1.04-.20-1.55-.37c-.63-.2-1.13-.31-1.09-.66c.02-.18.27-.36.74-.55c2.92-1.27 4.86-2.11 5.83-2.51c2.78-1.16 3.35-1.36 3.73-1.36c.08 0 .27.02.39.12c.1.08.13.19.12.27"></path>
              </svg>
            </a>
          </div>
          <h4 className="text-lg font-semibold mb-2">Legal</h4>
          <button
            onClick={() => document.getElementById('terms-modal').classList.remove('hidden')}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            View Terms & Conditions
          </button>
        </div>
        <div>
          <h4 className="text-lg font-semibold mb-2">We Accept:</h4>
          <div className="flex items-center space-x-4">
            <img
              alt="KHQR"
              src="https://raw.githubusercontent.com/Cheagjihvg/svg/aee1480802998cec595324cb335444a14b4a48ea/khqr.svg"
              className="h-8"
            />
          </div>
        </div>
      </div>
    </div>
    <div className="border-t border-gray-600 pt-6 mt-6">
      <div className="text-center text-gray-400 text-sm">
        <p>{storeConfig.footer.copyright}</p>
        <p className="mt-1">
          Developed by:{" "}
          <a
            href={storeConfig.fb}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            ETW
          </a>
        </p>
      </div>
    </div>
  </div>
</footer>
<div id="terms-modal" className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto dangrek">
    <h2 className="text-xl md:text-2xl font-bold text-white mb-4 concert-one-regular">Terms & Conditions</h2>
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
      className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-full transition-all duration-300 dangrek"
    >
      Close
    </button>
  </div>
</div>

    </div>
  );
}

export default App;
