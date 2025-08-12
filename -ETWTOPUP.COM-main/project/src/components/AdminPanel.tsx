import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { GameProduct, Reseller, ResellerPrice } from '../types';
import { Loader2, Plus, Trash, Edit, Save, X, LogOut, RefreshCw, Users, ShoppingBag, Settings, DollarSign, Tag, Home, BarChart2 } from 'lucide-react';
import { ResellerManager } from './ResellerManager';
import { ResellerPriceManager } from './ResellerPriceManager';
import { PromoCodeManager } from './PromoCodeManager';
import { Dashboard } from './Dashboard';

interface AdminPanelProps {
  onLogout: () => void;
}

export function AdminPanel({ onLogout }: AdminPanelProps) {
  const [mlbbProducts, setMlbbProducts] = useState<GameProduct[]>([]);
  const [ffProducts, setFfProducts] = useState<GameProduct[]>([]);
  const [mlbbPhProducts, setMlbbPhProducts] = useState<GameProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mlbb' | 'mlbb_ph' | 'freefire' | 'resellers' | 'prices' | 'promos'>('dashboard');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [refreshing, setRefreshing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [newProduct, setNewProduct] = useState<Partial<GameProduct>>({
    name: '',
    diamonds: undefined,
    price: 0,
    currency: 'USD',
    type: 'diamonds',
    game: 'mlbb',
    image: '',
    code: '',
    tagname: '', // Added tagname
  });
  
  const [editingProduct, setEditingProduct] = useState<GameProduct | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: mlbbData, error: mlbbError },
        { data: mlbbPhData, error: mlbbPhError },
        { data: ffData, error: ffError }
      ] = await Promise.all([
        supabase.from('mlbb_products').select('*').order('id', { ascending: true }),
        supabase.from('mlbb_ph_products').select('*').order('id', { ascending: true }),
        supabase.from('freefire_products').select('*').order('id', { ascending: true })
      ]);

      if (mlbbError) throw mlbbError;
      if (mlbbPhError) throw mlbbPhError;
      if (ffError) throw ffError;

      setMlbbProducts(mlbbData.map(transformProduct('mlbb')));
      setMlbbPhProducts(mlbbPhData.map(transformProduct('mlbb_ph')));
      setFfProducts(ffData.map(transformProduct('freefire')));
    } catch (error) {
      console.error('Error fetching products:', error);
      alert('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const transformProduct = (game: string) => (product: any): GameProduct => ({
    id: product.id,
    name: product.name,
    diamonds: product.diamonds || undefined,
    price: product.price,
    currency: product.currency,
    type: product.type as 'diamonds' | 'subscription' | 'special',
    game: game as 'mlbb' | 'mlbb_ph' | 'freefire',
    image: product.image || undefined,
    code: product.code || undefined,
    tagname: product.tagname || undefined, // Added tagname
  });

  useEffect(() => {
    if (activeTab !== 'dashboard') {
      fetchProducts();
    }
  }, [fetchProducts, activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeTab !== 'dashboard') {
      await fetchProducts();
    }
    setRefreshing(false);
  };

  const validateForm = (product: Partial<GameProduct>): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!product.name?.trim()) errors.name = 'Name is required';
    if (product.type === 'diamonds' && !product.diamonds) errors.diamonds = 'Diamonds amount is required';
    if (product.price === undefined || product.price <= 0) errors.price = 'Price must be greater than 0';
    if (!product.currency?.trim()) errors.currency = 'Currency is required';
    if (!product.type) errors.type = 'Type is required';
    if (!product.image?.trim()) errors.image = 'Image URL is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
    product: Partial<GameProduct> = newProduct
  ) => {
    const { name, value, type } = e.target;
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
    
    const updateValue = (prev: any) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : undefined) : value
    });

    if (product === newProduct) {
      setNewProduct(updateValue);
    } else if (editingProduct) {
      setEditingProduct(updateValue);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(newProduct)) return;
    
    setLoading(true);
    try {
      const tableName = newProduct.game === 'mlbb' ? 'mlbb_products' 
                     : newProduct.game === 'mlbb_ph' ? 'mlbb_ph_products' 
                     : 'freefire_products';
      
      const productData = {
        name: newProduct.name,
        diamonds: newProduct.diamonds || null,
        price: newProduct.price,
        currency: newProduct.currency,
        type: newProduct.type,
        image: newProduct.image || null,
        tagname: newProduct.tagname || null, // Added tagname
        ...((newProduct.game === 'mlbb' || newProduct.game === 'mlbb_ph') && { code: newProduct.code || null })
      };
      
      const { error } = await supabase.from(tableName).insert([productData]);
      if (error) throw error;
      
      setNewProduct({
        name: '',
        diamonds: undefined,
        price: 0,
        currency: 'USD',
        type: 'diamonds',
        game: newProduct.game,
        image: '',
        code: '',
        tagname: '', // Reset tagname
      });
      
      setShowAddForm(false);
      await fetchProducts();
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !validateForm(editingProduct)) return;
    
    setLoading(true);
    try {
      const tableName = editingProduct.game === 'mlbb' ? 'mlbb_products' 
                     : editingProduct.game === 'mlbb_ph' ? 'mlbb_ph_products' 
                     : 'freefire_products';
      
      const productData = {
        name: editingProduct.name,
        diamonds: editingProduct.diamonds || null,
        price: editingProduct.price,
        currency: editingProduct.currency,
        type: editingProduct.type,
        image: editingProduct.image || null,
        tagname: editingProduct.tagname || null, // Added tagname
        updated_at: new Date().toISOString(),
        ...((editingProduct.game === 'mlbb' || editingProduct.game === 'mlbb_ph') && { code: editingProduct.code || null })
      };
      
      const { error } = await supabase
        .from(tableName)
        .update(productData)
        .eq('id', editingProduct.id);
      
      if (error) throw error;
      
      setEditingProduct(null);
      setShowEditForm(false);
      await fetchProducts();
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (product: GameProduct) => {
    if (!confirm(`Are you sure you want to delete ${product.name}?`)) return;
    
    setLoading(true);
    try {
      const tableName = product.game === 'mlbb' ? 'mlbb_products' 
                       : product.game === 'mlbb_ph' ? 'mlbb_ph_products' 
                       : 'freefire_products';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', product.id);
      
      if (error) throw error;
      await fetchProducts();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditProduct = (product: GameProduct) => {
    setEditingProduct(product);
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setShowEditForm(false);
    setFormErrors({});
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setFormErrors({});
    setNewProduct({
      name: '',
      diamonds: undefined,
      price: 0,
      currency: 'USD',
      type: 'diamonds',
      game: activeTab === 'resellers' || activeTab === 'prices' || activeTab === 'promos' ? 'mlbb' : activeTab,
      image: '',
      code: '',
      tagname: '', // Reset tagname
    });
  };

  const getCurrentProducts = () => {
    switch (activeTab) {
      case 'mlbb': return mlbbProducts;
      case 'mlbb_ph': return mlbbPhProducts;
      case 'freefire': return ffProducts;
      default: return [];
    }
  };

  const getColumnCount = () => {
    return activeTab === 'freefire' ? 7 : 8; // Adjusted for tagname column
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="md:hidden fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-md bg-white shadow-md"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white/90 backdrop-blur">
          <div className="flex flex-col h-full p-4 pt-20">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" /> },
              { id: 'mlbb', label: 'MLBB', icon: <ShoppingBag className="w-5 h-5" /> },
              { id: 'mlbb_ph', label: 'MLBB PH', icon: <ShoppingBag className="w-5 h-5" /> },
              { id: 'freefire', label: 'Free Fire', icon: <ShoppingBag className="w-5 h-5" /> },
              { id: 'resellers', label: 'Resellers', icon: <Users className="w-5 h-5" /> },
              { id: 'prices', label: 'Prices', icon: <DollarSign className="w-5 h-5" /> },
              { id: 'promos', label: 'Promos', icon: <Tag className="w-5 h-5" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setIsMobileMenuOpen(false);
                }}
                className={`py-3 px-4 text-left rounded-md flex items-center gap-3 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <div className="mt-auto pt-4 border-t border-gray-200">
              <button
                onClick={onLogout}
                className="w-full py-3 px-4 text-left rounded-md flex items-center gap-3 text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Admin Panel</h1>
            <span className="ml-2 md:ml-4 px-2 py-0.5 md:px-3 md:py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              Logged In
            </span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
              <span className="text-sm">Refresh</span>
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="hidden md:block border-b border-gray-200">
            <nav className="flex -mb-px">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 className="w-4 h-4" /> },
                { id: 'mlbb', label: 'Mobile Legends', icon: <ShoppingBag className="w-4 h-4" /> },
                { id: 'mlbb_ph', label: 'Mobile Legends PH', icon: <ShoppingBag className="w-4 h-4" /> },
                { id: 'freefire', label: 'Free Fire', icon: <ShoppingBag className="w-4 h-4" /> },
                { id: 'resellers', label: 'Resellers', icon: <Users className="w-4 h-4" /> },
                { id: 'prices', label: 'Reseller Prices', icon: <DollarSign className="w-4 h-4" /> },
                { id: 'promos', label: 'Promo Codes', icon: <Tag className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (['mlbb', 'mlbb_ph', 'freefire'].includes(tab.id)) {
                      setNewProduct(prev => ({ ...prev, game: tab.id as any }));
                    }
                    setShowAddForm(false);
                    setShowEditForm(false);
                  }}
                  className={`py-4 px-4 text-center border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="md:hidden p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {activeTab === 'dashboard' && <BarChart2 className="w-5 h-5 text-blue-600" />}
              {activeTab === 'mlbb' && <ShoppingBag className="w-5 h-5 text-blue-600" />}
              {activeTab === 'mlbb_ph' && <ShoppingBag className="w-5 h-5 text-blue-600" />}
              {activeTab === 'freefire' && <ShoppingBag className="w-5 h-5 text-blue-600" />}
              {activeTab === 'resellers' && <Users className="w-5 h-5 text-blue-600" />}
              {activeTab === 'prices' && <DollarSign className="w-5 h-5 text-blue-600" />}
              {activeTab === 'promos' && <Tag className="w-5 h-5 text-blue-600" />}
              <h2 className="text-lg font-semibold text-gray-900">
                {activeTab === 'dashboard' ? 'Dashboard' 
                 : activeTab === 'mlbb' ? 'Mobile Legends' 
                 : activeTab === 'mlbb_ph' ? 'Mobile Legends PH' 
                 : activeTab === 'freefire' ? 'Free Fire' 
                 : activeTab === 'resellers' ? 'Resellers'
                 : activeTab === 'prices' ? 'Reseller Prices'
                 : 'Promo Codes'}
              </h2>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === 'dashboard' ? (
              <Dashboard />
            ) : activeTab === 'resellers' ? (
              <ResellerManager />
            ) : activeTab === 'prices' ? (
              <ResellerPriceManager 
                mlbbProducts={mlbbProducts}
                ffProducts={ffProducts}
                mlbbPhProducts={mlbbPhProducts}
              />
            ) : activeTab === 'promos' ? (
              <PromoCodeManager />
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                  <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                    {activeTab === 'mlbb' ? 'Mobile Legends Products' 
                     : activeTab === 'mlbb_ph' ? 'Mobile Legends PH Products' 
                     : 'Free Fire Products'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddForm(true);
                      setShowEditForm(false);
                      setNewProduct(prev => ({ ...prev, game: activeTab }));
                    }}
                    className="flex items-center justify-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors w-full md:w-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Add Product
                  </button>
                </div>

                {loading && !showAddForm && !showEditForm ? (
                  <div className="flex justify-center items-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-600">Loading products...</span>
                  </div>
                ) : (
                  <>
                    {(showAddForm || showEditForm) && (
                      <div className="bg-gray-50 p-4 md:p-6 rounded-lg mb-6 border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-md md:text-lg font-medium text-gray-900">
                            {showAddForm ? 'Add New Product' : 'Edit Product'}
                          </h3>
                          <button onClick={showAddForm ? cancelAdd : cancelEdit} className="text-gray-500 hover:text-gray-700">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <form onSubmit={showAddForm ? handleAddProduct : handleEditProduct} className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <label htmlFor={showAddForm ? "name" : "edit-name"} className="block text-sm font-medium text-gray-700 mb-1">
                                Product Name
                              </label>
                              <input
                                type="text"
                                id={showAddForm ? "name" : "edit-name"}
                                name="name"
                                value={showAddForm ? newProduct.name : (editingProduct?.name || '')}
                                onChange={showAddForm ? handleInputChange : (e) => handleInputChange(e, editingProduct || undefined)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              />
                              {formErrors.name && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                              )}
                            </div>
                            <div>
                              <label htmlFor={showAddForm ? "type" : "edit-type"} className="block text-sm font-medium text-gray-700 mb-1">
                                Product Type
                              </label>
                              <select
                                id={showAddForm ? "type" : "edit-type"}
                                name="type"
                                value={showAddForm ? newProduct.type : (editingProduct?.type || '')}
                                onChange={showAddForm ? handleInputChange : (e) => handleInputChange(e, editingProduct || undefined)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              >
                                <option value="diamonds">Diamonds</option>
                                <option value="subscription">Subscription</option>
                                <option value="special">Special</option>
                              </select>
                              {formErrors.type && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.type}</p>
                              )}
                            </div>
                            <div>
                              <label htmlFor={showAddForm ? "diamonds" : "edit-diamonds"} className="block text-sm font-medium text-gray-700 mb-1">
                                Diamonds Amount
                              </label>
                              <input
                                type="number"
                                id={showAddForm ? "diamonds" : "edit-diamonds"}
                                name="diamonds"
                                value={showAddForm ? (newProduct.diamonds || '') : (editingProduct?.diamonds || '')}
                                onChange={showAddForm ? handleInputChange : (e) => handleInputChange(e, editingProduct || undefined)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              />
                              {formErrors.diamonds && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.diamonds}</p>
                              )}
                            </div>
                            <div>
                              <label htmlFor={showAddForm ? "price" : "edit-price"} className="block text-sm font-medium text-gray-700 mb-1">
                                Price
                              </label>
                              <input
                                type="number"
                                id={showAddForm ? "price" : "edit-price"}
                                name="price"
                                step="0.01"
                                value={showAddForm ? (newProduct.price || '') : (editingProduct?.price || '')}
                                onChange={showAddForm ? handleInputChange : (e) => handleInputChange(e, editingProduct || undefined)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              />
                              {formErrors.price && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>
                              )}
                            </div>
                            <div>
                              <label htmlFor={showAddForm ? "currency" : "edit-currency"} className="block text-sm font-medium text-gray-700 mb-1">
                                Currency
                              </label>
                              <input
                                type="text"
                                id={showAddForm ? "currency" : "edit-currency"}
                                name="currency"
                                value={showAddForm ? newProduct.currency : (editingProduct?.currency || '')}
                                onChange={showAddForm ? handleInputChange : (e) => handleInputChange(e, editingProduct || undefined)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              />
                              {formErrors.currency && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.currency}</p>
                              )}
                            </div>
                            <div>
                              <label htmlFor={showAddForm ? "image" : "edit-image"} className="block text-sm font-medium text-gray-700 mb-1">
                                Image URL
                              </label>
                              <input
                                type="text"
                                id={showAddForm ? "image" : "edit-image"}
                                name="image"
                                value={showAddForm ? (newProduct.image || '') : (editingProduct?.image || '')}
                                onChange={showAddForm ? handleInputChange : (e) => handleInputChange(e, editingProduct || undefined)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                              />
                              {formErrors.image && (
                                <p className="text-red-500 text-xs mt-1">{formErrors.image}</p>
                              )}
                            </div>
                            {(activeTab === 'mlbb' || activeTab === 'mlbb_ph') && (
                              <div>
                                <label htmlFor={showAddForm ? "code" : "edit-code"} className="block text-sm font-medium text-gray-700 mb-1">
                                  Product Code
                                </label>
                                <input
                                  type="text"
                                  id={showAddForm ? "code" : "edit-code"}
                                  name="code"
                                  value={showAddForm ? (newProduct.code || '') : (editingProduct?.code || '')}
                                  onChange={showAddForm ? handleInputChange : (e) => handleInputChange(e, editingProduct || undefined)}
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                />
                              </div>
                            )}
                            <div>
                              <label htmlFor={showAddForm ? "tagname" : "edit-tagname"} className="block text-sm font-medium text-gray-700 mb-1">
                                Tag Name (Optional)
                              </label>
                              <input
                                type="text"
                                id={showAddForm ? "tagname" : "edit-tagname"}
                                name="tagname"
                                value={showAddForm ? (newProduct.tagname || '') : (editingProduct?.tagname || '')}
                                onChange={showAddForm ? handleInputChange : (e) => handleInputChange(e, editingProduct || undefined)}
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                placeholder="e.g., Best Value, Limited Offer"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={showAddForm ? cancelAdd : cancelEdit}
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
                                  {showAddForm ? 'Save Product' : 'Update Product'}
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ID
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Diamonds
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Price
                            </th>
                            {(activeTab === 'mlbb' || activeTab === 'mlbb_ph') && (
                              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Code
                              </th>
                            )}
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tag Name
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getCurrentProducts().map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50">
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.id}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  {product.image && (
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="w-8 h-8 rounded-md mr-2 object-cover"
                                    />
                                  )}
                                  <div className="truncate max-w-[120px] md:max-w-none">
                                    <div className="text-sm font-medium text-gray-900 truncate">{product.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  product.type === 'diamonds'
                                    ? 'bg-blue-100 text-blue-800'
                                    : product.type === 'subscription'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}>
                                  {product.type}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.diamonds || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                {product.currency} {product.price.toFixed(2)}
                              </td>
                              {(activeTab === 'mlbb' || activeTab === 'mlbb_ph') && (
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {product.code || '-'}
                                </td>
                              )}
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.tagname || '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => startEditProduct(product)}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteProduct(product)}
                                    className="text-red-600 hover:text-red-900"
                                  >
                                    <Trash className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {getCurrentProducts().length === 0 && !loading && (
                            <tr>
                              <td colSpan={getColumnCount()} className="px-4 py-4 text-center text-sm text-gray-500">
                                No products found. Add some products to get started.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
