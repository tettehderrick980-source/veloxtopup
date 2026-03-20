import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BuyPage from './pages/BuyPage';
import TransactionsPage from './pages/TransactionsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import GuestCheckoutPage from './pages/GuestCheckoutPage';
import { AuthProvider } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-primary-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <WalletProvider>
        <div className="min-h-screen bg-dark-900">
          <Navbar user={user} />
          <main>
            <Routes>
              <Route path="/" element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
              <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
              <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
              <Route path="/guest-checkout" element={!user ? <GuestCheckoutPage /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
              <Route path="/buy" element={user ? <BuyPage /> : <Navigate to="/login" />} />
              <Route path="/transactions" element={user ? <TransactionsPage /> : <Navigate to="/login" />} />
              <Route path="/admin" element={user ? <AdminDashboardPage /> : <Navigate to="/login" />} />
            </Routes>
          </main>
        </div>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
