import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { db } from '../lib/supabase';
import WalletBalance from '../components/WalletBalance';
import { 
  PlusIcon, 
  ArrowTrendingUpIcon, 
  UserGroupIcon,
  ClockIcon,
  ShareIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const { wallet } = useWallet();
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [referralStats, setReferralStats] = useState({ total: 0, totalBonus: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      const [transactionsResult, referralsResult] = await Promise.all([
        db.getTransactions(user.id, 5),
        db.getReferrals(user.id)
      ]);

      setRecentTransactions(transactionsResult.data || []);
      
      const totalReferrals = referralsResult.data?.length || 0;
      const totalBonus = referralsResult.data?.reduce((sum, ref) => sum + (ref.bonus || 0), 0) || 0;
      setReferralStats({ total: totalReferrals, totalBonus });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/register?ref=${user?.user_metadata?.referral_code}`;
    navigator.clipboard.writeText(referralLink);
    alert('Referral link copied to clipboard!');
  };

  const stats = [
    {
      name: 'Total Transactions',
      value: recentTransactions.length,
      icon: ClockIcon,
      color: 'text-blue-400'
    },
    {
      name: 'Referrals',
      value: referralStats.total,
      icon: UserGroupIcon,
      color: 'text-green-400'
    },
    {
      name: 'Referral Bonus',
      value: `GH₵${referralStats.totalBonus.toFixed(2)}`,
      icon: ArrowTrendingUpIcon,
      color: 'text-yellow-400'
    }
  ];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-dark-700 rounded w-1/3 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-32"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user?.email?.split('@')[0]}!
        </h1>
        <p className="text-dark-400">
          Manage your wallet, buy airtime/data, and track your transactions.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg bg-dark-700 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-dark-400">{stat.name}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Wallet Balance */}
          <WalletBalance />

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                to="/buy"
                className="flex items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <PlusIcon className="w-5 h-5 text-primary-400 mr-3" />
                <div>
                  <div className="text-white font-medium">Buy Airtime/Data</div>
                  <div className="text-dark-400 text-sm">Instant delivery</div>
                </div>
              </Link>
              
              <button
                onClick={() => window.open('https://paystack.com/pay/veloxtopup', '_blank')}
                className="flex items-center p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <CreditCardIcon className="w-5 h-5 text-primary-400 mr-3" />
                <div>
                  <div className="text-white font-medium">Fund Wallet</div>
                  <div className="text-dark-400 text-sm">Add money to wallet</div>
                </div>
              </button>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
              <Link
                to="/transactions"
                className="text-primary-400 hover:text-primary-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            
            {recentTransactions.length > 0 ? (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                    <div>
                      <div className="text-white font-medium capitalize">{transaction.type}</div>
                      <div className="text-dark-400 text-sm">
                        {transaction.network} • {transaction.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-primary-400 font-semibold">
                        GH₵{transaction.amount?.toFixed(2)}
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        transaction.status === 'success' ? 'text-green-400 bg-green-900/20' :
                        transaction.status === 'pending' ? 'text-yellow-400 bg-yellow-900/20' :
                        'text-red-400 bg-red-900/20'
                      }`}>
                        {transaction.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-dark-400">
                No transactions yet. Start by buying airtime or data!
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Referral Card */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Refer & Earn</h3>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-dark-400 mb-1">Your Referral Code</div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={userProfile?.referral_code || ''}
                    readOnly
                    className="input-field flex-1"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="btn-primary p-2"
                  >
                    <ShareIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="bg-dark-700 p-3 rounded-lg">
                <div className="text-sm text-dark-400 mb-1">Referral Bonus</div>
                <div className="text-xl font-bold text-primary-400">
                  GH₵{referralStats.totalBonus.toFixed(2)}
                </div>
                <div className="text-xs text-dark-500">
                  From {referralStats.total} referral(s)
                </div>
              </div>
              
              <p className="text-sm text-dark-400">
                Invite friends and earn GH₵5.00 for each successful referral!
              </p>
            </div>
          </div>

          {/* Account Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Account Info</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-dark-400">Email</div>
                <div className="text-white">{user?.email}</div>
              </div>
              <div>
                <div className="text-sm text-dark-400">Phone</div>
                <div className="text-white">{userProfile?.phone || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-dark-400">Member Since</div>
                <div className="text-white">
                  {new Date(user?.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
