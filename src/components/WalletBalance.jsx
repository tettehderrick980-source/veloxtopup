import React from 'react';
import { useWallet } from '../contexts/WalletContext';
import { CreditCardIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';

export default function WalletBalance() {
  const { wallet, loading } = useWallet();

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-4 bg-dark-700 rounded w-1/4 mb-2"></div>
        <div className="h-8 bg-dark-700 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CreditCardIcon className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold text-white">Wallet Balance</h3>
        </div>
        <div className="flex items-center space-x-1 text-green-400 text-sm">
          <ArrowTrendingUpIcon className="w-4 h-4" />
          <span>Active</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="text-3xl font-bold text-primary-400">
          GH₵{wallet?.balance?.toFixed(2) || '0.00'}
        </div>
        <div className="text-sm text-dark-400">
          Available for purchases
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-dark-700">
        <div className="flex justify-between text-sm">
          <span className="text-dark-400">Last Updated</span>
          <span className="text-dark-300">
            {wallet?.updated_at 
              ? new Date(wallet.updated_at).toLocaleString()
              : 'Never'
            }
          </span>
        </div>
      </div>
    </div>
  );
}
