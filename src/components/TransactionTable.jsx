import React from 'react';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: 'text-yellow-400 bg-yellow-900/20 border-yellow-700',
  success: 'text-green-400 bg-green-900/20 border-green-700',
  failed: 'text-red-400 bg-red-900/20 border-red-700',
  processing: 'text-blue-400 bg-blue-900/20 border-blue-700'
};

const NETWORK_COLORS = {
  mtn: 'bg-yellow-500',
  airteltigo: 'bg-blue-500',
  vodafone: 'bg-red-500'
};

export default function TransactionTable({ transactions, showUser = false }) {
  const getStatusBadge = (status) => (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  const getNetworkBadge = (network) => (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 ${NETWORK_COLORS[network] || 'bg-gray-500'} rounded-full`} />
      <span className="text-sm capitalize">{network}</span>
    </div>
  );

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-dark-400">No transactions found</div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-dark-700">
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Reference</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Type</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Network</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Phone</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Plan/Amount</th>
            {showUser && (
              <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">User</th>
            )}
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Status</th>
            <th className="text-left py-3 px-4 text-sm font-medium text-dark-400">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-700">
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="hover:bg-dark-800/50 transition-colors">
              <td className="py-3 px-4">
                <span className="text-sm font-mono text-primary-400">
                  {transaction.reference}
                </span>
              </td>
              <td className="py-3 px-4">
                <span className="text-sm capitalize text-dark-300">
                  {transaction.type}
                </span>
              </td>
              <td className="py-3 px-4">
                {getNetworkBadge(transaction.network)}
              </td>
              <td className="py-3 px-4">
                <span className="text-sm text-dark-300">
                  {transaction.phone}
                </span>
              </td>
              <td className="py-3 px-4">
                <div>
                  <div className="text-sm text-dark-300">{transaction.plan}</div>
                  <div className="text-xs text-primary-400">
                    GH₵{transaction.amount?.toFixed(2)}
                  </div>
                </div>
              </td>
              {showUser && transaction.users && (
                <td className="py-3 px-4">
                  <div>
                    <div className="text-sm text-dark-300">{transaction.users.email}</div>
                    <div className="text-xs text-dark-500">{transaction.users.phone}</div>
                  </div>
                </td>
              )}
              <td className="py-3 px-4">
                {getStatusBadge(transaction.status)}
              </td>
              <td className="py-3 px-4">
                <div className="text-sm text-dark-300">
                  {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                </div>
                <div className="text-xs text-dark-500">
                  {format(new Date(transaction.created_at), 'HH:mm')}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
