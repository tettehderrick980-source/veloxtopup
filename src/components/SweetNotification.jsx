import React, { useEffect, useState } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  XMarkIcon,
  ClockIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline';
import { AppError, getErrorMessage } from '../utils/errorHandler';

// Auto-dismiss timer duration (in ms)
const AUTO_DISMISS_DELAY = 5000;

export default function SweetNotification({ 
  message, 
  type = 'success', 
  onClose,
  error = null,
  dismissible = true,
  autoDismiss = true,
  action = null
}) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (autoDismiss && isVisible) {
      const timer = setTimeout(() => {
        handleClose();
      }, AUTO_DISMISS_DELAY);

      // Progress animation
      const interval = setInterval(() => {
        setProgress(prev => Math.max(0, prev - (100 / (AUTO_DISMISS_DELAY / 100))));
      }, 100);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    }
  }, [isVisible, autoDismiss]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  // Get icon based on type
  const getIcon = () => {
    const icons = {
      success: <CheckCircleIcon className="w-6 h-6" />,
      error: <ExclamationCircleIcon className="w-6 h-6" />,
      warning: <ExclamationTriangleIcon className="w-6 h-6" />,
      info: <InformationCircleIcon className="w-6 h-6" />,
      loading: <ClockIcon className="w-6 h-6 animate-spin" />,
      blocked: <NoSymbolIcon className="w-6 h-6" />
    };
    return icons[type] || icons.info;
  };

  // Get styles based on type
  const getStyles = () => {
    const styles = {
      success: {
        container: 'bg-green-900/30 border-green-500/50',
        icon: 'text-green-400',
        text: 'text-green-100',
        progress: 'bg-green-500'
      },
      error: {
        container: 'bg-red-900/30 border-red-500/50',
        icon: 'text-red-400',
        text: 'text-red-100',
        progress: 'bg-red-500'
      },
      warning: {
        container: 'bg-yellow-900/30 border-yellow-500/50',
        icon: 'text-yellow-400',
        text: 'text-yellow-100',
        progress: 'bg-yellow-500'
      },
      info: {
        container: 'bg-blue-900/30 border-blue-500/50',
        icon: 'text-blue-400',
        text: 'text-blue-100',
        progress: 'bg-blue-500'
      },
      loading: {
        container: 'bg-dark-700/30 border-dark-500/50',
        icon: 'text-primary-400',
        text: 'text-dark-100',
        progress: 'bg-primary-500'
      },
      blocked: {
        container: 'bg-gray-900/30 border-gray-500/50',
        icon: 'text-gray-400',
        text: 'text-gray-100',
        progress: 'bg-gray-500'
      }
    };
    return styles[type] || styles.info;
  };

  // Parse message for AppError objects or use provided error
  const getDisplayMessage = () => {
    // If it's an AppError or regular error object
    if (error) {
      if (error instanceof AppError) {
        return getErrorMessage(error);
      }
      return error.message || message;
    }
    
    // If message itself is an error object
    if (message instanceof AppError) {
      return getErrorMessage(message);
    }
    
    if (typeof message === 'object' && message !== null) {
      // Handle error-like objects
      if (message.error) {
        return typeof message.error === 'string' 
          ? message.error 
          : getErrorMessage(message.error);
      }
      if (message.message) {
        return message.message;
      }
    }
    
    return message;
  };

  // Get error code if available
  const getErrorCode = () => {
    if (error instanceof AppError) {
      return error.code;
    }
    if (message instanceof AppError) {
      return message.code;
    }
    return null;
  };

  const styles = getStyles();
  const displayMessage = getDisplayMessage();
  const errorCode = getErrorCode();

  if (!isVisible) return null;

  return (
    <div className="relative">
      <div 
        className={`
          ${styles.container} 
          border rounded-lg p-4 
          transform transition-all duration-300
          ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
          shadow-lg
        `}
        role="alert"
      >
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={`flex-shrink-0 ${styles.icon}`}>
            {getIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Main Message */}
            <p className={`${styles.text} text-sm font-medium`}>
              {displayMessage}
            </p>

            {/* Error Code */}
            {errorCode && (
              <p className="text-xs text-dark-400 mt-1">
                Error Code: <code className="font-mono">{errorCode}</code>
              </p>
            )}

            {/* Action Button */}
            {action && (
              <button
                onClick={action.onClick}
                className="mt-2 text-sm font-medium text-primary-400 hover:text-primary-300 underline"
              >
                {action.label}
              </button>
            )}
          </div>

          {/* Close Button */}
          {dismissible && (
            <button
              onClick={handleClose}
              className="flex-shrink-0 text-dark-400 hover:text-white transition-colors"
              aria-label="Dismiss notification"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Auto-dismiss Progress Bar */}
        {autoDismiss && type !== 'loading' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-dark-700 rounded-b-lg overflow-hidden">
            <div 
              className={`h-full ${styles.progress} transition-all duration-100`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for async operation feedback
export function LoadingNotification({ message = 'Loading...' }) {
  return (
    <SweetNotification 
      type="loading" 
      message={message} 
      autoDismiss={false}
      dismissible={false}
    />
  );
}

// Helper component for error with retry option
export function ErrorNotification({ 
  error, 
  onRetry = null, 
  onDismiss = null,
  context = 'operation'
}) {
  const getRetryMessage = () => {
    if (error instanceof AppError) {
      return getErrorMessage(error);
    }
    return error?.message || 'An error occurred';
  };

  return (
    <SweetNotification
      type="error"
      message={getRetryMessage()}
      error={error}
      action={onRetry ? {
        label: `Retry ${context}`,
        onClick: onRetry
      } : null}
      onClose={onDismiss}
      autoDismiss={!onRetry} // Auto-dismiss if no retry option
    />
  );
}

// Helper component for success with optional action
export function SuccessNotification({ 
  message, 
  action = null,
  onDismiss = null 
}) {
  return (
    <SweetNotification
      type="success"
      message={message}
      action={action}
      onClose={onDismiss}
      autoDismiss={!action} // Auto-dismiss if no action needed
    />
  );
}

// Helper component for blocking/unavailable notices
export function BlockedNotification({ 
  message,
  reason = 'unavailable',
  onDismiss = null 
}) {
  return (
    <SweetNotification
      type="blocked"
      message={message}
      onClose={onDismiss}
      autoDismiss={false}
      dismissible={true}
    />
  );
}
