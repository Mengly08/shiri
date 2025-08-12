import React, { useState, useEffect } from 'react';
import { ResellerLogin } from '../components/ResellerLogin';
import { supabase } from '../lib/supabase';
import { AlertCircle, Loader2 } from 'lucide-react';

interface ResellerPageProps {
  onLogin: () => void;
}

export function ResellerPage({ onLogin }: ResellerPageProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check if user was previously authenticated in this session
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const resellerAuth = localStorage.getItem('jackstore_reseller_auth');
        
        if (resellerAuth === 'true') {
          // Verify that the resellers table exists and is accessible
          const { error } = await supabase
            .from('resellers')
            .select('id')
            .limit(1);
          
          if (error) {
            if (error.code === '42501') {
              setError('Permission denied. Please contact the administrator to set up proper permissions for the resellers table.');
              // Clear the auth since we can't verify it
              localStorage.removeItem('jackstore_reseller_auth');
              localStorage.removeItem('jackstore_reseller_username');
            } else {
              setError('Database connection error. Please try again later.');
            }
            setIsAuthenticated(false);
          } else {
            setIsAuthenticated(true);
            onLogin();
          }
        }
      } catch (err) {
        console.error('Error checking authentication:', err);
        setError('An unexpected error occurred. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [onLogin]);
  
  const handleLogin = () => {
    setIsAuthenticated(true);
    // Store authentication state in local storage
    localStorage.setItem('jackstore_reseller_auth', 'true');
    onLogin();
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-emerald-900 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication status...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 to-emerald-900 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">Authentication Error</h2>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
          <div className="space-y-4">
            <p className="text-gray-600">
              This is likely due to missing Row Level Security (RLS) policies in your Supabase database.
              Please contact the administrator to set up the proper permissions.
            </p>
            <div className="flex justify-center">
              <a 
                href="/"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Return to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {!isAuthenticated && (
        <ResellerLogin onLogin={handleLogin} />
      )}
    </>
  );
}

export default ResellerPage;