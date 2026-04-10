import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db, supabase } from '../lib/supabase';
import { paystackService } from '../services/paystack';
import { validateGhanaPhoneNumber, validatePhoneInput, detectNetworkFromPhoneNumber } from '../utils/phoneValidation';
import GhDataConnectService, { GhDataConnectAPI } from '../services/ghdataconnect';
import { 
  PhoneIcon, 
  EnvelopeIcon, 
  CheckCircleIcon,
  XCircleIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

const NETWORKS = [
  { id: 'mtn', name: 'MTN', logo: '/MTN.jpg', color: 'bg-yellow-500' },
  { id: 'telecel', name: 'Telecel', logo: '/Telecel.png', color: 'bg-blue-500' },
  { id: 'atbigtime', name: 'AT Big Time', logo: '/AirtelTigo.avif', color: 'bg-orange-500' },
  { id: 'atishare', name: 'AT iShare', logo: '/AirtelTigo.avif', color: 'bg-purple-500' }
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'text-yellow-400', description: 'Waiting for payment...' },
  processing: { label: 'Processing', color: 'text-blue-400', description: 'Payment received, processing your order...' },
  queued: { label: 'Queued', color: 'text-orange-400', description: 'Order received! Your data will be delivered shortly.' },
  delivered: { label: 'Delivered', color: 'text-green-400', description: 'Data has been delivered to your phone!' },
  failed: { label: 'Failed', color: 'text-red-400', description: 'Order failed. Please contact support.' },
  cancelled: { label: 'Cancelled', color: 'text-gray-400', description: 'Order was cancelled.' },
  expired: { label: 'Expired', color: 'text-gray-400', description: 'Order expired. Refund initiated.' }
};

const TRANSACTION_LOCK_DURATION = 30000;

