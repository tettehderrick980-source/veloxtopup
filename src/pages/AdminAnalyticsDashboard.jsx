import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ChartBarIcon, 
  CurrencyDollarIcon, 
  UsersIcon, 
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

/**
 * Admin Analytics Dashboard for VeloxTopUp
 * Professional analytics with charts and metrics
 */
export default function AdminAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('7d'); // 24h, 7d, 30d, 90d
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    successfulDeliveries: 0,
    failedOrders: 0,
    newUsers: 0,
    avgOrderValue: 0
  });
  const [networkStats, setNetworkStats] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [topBundles, setTopBundles] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      const days = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 };
      startDate.setDate(startDate.getDate() - (days[timeRange] || 7));

      // Fetch metrics in parallel
      const [
        revenueData,
        ordersData,
        networkData,
        recentData,
        bundlesData,
        hourlyStats
      ] = await Promise.all([
        fetchRevenueMetrics(startDate, endDate),
        fetchOrderMetrics(startDate, endDate),
        fetchNetworkStats(startDate, endDate),
        fetchRecentTransactions(),
        fetchTopBundles(startDate, endDate),
        fetchHourlyStats(startDate, endDate)
      ]);

      setMetrics({
        totalRevenue: revenueData.total || 0,
        totalOrders: ordersData.total || 0,
        successfulDeliveries: ordersData.successful || 0,
        failedOrders: ordersData.failed || 0,
        newUsers: ordersData.newUsers || 0,
        avgOrderValue: ordersData.total > 0 ? (revenueData.total / ordersData.total) : 0
      });

      setNetworkStats(networkData);
      setRecentTransactions(recentData);
      setTopBundles(bundlesData);
      setHourlyData(hourlyStats);

    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueMetrics = async (startDate, endDate) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('amount')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('status', 'completed');

    if (error) throw error;
    
    const total = data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
    return { total };
  };

  const fetchOrderMetrics = async (startDate, endDate) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('fulfillment_status, status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    const successful = data?.filter(t => 
      t.fulfillment_status === 'delivered' || t.status === 'completed'
    ).length || 0;
    
    const failed = data?.filter(t => 
      t.fulfillment_status === 'failed' || t.status === 'failed'
    ).length || 0;

    return {
      total: data?.length || 0,
      successful,
      failed,
      newUsers: 0 // Would need users table query
    };
  };

  const fetchNetworkStats = async (startDate, endDate) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('network, amount, fulfillment_status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    const stats = {};
    data?.forEach(t => {
      if (!stats[t.network]) {
        stats[t.network] = { 
          network: t.network, 
          orders: 0, 
          revenue: 0, 
          successful: 0, 
          failed: 0 
        };
      }
      stats[t.network].orders++;
      stats[t.network].revenue += t.amount || 0;
      if (t.fulfillment_status === 'delivered') {
        stats[t.network].successful++;
      } else if (t.fulfillment_status === 'failed') {
        stats[t.network].failed++;
      }
    });

    return Object.values(stats);
  };

  const fetchRecentTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data || [];
  };

  const fetchTopBundles = async (startDate, endDate) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('plan, amount, network')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .eq('fulfillment_status', 'delivered');

    if (error) throw error;

    const bundleStats = {};
    data?.forEach(t => {
      const key = t.plan;
      if (!bundleStats[key]) {
        bundleStats[key] = { name: key, orders: 0, revenue: 0, network: t.network };
      }
      bundleStats[key].orders++;
      bundleStats[key].revenue += t.amount || 0;
    });

    return Object.values(bundleStats)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);
  };

  const fetchHourlyStats = async (startDate, endDate) => {
    // This would typically use a database function or aggregation
    // For now, return mock data structure
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      orders: Math.floor(Math.random() * 10),
      revenue: Math.floor(Math.random() * 100)
    }));
  };

  const formatCurrency = (amount) => {
    return `GH₵${amount.toFixed(2)}`;
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-GH').format(num);
  };

  const getSuccessRate = () => {
    if (metrics.totalOrders === 0) return 0;
    return ((metrics.successfulDeliveries / metrics.totalOrders) * 100).toFixed(1);
  };

  const getFailureRate = () => {
    if (metrics.totalOrders === 0) return 0;
    return ((metrics.failedOrders / metrics.totalOrders) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-dark-800 rounded w-1/4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-dark-800 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-2" />
            <p className="text-red-200">{error}</p>
            <button 
              onClick={fetchAnalytics}
              className="mt-4 btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-dark-400 mt-1">Monitor your business performance</p>
          </div>
          
          {/* Time Range Selector */}
          <div className="flex bg-dark-800 rounded-lg p-1">
            {[
              { value: '24h', label: '24H' },
              { value: '7d', label: '7D' },
              { value: '30d', label: '30D' },
              { value: '90d', label: '90D' }
            ].map((range) => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timeRange === range.value
                    ? 'bg-primary-500 text-white'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            icon={CurrencyDollarIcon}
            trend="up"
            trendValue="12%"
            color="green"
          />
          <MetricCard
            title="Total Orders"
            value={formatNumber(metrics.totalOrders)}
            icon={ShoppingBagIcon}
            trend="up"
            trendValue="8%"
            color="blue"
          />
          <MetricCard
            title="Success Rate"
            value={`${getSuccessRate()}%`}
            icon={CheckCircleIcon}
            trend={parseFloat(getSuccessRate()) > 90 ? 'up' : 'down'}
            trendValue="vs last period"
            color="green"
          />
          <MetricCard
            title="Avg Order Value"
            value={formatCurrency(metrics.avgOrderValue)}
            icon={ChartBarIcon}
            trend="up"
            trendValue="5%"
            color="purple"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
              <h3 className="text-dark-300 font-medium">Successful</h3>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(metrics.successfulDeliveries)}</p>
            <p className="text-sm text-dark-400 mt-1">Delivered orders</p>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <XCircleIcon className="w-6 h-6 text-red-400" />
              <h3 className="text-dark-300 font-medium">Failed</h3>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(metrics.failedOrders)}</p>
            <p className="text-sm text-dark-400 mt-1">{getFailureRate()}% failure rate</p>
          </div>
          
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <UsersIcon className="w-6 h-6 text-blue-400" />
              <h3 className="text-dark-300 font-medium">New Users</h3>
            </div>
            <p className="text-2xl font-bold text-white">{formatNumber(metrics.newUsers)}</p>
            <p className="text-sm text-dark-400 mt-1">In selected period</p>
          </div>
        </div>

        {/* Network Performance */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Network Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Network</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">Orders</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">Revenue</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">Success Rate</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {networkStats.map((network) => {
                  const successRate = network.orders > 0 
                    ? ((network.successful / network.orders) * 100).toFixed(1)
                    : 0;
                  return (
                    <tr key={network.network} className="border-b border-dark-700/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{network.network}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-dark-300">{formatNumber(network.orders)}</td>
                      <td className="py-3 px-4 text-right text-dark-300">{formatCurrency(network.revenue)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`${parseFloat(successRate) > 90 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {successRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          parseFloat(successRate) > 90 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {parseFloat(successRate) > 90 ? 'Healthy' : 'Warning'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {networkStats.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-dark-400">
                      No data available for selected period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Bundles */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Top Selling Bundles</h2>
          <div className="space-y-4">
            {topBundles.map((bundle, index) => (
              <div key={bundle.name} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-white font-medium">{bundle.name}</p>
                    <p className="text-sm text-dark-400">{bundle.network}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-semibold">{formatNumber(bundle.orders)} orders</p>
                  <p className="text-sm text-dark-400">{formatCurrency(bundle.revenue)}</p>
                </div>
              </div>
            ))}
            {topBundles.length === 0 && (
              <p className="text-center text-dark-400 py-8">No bundle data available</p>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Reference</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Network</th>
                  <th className="text-left py-3 px-4 text-dark-400 font-medium">Phone</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">Amount</th>
                  <th className="text-center py-3 px-4 text-dark-400 font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-dark-400 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-dark-700/50">
                    <td className="py-3 px-4 text-white font-mono text-sm">{tx.reference}</td>
                    <td className="py-3 px-4 text-dark-300">{tx.network}</td>
                    <td className="py-3 px-4 text-dark-300">{tx.phone_number}</td>
                    <td className="py-3 px-4 text-right text-white">{formatCurrency(tx.amount)}</td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={tx.fulfillment_status || tx.status} />
                    </td>
                    <td className="py-3 px-4 text-right text-dark-400 text-sm">
                      <TimeAgo date={tx.created_at} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({ title, value, icon: Icon, trend, trendValue, color }) {
  const colors = {
    green: 'text-green-400 bg-green-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    red: 'text-red-400 bg-red-500/10'
  };

  const TrendIcon = trend === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            <TrendIcon className="w-4 h-4" />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
      <p className="text-dark-400 text-sm mt-1">{title}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    delivered: { color: 'bg-green-500/20 text-green-400', label: 'Delivered' },
    completed: { color: 'bg-green-500/20 text-green-400', label: 'Completed' },
    pending: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Pending' },
    processing: { color: 'bg-blue-500/20 text-blue-400', label: 'Processing' },
    failed: { color: 'bg-red-500/20 text-red-400', label: 'Failed' },
    refunded: { color: 'bg-gray-500/20 text-gray-400', label: 'Refunded' }
  };

  const config = configs[status] || { color: 'bg-gray-500/20 text-gray-400', label: status };

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function TimeAgo({ date }) {
  const getTimeAgo = (dateString) => {
    const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' mins ago';
    
    return 'Just now';
  };

  return <span>{getTimeAgo(date)}</span>;
}
