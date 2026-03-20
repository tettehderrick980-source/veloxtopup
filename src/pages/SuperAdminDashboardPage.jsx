import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import { 
  UsersIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  CreditCardIcon,
  UserGroupIcon,
  ServerIcon
} from '@heroicons/react/24/outline';

export default function SuperAdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    pendingTransactions: 0,
    failedTransactions: 0,
    systemHealth: 'good',
    apiUsage: 0,
    activeUsers: 0
  });
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  const fetchSuperAdminData = async () => {
    try {
      // Fetch comprehensive stats
      const [
        usersResult,
        transactionsResult,
        walletsResult
      ] = await Promise.all([
        db.getAllUsers(),
        db.getAllTransactions(),
        db.getAllWallets()
      ]);

      const users = usersResult.data || [];
      const transactions = transactionsResult.data || [];
      const wallets = walletsResult.data || [];

      // Calculate stats
      const totalRevenue = transactions
        .filter(t => t.status === 'success')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const pendingTransactions = transactions.filter(t => t.status === 'pending').length;
      const failedTransactions = transactions.filter(t => t.status === 'failed').length;
      
      const activeUsers = wallets.filter(w => w.balance > 0).length;

      setStats({
        totalUsers: users.length,
        totalTransactions: transactions.length,
        totalRevenue,
        pendingTransactions,
        failedTransactions,
        systemHealth: pendingTransactions > 10 ? 'warning' : 'good',
        apiUsage: transactions.length * 0.1, // Mock calculation
        activeUsers
      });

      setUsers(users.slice(0, 10)); // Recent 10 users
      setTransactions(transactions.slice(0, 10)); // Recent 10 transactions
      setSystemLogs([
        { id: 1, type: 'success', message: 'Payment webhook processed successfully', time: '2 mins ago' },
        { id: 2, type: 'warning', message: 'High API usage detected', time: '15 mins ago' },
        { id: 3, type: 'error', message: 'GhDataConnect API timeout', time: '1 hour ago' },
        { id: 4, type: 'info', message: 'New user registration spike', time: '2 hours ago' },
        { id: 5, type: 'success', message: 'System backup completed', time: '3 hours ago' }
      ]);

    } catch (error) {
      console.error('Error fetching super admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (userId, action) => {
    try {
      if (action === 'suspend') {
        await db.updateUser(userId, { status: 'suspended' });
      } else if (action === 'activate') {
        await db.updateUser(userId, { status: 'active' });
      } else if (action === 'delete') {
        await db.deleteUser(userId);
      }
      fetchSuperAdminData();
    } catch (error) {
      console.error('Error performing user action:', error);
    }
  };

  const handleTransactionAction = async (transactionId, action) => {
    try {
      if (action === 'refund') {
        await db.updateTransaction(transactionId, { status: 'refunded' });
      } else if (action === 'retry') {
        // Retry transaction logic
        await db.updateTransaction(transactionId, { status: 'processing' });
      }
      fetchSuperAdminData();
    } catch (error) {
      console.error('Error performing transaction action:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-primary-500 text-xl">Loading Super Admin Dashboard...</div>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Users', value: stats.totalUsers, icon: UserGroupIcon, color: 'text-blue-400', change: '+12%' },
    { name: 'Total Revenue', value: `GH₵${stats.totalRevenue.toFixed(2)}`, icon: BanknotesIcon, color: 'text-green-400', change: '+8%' },
    { name: 'Active Users', value: stats.activeUsers, icon: UsersIcon, color: 'text-purple-400', change: '+5%' },
    { name: 'Pending Transactions', value: stats.pendingTransactions, icon: ClockIcon, color: 'text-yellow-400', change: '-3%' },
    { name: 'Failed Transactions', value: stats.failedTransactions, icon: ExclamationTriangleIcon, color: 'text-red-400', change: '-2%' },
    { name: 'API Usage', value: `${stats.apiUsage.toFixed(1)}k`, icon: ServerIcon, color: 'text-indigo-400', change: '+15%' }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Super Admin Dashboard</h1>
        <p className="text-dark-300">Complete system oversight and control</p>
      </div>

      {/* System Health Indicator */}
      <div className={`mb-6 p-4 rounded-lg border ${
        stats.systemHealth === 'good' 
          ? 'bg-green-900 border-green-700' 
          : 'bg-yellow-900 border-yellow-700'
      }`}>
        <div className="flex items-center">
          <ShieldCheckIcon className="w-6 h-6 mr-3 text-green-400" />
          <div>
            <p className="text-white font-semibold">System Health: {stats.systemHealth === 'good' ? 'Good' : 'Warning'}</p>
            <p className="text-green-300 text-sm">
              {stats.systemHealth === 'good' 
                ? 'All systems operational' 
                : 'Some issues require attention'}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-dark-800 p-1 rounded-lg">
        {['overview', 'users', 'transactions', 'system'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {statCards.map((stat) => (
              <div key={stat.name} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-dark-400 text-sm">{stat.name}</p>
                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                    <p className={`text-sm ${stat.color}`}>{stat.change}</p>
                  </div>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </div>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Recent Users</h3>
              <div className="space-y-3">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{user.email}</p>
                      <p className="text-dark-400 text-sm">Role: {user.role}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300 text-sm">View</button>
                      <button className="text-red-400 hover:text-red-300 text-sm">Suspend</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">System Logs</h3>
              <div className="space-y-3">
                {systemLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 p-3 bg-dark-700 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      log.type === 'success' ? 'bg-green-400' :
                      log.type === 'warning' ? 'bg-yellow-400' :
                      log.type === 'error' ? 'bg-red-400' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-white text-sm">{log.message}</p>
                      <p className="text-dark-400 text-xs">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {selectedTab === 'users' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">User Management</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="pb-3 text-dark-300 font-medium">Email</th>
                  <th className="pb-3 text-dark-300 font-medium">Role</th>
                  <th className="pb-3 text-dark-300 font-medium">Status</th>
                  <th className="pb-3 text-dark-300 font-medium">Joined</th>
                  <th className="pb-3 text-dark-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-dark-700">
                    <td className="py-3 text-white">{user.email}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'super_admin' ? 'bg-purple-900 text-purple-200' :
                        user.role === 'admin' ? 'bg-blue-900 text-blue-200' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-1 text-xs bg-green-900 text-green-200 rounded-full">
                        Active
                      </span>
                    </td>
                    <td className="py-3 text-dark-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex space-x-2">
                        <button className="text-blue-400 hover:text-blue-300 text-sm">View</button>
                        <button className="text-yellow-400 hover:text-yellow-300 text-sm">Edit</button>
                        <button className="text-red-400 hover:text-red-300 text-sm">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Tab */}
      {selectedTab === 'transactions' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Transaction Oversight</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="pb-3 text-dark-300 font-medium">Reference</th>
                  <th className="pb-3 text-dark-300 font-medium">User</th>
                  <th className="pb-3 text-dark-300 font-medium">Type</th>
                  <th className="pb-3 text-dark-300 font-medium">Amount</th>
                  <th className="pb-3 text-dark-300 font-medium">Status</th>
                  <th className="pb-3 text-dark-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-dark-700">
                    <td className="py-3 text-white">{transaction.reference}</td>
                    <td className="py-3 text-white">{transaction.user_id?.slice(0, 8)}...</td>
                    <td className="py-3 text-white">{transaction.type}</td>
                    <td className="py-3 text-white">GH₵{transaction.amount}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.status === 'success' ? 'bg-green-900 text-green-200' :
                        transaction.status === 'pending' ? 'bg-yellow-900 text-yellow-200' :
                        transaction.status === 'failed' ? 'bg-red-900 text-red-200' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex space-x-2">
                        <button className="text-blue-400 hover:text-blue-300 text-sm">View</button>
                        {transaction.status === 'failed' && (
                          <button className="text-green-400 hover:text-green-300 text-sm">Retry</button>
                        )}
                        {transaction.status === 'success' && (
                          <button className="text-yellow-400 hover:text-yellow-300 text-sm">Refund</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Tab */}
      {selectedTab === 'system' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">System Configuration</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">API Rate Limiting</p>
                  <p className="text-dark-400 text-sm">100 requests per minute</p>
                </div>
                <button className="text-blue-400 hover:text-blue-300">Configure</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">Paystack Webhook</p>
                  <p className="text-green-400 text-sm">Connected</p>
                </div>
                <button className="text-blue-400 hover:text-blue-300">Test</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">GhDataConnect API</p>
                  <p className="text-green-400 text-sm">Operational</p>
                </div>
                <button className="text-blue-400 hover:text-blue-300">Status</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">Database Backups</p>
                  <p className="text-dark-400 text-sm">Last: 3 hours ago</p>
                </div>
                <button className="text-blue-400 hover:text-blue-300">Backup Now</button>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Security Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">Two-Factor Auth</p>
                  <p className="text-dark-400 text-sm">Enabled for admins</p>
                </div>
                <button className="text-blue-400 hover:text-blue-300">Manage</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">Session Timeout</p>
                  <p className="text-dark-400 text-sm">24 hours</p>
                </div>
                <button className="text-blue-400 hover:text-blue-300">Configure</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">Failed Login Lockout</p>
                  <p className="text-dark-400 text-sm">After 5 attempts</p>
                </div>
                <button className="text-blue-400 hover:text-blue-300">Settings</button>
              </div>
              <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">Audit Logging</p>
                  <p className="text-green-400 text-sm">Active</p>
                </div>
                <button className="text-blue-400 hover:text-blue-300">View Logs</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
