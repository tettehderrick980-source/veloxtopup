import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { 
  XMarkIcon, 
  BanknotesIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export const RefundModal = ({ transaction, isOpen, onClose, onRefund }) => {
  const [reason, setReason] = useState('customer_request');
  const [customReason, setCustomReason] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const { error, success } = useNotification();

  if (!isOpen || !transaction) return null;

  const refundReasons = [
    { value: 'customer_request', label: 'Customer Request' },
    { value: 'failed_delivery', label: 'Failed Delivery' },
    { value: 'duplicate_payment', label: 'Duplicate Payment' },
    { value: 'fraudulent', label: 'Fraudulent Transaction' },
    { value: 'system_error', label: 'System Error' },
    { value: 'other', label: 'Other (specify below)' }
  ];

  const handleRefund = async () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    setProcessing(true);
    
    try {
      const refundData = {
        transactionId: transaction.id,
        reason: reason === 'other' ? customReason : refundReasons.find(r => r.value === reason)?.label,
        amount: transaction.amount,
        notifyCustomer,
        refundedBy: 'admin',
        refundedAt: new Date().toISOString()
      };

      await onRefund(refundData);
      success(`Successfully refunded GH₵${transaction.amount.toFixed(2)}`);
      onClose();
    } catch (err) {
      error('Refund failed: ' + err.message);
    } finally {
      setProcessing(false);
      setConfirmStep(false);
    }
  };

  const getFinalReason = () => {
    if (reason === 'other') return customReason;
    return refundReasons.find(r => r.value === reason)?.label;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <div className="flex items-center">
            <div className="p-2 bg-red-500/20 rounded-lg mr-3">
              <BanknotesIcon className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Process Refund</h3>
              <p className="text-dark-400 text-sm">Transaction: {transaction.reference?.slice(0, 12)}...</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!confirmStep ? (
            <>
              {/* Transaction Summary */}
              <div className="bg-dark-700/50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-dark-400 text-sm">Amount to Refund:</span>
                  <span className="text-xl font-bold text-white">GH₵{transaction.amount?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-dark-400">Customer:</span>
                  <span className="text-white">{transaction.users?.email || 'Guest'}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-dark-400">Phone:</span>
                  <span className="text-white">{transaction.phone || 'N/A'}</span>
                </div>
              </div>

              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Refund Reason *
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500"
                >
                  {refundReasons.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* Custom Reason */}
              {reason === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Specify Reason *
                  </label>
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter refund reason..."
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500"
                    rows={3}
                  />
                </div>
              )}

              {/* Notify Customer */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifyCustomer"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  className="w-4 h-4 rounded border-dark-600 text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="notifyCustomer" className="ml-2 text-sm text-dark-300">
                  Notify customer via email
                </label>
              </div>

              {/* Warning */}
              <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" />
                  <p className="text-sm text-yellow-300">
                    This action cannot be undone. The refund will be processed immediately.
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Confirmation Step */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExclamationTriangleIcon className="w-8 h-8 text-yellow-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Confirm Refund</h4>
              <p className="text-dark-400 mb-4">
                Are you sure you want to refund <span className="text-white font-bold">GH₵{transaction.amount?.toFixed(2)}</span>?
              </p>
              <div className="bg-dark-700/50 rounded-lg p-3 text-left">
                <p className="text-sm text-dark-400">Reason:</p>
                <p className="text-sm text-white">{getFinalReason()}</p>
                {notifyCustomer && (
                  <p className="text-sm text-green-400 mt-2 flex items-center">
                    <CheckCircleIcon className="w-4 h-4 mr-1" />
                    Customer will be notified
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-dark-700">
          {confirmStep && (
            <button
              onClick={() => setConfirmStep(false)}
              className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              disabled={processing}
            >
              Back
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
            disabled={processing}
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={processing || (reason === 'other' && !customReason)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 flex items-center"
          >
            {processing ? (
              <>
                <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : confirmStep ? (
              'Confirm Refund'
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RefundModal;
