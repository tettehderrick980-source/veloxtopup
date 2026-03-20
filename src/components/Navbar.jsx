import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { 
  Bars3Icon, 
  XMarkIcon,
  UserIcon, 
  CreditCardIcon,
  ChartBarIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';

export default function Navbar({ user }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const { wallet } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-dark-800 border-b border-dark-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <span className="text-white font-bold text-xl">VeloxTopUp</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors ${
                isActive('/') ? 'text-primary-400' : 'text-dark-300 hover:text-primary-400'
              }`}
            >
              Home
            </Link>
            {user && (
              <>
                <Link
                  to="/dashboard"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/dashboard') ? 'text-primary-400' : 'text-dark-300 hover:text-primary-400'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/buy"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/buy') ? 'text-primary-400' : 'text-dark-300 hover:text-primary-400'
                  }`}
                >
                  Buy Airtime/Data
                </Link>
                <Link
                  to="/transactions"
                  className={`text-sm font-medium transition-colors ${
                    isActive('/transactions') ? 'text-primary-400' : 'text-dark-300 hover:text-primary-400'
                  }`}
                >
                  Transactions
                </Link>
                {userProfile?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`text-sm font-medium transition-colors ${
                      isActive('/admin') ? 'text-primary-400' : 'text-dark-300 hover:text-primary-400'
                    }`}
                  >
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {/* Wallet Balance */}
                <div className="bg-dark-700 px-3 py-1 rounded-lg">
                  <span className="text-dark-400 text-sm">Balance:</span>
                  <span className="text-primary-400 font-semibold ml-1">
                    GH₵{wallet?.balance?.toFixed(2) || '0.00'}
                  </span>
                </div>
                
                {/* User Menu */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 text-dark-300 hover:text-primary-400 transition-colors">
                    <UserIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">{user.email}</span>
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      <Link
                        to="/dashboard"
                        className="flex items-center px-4 py-2 text-sm text-dark-300 hover:bg-dark-700 hover:text-primary-400"
                      >
                        <ChartBarIcon className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-dark-300 hover:bg-dark-700 hover:text-primary-400"
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-dark-300 hover:text-primary-400 font-medium text-sm transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-dark-300 hover:text-primary-400"
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
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-dark-700">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className="block px-3 py-2 text-dark-300 hover:text-primary-400 hover:bg-dark-700 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    className="block px-3 py-2 text-dark-300 hover:text-primary-400 hover:bg-dark-700 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/buy"
                    className="block px-3 py-2 text-dark-300 hover:text-primary-400 hover:bg-dark-700 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Buy Airtime/Data
                  </Link>
                  <Link
                    to="/transactions"
                    className="block px-3 py-2 text-dark-300 hover:text-primary-400 hover:bg-dark-700 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Transactions
                  </Link>
                  {userProfile?.role === 'admin' && (
                    <Link
                      to="/admin"
                      className="block px-3 py-2 text-dark-300 hover:text-primary-400 hover:bg-dark-700 rounded-md"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                </>
              )}
            </div>
            
            {user && (
              <div className="pt-4 pb-3 border-t border-dark-700">
                <div className="px-2">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-dark-400 text-sm">Balance:</span>
                    <span className="text-primary-400 font-semibold">
                      GH₵{wallet?.balance?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-dark-300 hover:text-primary-400 hover:bg-dark-700 rounded-md"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
