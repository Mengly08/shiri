import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, Plus, Trash, Edit, Save, X, RefreshCw, AlertCircle } from 'lucide-react';

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number;
  used_count: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function PromoCodeManager() {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New promo code form state
  const [newPromoCode, setNewPromoCode] = useState<Partial<PromoCode>>({
    code: '',
    discount_percent: 10,
    max_uses: 0,
    active: true,
    expires_at: null
  });
  
  // Editing promo code state
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const fetchPromoCodes = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching promo codes:', error);
        if (error.code === '42501') {
          setError('Permission denied. Please contact the administrator to set up proper permissions.');
        } else {
          setError('Failed to load promo codes. Please try again.');
        }
        setPromoCodes([]);
      } else {
        setPromoCodes(data || []);
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      setError('An unexpected error occurred. Please try again later.');
      setPromoCodes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPromoCodes();
    setRefreshing(false);
  };

  const validateForm = (promoCode: Partial<PromoCode>): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!promoCode.code?.trim()) {
      errors.code = 'Code is required';
    }
    
    if (!promoCode.discount_percent || promoCode.discount_percent <= 0 || promoCode.discount_percent > 100) {
      errors.discount_percent = 'Discount must be between 1 and 100';
    }
    
    if (promoCode.max_uses !== undefined && promoCode.max_uses < 0) {
      errors.max_uses = 'Maximum uses cannot be negative';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    promoCode: Partial<PromoCode> = newPromoCode
  ) => {
    const { name, value, type } = e.target;
    
    // Clear the error for this field
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
    
    // Handle different input types
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (promoCode === newPromoCode) {
        setNewPromoCode(prev => ({ ...prev, [name]: checked }));
      } else if (editingPromoCode) {
        setEditingPromoCode(prev => ({ ...prev!, [name]: checked }));
      }
    } else if (type === 'number') {
      const numValue = value === '' ? 0 : parseFloat(value);
      if (promoCode === newPromoCode) {
        setNewPromoCode(prev => ({ ...prev, [name]: numValue }));
      } else if (editingPromoCode) {
        setEditingPromoCode(prev => ({ ...prev!, [name]: numValue }));
      }
    } else if (type === 'datetime-local') {
      const dateValue = value ? new Date(value).toISOString() : null;
      if (promoCode === newPromoCode) {
        setNewPromoCode(prev => ({ ...prev, [name]: dateValue }));
      } else if (editingPromoCode) {
        setEditingPromoCode(prev => ({ ...prev!, [name]: dateValue }));
      }
    } else {
      if (promoCode === newPromoCode) {
        setNewPromoCode(prev => ({ ...prev, [name]: value }));
      } else if (editingPromoCode) {
        setEditingPromoCode(prev => ({ ...prev!, [name]: value }));
      }
    }
  };

  const handleAddPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(newPromoCode)) {
      return;
    }
    
    setLoading(true);
    try {
      // Check if code already exists
      const { data: existingCode, error: checkError } = await supabase
        .from('promo_codes')
        .select('code')
        .eq('code', newPromoCode.code?.toUpperCase())
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (existingCode && existingCode.length > 0) {
        setFormErrors({ code: 'Promo code already exists' });
        setLoading(false);
        return;
      }
      
      // Insert the new promo code
      const { error } = await supabase
        .from('promo_codes')
        .insert([{
          ...newPromoCode,
          code: newPromoCode.code?.toUpperCase(),
          used_count: 0
        }]);
      
      if (error) throw error;
      
      // Reset form and refresh list
      setNewPromoCode({
        code: '',
        discount_percent: 10,
        max_uses: 0,
        active: true,
        expires_at: null
      });
      
      setShowAddForm(false);
      await fetchPromoCodes();
      
      alert('Promo code added successfully!');
    } catch (error) {
      console.error('Error adding promo code:', error);
      alert('Failed to add promo code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingPromoCode || !validateForm(editingPromoCode)) {
      return;
    }
    
    setLoading(true);
    try {
      // Check if code already exists (excluding current code)
      const { data: existingCode, error: checkError } = await supabase
        .from('promo_codes')
        .select('code')
        .eq('code', editingPromoCode.code.toUpperCase())
        .neq('id', editingPromoCode.id)
        .limit(1);
      
      if (checkError) throw checkError;
      
      if (existingCode && existingCode.length > 0) {
        setFormErrors({ code: 'Promo code already exists' });
        setLoading(false);
        return;
      }
      
      // Update the promo code
      const { error } = await supabase
        .from('promo_codes')
        .update({
          code: editingPromoCode.code.toUpperCase(),
          discount_percent: editingPromoCode.discount_percent,
          max_uses: editingPromoCode.max_uses,
          active: editingPromoCode.active,
          expires_at: editingPromoCode.expires_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingPromoCode.id);
      
      if (error) throw error;
      
      // Reset form and refresh list
      setEditingPromoCode(null);
      setShowEditForm(false);
      await fetchPromoCodes();
      
      alert('Promo code updated successfully!');
    } catch (error) {
      console.error('Error updating promo code:', error);
      alert('Failed to update promo code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromoCode = async (promoCode: PromoCode) => {
    if (!confirm(`Are you sure you want to delete the promo code ${promoCode.code}?`)) {
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('promo_codes')
        .delete()
        .eq('id', promoCode.id);
      
      if (error) throw error;
      
      await fetchPromoCodes();
      alert('Promo code deleted successfully!');
    } catch (error) {
      console.error('Error deleting promo code:', error);
      alert('Failed to delete promo code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditPromoCode = (promoCode: PromoCode) => {
    setEditingPromoCode(promoCode);
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingPromoCode(null);
    setShowEditForm(false);
    setFormErrors({});
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setFormErrors({});
    setNewPromoCode({
      code: '',
      discount_percent: 10,
      max_uses: 0,
      active: true,
      expires_at: null
    });
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-red-800 mb-2">Database Error</h3>
        <p className="text-red-700 mb-4">{error}</p>
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
        <h2 className="text-xl font-semibold text-gray-900">Promo Code Management</h2>
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
            }}
            className="flex items-center gap-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Promo Code
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add New Promo Code</h3>
            <button
              onClick={cancelAdd}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddPromoCode} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                  Promo Code
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={newPromoCode.code}
                  onChange={(e) => handleInputChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 uppercase"
                  placeholder="Enter promo code"
                />
                {formErrors.code && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.code}</p>
                )}
              </div>
              <div>
                <label htmlFor="discount_percent" className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage
                </label>
                <input
                  type="number"
                  id="discount_percent"
                  name="discount_percent"
                  value={newPromoCode.discount_percent}
                  onChange={(e) => handleInputChange(e)}
                  min="1"
                  max="100"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {formErrors.discount_percent && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.discount_percent}</p>
                )}
              </div>
              <div>
                <label htmlFor="max_uses" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Uses (0 for unlimited)
                </label>
                <input
                  type="number"
                  id="max_uses"
                  name="max_uses"
                  value={newPromoCode.max_uses}
                  onChange={(e) => handleInputChange(e)}
                  min="0"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {formErrors.max_uses && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.max_uses}</p>
                )}
              </div>
              <div>
                <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date (optional)
                </label>
                <input
                  type="datetime-local"
                  id="expires_at"
                  name="expires_at"
                  value={newPromoCode.expires_at ? new Date(newPromoCode.expires_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleInputChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={newPromoCode.active}
                  onChange={(e) => handleInputChange(e)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
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
                    Save Promo Code
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditForm && editingPromoCode && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Promo Code</h3>
            <button
              onClick={cancelEdit}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleEditPromoCode} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-code" className="block text-sm font-medium text-gray-700 mb-1">
                  Promo Code
                </label>
                <input
                  type="text"
                  id="edit-code"
                  name="code"
                  value={editingPromoCode.code}
                  onChange={(e) => handleInputChange(e, editingPromoCode)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 uppercase"
                />
                {formErrors.code && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.code}</p>
                )}
              </div>
              <div>
                <label htmlFor="edit-discount_percent" className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Percentage
                </label>
                <input
                  type="number"
                  id="edit-discount_percent"
                  name="discount_percent"
                  value={editingPromoCode.discount_percent}
                  onChange={(e) => handleInputChange(e, editingPromoCode)}
                  min="1"
                  max="100"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {formErrors.discount_percent && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.discount_percent}</p>
                )}
              </div>
              <div>
                <label htmlFor="edit-max_uses" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Uses (0 for unlimited)
                </label>
                <input
                  type="number"
                  id="edit-max_uses"
                  name="max_uses"
                  value={editingPromoCode.max_uses}
                  onChange={(e) => handleInputChange(e, editingPromoCode)}
                  min="0"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {formErrors.max_uses && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.max_uses}</p>
                )}
              </div>
              <div>
                <label htmlFor="edit-expires_at" className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date (optional)
                </label>
                <input
                  type="datetime-local"
                  id="edit-expires_at"
                  name="expires_at"
                  value={editingPromoCode.expires_at ? new Date(editingPromoCode.expires_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleInputChange(e, editingPromoCode)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-active"
                  name="active"
                  checked={editingPromoCode.active}
                  onChange={(e) => handleInputChange(e, editingPromoCode)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="edit-active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
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
                    Update Promo Code
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
          <span className="ml-2 text-gray-600">Loading promo codes...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Discount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promoCodes.map((promoCode) => (
                <tr key={promoCode.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{promoCode.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{promoCode.discount_percent}%</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {promoCode.used_count} / {promoCode.max_uses || '∞'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      promoCode.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {promoCode.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {promoCode.expires_at 
                        ? new Date(promoCode.expires_at).toLocaleDateString()
                        : 'Never'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEditPromoCode(promoCode)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeletePromoCode(promoCode)}
                        className="text-red-600 hover -text-red-900"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {promoCodes.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No promo codes found. Add some promo codes to get started.
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