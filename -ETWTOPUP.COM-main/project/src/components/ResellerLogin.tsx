import React, { useState, useEffect } from 'react';
import { Lock, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ResellerLoginProps {
  onLogin: () => void;
}

export function ResellerLogin({ onLogin }: ResellerLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Check if the resellers table exists
    const checkResellersTable = async () => {
      try {
        const { data, error } = await supabase
          .from('resellers')
          .select('id')
          .limit(1);
        
        if (error) {
          console.error('Error checking resellers table:', error);
          if (error.code === '42501') {
            setError('Permission denied. Please contact the administrator to set up proper permissions.');
          } else {
            setError('Database connection error. Please try again later.');
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setInitialLoading(false);
      }
    };

    checkResellersTable();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Get the reseller from the database
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .eq('username', username)
        .eq('active', true)
        .limit(1);
      
      if (error) {
        console.error('Supabase error:', error);
        if (error.code === '42501') {
          throw new Error('Permission denied. Please contact the administrator to set up proper permissions.');
        } else {
          throw new Error('Failed to verify credentials. Please try again.');
        }
      }
      
      // Check if we have data and if the password matches
      if (data && data.length > 0 && data[0].password === password) {
        // Update last login time and increment login count
        const deviceInfo = navigator.userAgent;
        let devices = data[0].devices || [];
        
        // Add device if not already in the list (limit to 5 most recent)
        if (!devices.includes(deviceInfo)) {
          devices = [deviceInfo, ...devices].slice(0, 5);
        }
        
        try {
          // Update reseller record
          const { error: updateError } = await supabase
            .from('resellers')
            .update({
              last_login: new Date().toISOString(),
              login_count: (data[0].login_count || 0) + 1,
              devices: devices
            })
            .eq('id', data[0].id);
            
          if (updateError && updateError.code === '42501') {
            console.warn('Permission denied when updating reseller login info. Continuing with login.');
          } else if (updateError) {
            console.error('Error updating reseller login info:', updateError);
          }
        } catch (updateErr) {
          console.error('Error during update:', updateErr);
          // Continue with login even if update fails
        }
        
        // Store username for display purposes
        localStorage.setItem('jackstore_reseller_username', username);
        
        onLogin();
      } else {
        setError('Invalid username or password. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-emerald-900 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Connecting to database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-emerald-900 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Reseller</h2>
            <p className="text-gray-600 mt-1">Enter your credentials to access reseller prices</p>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 text-white py-3 px-4 rounded-lg hover:from-yellow-600 hover:to-amber-700 transition-all duration-300 flex items-center justify-center disabled:opacity-70 text-base font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Login as Reseller'
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Return to <a href="/" className="text-green-600 hover:text-green-800 font-medium">HOME</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
