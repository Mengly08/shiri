import React, { useState, useEffect } from 'react';
import { AdminLogin } from '../components/AdminLogin';
import { AdminPanel } from '../components/AdminPanel';

export function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check if user was previously authenticated in this session
  useEffect(() => {
    const adminAuth = sessionStorage.getItem('jackstore_admin_auth');
    if (adminAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);
  
  const handleLogin = () => {
    setIsAuthenticated(true);
    // Store authentication state in session storage
    sessionStorage.setItem('jackstore_admin_auth', 'true');
  };
  
  const handleLogout = () => {
    setIsAuthenticated(false);
    // Clear authentication state
    sessionStorage.removeItem('jackstore_admin_auth');
  };
  
  return (
    <>
      {isAuthenticated ? (
        <AdminPanel onLogout={handleLogout} />
      ) : (
        <AdminLogin onLogin={handleLogin} />
      )}
    </>
  );
}

export default AdminPage;