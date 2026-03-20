import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import TransactionTable from '../components/TransactionTable';
import { 
  UsersIcon, 
  CreditCardIcon, 
  ChartBarIcon,
  CurrencyDollarIcon,
  CogIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function AdminDashboardPage() {
  const { userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalRevenue: 0,
    totalWalletBalance: 0
  });
  const [transactions, setTransactions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    profitMargin: 10,
    mode2Enabled: true
  });

  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      return;
    }
    fetchDashboardData();
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

  if (userProfile?.role !== 'admin') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-dark-400">
            You don't have permission to access the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'transactions', label: 'Transactions', icon: CreditCardIcon },
    { id: 'users', label: 'Users', icon: UsersIcon },
    { id: 'wallets', label: 'Wallets', icon: CurrencyDollarIcon },
    { id: 'settings', label: 'Settings', icon: CogIcon }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <div className="lg:w-64">
          <div className="card">
            <h2 className="text-lg font-semibold text-white mb-4">Admin Panel</h2>
            <nav className="space-y-1">
              {sidebarItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`sidebar-item w-full ${activeTab === item.id ? 'active' : ''}`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
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
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
                <button
                  onClick={fetchDashboardData}
                  className="btn-secondary"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="card">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-500 rounded-lg">
                      <UsersIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-dark-400">Total Users</p>
                      <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-500 rounded-lg">
                      <CreditCardIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-dark-400">Total Transactions</p>
                      <p className="text-2xl font-bold text-white">{stats.totalTransactions}</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center">
                    <div className="p-3 bg-yellow-500 rounded-lg">
                      <CurrencyDollarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-dark-400">Total Revenue</p>
                      <p className="text-2xl font-bold text-white">GH₵{stats.totalRevenue.toFixed(2)}</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-500 rounded-lg">
                      <ChartBarIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-dark-400">Wallet Balance</p>
                      <p className="text-2xl font-bold text-white">GH₵{stats.totalWalletBalance.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">All Transactions</h1>
                <button
                  onClick={fetchDashboardData}
                  className="btn-secondary"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>
              <div className="card">
                {loading ? (
                  <div className="animate-pulse h-96"></div>
                ) : (
                  <TransactionTable transactions={transactions} showUser={true} />
                )}
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">All Users</h1>
                <button
                  onClick={fetchDashboardData}
                  className="btn-secondary"
                >
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Refresh
                </button>
              </div>
              <div className="card">
                {loading ? (
                  <div className="animate-pulse h-96"></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-dark-700">
                          <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Email</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Phone</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Role</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Wallet Balance</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Referral Code</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-dark-800/50">
                            <td className="py-3 px-4 text-dark-300">{user.email}</td>
                            <td className="py-3 px-4 text-dark-300">{user.phone || 'N/A'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                user.role === 'admin' 
                                  ? 'bg-purple-900/20 text-purple-400 border border-purple-700'
                                  : 'bg-blue-900/20 text-blue-400 border border-blue-700'
                              }`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-primary-400">
                              GH₵{user.wallets?.balance?.toFixed(2) || '0.00'}
                            </td>
                            <td className="py-3 px-4 text-primary-400 font-mono text-sm">
                              {user.referral_code}
                            </td>
                            <td className="py-3 px-4 text-dark-300">
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

          {/* Wallets Tab */}
          {activeTab === 'wallets' && (
            <div>
              <h1 className="text-3xl font-bold text-white mb-8">Wallet Management</h1>
              <div className="card">
                <div className="text-center py-12">
                  <CurrencyDollarIcon className="w-16 h-16 text-primary-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Wallet Overview</h3>
                  <p className="text-dark-400 mb-4">
                    Total wallet balance across all users: GH₵{stats.totalWalletBalance.toFixed(2)}
                  </p>
                  <p className="text-dark-500 text-sm">
                    Advanced wallet management features coming soon.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h1 className="text-3xl font-bold text-white mb-8">System Settings</h1>
              <div className="card">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Profit Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                          Profit Margin (%)
                        </label>
                        <input
                          type="number"
                          value={settings.profitMargin}
                          onChange={(e) => setSettings({...settings, profitMargin: parseFloat(e.target.value)})}
                          className="input-field w-full"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Automation Settings</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">Mode 2 API Automation</div>
                          <div className="text-dark-400 text-sm">
                            Automatically process purchases via GhDataConnect API
                          </div>
                        </div>
                        <button
                          onClick={() => setSettings({...settings, mode2Enabled: !settings.mode2Enabled})}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            settings.mode2Enabled ? 'bg-primary-500' : 'bg-dark-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              settings.mode2Enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-dark-700">
                    <button className="btn-primary">
                      Save Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
