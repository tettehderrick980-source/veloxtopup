import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import BuyForm from '../components/BuyForm';
import { 
  EnvelopeIcon, 
  UserIcon, 
  SparklesIcon,
  ArrowLeftIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

export default function GuestCheckoutPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState('landing'); // 'landing' | 'email' | 'checkout'
  const [guestEmail, setGuestEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  // Redirect authenticated users to buy page
  useEffect(() => {
    if (!loading && user) {
      navigate('/buy', { replace: true });
    }
  }, [user, loading, navigate]);

  // Load email from sessionStorage if available
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('guestEmail');
    if (savedEmail) {
      setGuestEmail(savedEmail);
    }
  }, []);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    setEmailError('');

    const trimmedEmail = guestEmail.trim();
    
    if (!trimmedEmail) {
      setEmailError('Email is required for guest checkout');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Store email in sessionStorage
    sessionStorage.setItem('guestEmail', trimmedEmail);
    setStep('checkout');
  };

  const handleEmailChange = (e) => {
    setGuestEmail(e.target.value);
    if (emailError) {
      setEmailError('');
    }
  };

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  // Landing step - show options
  if (step === 'landing') {
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
              no referral bonuses. For full features,{` `}
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
                Your transaction will be processed immediately, but you won&apos;t have access to features
                like wallet balance, transaction history, or referral bonuses.
              </p>
            </div>
          </div>
        </div>

        {/* Account Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
          <Link
            to="/login"
            className="card hover:border-primary-600 transition-colors cursor-pointer group"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-400 transition-colors">
                <UserIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-1">Sign In</h3>
              <p className="text-dark-400 text-sm">
                Access your wallet and transaction history
              </p>
            </div>
          </Link>

          <Link
            to="/register"
            className="card hover:border-primary-600 transition-colors cursor-pointer group"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-3 group-hover:bg-primary-400 transition-colors">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-1">Create Account</h3>
              <p className="text-dark-400 text-sm">
                Get wallet, referrals, and full features
              </p>
            </div>
          </Link>
        </div>

        {/* Continue as Guest */}
        <div className="text-center">
          <button
            onClick={() => setStep('email')}
            className="btn-secondary inline-flex items-center"
          >
            Continue as Guest
            <ArrowLeftIcon className="w-4 h-4 ml-2 rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  // Email collection step
  if (step === 'email') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-md mx-auto">
          <div className="card">
            <h2 className="text-2xl font-bold text-white mb-2">Enter Your Email</h2>
            <p className="text-dark-400 mb-6">
              We&apos;ll use this email for your payment receipt and order updates.
            </p>
            
            <form onSubmit={handleEmailSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={handleEmailChange}
                    placeholder="your@email.com"
                    className={`input-field w-full pl-10 ${emailError ? 'border-red-500 focus:border-red-500' : ''}`}
                    autoFocus
                  />
                </div>
                {emailError && (
                  <p className="mt-2 text-sm text-red-400 flex items-center">
                    <span className="mr-1">⚠</span>
                    {emailError}
                  </p>
                )}
              </div>
              
              <button type="submit" className="btn-primary w-full py-3">
                Continue to Checkout
              </button>
            </form>
            
            <button
              onClick={() => setStep('landing')}
              className="w-full mt-4 text-sm text-dark-400 hover:text-white transition-colors flex items-center justify-center"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Checkout step - show BuyForm
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Guest Checkout</h1>
        <p className="text-dark-400 text-sm">Instant delivery to all Ghanaian networks.</p>
      </div>

      {/* Guest email notice */}
      <div className="mb-6 p-4 bg-dark-800 border border-dark-700 rounded-lg">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center">
            <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
            <div>
              <p className="text-white text-sm font-medium">
                Guest Email: <span className="text-primary-400">{guestEmail}</span>
              </p>
              <p className="text-dark-400 text-xs mt-0.5">
                Receipts will be sent to this email
              </p>
            </div>
          </div>
          <button
            onClick={() => setStep('email')}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Change email
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 bg-primary-900/20 border border-primary-700 rounded-lg">
        <p className="text-primary-300 text-sm">
          <strong>Tip:</strong> Enter your email in the form below to ensure you receive your receipt. 
          You can also <Link to="/register" className="text-primary-400 hover:text-primary-300 underline">create an account</Link> anytime to track your orders.
        </p>
      </div>

      {/* The BuyForm - it handles the actual purchase flow */}
      <BuyForm />
    </div>
  );
}
