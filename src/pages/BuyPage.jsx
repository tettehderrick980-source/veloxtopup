import React from 'react';
import BuyForm from '../components/BuyForm';

export default function BuyPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Buy Airtime & Data</h1>
        <p className="text-dark-400">
          Purchase airtime and data bundles for all major Ghanaian networks instantly.
        </p>
      </div>
      
      <BuyForm />
    </div>
  );
}
