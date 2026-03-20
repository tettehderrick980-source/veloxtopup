import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import TransactionTable from '../components/TransactionTable';
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, filterStatus, filterType]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await db.getTransactions(user.id, 100);
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = transactions;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.phone.includes(searchTerm) ||
        transaction.plan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.network.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === filterStatus);
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(transaction => transaction.type === filterType);
    }

    setFilteredTransactions(filtered);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchTransactions();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-dark-700 rounded w-1/3 mb-8"></div>
          <div className="card h-96"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Transaction History</h1>
          <p className="text-dark-400">
            View and track all your airtime and data purchases.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="btn-secondary mt-4 sm:mt-0"
        >
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
              <input
                type="text"
                placeholder="Search by reference, phone, or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field w-full pl-10"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field w-full"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="input-field w-full"
            >
              <option value="all">All Types</option>
              <option value="airtime">Airtime</option>
              <option value="data">Data</option>
              <option value="wallet_funding">Wallet Funding</option>
              <option value="refund">Refund</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-dark-400">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>
        {(searchTerm || filterStatus !== 'all' || filterType !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('all');
              setFilterType('all');
            }}
            className="text-primary-400 hover:text-primary-300 text-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Transactions Table */}
      <div className="card">
        <TransactionTable transactions={filteredTransactions} />
      </div>

      {/* Empty State */}
      {filteredTransactions.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-dark-400 mb-4">
            {transactions.length === 0 
              ? 'No transactions found. Start by buying airtime or data!'
              : 'No transactions match your filters.'
            }
          </div>
          {transactions.length === 0 && (
            <a
              href="/buy"
              className="btn-primary inline-flex"
            >
              Buy Airtime/Data
            </a>
          )}
        </div>
      )}
    </div>
  );
}
