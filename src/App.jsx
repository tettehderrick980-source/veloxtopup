import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import NotificationContainer from './components/NotificationContainer';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WalletProvider } from './contexts/WalletContext';

// Lazy load all pages
const LoginPage              = lazy(() => import('./pages/LoginPage'));
const RegisterPage           = lazy(() => import('./pages/RegisterPage'));
const DashboardPage          = lazy(() => import('./pages/DashboardPage'));
const BuyPage                = lazy(() => import('./pages/BuyPage'));
const TransactionsPage       = lazy(() => import('./pages/TransactionsPage'));
const AdminDashboardPage     = lazy(() => import('./pages/AdminDashboardPage'));
const SuperAdminDashboardPage = lazy(() => import('./pages/SuperAdminDashboardPage'));
const GuestCheckoutPage      = lazy(() => import('./pages/GuestCheckoutPage'));
const ProfilePage            = lazy(() => import('./pages/ProfilePage'));
const TrackOrderPage         = lazy(() => import('./pages/TrackOrderPage'));

const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

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
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<BuyPage />} />
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
        </Suspense>
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
