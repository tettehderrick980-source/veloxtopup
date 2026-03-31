import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GhDataConnectService } from '../services/ghDataConnect';
import { db } from '../lib/supabase';
import { 
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  ServerIcon,
  BellIcon,
  ChartBarIcon,
  UsersIcon,
  ShoppingBagIcon,
  XCircleIcon,
  ArrowUpCircleIcon,
  ArrowDownCircleIcon
} from '@heroicons/react/24/outline';

export default function AdminDashboard() {
  const { user, userProfile } = useAuth();
  const [walletBalance, setWalletBalance] = useState('0.00');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin) {
      fetchWalletBalance();
      fetchAllTransactions();
    }
  }, [isAdmin]);

  // Auto-refresh transactions every 10 seconds for super admins
  useEffect(() => {
    if (!isAdmin || !autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchAllTransactions();
    }, 10000);

    return () => clearInterval(interval);
  }, [isAdmin, autoRefresh]);

  const fetchWalletBalance = async () => {
    try {
      setLoading(true);
      setError('');
      const balance = await GhDataConnectService.getWalletBalance();
      setWalletBalance(balance);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      setError('Failed to fetch wallet balance');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const { data, error } = await db.getAllTransactions();
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchWalletBalance();
    await fetchAllTransactions();
    setRefreshing(false);
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: { 
        color: 'badge-warning',
        textColor: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        icon: ClockIcon,
        label: 'Pending'
      },
      processing: { 
        color: 'badge-info',
        textColor: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        icon: ArrowPathIcon,
        label: 'Processing'
      },
      queued: { 
        color: 'badge-warning',
        textColor: 'text-orange-400',
        bgColor: 'bg-orange-500/10',
        icon: ClockIcon,
        label: 'Queued'
      },
      delivered: { 
        color: 'badge-success',
        textColor: 'text-green-400',
        bgColor: 'bg-green-500/10',
        icon: CheckCircleIcon,
        label: 'Delivered'
      },
      success: { 
        color: 'badge-success',
        textColor: 'text-green-400',
        bgColor: 'bg-green-500/10',
        icon: CheckCircleIcon,
        label: 'Success'
      },
      failed: { 
        color: 'badge-error',
        textColor: 'text-red-400',
        bgColor: 'bg-red-500/10',
        icon: XCircleIcon,
        label: 'Failed'
      },
      cancelled: { 
        color: 'badge-error',
        textColor: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        icon: XCircleIcon,
        label: 'Cancelled'
      },
      expired: { 
        color: 'badge-error',
        textColor: 'text-gray-400',
        bgColor: 'bg-gray-500/10',
        icon: ExclamationTriangleIcon,
        label: 'Expired'
      }
    };
    return configs[status] || configs.pending;
  };

  const countByStatus = (status) => transactions.filter(t => t.status === status).length;
  
  const countByFulfillmentStatus = (status) => 
    transactions.filter(t => t.fulfillment_status === status).length;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-dark-950 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="card text-center py-16">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircleIcon className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Access Denied</h2>
            <p className="text-dark-300 text-lg">You don't have permission to access this dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {userProfile?.role === 'super_admin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}
            </h1>
            <p className="text-dark-400">Real-time monitoring and management</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-dark-300 px-3 py-2 bg-dark-800/50 rounded-xl border border-dark-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-primary-500 focus:ring-primary-500"
              />
              <span>Auto-refresh</span>
            </label>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary flex items-center gap-2 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="card p-6 text-center hover:scale-[1.02] transition-transform">
            <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ClockIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-400">{countByStatus('pending')}</p>
            <p className="text-sm text-dark-400">Pending</p>
          </div>
          <div className="card p-6 text-center hover:scale-[1.02] transition-transform">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ArrowPathIcon className="w-6 h-6 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-blue-400">{countByStatus('processing')}</p>
            <p className="text-sm text-dark-400">Processing</p>
          </div>
          <div className="card p-6 text-center border border-orange-500/30 hover:scale-[1.02] transition-transform">
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ClockIcon className="w-6 h-6 text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-orange-400">{countByFulfillmentStatus('queued')}</p>
            <p className="text-sm text-dark-400">Queued</p>
          </div>
          <div className="card p-6 text-center hover:scale-[1.02] transition-transform">
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-400">{countByStatus('delivered') + countByStatus('success')}</p>
            <p className="text-sm text-dark-400">Delivered</p>
          </div>
          <div className="card p-6 text-center hover:scale-[1.02] transition-transform">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <XCircleIcon className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-400">{countByStatus('failed') + countByFulfillmentStatus('expired')}</p>
            <p className="text-sm text-dark-400">Failed/Expired</p>
          </div>
          <div className="card p-6 text-center hover:scale-[1.02] transition-transform">
            <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ChartBarIcon className="w-6 h-6 text-primary-400" />
            </div>
            <p className="text-2xl font-bold text-white">{transactions.length}</p>
            <p className="text-sm text-dark-400">Total</p>
          </div>
        </div>

        {/* Low Balance Alert Banner */}
        {parseFloat(walletBalance) < 10 && (
          <div className="alert-error">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-400 mb-1">⚠️ Low Wallet Balance</h3>
                <p className="text-red-200 text-sm">
                  Your wallet balance is GH₵{parseFloat(walletBalance).toFixed(2)}. Orders are being queued. Top up immediately to avoid order expirations.
                </p>
              </div>
              <button
                onClick={() => window.open('https://ghdataconnect.com/dashboard', '_blank')}
                className="btn-primary bg-red-600 hover:bg-red-700 flex-shrink-0"
              >
                Top Up Now
              </button>
            </div>
          </div>
        )}

        {/* Pending Fulfillment Orders */}
        {countByFulfillmentStatus('queued') > 0 && (
          <div className="card border border-orange-500/30">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                  <ClockIcon className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-orange-400">Orders Pending Fulfillment</h2>
                  <p className="text-sm text-orange-300">{countByFulfillmentStatus('queued')} orders waiting</p>
                </div>
              </div>
              <span className="text-sm text-orange-300 bg-orange-500/10 px-3 py-1 rounded-lg">
                Top up wallet to process
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">Network</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">Phone</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">Bundle</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">Cost</th>
                    <th className="text-left py-3 px-4 text-dark-400 font-medium">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions
                    .filter(tx => tx.fulfillment_status === 'queued')
                    .slice(0, 5)
                    .map((tx) => (
                      <tr key={tx.id} className="border-b border-dark-700/50 hover:bg-dark-800/50 transition-colors">
                        <td className="py-3 px-4 text-white capitalize font-medium">{tx.network || '-'}</td>
                        <td className="py-3 px-4 text-dark-300">{tx.phone || '-'}</td>
                        <td className="py-3 px-4 text-dark-300">{tx.capacity ? `${tx.capacity}GB` : '-'}</td>
                        <td className="py-3 px-4 text-red-400 font-medium">GH₵{tx.cost_price?.toFixed(2) || '0.00'}</td>
                        <td className="py-3 px-4 text-orange-300 text-sm">
                          {tx.fulfillment_expires_at ? (
                            <span className="flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" />
                              {new Date(tx.fulfillment_expires_at).toLocaleTimeString()}
                            </span>
                          ) : 'Soon'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wallet Balance Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
              <CreditCardIcon className="w-5 h-5 text-primary-400" />
            </div>
            <h2 className="text-xl font-bold text-white">GhDataConnect Wallet</h2>
          </div>
          
          {error && (
            <div className="alert-error mb-6">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 mr-3" />
                {error}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-600 hover:border-primary-500/20 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-400 mb-2">Current Balance</p>
                  <p className="text-3xl font-bold text-white">
                    GH₵{loading ? '...' : parseFloat(walletBalance).toFixed(2)}
                  </p>
                </div>
                <div className="w-14 h-14 bg-primary-500/10 rounded-xl flex items-center justify-center">
                  <CurrencyDollarIcon className="w-7 h-7 text-primary-400" />
                </div>
              </div>
            </div>

            <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-600 hover:border-green-500/20 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-400 mb-2">API Status</p>
                  <p className="text-2xl font-bold text-green-400">
                    {loading ? '...' : 'Connected'}
                  </p>
                </div>
                <div className="w-14 h-14 bg-green-500/10 rounded-xl flex items-center justify-center">
                  <ServerIcon className="w-7 h-7 text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-dark-800/50 rounded-xl p-6 border border-dark-600 hover:border-blue-500/20 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-dark-400 mb-2">Last Updated</p>
                  <p className="text-lg font-semibold text-white">
                    {new Date().toLocaleTimeString()}
                  </p>
                </div>
                <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <ClockIcon className="w-7 h-7 text-blue-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Balance'}
            </button>
            
            <button
              onClick={() => window.open('https://ghdataconnect.com/dashboard', '_blank')}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              <ServerIcon className="w-4 h-4" />
              Open GhDataConnect Dashboard
            </button>
          </div>
        </div>

        {/* Live Transactions Monitor */}
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
                <ChartBarIcon className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Live Transaction Monitor</h2>
                <p className="text-sm text-dark-400">Real-time transaction updates</p>
              </div>
            </div>
            {transactionsLoading && (
              <div className="flex items-center gap-2 text-sm text-blue-400">
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Updating...
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Status</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Network</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Phone</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Plan</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Amount</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-dark-400">
                      <div className="flex flex-col items-center gap-3">
                        <ShoppingBagIcon className="w-12 h-12 text-dark-500" />
                        <span className="text-lg font-medium">No transactions found</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transactions.slice(0, 20).map((tx) => {
                    const statusConfig = getStatusConfig(tx.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={tx.id} className="border-b border-dark-700/50 hover:bg-dark-800/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.textColor} ${statusConfig.bgColor}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white capitalize font-medium">{tx.network || '-'}</td>
                        <td className="py-3 px-4 text-dark-300">{tx.phone || '-'}</td>
                        <td className="py-3 px-4 text-dark-300">{tx.plan || tx.capacity ? `${tx.capacity}GB` : '-'}</td>
                        <td className="py-3 px-4 text-primary-400 font-medium">
                          GH₵{tx.amount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="py-3 px-4 text-dark-400 text-sm">
                          {tx.created_at ? new Date(tx.created_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {transactions.length > 20 && (
            <div className="text-center mt-6">
              <p className="text-sm text-dark-400">
                Showing 20 of {transactions.length} transactions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