export default function BuyForm() {
  const { user } = useAuth();
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [bundlesLoading, setBundlesLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bundles, setBundles] = useState([]);
  const [availableNetworks, setAvailableNetworks] = useState([]);
  const [currentTransaction, setCurrentTransaction] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  
  const lastTransactionRef = useRef(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportNote, setReportNote] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  const [phoneError, setPhoneError] = useState('');
  const [detectedNetwork, setDetectedNetwork] = useState(null);

  // Refs for polling cleanup
  const pollingIntervalRef = useRef(null);
  const pollingTimeoutRef = useRef(null);

  const isGuest = !user;
  const totalAmount = selectedPlan ? selectedPlan.selling_price : 0;

  useEffect(() => {
    fetchAvailableNetworks();
    checkWalletBalance();
  }, []);

  useEffect(() => {
    if (selectedNetwork) {
      fetchBundles();
    } else {
      setBundles([]);
      setSelectedPlan(null);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    let interval;
    if (currentTransaction && transactionStatus === 'processing') {
      interval = setInterval(async () => {
        await checkTransactionStatus();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [currentTransaction, transactionStatus]);

  useEffect(() => {
    if (phoneNumber.length >= 10) {
      const validation = validateGhanaPhoneNumber(phoneNumber, selectedNetwork);
      setPhoneError(validation.error || '');
      
      // Auto-detect network from phone number
      const detected = detectNetworkFromPhoneNumber(phoneNumber);
      setDetectedNetwork(detected);
    } else {
      setPhoneError('');
      setDetectedNetwork(null);
    }
  }, [phoneNumber, selectedNetwork]);

  useEffect(() => {
    if (lockCountdown > 0) {
      const timer = setTimeout(() => setLockCountdown(lockCountdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (lockCountdown === 0 && isLocked) {
      setIsLocked(false);
      lastTransactionRef.current = null;
    }
  }, [lockCountdown, isLocked]);

  // Cleanup polling interval and timeout on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  const checkWalletBalance = async () => {
    // Silently check balance in background - don't block UI
    GhDataConnectService.getWalletBalance().catch(() => {});
  };

  const checkDuplicateTransaction = (network, phone, capacity) => {
    const now = Date.now();
    const lastTx = lastTransactionRef.current;
    
    if (lastTx) {
      const timeDiff = now - lastTx.timestamp;
      const isSameTx = lastTx.network === network && 
                       lastTx.phone === phone && 
                       lastTx.capacity === capacity;
      
      if (isSameTx && timeDiff < TRANSACTION_LOCK_DURATION) {
        const remainingSeconds = Math.ceil((TRANSACTION_LOCK_DURATION - timeDiff) / 1000);
        setIsLocked(true);
        setLockCountdown(remainingSeconds);
        return true;
      }
    }
    return false;
  };

  const fetchAvailableNetworks = async () => {
    try {
      const networks = await GhDataConnectService.fetchAllNetworks();
      setAvailableNetworks(networks);
    } catch (error) {
      console.error('Error fetching networks:', error);
      setAvailableNetworks(NETWORKS.map(n => ({ key: n.id, name: n.name })));
    }
  };

  const fetchBundles = async () => {
    setBundlesLoading(true);
    setError('');
    try {
      const fetchedBundles = await GhDataConnectAPI.getPlansForNetwork(selectedNetwork);
      setBundles(fetchedBundles);
    } catch (error) {
      console.error('Error fetching bundles:', error);
      setError(`Failed to load ${selectedNetwork} bundles`);
      setBundles([]);
    } finally {
      setBundlesLoading(false);
    }
  };

  const checkTransactionStatus = async () => {
    if (!currentTransaction?.id) return;
    
    setCheckingStatus(true);
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', currentTransaction.id)
        .single();

      if (data) {
        setTransactionStatus(data.status);
        if (data.status === 'delivered' || data.fulfillment_status === 'fulfilled') {
          setSuccess('Purchase completed successfully! Data has been delivered to your phone.');
          setTimeout(() => resetForm(), 5000);
        } else if (data.status === 'failed' || data.fulfillment_status === 'expired') {
          setError(data.fulfillment_status === 'expired' ? 'Order expired. Refund has been initiated.' : 'Purchase failed. Please contact support.');
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const startQueuedOrderPolling = (transactionId) => {
    const MAX_POLLING_DURATION = 65 * 60 * 1000; // 65 minutes (slightly beyond 1-hour queue expiry)

    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', transactionId)
          .single();

        if (data) {
          if (data.fulfillment_status === 'fulfilled' || data.status === 'delivered') {
            clearInterval(pollInterval);
            if (pollingTimeoutRef.current) {
              clearTimeout(pollingTimeoutRef.current);
              pollingTimeoutRef.current = null;
            }
            pollingIntervalRef.current = null;
            setTransactionStatus('delivered');
            setSuccess('Purchase completed successfully! Data has been delivered to your phone.');
            setTimeout(() => resetForm(), 5000);
          } else if (data.fulfillment_status === 'expired') {
            clearInterval(pollInterval);
            if (pollingTimeoutRef.current) {
              clearTimeout(pollingTimeoutRef.current);
              pollingTimeoutRef.current = null;
            }
            pollingIntervalRef.current = null;
            setTransactionStatus('expired');
            setError('Order expired due to processing timeout. Refund has been initiated.');
          } else if (data.fulfillment_status === 'failed') {
            clearInterval(pollInterval);
            if (pollingTimeoutRef.current) {
              clearTimeout(pollingTimeoutRef.current);
              pollingTimeoutRef.current = null;
            }
            pollingIntervalRef.current = null;
            setTransactionStatus('failed');
            setError('Order processing failed. Please contact support.');
          }
        }
      } catch (error) {
        console.error('Error polling queued order:', error);
      }
    }, 10000);

    pollingIntervalRef.current = pollInterval;

    // Set a maximum polling timeout
    pollingTimeoutRef.current = setTimeout(() => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      pollingTimeoutRef.current = null;
      setTransactionStatus('expired');
      setError('Your order has expired. If payment was made, a refund will be initiated automatically. Please contact support if you need assistance.');
    }, MAX_POLLING_DURATION);
  };

  const resetForm = () => {
    // Clean up any ongoing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    setSelectedNetwork('');
    setPhoneNumber('');
    setSelectedPlan(null);
    setBundles([]);
    setCurrentTransaction(null);
    setTransactionStatus(null);
    setError('');
    setSuccess('');
    setShowReportForm(false);
    setReportNote('');
    setReportSent(false);
  };

  const handleSendReport = async (e) => {
    e.preventDefault();
    if (!reportNote.trim()) return;
    
    setSendingReport(true);
    try {
      if (currentTransaction?.id) {
        await db.updateTransaction(currentTransaction.id, {
          user_report: reportNote,
          user_report_email: user?.email || guestEmail,
          user_report_phone: phoneNumber,
          reported_at: new Date().toISOString()
        });
      }
      
      setReportSent(true);
      setReportNote('');
      setShowReportForm(false);
    } catch (error) {
      console.error('Error sending report:', error);
    } finally {
      setSendingReport(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!selectedNetwork) throw new Error('Please select a network');
      
      // Validate phone number with network check
      const phoneValidation = validateGhanaPhoneNumber(phoneNumber, selectedNetwork);
      if (!phoneValidation.isValid) {
        throw new Error(phoneValidation.error || 'Please enter a valid phone number');
      }
      
      if (!selectedPlan) throw new Error('Please select a data plan');

      if (checkDuplicateTransaction(selectedNetwork, phoneNumber, selectedPlan.capacity)) {
        throw new Error(`Please wait ${lockCountdown} seconds before placing another order.`);
      }

      const paymentEmail = user?.email || guestEmail || `guest_${Date.now()}@veloxtopup.shop`;

      lastTransactionRef.current = {
        network: selectedNetwork,
        phone: phoneNumber,
        capacity: selectedPlan.capacity,
        timestamp: Date.now()
      };

      const transactionData = {
        user_id: user?.id || null,
        guest_email: paymentEmail,
        type: 'data',
        network: selectedNetwork,
        phone: phoneNumber,
        plan: selectedPlan.name,
        amount: selectedPlan.selling_price,
        cost_price: selectedPlan.cost_price,
        selling_price: selectedPlan.selling_price,
        profit: selectedPlan.profit,
        margin_percentage: selectedPlan.margin_percentage,
        capacity: String(selectedPlan.capacity),
        status: 'pending',
        reference: `VTU${Date.now()}`,
        created_at: new Date().toISOString()
      };

      const { data: transaction, error: transactionError } = await db.createTransaction(transactionData);
      if (transactionError) throw transactionError;

      await paystackService.initializePayment({
        email: paymentEmail,
        amount: selectedPlan.selling_price,
        metadata: {
          transaction_id: transaction.id,
          user_id: user?.id || null,
          type: 'data_purchase',
          network: selectedNetwork,
          phone: phoneNumber,
          plan: selectedPlan.name,
          capacity: selectedPlan.capacity,
          cost_price: selectedPlan.cost_price,
          selling_price: selectedPlan.selling_price,
          profit: selectedPlan.profit,
          is_guest: isGuest
        },
        onSuccess: async (response) => {
          try {
            // Get fresh session token if user is logged in
            const sessionToken = user
              ? (await supabase.auth.getSession()).data.session?.access_token
              : null;

            const updateTx = async (id, updates) => {
              const { error } = await supabase
                .from('transactions')
                .update(updates)
                .eq('id', id);
              if (error) throw error;
            };

            await updateTx(transaction.id, {
              status: 'processing',
              payment_reference: response.reference,
              updated_at: new Date().toISOString()
            });

            setCurrentTransaction(transaction);
            setTransactionStatus('processing');
            setSuccess('Payment successful! Processing your purchase...');
            setError('');

            const { data, error: fnError } = await supabase.functions.invoke('purchase-data', {
              body: {
                transactionId: transaction.id,
                network: selectedNetwork,
                phone: phoneNumber,
                capacity: selectedPlan.capacity,
                cost_price: selectedPlan.cost_price,
                selling_price: selectedPlan.selling_price,
                reference: transaction.reference,
                payment_reference: response.reference,
                user_id: user?.id || null
              },
              ...(sessionToken ? { headers: { Authorization: `Bearer ${sessionToken}` } } : {})
            });

            if (fnError) throw fnError;

            if (data?.data?.status === 'queued') {
              setTransactionStatus('queued');
              setSuccess(data.data.message || 'Order received! Your data will be delivered once our wallet is topped up.');
              await updateTx(transaction.id, {
                status: 'processing',
                fulfillment_status: 'queued',
                fulfillment_expires_at: data.data.expires_at,
                api_response: data.data,
                updated_at: new Date().toISOString()
              });
              lastTransactionRef.current = null;
              setIsLocked(false);
              startQueuedOrderPolling(transaction.id);
            } else {
              await updateTx(transaction.id, {
                status: 'delivered',
                fulfillment_status: 'fulfilled',
                vendor_reference: data.data?.vendor_reference,
                api_response: data.data,
                updated_at: new Date().toISOString()
              });
              setTransactionStatus('delivered');
              setSuccess('Purchase completed successfully! Data has been delivered to your phone.');
              lastTransactionRef.current = null;
              setIsLocked(false);
              setTimeout(() => resetForm(), 5000);
            }

          } catch (error) {
            console.error('Purchase processing error:', error);
            setTransactionStatus('failed');
            setError('Payment received but purchase failed. Please contact support.');
            await supabase.from('transactions').update({
              status: 'failed',
              api_response: { error: error.message },
              updated_at: new Date().toISOString()
            }).eq('id', transaction.id);
          }
        },
        onClose: () => {
          if (transaction?.id) {
            supabase.from('transactions').update({
              status: 'cancelled',
              updated_at: new Date().toISOString()
            }).eq('id', transaction.id);
          }
          setTransactionStatus('cancelled');
          setLoading(false);
          lastTransactionRef.current = null;
          setIsLocked(false);
        }
      });

    } catch (error) {
      console.error('Purchase error:', error);
      setError(error.message || 'Purchase failed');
      lastTransactionRef.current = null;
      setIsLocked(false);
    } finally {
      setLoading(false);
    }
  };

  const isNetworkAvailable = (networkId) => {
    return availableNetworks.some(network => network.key === networkId);
  };

  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <div className="card max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Buy Data Bundles</h2>
      
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {transactionStatus && (
        <div className={`border rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 ${
          transactionStatus === 'delivered' ? 'bg-green-900/50 border-green-700' :
          transactionStatus === 'failed' ? 'bg-red-900/50 border-red-700' :
          transactionStatus === 'cancelled' ? 'bg-gray-900/50 border-gray-700' :
          'bg-blue-900/50 border-blue-700'
        }`}>
          <div className="flex items-center gap-2 sm:gap-3">
            {transactionStatus === 'processing' && (
              <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-500"></div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-bold text-base sm:text-lg ${getStatusConfig(transactionStatus).color}`}>
                  {getStatusConfig(transactionStatus).label}
                </span>
                {checkingStatus && (
                  <span className="text-xs text-dark-400">Checking...</span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-dark-300 mt-1">
                {getStatusConfig(transactionStatus).description}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 sm:mt-4">
            <div className="flex justify-between text-xs text-dark-400 mb-2">
              <span className={transactionStatus !== 'cancelled' ? 'text-green-500' : ''}>Pending</span>
              <span className={['processing', 'delivered', 'success'].includes(transactionStatus) ? 'text-green-500' : ''}>Processing</span>
              <span className={['delivered', 'success'].includes(transactionStatus) ? 'text-green-500' : ''}>Delivered</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <div className={`h-full transition-all duration-500 ${
                transactionStatus === 'delivered' || transactionStatus === 'success' ? 'bg-green-500 w-full' :
                transactionStatus === 'processing' ? 'bg-blue-500 w-2/3' :
                transactionStatus === 'failed' || transactionStatus === 'cancelled' ? 'bg-red-500 w-full' :
                'bg-yellow-500 w-1/3'
              }`}></div>
            </div>
          </div>

          {transactionStatus === 'delivered' && currentTransaction && (
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-dark-800 rounded-lg">
              <h4 className="text-xs sm:text-sm font-semibold text-white mb-2">Order Details</h4>
              <div className="text-xs text-dark-300 space-y-1">
                <p><span className="text-dark-400">Network:</span> {currentTransaction.network}</p>
                <p><span className="text-dark-400">Phone:</span> {currentTransaction.phone}</p>
                <p><span className="text-dark-400">Bundle:</span> {currentTransaction.plan}</p>
                <p><span className="text-dark-400">Amount:</span> GH₵{currentTransaction.amount?.toFixed(2)}</p>
              </div>
            </div>
          )}

          {(transactionStatus === 'failed' || transactionStatus === 'expired') && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-dark-600">
              <h4 className="text-xs sm:text-sm font-semibold text-white mb-3">Need Help? Contact Support</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-4">
                <a href="mailto:veloxtopupgh@gmail.com" className="flex items-center p-2 sm:p-3 bg-dark-800 rounded-lg hover:bg-dark-700">
                  <EnvelopeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-400 mr-2 sm:mr-3" />
                  <div>
                    <p className="text-white text-xs sm:text-sm font-medium">Email Support</p>
                    <p className="text-dark-400 text-xs hidden sm:block">veloxtopupgh@gmail.com</p>
                  </div>
                </a>
                <a href="tel:+233531649960" className="flex items-center p-2 sm:p-3 bg-dark-800 rounded-lg hover:bg-dark-700">
                  <PhoneIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 mr-2 sm:mr-3" />
                  <div>
                    <p className="text-white text-xs sm:text-sm font-medium">Call Support</p>
                    <p className="text-dark-400 text-xs hidden sm:block">+233 531649960</p>
                  </div>
                </a>
              </div>

              {!reportSent ? (
                <div className="bg-dark-800 rounded-lg p-4">
                  {!showReportForm ? (
                    <button onClick={() => setShowReportForm(true)} className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg">
                      Report an Issue
                    </button>
                  ) : (
                    <form onSubmit={handleSendReport} className="space-y-3">
                      <textarea
                        value={reportNote}
                        onChange={(e) => setReportNote(e.target.value)}
                        placeholder="Describe your issue..."
                        className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white"
                        rows={3}
                      />
                      <div className="flex space-x-3">
                        <button type="button" onClick={() => setShowReportForm(false)} className="flex-1 py-2 bg-dark-700 rounded-lg">Cancel</button>
                        <button type="submit" disabled={sendingReport} className="flex-1 py-2 bg-primary-500 rounded-lg">Send Report</button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                <div className="bg-green-900/50 border border-green-700 rounded-lg p-4 text-center">
                  <CheckCircleIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-200">Report Sent!</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">Select Network</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {NETWORKS.map((network) => {
              const isAvailable = isNetworkAvailable(network.id);
              return (
                <button
                  key={network.id}
                  type="button"
                  onClick={() => isAvailable && !transactionStatus && !isLocked && setSelectedNetwork(network.id)}
                  disabled={!isAvailable || !!transactionStatus || isLocked}
                  className={`py-3 px-2 rounded-lg font-medium transition-all flex flex-col items-center ${
                    selectedNetwork === network.id
                      ? 'bg-primary-500 text-white ring-2 ring-primary-400'
                      : isAvailable
                      ? 'bg-dark-700 text-dark-300 hover:bg-dark-600'
                      : 'bg-dark-800 text-dark-500 opacity-50'
                  }`}
                >
                  <img src={network.logo} alt={network.name} className="w-12 h-12 sm:w-10 sm:h-10 object-cover rounded-lg mb-2" />
                  <span className="text-xs sm:text-sm">{network.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-300 mb-2">Phone Number</label>
          <div className="relative">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0241234567"
              className={`input-field w-full ${
                phoneError ? 'border-red-500 focus:border-red-500' : 
                detectedNetwork ? 'border-green-500 focus:border-green-500' : ''
              }`}
              disabled={!!transactionStatus || isLocked}
              required
            />
            {detectedNetwork && !phoneError && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-xs text-green-400 bg-green-900/50 px-2 py-1 rounded">
                  {NETWORKS.find(n => n.id === detectedNetwork)?.name || detectedNetwork}
                </span>
              </div>
            )}
          </div>
          {phoneError && (
            <p className="mt-1 text-sm text-red-400 flex items-center">
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              {phoneError}
            </p>
          )}
          {!phoneError && phoneNumber.length >= 10 && detectedNetwork && detectedNetwork !== selectedNetwork && (
            <p className="mt-1 text-sm text-yellow-400 flex items-center">
              <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
              Number appears to be {NETWORKS.find(n => n.id === detectedNetwork)?.name}, but you selected {NETWORKS.find(n => n.id === selectedNetwork)?.name}
            </p>
          )}
          <p className="mt-1 text-xs text-dark-400">
            Format: 0241234567 (10 digits starting with 0)
          </p>
        </div>

        {isGuest && (
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Email (Optional)</label>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="your@email.com"
              className="input-field w-full"
              disabled={!!transactionStatus || isLocked}
            />
          </div>
        )}

        {selectedNetwork && (
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Select Data Plan</label>
            {bundlesLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            ) : bundles.length > 0 ? (
              <div className="space-y-3">
                {bundles.map((bundle) => (
                  <button
                    key={bundle.id}
                    type="button"
                    onClick={() => !transactionStatus && !isLocked && setSelectedPlan(bundle)}
                    disabled={!!transactionStatus || isLocked}
                    className={`w-full p-4 sm:p-4 rounded-lg border transition-all ${
                      selectedPlan?.id === bundle.id
                        ? 'border-primary-500 bg-dark-700'
                        : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <div className="text-white font-medium text-sm sm:text-base">{bundle.name}</div>
                        <div className="text-dark-400 text-xs sm:text-sm">{bundle.validity}</div>
                      </div>
                      <div className="text-primary-400 font-semibold text-sm sm:text-base">GH₵{bundle.selling_price.toFixed(2)}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-dark-400">No bundles available</div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !selectedNetwork || !phoneNumber || !selectedPlan || !!transactionStatus || isLocked}
          className="btn-primary w-full py-3 disabled:opacity-50"
        >
          {isLocked ? `Please wait ${lockCountdown}s...` : loading ? 'Processing...' : `Buy ${selectedPlan?.name || 'Data'} - GH₵${totalAmount.toFixed(2)}`}
        </button>

        {transactionStatus && (
          <button type="button" onClick={resetForm} className="w-full py-2 text-sm text-dark-400 hover:text-white">
            Make Another Purchase
          </button>
        )}
      </form>
    </div>
  );
}
