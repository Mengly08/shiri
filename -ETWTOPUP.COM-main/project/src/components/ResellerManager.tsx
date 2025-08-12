import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Reseller } from '../types';
import { Loader2, Plus, Trash, Edit, Save, X, RefreshCw, Eye, EyeOff, AlertCircle, Check, UserPlus } from 'lucide-react';

export function ResellerManager() {
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New reseller form state
  const [newReseller, setNewReseller] = useState<Partial<Reseller>>({
    username: '',
    password: '',
    active: true,
    devices: []
  });
  
  // Editing reseller state
  const [editingReseller, setEditingReseller] = useState<Reseller | null>(null);

  useEffect(() => {
    fetchResellers();
  }, []);

  const fetchResellers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .order('username', { ascending: true });
      
      if (error) {
        console.error('Error fetching resellers:', error);
        if (error.code === '42501') {
          setError('Permission denied. Please contact the administrator to set up proper permissions for the resellers table.');
        } else {
          setError('Failed to load resellers. Please try again.');
        }
        setResellers([]);
      } else {
        setResellers(data || []);
      }
    } catch (error) {
      console.error('Error fetching resellers:', error);
      setError('An unexpected error occurred. Please try again later.');
      setResellers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchResellers();
    setRefreshing(false);
  };

  const validateForm = (reseller: Partial<Reseller>): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!reseller.username?.trim()) {
      errors.username = 'Username is required';
    }
    
    if (!reseller.password?.trim()) {
      errors.password = 'Password is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    reseller: Partial<Reseller> = newReseller
  ) => {
    const { name, value, type, checked } = e.target;
    
    // Clear the error for this field
    setFormErrors(prev => ({ ...prev, [name]: undefined }));
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      if (reseller === newReseller) {
        setNewReseller(prev => ({
          ...prev,
          [name]: checked
        }));
      } else if (editingReseller) {
        setEditingReseller(prev => ({
          ...prev!,
          [name]: checked
        }));
      }
    } else {
      // Handle other inputs
      if (reseller === newReseller) {
        setNewReseller(prev => ({
          ...prev,
          [name]: value
        }));
      } else if (editingReseller) {
        setEditingReseller(prev => ({
          ...prev!,
          [name]: value
        }));
      }
    }
  };

  const handleAddReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(newReseller)) {
      return;
    }
    
    setLoading(true);
    try {
      // Check if username already exists
      const { data: existingReseller, error: checkError } = await supabase
        .from('resellers')
        .select('username')
        .eq('username', newReseller.username)
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
      
      if (existingReseller && existingReseller.length > 0) {
        setFormErrors({ username: 'Username already exists' });
        setLoading(false);
        return;
      }
      
      // Insert the new reseller
      const { error } = await supabase
        .from('resellers')
        .insert([{
          username: newReseller.username,
          password: newReseller.password,
          active: newReseller.active,
          devices: []
        }]);
      
      if (error) {
        if (error.code === '42501') {
          setError('Permission denied. Please contact the administrator to set up proper permissions.');
        } else {
          throw error;
        }
      } else {
        // Reset the form and refresh resellers
        setNewReseller({
          username: '',
          password: '',
          active: true,
          devices: []
        });
        
        setShowAddForm(false);
        await fetchResellers();
        
        alert('Reseller added successfully!');
      }
    } catch (error) {
      console.error('Error adding reseller:', error);
      alert('Failed to add reseller. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingReseller || !validateForm(editingReseller)) {
      return;
    }
    
    setLoading(true);
    try {
      // Check if username already exists (but not the current reseller)
      const { data: existingReseller, error: checkError } = await supabase
        .from('resellers')
        .select('username')
        .eq('username', editingReseller.username)
        .neq('id', editingReseller.id)
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
      
      if (existingReseller && existingReseller.length > 0) {
        setFormErrors({ username: 'Username already exists' });
        setLoading(false);
        return;
      }
      
      // Update the reseller
      const { error } = await supabase
        .from('resellers')
        .update({
          username: editingReseller.username,
          password: editingReseller.password,
          active: editingReseller.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingReseller.id);
      
      if (error) {
        if (error.code === '42501') {
          setError('Permission denied. Please contact the administrator to set up proper permissions.');
        } else {
          throw error;
        }
      } else {
        // Reset the form and refresh resellers
        setEditingReseller(null);
        setShowEditForm(false);
        await fetchResellers();
        
        alert('Reseller updated successfully!');
      }
    } catch (error) {
      console.error('Error updating reseller:', error);
      alert('Failed to update reseller. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReseller = async (reseller: Reseller) => {
    if (!confirm(`Are you sure you want to delete ${reseller.username}?`)) {
      return;
    }
    
    setLoading(true);
    try {
      // Delete the reseller
      const { error } = await supabase
        .from('resellers')
        .delete()
        .eq('id', reseller.id);
      
      if (error) {
        if (error.code === '42501') {
          setError('Permission denied. Please contact the administrator to set up proper permissions.');
        } else {
          throw error;
        }
      } else {
        // Refresh resellers
        await fetchResellers();
        
        alert('Reseller deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting reseller:', error);
      alert('Failed to delete reseller. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const startEditReseller = (reseller: Reseller) => {
    setEditingReseller(reseller);
    setShowEditForm(true);
    setShowAddForm(false);
  };

  const cancelEdit = () => {
    setEditingReseller(null);
    setShowEditForm(false);
    setFormErrors({});
  };

  const cancelAdd = () => {
    setShowAddForm(false);
    setFormErrors({});
    setNewReseller({
      username: '',
      password: '',
      active: true,
      devices: []
    });
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
        <h2 className="text-xl font-semibold text-gray-900">Reseller Management</h2>
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
            <UserPlus className="w-4 h-4" />
            Add Reseller
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add New Reseller</h3>
            <button
              onClick={cancelAdd}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddReseller} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={newReseller.username}
                  onChange={(e) => handleInputChange(e)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {formErrors.username && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={newReseller.password}
                    onChange={(e) => handleInputChange(e)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                )}
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={newReseller.active}
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
                    Save Reseller
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {showEditForm && editingReseller && (
        <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit Reseller</h3>
            <button
              onClick={cancelEdit}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleEditReseller} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  id="edit-username"
                  name="username"
                  value={editingReseller.username}
                  onChange={(e) => handleInputChange(e, editingReseller)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
                {formErrors.username && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
                )}
              </div>
              <div>
                <label htmlFor="edit-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="edit-password"
                    name="password"
                    value={editingReseller.password}
                    onChange={(e) => handleInputChange(e, editingReseller)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                )}
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-active"
                  name="active"
                  checked={editingReseller.active}
                  onChange={(e) => handleInputChange(e, editingReseller)}
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
                    Update Reseller
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
          <span className="ml-2 text-gray-600">Loading resellers...</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Login Count
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {resellers.map((reseller) => (
                <tr key={reseller.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{reseller.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      reseller.active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {reseller.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {reseller.last_login 
                      ? new Date(reseller.last_login).toLocaleString() 
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {reseller.login_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => startEditReseller(reseller)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteReseller(reseller)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {resellers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No resellers found. Add some resellers to get started.
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