import React, { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { 
  XMarkIcon, 
  PlayIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  SignalIcon
} from '@heroicons/react/24/outline';

export const RetryModal = ({ transaction, isOpen, onClose, onRetry, apiBalance }) => {
  const [confirmStep, setConfirmStep] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [retryStatus, setRetryStatus] = useState('idle');
  const { error, success } = useNotification();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setRetryStatus('idle');
      setConfirmStep(false);
      setProcessing(false);
    }
  }, [isOpen]);

  // Early return after all hooks are defined
  if (!isOpen || !transaction) return null;

  const canRetry = apiBalance >= transaction.amount;
  const previousAttempts = transaction.retry_count || 0;

  const handleRetry = async () => {
    if (!confirmStep) {
      setConfirmStep(true);
      return;
    }

    if (!canRetry) {
      error('Insufficient API balance to retry transaction');
      return;
    }

    setProcessing(true);
    setRetryStatus('checking');

    try {
      // Simulate status check
      await new Promise(resolve => setTimeout(resolve, 1000));
      setRetryStatus('processing');

      const retryData = {
        transactionId: transaction.id,
        previousAttempts: previousAttempts + 1,
        network: transaction.network,
        phone: transaction.phone,
        capacity: transaction.plan,
        amount: transaction.amount,
        retriedAt: new Date().toISOString()
      };

      await onRetry(retryData);
      setRetryStatus('success');
      success('Transaction retry initiated successfully!');
      
      // Close after showing success briefly
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setRetryStatus('failed');
      error('Retry failed: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusDisplay = () => {
    switch (retryStatus) {
      case 'checking':
        return {
          icon: <ClockIcon className="w-8 h-8 text-yellow-400 animate-pulse" />,
          title: 'Checking Status',
          message: 'Verifying transaction status and API balance...'
        };
      case 'processing':
        return {
          icon: <ArrowPathIcon className="w-8 h-8 text-primary-400 animate-spin" />,
          title: 'Processing Retry',
          message: 'Initiating data bundle delivery...'
        };
      case 'success':
        return {
          icon: <CheckCircleIcon className="w-8 h-8 text-green-400" />,
          title: 'Retry Initiated',
          message: 'Transaction is being processed. Check status in a few moments.'
        };
      case 'failed':
        return {
          icon: <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />,
          title: 'Retry Failed',
          message: 'Unable to process retry. Please try again or contact support.'
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-800 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-700">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-500/20 rounded-lg mr-3">
              <PlayIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Retry Transaction</h3>
              <p className="text-dark-400 text-sm">Transaction: {transaction.reference?.slice(0, 12)}...</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg">
            <XMarkIcon className="w-5 h-5 text-dark-400" />
          </button>
        </div>

        <div className="p-6">
          {statusDisplay ? (
            /* Processing Status */
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-dark-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                {statusDisplay.icon}
              </div>
              <h4 className="text-xl font-bold text-white mb-2">{statusDisplay.title}</h4>
              <p className="text-dark-400">{statusDisplay.message}</p>
            </div>
          ) : !confirmStep ? (
            /* Initial Step - Transaction Details */
            <div className="space-y-4">
              {/* Transaction Info */}
              <div className="bg-dark-700/50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-dark-400 text-xs uppercase">Network</p>
                    <p className="text-white font-medium flex items-center">
                      <SignalIcon className="w-4 h-4 mr-1 text-primary-400" />
                      {transaction.network || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-dark-400 text-xs uppercase">Phone</p>
                    <p className="text-white font-medium">{transaction.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-dark-400 text-xs uppercase">Amount</p>
                    <p className="text-white font-medium">GH₵{transaction.amount?.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-dark-400 text-xs uppercase">Previous Attempts</p>
                    <p className="text-white font-medium">{previousAttempts}</p>
                  </div>
                </div>
              </div>

              {/* API Balance Check */}
              <div className={`p-4 rounded-lg border ${
                canRetry 
                  ? 'bg-green-900/20 border-green-700' 
                  : 'bg-red-900/20 border-red-700'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${canRetry ? 'text-green-300' : 'text-red-300'}`}>
                      API Balance
                    </p>
                    <p className="text-white font-bold text-lg">
                      GH₵{apiBalance?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    canRetry ? 'bg-green-500/20' : 'bg-red-500/20'
                  }`}>
                    {canRetry ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                </div>
                {!canRetry && (
                  <p className="text-red-300 text-sm mt-2">
                    Insufficient balance. Need GH₵{(transaction.amount - (apiBalance || 0)).toFixed(2)} more.
                  </p>
                )}
              </div>

              {/* Previous Attempts Warning */}
              {previousAttempts > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-yellow-300 font-medium">
                        {previousAttempts} previous attempt{previousAttempts !== 1 ? 's' : ''} failed
                      </p>
                      <p className="text-xs text-yellow-400 mt-1">
                        Last attempt: {transaction.last_retry_at ? new Date(transaction.last_retry_at).toLocaleString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info */}
              <div className="text-sm text-dark-400">
                <p>
                  This will attempt to deliver the data bundle again using the same details.
                </p>
              </div>
            </div>
          ) : (
            /* Confirmation Step */
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlayIcon className="w-8 h-8 text-yellow-400" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Confirm Retry</h4>
              <p className="text-dark-400 mb-4">
                Retry attempt <span className="text-white font-bold">#{previousAttempts + 1}</span> for this transaction?
              </p>
              <div className="bg-dark-700/50 rounded-lg p-3 text-left space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Network:</span>
                  <span className="text-white">{transaction.network}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Phone:</span>
                  <span className="text-white">{transaction.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">Amount:</span>
                  <span className="text-white">GH₵{transaction.amount?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-dark-700">
          {statusDisplay ? (
            retryStatus === 'failed' ? (
              <button
                onClick={() => {
                  setRetryStatus('idle');
                  setConfirmStep(false);
                }}
                className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Try Again
              </button>
            ) : retryStatus === 'success' ? null : (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600"
              >
                Cancel
              </button>
            )
          ) : (
            <>
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
                onClick={handleRetry}
                disabled={processing || !canRetry}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-500 disabled:opacity-50 flex items-center"
              >
                {confirmStep ? (
                  <>
                    <PlayIcon className="w-4 h-4 mr-2" />
                    Confirm Retry
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-4 h-4 mr-2" />
                    Continue
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RetryModal;
