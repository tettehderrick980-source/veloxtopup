import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/supabase';
import TransactionTable from '../components/TransactionTable';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, filterStatus]);

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

    if (searchTerm) {
      filtered = filtered.filter(transaction =>
        transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.phone.includes(searchTerm) ||
        transaction.plan?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(transaction => transaction.status === filterStatus);
    }

    setFilteredTransactions(filtered);
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchTransactions();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-dark-700 rounded w-1/3"></div>
          <div className="card h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Transactions</h1>
          <p className="text-dark-400 text-sm">Track your purchases.</p>
        </div>
        <button onClick={handleRefresh} className="btn-secondary mt-4 sm:mt-0">
          <ArrowPathIcon className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field w-full pl-10"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field w-full"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 flex justify-between items-center">
        <div className="text-dark-400 text-sm">
          {filteredTransactions.length} of {transactions.length}
        </div>
        {(searchTerm || filterStatus !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterStatus('all');
            }}
            className="text-primary-400 hover:text-primary-300 text-sm"
          >
            Clear
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
              ? 'No transactions yet.' 
              : 'No matches found.'}
          </div>
          {transactions.length === 0 && (
            <a href="/buy" className="btn-primary inline-flex">
              Buy Airtime/Data
            </a>
          )}
        </div>
      )}
    </div>
  );
}
