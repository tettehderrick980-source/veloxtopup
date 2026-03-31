import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotificationContainer from './components/NotificationContainer';
import { NotificationProvider } from './contexts/NotificationContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import BuyPage from './pages/BuyPage';
import TransactionsPage from './pages/TransactionsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import SuperAdminDashboardPage from './pages/SuperAdminDashboardPage';
import GuestCheckoutPage from './pages/GuestCheckoutPage';
import ProfilePage from './pages/ProfilePage';
import TrackOrderPage from './pages/TrackOrderPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';

function AppContent() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-primary-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar user={user} />
      <main>
        <Routes>
          <Route path="/" element={<BuyPage />} /> {/* Home page is BuyPage */}
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/dashboard" />} />
          <Route path="/guest-checkout" element={!user ? <GuestCheckoutPage /> : <Navigate to="/dashboard" />} />
          <Route path="/buy" element={<BuyPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/dashboard" element={user ? <DashboardPage /> : <Navigate to="/login" />} />
          <Route path="/transactions" element={user ? <TransactionsPage /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route path="/settings" element={user ? <ProfilePage /> : <Navigate to="/login" />} />
          <Route 
            path="/admin" 
            element={
              user ? (
                userProfile?.role === 'super_admin' ? 
                <SuperAdminDashboardPage /> : 
                userProfile?.role === 'admin' ?
                <AdminDashboardPage /> :
                <Navigate to="/dashboard" />
              ) : <Navigate to="/login" />
            } 
          />
        </Routes>
      </main>
      <Footer />
      <NotificationContainer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <WalletProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </WalletProvider>
    </AuthProvider>
  );
}

export default App;
