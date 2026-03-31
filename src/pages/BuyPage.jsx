import React from 'react';
import BuyForm from '../components/BuyForm';
import { useAuth } from '../contexts/AuthContext';

export default function BuyPage() {
  const { user } = useAuth();
  const isGuest = !user;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Buy Airtime & Data</h1>
        <p className="text-dark-400 text-sm">Instant delivery to all Ghanaian networks.</p>
      </div>
      
      {isGuest && (
        <div className="mb-6 p-4 bg-dark-800 border border-dark-700 rounded-lg">
          <p className="text-primary-400 text-sm">
            <strong>Guest Checkout:</strong> No account required!
          </p>
          <p className="text-dark-400 text-sm mt-1">
            <a href="/register" className="text-primary-400 hover:text-primary-300">Create an account</a> to track orders.
          </p>
        </div>
      )}
      
      <BuyForm />
    </div>
  );
}
