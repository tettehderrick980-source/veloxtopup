import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { useNotification } from '../contexts/NotificationContext';
import NotificationBell from './NotificationBell';
import { 
  Bars3Icon, 
  XMarkIcon,
  UserIcon, 
  CreditCardIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon,
  HomeIcon,
  DocumentTextIcon,
  CogIcon,
  BoltIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

export default function Navbar({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { signOut, userProfile } = useAuth();
  const { wallet } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: 'Buy Data', icon: HomeIcon },
    { path: '/track-order', label: 'Track Order', icon: TruckIcon },
    { path: '/dashboard', label: 'Dashboard', icon: ChartBarIcon },
    { path: '/transactions', label: 'Transactions', icon: DocumentTextIcon },
  ];

  const userMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: ChartBarIcon },
    { path: '/profile', label: 'Profile', icon: UserIcon },
    { path: '/settings', label: 'Settings', icon: CogIcon },
  ];

  return (
    <nav className="bg-dark-900/95 backdrop-blur-sm border-b border-dark-700/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <img 
                  src="/Velox-Logo.png" 
                  alt="VeloxTopUp Logo" 
                  className="h-10 w-auto transition-transform group-hover:scale-105"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary-500 rounded-full animate-pulse"></div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-white">VeloxTopUp</h1>
                <p className="text-xs text-primary-400">Fast Data Delivery</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              if (item.path === '/' || user) {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive(item.path) 
                        ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' 
                        : 'text-dark-300 hover:text-primary-400 hover:bg-dark-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              }
              return null;
            })}
            
            {(userProfile?.role === 'admin' || userProfile?.role === 'super_admin') && (
              <Link
                to="/admin"
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive('/admin') 
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                    : 'text-dark-300 hover:text-orange-400 hover:bg-dark-800/50'
                }`}
              >
                <CogIcon className="w-4 h-4" />
                <span>{userProfile?.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
              </Link>
            )}
          </div>

          {/* User Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {user ? (
              <>
                {/* Wallet Balance */}
                {wallet && (
                  <div className="flex items-center space-x-2 px-3 py-2 bg-dark-800/50 rounded-xl border border-dark-600">
                    <CreditCardIcon className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-medium text-white">
                      GH₵{parseFloat(wallet.balance || 0).toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Notification Bell */}
                <NotificationBell />
                
                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button 
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-3 px-4 py-2 bg-dark-800/50 rounded-xl border border-dark-600 hover:border-primary-500/50 transition-all group"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                      <UserIcon className="w-4 h-4 text-white" />
                    </div>
                    <div className="hidden xl:block text-left">
                      <p className="text-sm font-medium text-white">
                        {user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-dark-400">
                        {userProfile?.role || 'User'}
                      </p>
                    </div>
                    <div className={`transform transition-transform ${
                      userMenuOpen ? 'rotate-180' : ''
                    }`}>
                      <BoltIcon className="w-4 h-4 text-primary-400" />
                    </div>
                  </button>
                  
                  <div className={`absolute right-0 mt-2 w-56 bg-dark-800 border border-dark-600 rounded-xl shadow-xl backdrop-blur-sm transition-all duration-200 ${
                    userMenuOpen 
                      ? 'opacity-100 translate-y-0 visible' 
                      : 'opacity-0 -translate-y-2 invisible'
                  }`}>
                    <div className="p-2">
                      <div className="px-3 py-2 border-b border-dark-600">
                        <p className="text-sm font-medium text-white truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-dark-400">
                          {userProfile?.role || 'User'}
                        </p>
                      </div>
                      
                      {userMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center space-x-3 px-3 py-2 text-sm text-dark-300 hover:text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                      
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-dark-300 hover:text-primary-400 font-medium text-sm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm px-4 py-2"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-dark-300 hover:text-primary-400 hover:bg-dark-800/50 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="w-6 h-6" />
              ) : (
                <Bars3Icon className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className={`lg:hidden transition-all duration-300 ${
          mobileMenuOpen 
            ? 'max-h-96 opacity-100' 
            : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className="border-t border-dark-700/50 py-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                if (item.path === '/' || user) {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive(item.path) 
                          ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' 
                          : 'text-dark-300 hover:text-primary-400 hover:bg-dark-800/50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                }
                return null;
              })}
              
              {(userProfile?.role === 'admin' || userProfile?.role === 'super_admin') && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive('/admin') 
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' 
                      : 'text-dark-300 hover:text-orange-400 hover:bg-dark-800/50'
                  }`}
                >
                  <CogIcon className="w-5 h-5" />
                  <span>{userProfile?.role === 'super_admin' ? 'Super Admin' : 'Admin'}</span>
                </Link>
              )}
            </div>
            
            {user && (
              <div className="mt-6 pt-6 border-t border-dark-700/50">
                <div className="px-4 mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white truncate">
                        {user.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-dark-400">
                        {userProfile?.role || 'User'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {wallet && (
                  <div className="px-4 mb-4">
                    <div className="flex items-center space-x-2 px-3 py-2 bg-dark-800/50 rounded-xl border border-dark-600">
                      <CreditCardIcon className="w-4 h-4 text-primary-400" />
                      <span className="text-sm font-medium text-white">
                        GH₵{parseFloat(wallet.balance || 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={handleSignOut}
                  className="flex items-center space-x-3 w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
            
            {!user && (
              <div className="mt-6 pt-6 border-t border-dark-700/50 px-4 space-y-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full text-center px-4 py-3 text-dark-300 hover:text-primary-400 font-medium text-sm transition-colors border border-dark-600 rounded-xl hover:border-primary-500/50"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn-primary text-sm w-full"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
