import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, supabase } from '../lib/supabase';
import { RefundModal } from '../components/RefundModal';
import { RetryModal } from '../components/RetryModal';
import { useNotification } from '../contexts/NotificationContext';
import { 
  UsersIcon, 
  CreditCardIcon, 
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  EyeIcon,
  PlayIcon,
  BanknotesIcon as RefundIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  WalletIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function AdminDashboardPage() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    totalWalletBalance: 0,
    pendingTransactions: 0,
    failedTransactions: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Transaction management state
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  const [ghDataConnectBalance, setGhDataConnectBalance] = useState(null);
  
  // Modal states for refund and retry
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [selectedTransactionForAction, setSelectedTransactionForAction] = useState(null);
  
  const { success, error } = useNotification();

  useEffect(() => {
    if (userProfile?.role !== 'admin') return;
    fetchDashboardData();
    fetchGhDataConnectBalance();
  }, [userProfile, activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'overview') {
        const dashboardStats = await db.getDashboardStats();
        setStats(dashboardStats);
      } else if (activeTab === 'transactions') {
        const { data } = await db.getAllTransactions();
        setTransactions(data || []);
      } else if (activeTab === 'users') {
        const { data } = await db.getAllUsers();
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGhDataConnectBalance = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('ghdataconnect-balance')
      if (!error && data?.data?.balance) {
        setGhDataConnectBalance(data.data.balance)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  // Transaction Actions
  const handleViewTransaction = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionModal(true);
  };

  const openRefundModal = (transaction) => {
    setSelectedTransactionForAction(transaction);
    setShowRefundModal(true);
  };

  const openRetryModal = (transaction) => {
    setSelectedTransactionForAction(transaction);
    setShowRetryModal(true);
  };

  const handleRefundTransaction = async (refundData) => {
    setProcessingAction(true);
    setActionMessage({ type: '', text: '' });
    
    try {
      // Update transaction with full audit trail
      const { error: dbError } = await db.updateTransaction(refundData.transactionId, {
        status: 'refunded',
        refunded_at: refundData.refundedAt,
        refund_reason: refundData.reason,
        refund_amount: refundData.amount,
        refunded_by: refundData.refundedBy,
        customer_notified: refundData.notifyCustomer,
        updated_at: new Date().toISOString()
      });
      
      if (dbError) throw dbError;
      
      success(`Successfully refunded GH₵${refundData.amount.toFixed(2)}`);
      setActionMessage({ type: 'success', text: 'Transaction refunded successfully!' });
      fetchDashboardData();
    } catch (err) {
      console.error('Refund error:', err);
      error('Refund failed: ' + err.message);
      setActionMessage({ type: 'error', text: 'Failed to process refund: ' + err.message });
      throw err;
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRetryTransaction = async (retryData) => {
    setProcessingAction(true);
    setActionMessage({ type: '', text: '' });
    
    try {
      // Update transaction with retry tracking
      const { error: dbError } = await db.updateTransaction(retryData.transactionId, {
        status: 'processing',
        fulfillment_status: 'processing',
        retry_count: retryData.previousAttempts,
        last_retry_at: retryData.retriedAt,
        retry_reason: 'admin_retry',
        updated_at: new Date().toISOString()
      });
      
      if (dbError) throw dbError;
      
      // Invoke purchase-data edge function to retry
      const { error: fnError } = await supabase.functions.invoke('purchase-data', {
        body: {
          transactionId: retryData.transactionId,
          network: retryData.network,
          phone: retryData.phone,
          capacity: retryData.capacity,
          cost_price: retryData.amount * 0.95,
          selling_price: retryData.amount,
          reference: `retry-${Date.now()}`,
          is_retry: true
        }
      })

      if (fnError) throw fnError
      
      success('Transaction retry initiated successfully!');
      setActionMessage({ type: 'success', text: 'Transaction retry initiated!' });
      fetchDashboardData();
    } catch (err) {
      console.error('Retry error:', err);
      error('Retry failed: ' + err.message);
      setActionMessage({ type: 'error', text: 'Failed to retry: ' + err.message });
      throw err;
    } finally {
      setProcessingAction(false);
    }
  };

  const closeTransactionModal = () => {
    setShowTransactionModal(false);
    setSelectedTransaction(null);
    setActionMessage({ type: '', text: '' });
  };

  if (userProfile?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-dark-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'transactions', label: 'Transactions', icon: CreditCardIcon },
    { id: 'users', label: 'Users', icon: UsersIcon }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-48">
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Admin Panel</h2>
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`sidebar-item w-full ${activeTab === item.id ? 'active' : ''}`}
                >
                  <item.icon className="w-5 h-5 mr-2" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
                <button onClick={fetchDashboardData} className="btn-secondary">
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>

              {/* System Health */}
              <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                <div className="flex items-center">
                  <ShieldCheckIcon className="w-6 h-6 text-green-400 mr-3" />
                  <div>
                    <p className="text-white font-semibold">System Status: Operational</p>
                    <p className="text-green-300 text-sm">All systems running smoothly</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card p-4 text-center">
                  <UsersIcon className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-dark-400 text-xs uppercase">Users</p>
                  <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                </div>

                <div className="card p-4 text-center">
                  <CreditCardIcon className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-dark-400 text-xs uppercase">Transactions</p>
                  <p className="text-2xl font-bold text-white">{stats.totalTransactions}</p>
                </div>

                <div className="card p-4 text-center">
                  <CurrencyDollarIcon className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <p className="text-dark-400 text-xs uppercase">Revenue</p>
                  <p className="text-2xl font-bold text-white">GH₵{stats.totalRevenue?.toFixed(2)}</p>
                </div>

                <div className="card p-4 text-center">
                  <WalletIcon className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-dark-400 text-xs uppercase">API Balance</p>
                  <p className="text-2xl font-bold text-primary-400">
                    GH₵{Number(ghDataConnectBalance || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Transaction Status Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 border-l-4 border-green-500">
                  <p className="text-dark-400 text-xs uppercase">Successful</p>
                  <p className="text-2xl font-bold text-green-400">
                    {transactions.filter(t => t.status === 'success' || t.status === 'delivered').length}
                  </p>
                </div>
                <div className="card p-4 border-l-4 border-yellow-500">
                  <p className="text-dark-400 text-xs uppercase">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {transactions.filter(t => t.status === 'pending' || t.status === 'processing').length}
                  </p>
                </div>
                <div className="card p-4 border-l-4 border-red-500">
                  <p className="text-dark-400 text-xs uppercase">Failed</p>
                  <p className="text-2xl font-bold text-red-400">
                    {transactions.filter(t => t.status === 'failed').length}
                  </p>
                </div>
                <div className="card p-4 border-l-4 border-gray-500">
                  <p className="text-dark-400 text-xs uppercase">Refunded</p>
                  <p className="text-2xl font-bold text-gray-400">
                    {transactions.filter(t => t.status === 'refunded').length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab - Enhanced */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Transaction Management</h1>
                <button onClick={fetchDashboardData} className="btn-secondary">
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>

              {/* Action Message */}
              {actionMessage.text && (
                <div className={`p-4 rounded-lg ${
                  actionMessage.type === 'success' 
                    ? 'bg-green-900/20 border border-green-700' 
                    : 'bg-red-900/20 border border-red-700'
                }`}>
                  <div className="flex items-center">
                    {actionMessage.type === 'success' ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />
                    ) : (
                      <XCircleIcon className="w-5 h-5 text-red-400 mr-2" />
                    )}
                    <span className={actionMessage.type === 'success' ? 'text-green-300' : 'text-red-300'}>
                      {actionMessage.text}
                    </span>
                  </div>
                </div>
              )}

              {/* Filters & Search */}
              <div className="card">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <h3 className="text-lg font-semibold text-white">All Transactions</h3>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={transactionSearch}
                        onChange={(e) => setTransactionSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm w-full sm:w-64"
                      />
                    </div>
                    
                    <div className="relative">
                      <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
                      <select
                        value={transactionFilter}
                        onChange={(e) => setTransactionFilter(e.target.value)}
                        className="pl-10 pr-8 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm appearance-none cursor-pointer"
                      >
                        <option value="all">All Status</option>
                        <option value="success">Successful</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Transactions Table */}
                {loading ? (
                  <div className="animate-pulse h-64 bg-dark-700 rounded-lg"></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-700">
                          <th className="pb-3 text-left text-dark-400 text-xs uppercase">Reference</th>
                          <th className="pb-3 text-left text-dark-400 text-xs uppercase">Customer</th>
                          <th className="pb-3 text-left text-dark-400 text-xs uppercase">Amount</th>
                          <th className="pb-3 text-left text-dark-400 text-xs uppercase">Status</th>
                          <th className="pb-3 text-left text-dark-400 text-xs uppercase">Date</th>
                          <th className="pb-3 text-left text-dark-400 text-xs uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700">
                        {transactions
                          .filter(tx => {
                            const matchesFilter = transactionFilter === 'all' || tx.status === transactionFilter;
                            const matchesSearch = transactionSearch === '' || 
                              tx.reference?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                              tx.phone?.includes(transactionSearch);
                            return matchesFilter && matchesSearch;
                          })
                          .map((tx) => (
                          <tr key={tx.id} className="hover:bg-dark-700/50 transition-colors">
                            <td className="py-3">
                              <span className="text-white font-medium text-sm">{tx.reference?.slice(0, 12)}...</span>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-col">
                                <span className="text-white text-sm">{tx.users?.email || 'Guest'}</span>
                                <span className="text-dark-500 text-xs">{tx.phone}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="text-white font-semibold text-sm">GH₵{Number(tx.amount).toFixed(2)}</span>
                            </td>
                            <td className="py-3">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                tx.status === 'success' || tx.status === 'delivered' 
                                  ? 'bg-green-900/50 text-green-300 border border-green-700' :
                                tx.status === 'pending' || tx.status === 'processing'
                                  ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' :
                                tx.status === 'failed'
                                  ? 'bg-red-900/50 text-red-300 border border-red-700' :
                                tx.status === 'refunded'
                                  ? 'bg-gray-700/50 text-gray-300 border border-gray-600' :
                                'bg-dark-700 text-dark-300'
                              }`}>
                                {tx.status === 'success' && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                                {tx.status === 'failed' && <XCircleIcon className="w-3 h-3 mr-1" />}
                                {tx.status === 'pending' && <ClockIcon className="w-3 h-3 mr-1" />}
                                {tx.status}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="text-dark-400 text-sm">
                                {new Date(tx.created_at).toLocaleDateString()}
                              </span>
                            </td>
                            <td className="py-3">
                              <div className="flex items-center space-x-1">
                                <button 
                                  onClick={() => handleViewTransaction(tx)}
                                  className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-lg"
                                  title="View"
                                >
                                  <EyeIcon className="w-4 h-4" />
                                </button>
                                
                                {(tx.status === 'failed' || tx.status === 'pending') && (
                                  <button 
                                    onClick={() => openRetryModal(tx)}
                                    disabled={processingAction}
                                    className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30 rounded-lg disabled:opacity-50"
                                    title="Retry"
                                  >
                                    <PlayIcon className="w-4 h-4" />
                                  </button>
                                )}
                                
                                {(tx.status === 'success' || tx.status === 'failed') && tx.status !== 'refunded' && (
                                  <button 
                                    onClick={() => openRefundModal(tx)}
                                    disabled={processingAction}
                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg disabled:opacity-50"
                                    title="Refund"
                                  >
                                    <RefundIcon className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Transaction Detail Modal */}
              {showTransactionModal && selectedTransaction && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                  <div className="bg-dark-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between p-6 border-b border-dark-700">
                      <div>
                        <h3 className="text-xl font-bold text-white">Transaction Details</h3>
                        <p className="text-dark-400 text-sm">{selectedTransaction.reference}</p>
                      </div>
                      <button onClick={closeTransactionModal} className="p-2 hover:bg-dark-700 rounded-lg">
                        <XMarkIcon className="w-6 h-6 text-dark-400" />
                      </button>
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="flex items-center justify-center">
                        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          selectedTransaction.status === 'success' 
                            ? 'bg-green-900/50 text-green-300' :
                          selectedTransaction.status === 'failed'
                            ? 'bg-red-900/50 text-red-300' :
                          'bg-yellow-900/50 text-yellow-300'
                        }`}>
                          {selectedTransaction.status?.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-dark-700/50 p-4 rounded-lg">
                          <p className="text-dark-400 text-xs uppercase">Amount</p>
                          <p className="text-white text-lg font-bold">GH₵{Number(selectedTransaction.amount).toFixed(2)}</p>
                        </div>
                        <div className="bg-dark-700/50 p-4 rounded-lg">
                          <p className="text-dark-400 text-xs uppercase">Type</p>
                          <p className="text-white text-lg font-semibold">{selectedTransaction.type}</p>
                        </div>
                      </div>

                      <div className="bg-dark-700/30 p-4 rounded-lg">
                        <h4 className="text-white font-semibold mb-3">Customer</h4>
                        <p className="text-dark-400 text-sm">
                          Email: <span className="text-white">{selectedTransaction.users?.email || 'Guest'}</span>
                        </p>
                        <p className="text-dark-400 text-sm">
                          Phone: <span className="text-white">{selectedTransaction.phone}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 p-6 border-t border-dark-700">
                      <button onClick={closeTransactionModal} className="px-4 py-2 bg-dark-700 text-white rounded-lg">
                        Close
                      </button>
                      {(selectedTransaction.status === 'failed' || selectedTransaction.status === 'pending') && (
                        <button 
                          onClick={() => { openRetryModal(selectedTransaction); closeTransactionModal(); }}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg"
                        >
                          Retry
                        </button>
                      )}
                      {(selectedTransaction.status === 'success' || selectedTransaction.status === 'delivered' || selectedTransaction.status === 'failed') && selectedTransaction.status !== 'refunded' && (
                        <button 
                          onClick={() => { openRefundModal(selectedTransaction); closeTransactionModal(); }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg"
                        >
                          Refund
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Refund Modal */}
              <RefundModal
                transaction={selectedTransactionForAction}
                isOpen={showRefundModal}
                onClose={() => {
                  setShowRefundModal(false);
                  setSelectedTransactionForAction(null);
                }}
                onRefund={handleRefundTransaction}
              />

              {/* Retry Modal */}
              <RetryModal
                transaction={selectedTransactionForAction}
                isOpen={showRetryModal}
                onClose={() => {
                  setShowRetryModal(false);
                  setSelectedTransactionForAction(null);
                }}
                onRetry={handleRetryTransaction}
                apiBalance={ghDataConnectBalance}
              />
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white">Users</h1>
                <button onClick={fetchDashboardData} className="btn-secondary">
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>
              <div className="card">
                {loading ? (
                  <div className="animate-pulse h-64"></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Email</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Role</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-dark-800/50">
                            <td className="py-3 px-4 text-dark-300 text-sm">{user.email}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-purple-900/20 text-purple-400 border border-purple-700'
                                  : 'bg-blue-900/20 text-blue-400 border border-blue-700'
                              }`}>{user.role}</span>
                            </td>
                            <td className="py-3 px-4 text-dark-300 text-sm">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
