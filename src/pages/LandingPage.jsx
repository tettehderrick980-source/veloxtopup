import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BoltIcon, 
  ShieldCheckIcon, 
  UserGroupIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center">
                <BoltIcon className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Fast Airtime & Data
              <span className="text-primary-400"> Bundle Reselling</span>
            </h1>
            <p className="text-xl text-dark-300 mb-8 max-w-2xl mx-auto">
              Automated platform for instant airtime and data bundle purchases with wallet system, 
              referral bonuses, and real-time transactions.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="btn-primary py-3 px-8 text-lg inline-flex items-center justify-center"
              >
                Get Started
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Link>
              <Link
                to="/guest-checkout"
                className="btn-secondary py-3 px-8 text-lg inline-flex items-center justify-center"
              >
                Guest Checkout
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Why Choose VeloxTopUp?
            </h2>
            <p className="text-lg text-dark-300 max-w-2xl mx-auto">
              Experience the fastest and most reliable airtime and data bundle reselling platform in Ghana.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BoltIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Instant Delivery</h3>
              <p className="text-dark-300">
                Automated processing ensures your airtime and data bundles are delivered instantly after payment.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Secure Payments</h3>
              <p className="text-dark-300">
                Paystack integration ensures your payments are secure with wallet system for easy management.
              </p>
            </div>

            <div className="card text-center">
              <div className="w-12 h-12 bg-primary-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <UserGroupIcon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Referral Rewards</h3>
              <p className="text-dark-300">
                Earn bonuses when you refer friends and family to join VeloxTopUp.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-lg text-dark-300">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Sign Up & Fund Wallet</h3>
              <p className="text-dark-300">
                Create an account and fund your wallet securely via Paystack.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Select Network & Plan</h3>
              <p className="text-dark-300">
                Choose your network (MTN, AirtelTigo, Vodafone) and select your desired plan.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Instant Delivery</h3>
              <p className="text-dark-300">
                Receive your airtime or data bundle instantly via automated processing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Networks */}
      <section className="py-20 bg-dark-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Supported Networks
            </h2>
            <p className="text-lg text-dark-300">
              We support all major networks in Ghana
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-16 h-16 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">MTN</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">MTN Ghana</h3>
              <p className="text-dark-300 mb-4">Airtime and data bundles</p>
              <ul className="text-sm text-dark-400 space-y-1">
                <li className="flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                  Instant delivery
                </li>
                <li className="flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                  All data plans
                </li>
              </ul>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">AT</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AirtelTigo</h3>
              <p className="text-dark-300 mb-4">Airtime and data bundles</p>
              <ul className="text-sm text-dark-400 space-y-1">
                <li className="flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                  Instant delivery
                </li>
                <li className="flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                  All data plans
                </li>
              </ul>
            </div>

            <div className="card text-center">
              <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-lg">VF</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Vodafone</h3>
              <p className="text-dark-300 mb-4">Airtime and data bundles</p>
              <ul className="text-sm text-dark-400 space-y-1">
                <li className="flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                  Instant delivery
                </li>
                <li className="flex items-center justify-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-400 mr-2" />
                  All data plans
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of satisfied customers using VeloxTopUp for instant airtime and data bundles.
          </p>
          <Link
            to="/register"
            className="btn-primary bg-white text-primary-600 hover:bg-gray-100 py-3 px-8 text-lg inline-flex items-center"
          >
            Create Account Now
            <ArrowRightIcon className="w-5 h-5 ml-2" />
          </Link>
        </div>
      </section>
    </div>
  );
}
