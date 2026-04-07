import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, supabase } from '../lib/supabase';
import { RefundModal } from '../components/RefundModal';
import { RetryModal } from '../components/RetryModal';
import { useNotification } from '../contexts/NotificationContext';
import { 
  UsersIcon, 
  BanknotesIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  WalletIcon,
  ArrowPathIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  UserMinusIcon,
  BackwardIcon,
  ArrowUturnLeftIcon,
  PlayIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon as RefundIcon,
  DocumentArrowDownIcon,
  BellIcon,
  ChartBarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export default function SuperAdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingTransactions: 0,
    failedTransactions: 0
  });
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  const [showCreateSuperAdmin, setShowCreateSuperAdmin] = useState(false);
  const [newSuperAdmin, setNewSuperAdmin] = useState({ email: '', password: '', phone: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [transactionSearch, setTransactionSearch] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  
  const [ghDataConnectBalance, setGhDataConnectBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  
  // Additional Super Admin features
  const [notifications, setNotifications] = useState([]);
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Modal states for refund and retry
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [selectedTransactionForAction, setSelectedTransactionForAction] = useState(null);

  useEffect(() => {
    fetchSuperAdminData();
    fetchGhDataConnectBalance();
  }, []);

  const fetchGhDataConnectBalance = async () => {
    setBalanceLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghdataconnect-balance')
      if (!error && data?.data?.balance) {
        setGhDataConnectBalance(data.data.balance)
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchSuperAdminData = async () => {
    try {
      const [usersResult, transactionsResult] = await Promise.all([
        db.getAllUsers(),
        db.getAllTransactions()
      ]);

      const allUsers = usersResult.data || [];
      const allTransactions = transactionsResult.data || [];

      const totalRevenue = allTransactions
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      setStats({
        totalUsers: allUsers.length,
        totalTransactions: allTransactions.length,
        totalRevenue,
        pendingTransactions: allTransactions.filter(t => t.status === 'pending').length,
        failedTransactions: allTransactions.filter(t => t.status === 'failed').length
      });

      setUsers(allUsers.slice(0, 10));
      setTransactions(allTransactions.slice(0, 10));

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      if (action === 'view') {
        const userData = users.find(u => u.id === userId);
        alert(`Email: ${userData?.email}\nRole: ${userData?.role}`);
      } else if (action === 'suspend') {
        if (confirm('Suspend this user?')) {
          await db.updateUser(userId, { status: 'suspended' });
          alert('User suspended');
          fetchSuperAdminData();
        }
      } else if (action === 'activate') {
        await db.updateUser(userId, { status: 'active' });
        alert('User activated');
        fetchSuperAdminData();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error performing action');
    }
  };

  const handleCreateSuperAdmin = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreateLoading(true);

    try {
      if (!newSuperAdmin.email || !newSuperAdmin.password || !newSuperAdmin.phone) {
        setCreateError('All fields required');
        setCreateLoading(false);
        return;
      }

      const { error } = await db.createSuperAdmin(
        newSuperAdmin.email,
        newSuperAdmin.password,
        newSuperAdmin.phone
      );

      if (error) {
        setCreateError(error.message);
        setCreateLoading(false);
        return;
      }

      setCreateSuccess('Super Admin created!');
      setNewSuperAdmin({ email: '', password: '', phone: '' });
      setShowCreateSuperAdmin(false);
      fetchSuperAdminData();
    } catch (error) {
      setCreateError('An unexpected error occurred');
    } finally {
      setCreateLoading(false);
    }
  };

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
      // Update transaction status to refunded with full audit trail
      const { error } = await db.updateTransaction(refundData.transactionId, {
        status: 'refunded',
        refunded_at: refundData.refundedAt,
        refund_reason: refundData.reason,
        refund_amount: refundData.amount,
        refunded_by: refundData.refundedBy,
        customer_notified: refundData.notifyCustomer,
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      // Log refund action for audit
      console.log('Refund processed:', {
        transactionId: refundData.transactionId,
        amount: refundData.amount,
        reason: refundData.reason,
        refundedBy: refundData.refundedBy,
        refundedAt: refundData.refundedAt,
        customerNotified: refundData.notifyCustomer
      });
      
      setActionMessage({ type: 'success', text: 'Transaction refunded successfully!' });
      fetchSuperAdminData();
    } catch (error) {
      console.error('Refund error:', error);
      setActionMessage({ type: 'error', text: 'Failed to process refund: ' + error.message });
      throw error;
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRetryTransaction = async (retryData) => {
    setProcessingAction(true);
    setActionMessage({ type: '', text: '' });
    
    try {
      // Update status back to processing with retry tracking
      const { error } = await db.updateTransaction(retryData.transactionId, {
        status: 'processing',
        fulfillment_status: 'processing',
        retry_count: retryData.previousAttempts,
        last_retry_at: retryData.retriedAt,
        retry_reason: 'admin_retry',
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
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
      
      // Log retry action for audit
      console.log('Retry initiated:', {
        transactionId: retryData.transactionId,
        network: retryData.network,
        phone: retryData.phone,
        amount: retryData.amount,
        attempt: retryData.previousAttempts,
        retriedAt: retryData.retriedAt
      });
      
      setActionMessage({ type: 'success', text: 'Transaction retry initiated!' });
      fetchSuperAdminData();
    } catch (error) {
      console.error('Retry error:', error);
      setActionMessage({ type: 'error', text: 'Failed to retry transaction: ' + error.message });
      throw error;
    } finally {
      setProcessingAction(false);
    }
  };

  const closeTransactionModal = () => {
    setShowTransactionModal(false);
    setSelectedTransaction(null);
    setActionMessage({ type: '', text: '' });
  };

  // Export transactions to CSV
  const exportTransactions = () => {
    const filteredTransactions = transactions.filter(tx => {
      const matchesFilter = transactionFilter === 'all' || tx.status === transactionFilter;
      const matchesSearch = transactionSearch === '' || 
        tx.reference?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
        tx.phone?.includes(transactionSearch);
      return matchesFilter && matchesSearch;
    });

    const csvContent = [
      ['Reference', 'Email', 'Phone', 'Type', 'Network', 'Amount', 'Status', 'Date'].join(','),
      ...filteredTransactions.map(tx => [
        tx.reference,
        tx.users?.email || 'Guest',
        tx.phone || '',
        tx.type,
        tx.network || '',
        tx.amount,
        tx.status,
        new Date(tx.created_at).toLocaleDateString()
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    setActionMessage({ type: 'success', text: 'Transactions exported successfully!' });
  };

  // Analytics calculations
  const getDailyStats = () => {
    const dailyData = {};
    transactions.forEach(tx => {
      const date = new Date(tx.created_at).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = { count: 0, revenue: 0, successful: 0, failed: 0 };
      }
      dailyData[date].count++;
      if (tx.status === 'success') {
        dailyData[date].revenue += tx.amount;
        dailyData[date].successful++;
      } else if (tx.status === 'failed') {
        dailyData[date].failed++;
      }
    });
    return Object.entries(dailyData).slice(-7); // Last 7 days
  };

  // Check system notifications
  useEffect(() => {
    const alerts = [];
    
    if (ghDataConnectBalance !== null && ghDataConnectBalance < 10) {
      alerts.push({
        type: 'warning',
        message: `Low API Balance: GH₵${ghDataConnectBalance.toFixed(2)}`,
        icon: WalletIcon
      });
    }
    
    const failedCount = transactions.filter(t => t.status === 'failed').length;
    if (failedCount > 5) {
      alerts.push({
        type: 'error',
        message: `${failedCount} failed transactions need attention`,
        icon: ExclamationTriangleIcon
      });
    }
    
    const pendingCount = transactions.filter(t => t.status === 'pending').length;
    if (pendingCount > 10) {
      alerts.push({
        type: 'info',
        message: `${pendingCount} pending transactions`,
        icon: ClockIcon
      });
    }
    
    setNotifications(alerts);
  }, [ghDataConnectBalance, transactions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-primary-500">Loading...</div>
      </div>
    );
  }

  const statCards = [
    { name: 'Users', value: stats.totalUsers, icon: UsersIcon, color: 'text-blue-400' },
    { name: 'Revenue', value: `GH₵${stats.totalRevenue.toFixed(2)}`, icon: BanknotesIcon, color: 'text-green-400' },
    { name: 'Pending', value: stats.pendingTransactions, icon: ClockIcon, color: 'text-yellow-400' },
    { name: 'Failed', value: stats.failedTransactions, icon: ExclamationTriangleIcon, color: 'text-red-400' }
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Super Admin</h1>
        <p className="text-dark-400 text-sm">System oversight and control</p>
      </div>

      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          {notifications.map((notification, index) => (
            <div 
              key={index} 
              className={`p-4 rounded-lg border ${
                notification.type === 'warning' 
                  ? 'bg-yellow-900/20 border-yellow-700' :
                notification.type === 'error'
                  ? 'bg-red-900/20 border-red-700' :
                  'bg-blue-900/20 border-blue-700'
              }`}
            >
              <div className="flex items-center">
                <notification.icon className={`w-5 h-5 mr-3 ${
                  notification.type === 'warning' ? 'text-yellow-400' :
                  notification.type === 'error' ? 'text-red-400' :
                  'text-blue-400'
                }`} />
                <span className={
                  notification.type === 'warning' ? 'text-yellow-300' :
                  notification.type === 'error' ? 'text-red-300' :
                  'text-blue-300'
                }>
                  {notification.message}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System Health */}
      <div className="mb-6 p-4 bg-green-900/20 border border-green-800 rounded-lg">
        <div className="flex items-center">
          <ShieldCheckIcon className="w-6 h-6 text-green-400 mr-3" />
          <div>
            <p className="text-white font-semibold">System Health: Good</p>
            <p className="text-green-300 text-sm">All systems operational</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-dark-800 p-1 rounded-lg overflow-x-auto">
        {['overview', 'users', 'transactions'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              selectedTab === tab
                ? 'bg-primary-500 text-white'
                : 'text-dark-300 hover:text-white hover:bg-dark-700'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((stat) => (
              <div key={stat.name} className="card">
                <stat.icon className={`w-6 h-6 ${stat.color} mb-2`} />
                <p className="text-dark-400 text-sm">{stat.name}</p>
                <p className="text-xl font-bold text-white">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* GhDataConnect Balance */}
          <div className="card mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <WalletIcon className="w-8 h-8 text-primary-400 mr-3" />
                <div>
                  <p className="text-dark-400 text-sm">GhDataConnect Balance</p>
                  {balanceLoading ? (
                    <p className="text-lg font-bold text-white">Loading...</p>
                  ) : (
                    <p className="text-lg font-bold text-primary-400">GH₵{Number(ghDataConnectBalance || 0).toFixed(2)}</p>
                  )}
                </div>
              </div>
              <button
                onClick={fetchGhDataConnectBalance}
                disabled={balanceLoading}
                className="p-2 text-primary-400 hover:text-primary-300 hover:bg-dark-700 rounded-lg"
              >
                <ArrowPathIcon className={`w-5 h-5 ${balanceLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Recent Users */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Users</h3>
            <div className="space-y-3">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                  <div>
                    <p className="text-white text-sm">{u.email}</p>
                    <p className="text-dark-400 text-xs">{u.role}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button onClick={() => handleUserAction(u.id, 'view')} className="p-2 text-blue-400 hover:text-blue-300" title="View">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleUserAction(u.id, 'suspend')} className="p-2 text-red-400 hover:text-red-300" title="Suspend">
                      <UserMinusIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {selectedTab === 'users' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">User Management</h3>
            <button
              onClick={() => setShowCreateSuperAdmin(true)}
              className="flex items-center px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Create Admin
            </button>
          </div>
          
          {showCreateSuperAdmin && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">Create Super Admin</h3>
                  <button onClick={() => setShowCreateSuperAdmin(false)} className="text-dark-300 hover:text-white">
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>
                
                {createError && <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">{createError}</div>}
                {createSuccess && <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg text-green-300 text-sm">{createSuccess}</div>}
                
                <form onSubmit={handleCreateSuperAdmin} className="space-y-4">
                  <input type="email" value={newSuperAdmin.email} onChange={(e) => setNewSuperAdmin({...newSuperAdmin, email: e.target.value})} className="input-field w-full" placeholder="Email" required />
                  <input type="password" value={newSuperAdmin.password} onChange={(e) => setNewSuperAdmin({...newSuperAdmin, password: e.target.value})} className="input-field w-full" placeholder="Password" required />
                  <input type="tel" value={newSuperAdmin.phone} onChange={(e) => setNewSuperAdmin({...newSuperAdmin, phone: e.target.value})} className="input-field w-full" placeholder="Phone" required />
                  
                  <div className="flex space-x-3 pt-2">
                    <button type="button" onClick={() => setShowCreateSuperAdmin(false)} className="flex-1 px-4 py-2 bg-dark-700 text-dark-300 rounded-lg">Cancel</button>
                    <button type="submit" disabled={createLoading} className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg disabled:opacity-50">
                      {createLoading ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="pb-3 text-dark-300 text-sm">Email</th>
                  <th className="pb-3 text-dark-300 text-sm">Role</th>
                  <th className="pb-3 text-dark-300 text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-dark-700">
                    <td className="py-3 text-white text-sm">{user.email}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'super_admin' ? 'bg-purple-900 text-purple-200' :
                        user.role === 'admin' ? 'bg-blue-900 text-blue-200' :
                        'bg-gray-700 text-gray-300'
                      }`}>{user.role}</span>
                    </td>
                    <td className="py-3">
                      <button onClick={() => handleUserAction(user.id, 'view')} className="p-2 text-blue-400 hover:text-blue-300">
                        <EyeIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Tab - Enhanced */}
      {selectedTab === 'transactions' && (
        <div className="space-y-6">
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

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-dark-400 text-xs uppercase">Total</p>
              <p className="text-2xl font-bold text-white">{transactions.length}</p>
            </div>
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
          </div>

          {/* Filters & Search */}
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <h3 className="text-lg font-semibold text-white">Transaction Management</h3>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={transactionSearch}
                    onChange={(e) => setTransactionSearch(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white text-sm w-full sm:w-64"
                  />
                </div>
                
                {/* Filter */}
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
                {/* Analytics Toggle & Export */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAnalytics(!showAnalytics)}
                    className="flex items-center px-3 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg text-sm"
                  >
                    <ChartBarIcon className="w-4 h-4 mr-1" />
                    {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
                  </button>
                  <button
                    onClick={exportTransactions}
                    className="flex items-center px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {/* Analytics Section */}
            {showAnalytics && (
              <div className="mb-6 p-4 bg-dark-700/30 rounded-lg">
                <h4 className="text-white font-semibold mb-4 flex items-center">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Daily Statistics (Last 7 Days)
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {getDailyStats().map(([date, stats]) => (
                    <div key={date} className="bg-dark-800 p-3 rounded-lg">
                      <p className="text-dark-400 text-xs">{date}</p>
                      <p className="text-white font-semibold">{stats.count} txns</p>
                      <p className="text-green-400 text-xs">GH₵{stats.revenue.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="pb-3 text-left text-dark-400 text-xs uppercase font-medium">Reference</th>
                    <th className="pb-3 text-left text-dark-400 text-xs uppercase font-medium">Customer</th>
                    <th className="pb-3 text-left text-dark-400 text-xs uppercase font-medium">Type</th>
                    <th className="pb-3 text-left text-dark-400 text-xs uppercase font-medium">Amount</th>
                    <th className="pb-3 text-left text-dark-400 text-xs uppercase font-medium">Status</th>
                    <th className="pb-3 text-left text-dark-400 text-xs uppercase font-medium">Date</th>
                    <th className="pb-3 text-left text-dark-400 text-xs uppercase font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {transactions
                    .filter(tx => {
                      const matchesFilter = transactionFilter === 'all' || tx.status === transactionFilter;
                      const matchesSearch = transactionSearch === '' || 
                        tx.reference?.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                        tx.phone?.includes(transactionSearch) ||
                        tx.users?.email?.toLowerCase().includes(transactionSearch.toLowerCase());
                      return matchesFilter && matchesSearch;
                    })
                    .map((tx) => (
                    <tr key={tx.id} className="hover:bg-dark-700/50 transition-colors">
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="text-white font-medium text-sm">{tx.reference?.slice(0, 12)}...</span>
                          <span className="text-dark-500 text-xs">{tx.network || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="text-white text-sm">{tx.users?.email || 'Guest'}</span>
                          <span className="text-dark-500 text-xs">{tx.phone || 'No phone'}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-white text-sm capitalize">{tx.type}</span>
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
                          'bg-dark-700 text-dark-300 border border-dark-600'
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
                          {/* View Button */}
                          <button 
                            onClick={() => handleViewTransaction(tx)}
                            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          
                          {/* Retry Button - Only for failed/pending */}
                          {(tx.status === 'failed' || tx.status === 'pending') && (
                            <button 
                              onClick={() => openRetryModal(tx)}
                              disabled={processingAction}
                              className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title="Retry Transaction"
                            >
                              <PlayIcon className="w-4 h-4" />
                            </button>
                          )}
                          
                          {/* Refund Button - For successful/failed transactions */}
                          {(tx.status === 'success' || tx.status === 'delivered' || tx.status === 'failed') && (
                            <button 
                              onClick={() => openRefundModal(tx)}
                              disabled={processingAction || tx.status === 'refunded'}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                              title="Refund Transaction"
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

            {transactions.length === 0 && (
              <div className="text-center py-12">
                <BanknotesIcon className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                <p className="text-dark-400">No transactions found</p>
              </div>
            )}
          </div>

          {/* Transaction Detail Modal */}
          {showTransactionModal && selectedTransaction && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-dark-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-dark-700">
                  <div>
                    <h3 className="text-xl font-bold text-white">Transaction Details</h3>
                    <p className="text-dark-400 text-sm mt-1">{selectedTransaction.reference}</p>
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
    </div>
  );
}
