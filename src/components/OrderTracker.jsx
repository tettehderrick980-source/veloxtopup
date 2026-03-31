import React, { useState, useEffect } from 'react';
import { db, supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  TruckIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  ReceiptRefundIcon,
  ShieldCheckIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const STATUS_CONFIG = {
  pending: { 
    label: 'Pending', 
    color: 'text-yellow-400', 
    bgColor: 'bg-yellow-900/50',
    borderColor: 'border-yellow-700',
    icon: ClockIcon,
    description: 'Waiting for payment confirmation'
  },
  processing: { 
    label: 'Processing', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-900/50',
    borderColor: 'border-blue-700',
    icon: ArrowPathIcon,
    description: 'Payment received, processing your order'
  },
  queued: { 
    label: 'Queued', 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-900/50',
    borderColor: 'border-orange-700',
    icon: ClockIcon,
    description: 'Order queued for processing'
  },
  delivered: { 
    label: 'Delivered', 
    color: 'text-green-400', 
    bgColor: 'bg-green-900/50',
    borderColor: 'border-green-700',
    icon: CheckCircleIcon,
    description: 'Data has been delivered to your phone'
  },
  success: { 
    label: 'Delivered', 
    color: 'text-green-400', 
    bgColor: 'bg-green-900/50',
    borderColor: 'border-green-700',
    icon: CheckCircleIcon,
    description: 'Data has been delivered to your phone'
  },
  failed: { 
    label: 'Failed', 
    color: 'text-red-400', 
    bgColor: 'bg-red-900/50',
    borderColor: 'border-red-700',
    icon: XCircleIcon,
    description: 'Order failed. Refund may be pending'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'text-gray-400', 
    bgColor: 'bg-gray-900/50',
    borderColor: 'border-gray-700',
    icon: XCircleIcon,
    description: 'Order was cancelled'
  },
  expired: { 
    label: 'Expired', 
    color: 'text-orange-400', 
    bgColor: 'bg-orange-900/50',
    borderColor: 'border-orange-700',
    icon: ExclamationTriangleIcon,
    description: 'Order expired. Refund initiated'
  },
  refunded: { 
    label: 'Refunded', 
    color: 'text-blue-400', 
    bgColor: 'bg-blue-900/50',
    borderColor: 'border-blue-700',
    icon: ReceiptRefundIcon,
    description: 'Refund has been processed'
  }
};

const FULFILLMENT_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-400' },
  queued: { label: 'Queued', color: 'text-orange-400' },
  processing: { label: 'Processing', color: 'text-blue-400' },
  fulfilled: { label: 'Fulfilled', color: 'text-green-400' },
  failed: { label: 'Failed', color: 'text-red-400' },
  expired: { label: 'Expired', color: 'text-orange-400' }
};

