import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import BuyForm from '../components/BuyForm';
import { UserIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

export default function GuestCheckoutPage() {
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [showGuestForm, setShowGuestForm] = useState(false);

  const handleGuestInfoChange = (e) => {
    setGuestInfo({
      ...guestInfo,
      [e.target.name]: e.target.value
    });
  };

  const handleContinueAsGuest = () => {
    setShowGuestForm(true);
  };

  const handleGuestFormSubmit = (e) => {
    e.preventDefault();
    // Basic validation
    if (!guestInfo.name || !guestInfo.email || !guestInfo.phone) {
      alert('Please fill in all fields');
      return;
    }
    setShowLoginPrompt(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Guest Checkout</h1>
        <p className="text-dark-400 mb-4">
          Buy airtime and data bundles without creating an account.
        </p>
        <div className="bg-primary-900/20 border border-primary-700 rounded-lg p-4 max-w-2xl mx-auto">
          <p className="text-primary-300 text-sm">
            <strong>Guest Checkout Limitations:</strong> No transaction history, no wallet funding, 
            no referral bonuses. For full features,{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300 underline">
              create a free account
            </Link>.
          </p>
        </div>
      </div>

      {/* Guest Notice */}
      <div className="card max-w-2xl mx-auto mb-6">
        <div className="flex items-start space-x-3">
          <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">!</span>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">Guest Purchase Notice</h3>
            <p className="text-dark-300 text-sm">
              As a guest, you can only make one-time purchases using our secure payment system. 
              Your transaction will be processed immediately, but you won't have access to features 
              like wallet balance, transaction history, or referral bonuses.
            </p>
          </div>
        </div>
      </div>

      {/* Account Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
        <Link
          to="/login"
          className="card hover:border-primary-600 transition-colors cursor-pointer"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold">👤</span>
            </div>
            <h3 className="text-white font-semibold mb-1">Sign In</h3>
            <p className="text-dark-400 text-sm">
              Access your wallet and transaction history
            </p>
          </div>
        </Link>

        <Link
          to="/register"
          className="card hover:border-primary-600 transition-colors cursor-pointer"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold">✨</span>
            </div>
            <h3 className="text-white font-semibold mb-1">Create Account</h3>
            <p className="text-dark-400 text-sm">
              Get wallet, referrals, and full features
            </p>
          </div>
        </Link>
      </div>

      {/* Continue as Guest */}
      <div className="text-center mb-8">
        <button
          onClick={() => setShowLoginPrompt(true)}
          className="btn-secondary"
        >
          Continue as Guest
        </button>
      </div>

      {/* Guest Form (shown when continue as guest is clicked) */}
      {showLoginPrompt && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4 mb-6">
            <p className="text-yellow-300 text-sm">
              You're continuing as a guest. For the best experience with wallet funding, 
              transaction history, and referral bonuses, consider creating an account.
            </p>
          </div>
          
          {/* Modified BuyForm for guest checkout */}
          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-6">Guest Purchase</h2>
            <p className="text-dark-400 mb-6">
              Enter your details to make a one-time purchase.
            </p>
            
            {/* Guest form fields would go here */}
            <div className="text-center py-8">
              <p className="text-dark-400 mb-4">
                Guest checkout functionality requires additional payment integration.
              </p>
              <Link
                to="/register"
                className="btn-primary"
              >
                Create Account for Full Access
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
