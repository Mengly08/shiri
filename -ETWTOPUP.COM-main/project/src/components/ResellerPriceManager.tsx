import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GameProduct, ResellerPrice } from '../types';
import { Loader2, Plus, Trash, Edit, Save, X, RefreshCw, AlertCircle, DollarSign } from 'lucide-react';

interface ResellerPriceManagerProps {
  mlbbProducts: GameProduct[];
  ffProducts: GameProduct[];
}

export function ResellerPriceManager({ mlbbProducts, ffProducts }: ResellerPriceManagerProps) {
  const [resellerPrices, setResellerPrices] = useState<ResellerPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGame, setActiveGame] = useState<'mlbb' | 'freefire'>('mlbb');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New price form state
  const [newPrice, setNewPrice] = useState<Partial<ResellerPrice>>({
    product_id: 0,
    game: 'mlbb',
    price: 0
  });
  
  // Editing price state
  const [editingPrice, setEditingPrice] = useState<ResellerPrice | null>(null);

  const fetchResellerPrices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('reseller_prices')
        .select('*')
        .eq('game', activeGame)
        .order('product_id', { ascending: true });
      
      if (error) {
        console.error('Error fetching reseller prices:', error);
        if (error.code === '42501') {
          setError('Permission denied. Please contact the administrator to set up proper permissions for the reseller_prices table.');
        } else {
          setError('Failed to load reseller prices. Please try again.');
        }
        setResellerPrices([]);
      } else {
        setResellerPrices(data || []);
      }
    } catch (error) {
      console.error('Error fetching reseller prices:', error);
      setError('An unexpected error occurred. Please try again later.');
      setResellerPrices([]);
    } finally {
      setLoading(false);
    }
  }, [activeGame]);

  useEffect(() => {
    fetchResellerPrices();
  }, [fetchResellerPrices, activeGame]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchResellerPrices();
    setRefreshing(false);
  };

  const validateForm = (price: Partial<ResellerPrice>): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!price.product_id) {
      errors.product_id = 'Product is required';
    }
    
    if (price.price === undefined || price.price <= 0) {
      errors.price = 'Price must be greater than 0';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    price: Partial<ResellerPrice> = newPrice
  ) => {
    const { name, value, type } = e.target;
    
    // Clear the error for this field
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
    
    // Handle numeric inputs
    if (name === 'price' || name === 'product_id') {
      const numValue = type === 'number' ? parseFloat(value) : parseInt(value, 10);
      
      if (price === newPrice) {
        setNewPrice(prev => ({
          ...prev,
          [name]: numValue
        }));
      } else if (editingPrice) {
        setEditingPrice(prev => ({
          ...prev!,
          [name]: numValue
        }));
      }
    } else {
      // Handle other inputs
      if (price === newPrice) {
        setNewPrice(prev => ({
          ...prev,
          [name]: value
        }));
      } else if (editingPrice) {
        setEditingPrice(prev => ({
          ...prev!,
          [name]: value
        }));
      }
    }
  };

  const handleAddPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(newPrice)) {
      return;
    }
    
    setLoading(true);
    try {
      // Check if price already exists for this product and game
      const { data: existingPrice, error: checkError } = await supabase
        .from('reseller_prices')
        .select('id')
        .eq('product_id', newPrice.product_id)
        .eq('game', newPrice.game)
        .limit(1);
      
      if (checkError) {
        if (checkError.code === '42501') {
          setError('Permission denied. Please contact the administrator to set up proper permissions.');
          setLoading(false);
          return;
        } else {
          throw checkError;
        }
      }
      
      if (existingPrice && existingPrice.length > 0) {
        setFormErrors({ product_id: 'Price already exists for this product' });
        setLoading(false);
        return;
      }
      
      // Insert the new price
      const { error } = await supabase
        .from('reseller_prices')
        .insert([{
          product_id: newPrice.product_id,
          game: newPrice.game,
          price: newPrice.price
        }]);
      
      if (error) {
        if (error.code === '42501') {
          setError('Permission denied. Please contact the administrator to set up proper permissions.');
        } else {
          throw error;
        }
      } else {
        // Reset the form and refresh prices
        setNewPrice({
          product_id: 0,
          game: activeGame,
          price: 0
        });
        
        setShowAddForm(false);
        await fetchResellerPrices();
        
        alert('Reseller price added successfully!');
      }
    } catch (error) {
      console.error('Error adding reseller price:', error);
      alert('Failed to add reseller price. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPrice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPrice || !validateForm(editingPrice)) {
      return;
    }
    
    setLoading(true);
    try {
      // Update the price
      const { error } = await supabase
        .from('reseller_prices')
        .update({
          price: editingPrice.price,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPrice.id);
      
      if (error) {
        if (error.code === '42501') {
          setError('Permission denied. Please contact the administrator to set up proper permissions.');
        } else {
          throw error;
        }
      } else {
        // Reset the form and refresh prices
        setEditingPrice(null);
        setShowEditForm(false);
        await fetchResellerPrices();
        
        alert('Reseller price updated successfully!');
      }
    } catch (error) {
      console.error('Error updating reseller price:', error);
      alert('Failed to update reseller price. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePrice = async (price: ResellerPrice) => {
    if (!confirm(`Are you sure you want to delete this reseller price?`)) {
      return;
    }
    
    setLoading(true);
    try {
      // Delete the price
      const { error } = await supabase
        .from('reseller_prices')
        .delete()
        .eq('id', price.id);
      
      if (error) {
        if (error.code === '42501') {
          setError('Permission denied. Please contact the administrator to set up proper permissions.');
        } else {
          throw error;
        }
      } else {
        // Refresh prices
        await fetchResellerPrices();
        
        alert('Reseller price deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting reseller price:', error);
      alert('Failed to delete reseller price. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditPrice = (price: ResellerPrice) => {
    setEditingPrice(price);
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingPrice(null);
    setShowEditForm(false);
    setFormErrors({});
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setFormErrors({});
    setNewPrice({
      product_id: 0,
      game: activeGame,
      price: 0
    });
  };

  // Find product name by ID
  const getProductName = (productId: number): string => {
    const products = activeGame === 'mlbb' ? mlbbProducts : ffProducts;
    const product = products.find(p => p.id === productId);
    return product ? product.name : `Product #${productId}`;
  };

  // Get product details for display
  const getProductDetails = (productId: number): { name: string; diamonds?: number; type: string } => {
    const products = activeGame === 'mlbb' ? mlbbProducts : ffProducts;
    const product = products.find(p => p.id === productId);
    
    if (!product) {
      return { name: `Product #${productId}`, type: 'unknown' };
    }
    
    return {
      name: product.name,
      diamonds: product.diamonds,
      type: product.type
    };
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Database Permission Error</h3>
        <p className="text-red-700 mb-4">{error}</p>
        <p className="text-sm text-gray-600 mb-4">
          This is likely due to missing Row Level Security (RLS) policies in your Supabase database.
          Please contact the administrator to set up the proper permissions.
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Reseller Price Management</h2>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {refreshing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <RefreshCw className="w-5 h-5" />
            )}
            <span className="text-sm">Refresh</span>
          </button>
          <button
            onClick={() => {
              setShowAddForm(true);
              setShowEditForm(false);
              setNewPrice(prev => ({ ...prev, game: activeGame }));
            }}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Price
          </button>
        </div>
      </div>

      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveGame('mlbb')}
          className={`px-4 py-2 rounded-md ${
            activeGame === 'mlbb'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Mobile Legends
        </button>
        <button
          onClick={() => setActiveGame('freefire')}
          className={`px-4 py-2 rounded-md ${
            activeGame === 'freefire'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Free Fire
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add New Reseller Price</h3>
            <button
              onClick={cancelAdd}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddPrice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="product_id" className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <select
                  id="product_id"
                  name="product_id"
                  value={newPrice.product_id || ''}
                  onChange={(e) => handleInputChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="">Select a product</option>
                  {(activeGame === 'mlbb' ? mlbbProducts : ffProducts).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} {product.diamonds ? `(${product.diamonds} Diamonds)` : ''}
                    </option>
                  ))}
                </select>
                {formErrors.product_id && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.product_id}</p>
                )}
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Reseller Price (USD)
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  step="0.01"
                  value={newPrice.price || ''}
                  onChange={(e) => handleInputChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {formErrors.price && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelAdd}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Price
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditForm && editingPrice && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Reseller Price</h3>
            <button
              onClick={cancelEdit}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleEditPrice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product
                </label>
                <div className="w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-100 text-gray-700">
                  {getProductName(editingPrice.product_id)}
                </div>
              </div>
              <div>
                <label htmlFor="edit-price" className="block text-sm font-medium text-gray-700 mb-1">
                  Reseller Price (USD)
                </label>
                <input
                  type="number"
                  id="edit-price"
                  name="price"
                  step="0.01"
                  value={editingPrice.price || ''}
                  onChange={(e) => handleInputChange(e, editingPrice)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {formErrors.price && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Update Price
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading && !showAddForm && !showEditForm ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading reseller prices...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Regular Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reseller Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit Margin
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {resellerPrices.map((price) => {
                const products = activeGame === 'mlbb' ? mlbbProducts : ffProducts;
                const product = products.find(p => p.id === price.product_id);
                const productDetails = getProductDetails(price.product_id);
                const regularPrice = product?.price || 0;
                const margin = regularPrice > 0 ? ((regularPrice - price.price) / regularPrice * 100).toFixed(1) : '0';
                
                return (
                  <tr key={price.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{productDetails.name}</div>
                      {productDetails.diamonds && (
                        <div className="text-xs text-gray-500">{productDetails.diamonds} Diamonds</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        productDetails.type === 'diamonds'
                          ? 'bg-blue-100 text-blue-800'
                          : productDetails.type === 'subscription'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {productDetails.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${regularPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${price.price.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        parseFloat(margin) > 15
                          ? 'bg-green-100 text-green-800'
                          : parseFloat(margin) > 5
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {margin}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEditPrice(price)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeletePrice(price)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {resellerPrices.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No reseller prices found. Add some prices to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}