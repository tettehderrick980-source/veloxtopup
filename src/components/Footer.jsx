import React from 'react';
import { Link } from 'react-router-dom';
import { 
  EnvelopeIcon, 
  PhoneIcon, 
  MapPinIcon,
  HeartIcon,
  ShieldCheckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-dark-800 border-t border-dark-700 mt-auto">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand & About */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-4">
              <img src="/Velox-Logo.png" alt="VeloxTopUp" className="h-10 w-auto" />
              <span className="ml-2 text-xl font-bold text-white">VeloxTopUp</span>
            </div>
            <p className="text-dark-400 text-sm mb-4">
              Your trusted partner for instant airtime and data bundles in Ghana. 
              Fast, secure, and reliable service 24/7.
            </p>
            <div className="flex items-center text-dark-400 text-sm">
              <ShieldCheckIcon className="w-4 h-4 mr-2 text-green-400" />
              <span>Secure & Trusted</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/buy" className="text-dark-400 hover:text-primary-400 text-sm transition-colors">
                  Buy Data
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-dark-400 hover:text-primary-400 text-sm transition-colors">
                  My Account
                </Link>
              </li>
              <li>
                <Link to="/transactions" className="text-dark-400 hover:text-primary-400 text-sm transition-colors">
                  Transactions
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-dark-400 hover:text-primary-400 text-sm transition-colors">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-white font-semibold mb-4">Customer Support</h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="mailto:gozojoseph122@gmail.com" 
                  className="flex items-center text-dark-400 hover:text-primary-400 text-sm transition-colors"
                >
                  <EnvelopeIcon className="w-4 h-4 mr-2" />
                  gozojoseph122@gmail.com
                </a>
              </li>
              <li>
                <a 
                  href="tel:+233531649960" 
                  className="flex items-center text-dark-400 hover:text-primary-400 text-sm transition-colors"
                >
                  <PhoneIcon className="w-4 h-4 mr-2" />
                  053 164 9960
                </a>
              </li>
              <li className="flex items-center text-dark-400 text-sm">
                <ClockIcon className="w-4 h-4 mr-2" />
                <span>24/7 Support Available</span>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/terms" className="text-dark-400 hover:text-primary-400 text-sm transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-dark-400 hover:text-primary-400 text-sm transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-dark-400 hover:text-primary-400 text-sm transition-colors">
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-dark-900 border-t border-dark-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm text-dark-400">
            <div className="flex items-center mb-2 md:mb-0">
              <span>© {currentYear} VeloxTopUp. All rights reserved.</span>
              <span className="mx-2">|</span>
              <span className="flex items-center">
                Made with <HeartIcon className="w-4 h-4 mx-1 text-red-500" /> in Ghana
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs text-dark-500">
                Powered by GoSoft
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