export default function OrderTracker({ isAdminMode = false }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'superadmin';
  
  // Superadmin can toggle between viewing all orders or just personal orders
  const [viewAllOrders, setViewAllOrders] = useState(false);
  
  const [searchType, setSearchType] = useState('phone');
  const [searchValue, setSearchValue] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchValue.trim()) return;

    setLoading(true);
    setError('');
    setSearched(true);

    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      // For non-superadmin users, restrict to their own orders only
      if (!isSuperAdmin || !viewAllOrders) {
        if (user) {
          // Authenticated user - filter by user_id
          query = query.eq('user_id', user.id);
        } else {
          // Guest user - only allow searching by their phone number
          // This is handled client-side by filtering results
        }
      }

      // Superadmin viewing all orders gets more results
      const limit = isSuperAdmin && viewAllOrders ? 100 : 20;
      query = query.limit(limit);

      if (searchType === 'phone') {
        const cleanedPhone = searchValue.replace(/\D/g, '');
        // For superadmin viewing all: search across all orders
        // For regular users: search only within their filtered orders
        if (isSuperAdmin && viewAllOrders) {
          query = query.or(`phone.eq.${cleanedPhone},phone.eq.0${cleanedPhone},phone.eq.233${cleanedPhone.substring(1)}`);
        } else {
          query = query.or(`phone.eq.${cleanedPhone},phone.eq.0${cleanedPhone},phone.eq.233${cleanedPhone.substring(1)}`);
        }
      } else {
        // Search by reference
        query = query.ilike('reference', `%${searchValue}%`);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Additional client-side filtering for non-superadmin users
      let filteredData = data || [];
      if (!isSuperAdmin && !user) {
        // Guest users without login should only see orders matching their search exactly
        // This prevents guests from seeing other people's orders
        const cleanedSearch = searchValue.replace(/\D/g, '');
        filteredData = filteredData.filter(order => {
          const orderPhone = (order.phone || '').replace(/\D/g, '');
          return orderPhone === cleanedSearch || 
                 orderPhone === '0' + cleanedSearch ||
                 orderPhone === '233' + cleanedSearch.substring(1);
        });
      }

      setOrders(filteredData);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const getFulfillmentConfig = (status) => FULFILLMENT_CONFIG[status] || FULFILLMENT_CONFIG.pending;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-GH', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    if (phone.length === 10) {
      return `${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
    }
    return phone;
  };

  return (
    <div className="card max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <TruckIcon className="w-8 h-8 text-primary-400" />
        <div>
          <h2 className="text-2xl font-bold text-white">Track Your Order</h2>
          <p className="text-dark-400 text-sm">Check the status of your data purchase</p>
        </div>
      </div>

      {/* Superadmin Toggle */}
      {isSuperAdmin && (
        <div className="mb-6 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-primary-400" />
              <span className="text-white font-medium text-sm">Superadmin Mode</span>
            </div>
            <button
              type="button"
              onClick={() => setViewAllOrders(!viewAllOrders)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                viewAllOrders ? 'bg-primary-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  viewAllOrders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <p className="text-dark-400 text-xs mt-2">
            {viewAllOrders 
              ? 'Viewing ALL orders system-wide' 
              : 'Viewing your personal orders only'}
          </p>
        </div>
      )}

      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setSearchType('phone'); setSearchValue(''); }}
              className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium text-sm transition-all ${
                searchType === 'phone'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <PhoneIcon className="w-4 h-4 inline mr-1" />
              <span className="hidden sm:inline">Phone Number</span>
              <span className="sm:hidden">Phone</span>
            </button>
            <button
              type="button"
              onClick={() => { setSearchType('reference'); setSearchValue(''); }}
              className={`flex-1 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg font-medium text-sm transition-all ${
                searchType === 'reference'
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-700 text-dark-300 hover:bg-dark-600'
              }`}
            >
              <span className="hidden sm:inline">Order Reference</span>
              <span className="sm:hidden">Reference</span>
            </button>
          </div>
          
          <div className="relative">
            <input
              type={searchType === 'phone' ? 'tel' : 'text'}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={searchType === 'phone' ? '0241234567' : 'VTU1234567890'}
              className="input-field w-full pr-12"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-primary-400 hover:text-primary-300 disabled:opacity-50"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="text-dark-400 mt-2">Searching orders...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Results */}
      {!loading && searched && (
        <>
          {orders.length === 0 ? (
            <div className="text-center py-8 text-dark-400">
              <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-3 text-dark-500" />
              <p>No orders found for {searchType === 'phone' ? 'this phone number' : 'this reference'}</p>
              <p className="text-sm mt-1">Try checking the spelling or use a different search method</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-dark-400 text-sm mb-4">
                Found {orders.length} order{orders.length > 1 ? 's' : ''}
              </p>
              
              {orders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;
                const fulfillmentStatus = order.fulfillment_status || 'pending';
                const fulfillmentConfig = getFulfillmentConfig(fulfillmentStatus);

                return (
                  <div
                    key={order.id}
                    className={`border rounded-lg p-3 sm:p-4 ${statusConfig.bgColor} ${statusConfig.borderColor}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <StatusIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${statusConfig.color}`} />
                        <div>
                          <span className={`font-bold text-sm sm:text-base ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                          <p className="text-xs text-dark-400 hidden sm:block">
                            {statusConfig.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold text-sm sm:text-base">GH₵{order.amount?.toFixed(2)}</p>
                        <p className="text-xs text-dark-400">{order.plan}</p>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                      <div>
                        <p className="text-dark-400 text-xs">Order Reference</p>
                        <p className="text-white font-mono">{order.reference}</p>
                      </div>
                      <div>
                        <p className="text-dark-400 text-xs">Phone Number</p>
                        <p className="text-white">{formatPhone(order.phone)}</p>
                      </div>
                      <div>
                        <p className="text-dark-400 text-xs">Network</p>
                        <p className="text-white capitalize">{order.network}</p>
                      </div>
                      <div>
                        <p className="text-dark-400 text-xs">Date</p>
                        <p className="text-white">{formatDate(order.created_at)}</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-dark-400 mb-1">
                        <span className={order.status !== 'cancelled' ? 'text-green-500' : ''}>Order</span>
                        <span className={['processing', 'delivered', 'success'].includes(order.status) ? 'text-green-500' : ''}>Payment</span>
                        <span className={['delivered', 'success'].includes(order.status) ? 'text-green-500' : ''}>Delivery</span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div className={`h-full transition-all duration-500 ${
                          ['delivered', 'success'].includes(order.status) ? 'bg-green-500 w-full' :
                          order.status === 'processing' ? 'bg-blue-500 w-2/3' :
                          order.status === 'pending' ? 'bg-yellow-500 w-1/3' :
                          'bg-red-500 w-full'
                        }`}></div>
                      </div>
                    </div>

                    {/* Fulfillment Status */}
                    {order.fulfillment_status && (
                      <div className="mt-3 pt-3 border-t border-dark-600/50">
                        <div className="flex items-center gap-2">
                          <span className="text-dark-400 text-xs">Fulfillment:</span>
                          <span className={`text-sm font-medium ${fulfillmentConfig.color}`}>
                            {fulfillmentConfig.label}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Support Section for Failed/Expired Orders */}
                    {(order.status === 'failed' || order.status === 'expired' || order.fulfillment_status === 'failed') && (
                      <div className="mt-3 pt-3 border-t border-dark-600">
                        <p className="text-sm text-dark-300 mb-2">Need help with this order?</p>
                        <div className="flex gap-2">
                          <a 
                            href={`mailto:veloxtopupgh@gmail.com?subject=Order%20Issue%20-%20${order.reference}`}
                            className="text-xs text-primary-400 hover:text-primary-300 underline"
                          >
                            Email Support
                          </a>
                          <span className="text-dark-500">|</span>
                          <a 
                            href="tel:+233531649960"
                            className="text-xs text-primary-400 hover:text-primary-300 underline"
                          >
                            Call +233 531649960
                          </a>
                        </div>
                      </div>
                    )}

                    {/* Show vendor reference if available */}
                    {order.vendor_reference && (
                      <div className="mt-2 text-xs text-dark-400">
                        Provider Ref: {order.vendor_reference}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Initial State */}
      {!loading && !searched && (
        <div className="text-center py-8 sm:py-12 text-dark-400">
          <TruckIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-dark-600" />
          <p className="text-base sm:text-lg mb-2">Track Your Data Purchase</p>
          <p className="text-xs sm:text-sm max-w-md mx-auto px-4">
            Enter your phone number or order reference to check the status of your order
          </p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-sm mx-auto px-4">
            <div className="bg-dark-800 rounded-lg p-3">
              <p className="text-xs text-dark-400 mb-1">By Phone</p>
              <p className="text-white text-sm">Enter the number you used to purchase</p>
            </div>
            <div className="bg-dark-800 rounded-lg p-3">
              <p className="text-xs text-dark-400 mb-1">By Reference</p>
              <p className="text-white text-sm">Find your VTU reference number</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
