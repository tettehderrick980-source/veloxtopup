import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import { 
  PlusIcon, 
  ShareIcon, 
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const { user, userProfile } = useAuth();
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [referralStats, setReferralStats] = useState({ total: 0, totalBonus: 0 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const copyReferralLink = async () => {
    const referralLink = `${window.location.origin}/register?ref=${user?.user_metadata?.referral_code}`;
    
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = referralLink;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
      case 'delivered':
        return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
      case 'pending':
      case 'processing':
        return <ClockIcon className="w-4 h-4 text-yellow-400" />;
      case 'failed':
      case 'expired':
        return <XCircleIcon className="w-4 h-4 text-red-400" />;
      default:
        return <ExclamationCircleIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const baseClasses = "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'success':
      case 'delivered':
        return `${baseClasses} badge-success`;
      case 'pending':
      case 'processing':
        return `${baseClasses} badge-warning`;
      case 'failed':
      case 'expired':
        return `${baseClasses} badge-error`;
      default:
        return `${baseClasses} badge-info`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-dark-800 rounded-xl w-48"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-24"></div>
              ))}
            </div>
            <div className="skeleton h-64"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Welcome back, {user?.email?.split('@')[0]}
              </h1>
              <p className="mt-1 text-primary-100 text-sm sm:text-base">
                Manage your purchases and track your activity
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Link
                to="/buy"
                className="inline-flex items-center px-6 py-3 bg-white text-primary-600 font-medium rounded-xl hover:bg-primary-50 transition-colors shadow-lg"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                Buy Data
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card-hover group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm font-medium">Transactions</p>
                <p className="text-3xl font-bold text-white mt-1">{recentTransactions.length}</p>
                <p className="text-xs text-dark-500 mt-2">Total purchases</p>
              </div>
              <div className="p-3 bg-primary-500/10 rounded-xl group-hover:bg-primary-500/20 transition-colors">
                <ArrowTrendingUpIcon className="w-6 h-6 text-primary-400" />
              </div>
            </div>
          </div>

          <div className="card-hover group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm font-medium">Referrals</p>
                <p className="text-3xl font-bold text-white mt-1">{referralStats.total}</p>
                <p className="text-xs text-dark-500 mt-2">People invited</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                <UserGroupIcon className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="card-hover group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-dark-400 text-sm font-medium">Bonus Earned</p>
                <p className="text-3xl font-bold text-primary-400 mt-1">GH₵{referralStats.totalBonus.toFixed(2)}</p>
                <p className="text-xs text-dark-500 mt-2">From referrals</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-xl group-hover:bg-yellow-500/20 transition-colors">
                <CurrencyDollarIcon className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Transactions */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
                <Link 
                  to="/transactions" 
                  className="text-sm text-primary-400 hover:text-primary-300 transition-colors font-medium"
                >
                  View All →
                </Link>
              </div>
              
              {recentTransactions.length > 0 ? (
                <div className="space-y-3">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-dark-700/50 rounded-xl hover:bg-dark-700 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-dark-600 rounded-lg">
                          {getStatusIcon(transaction.status)}
                        </div>
                        <div>
                          <div className="text-white font-medium capitalize">{transaction.type}</div>
                          <div className="text-dark-400 text-sm">
                            {transaction.network} • {transaction.phone}
                          </div>
                          <div className="text-dark-500 text-xs mt-1">
                            {transaction.plan} • {transaction.capacity}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-primary-400 font-semibold">GH₵{transaction.amount?.toFixed(2)}</div>
                        <div className={getStatusBadge(transaction.status)}>
                          {transaction.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-4 bg-dark-700/50 rounded-xl inline-flex mb-4">
                    <ArrowTrendingUpIcon className="w-8 h-8 text-dark-400" />
                  </div>
                  <p className="text-dark-400 font-medium">No transactions yet</p>
                  <p className="text-dark-500 text-sm mt-1">Start by purchasing your first data bundle</p>
                  <Link
                    to="/buy"
                    className="inline-flex items-center mt-4 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-xl hover:bg-primary-600 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Buy Data
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Referral Card */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-500/10 rounded-xl mb-3">
                  <ShareIcon className="w-6 h-6 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Refer & Earn</h3>
                <p className="text-sm text-dark-400">Earn GH₵5.00 per referral</p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Your Referral Code
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={userProfile?.referral_code || ''}
                      readOnly
                      className="input-field flex-1 text-center font-mono"
                    />
                    <button 
                      onClick={copyReferralLink}
                      className="btn-primary px-4 relative"
                    >
                      {copied ? (
                        <CheckCircleIcon className="w-5 h-5" />
                      ) : (
                        <ShareIcon className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-400 mt-2 text-center">Copied to clipboard!</p>
                  )}
                </div>
                
                <div className="pt-4 border-t border-dark-700">
                  <h4 className="text-sm font-medium text-dark-300 mb-3">How it works:</h4>
                  <ol className="space-y-2 text-sm text-dark-400">
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-primary-500/10 text-primary-400 rounded-full flex items-center justify-center text-xs font-medium mr-2 mt-0.5">1</span>
                      <span>Share your referral code with friends</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-primary-500/10 text-primary-400 rounded-full flex items-center justify-center text-xs font-medium mr-2 mt-0.5">2</span>
                      <span>They sign up and make a purchase</span>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 w-5 h-5 bg-primary-500/10 text-primary-400 rounded-full flex items-center justify-center text-xs font-medium mr-2 mt-0.5">3</span>
                      <span>You earn GH₵5.00 instantly!</span>
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
