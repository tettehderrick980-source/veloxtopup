import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'success':
      return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
    case 'error':
      return <XCircleIcon className="w-5 h-5 text-red-400" />;
    case 'warning':
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
    default:
      return <InformationCircleIcon className="w-5 h-5 text-blue-400" />;
  }
};

const NotificationStyles = {
  success: 'bg-green-900/90 border-green-700 text-green-100',
  error: 'bg-red-900/90 border-red-700 text-red-100',
  warning: 'bg-yellow-900/90 border-yellow-700 text-yellow-100',
  info: 'bg-blue-900/90 border-blue-700 text-blue-100'
};

const NotificationItem = ({ notification }) => {
  const { removeNotification } = useNotification();

  return (
    <div 
      className={`relative flex items-start gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm min-w-[300px] max-w-[400px] animate-slide-in ${NotificationStyles[notification.type]}`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        <NotificationIcon type={notification.type} />
      </div>
      
      <div className="flex-1 min-w-0">
        {notification.title && (
          <h4 className="font-semibold text-sm mb-1">
            {notification.title}
          </h4>
        )}
        <p className="text-sm opacity-90 break-words">
          {notification.message}
        </p>
      </div>

      <button 
        onClick={() => removeNotification(notification.id)}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Close notification"
      >
        <XMarkIcon className="w-4 h-4 opacity-70 hover:opacity-100" />
      </button>

      {/* Progress bar */}
      {notification.duration > 0 && (
        <div 
          className="absolute bottom-0 left-0 h-0.5 bg-white/30 rounded-full animate-progress"
          style={{ 
            animationDuration: `${notification.duration}ms`,
            width: '100%'
          }}
        />
      )}
    </div>
  );
};

export const NotificationContainer = () => {
  const { notifications, clearAll } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div 
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Clear all button */}
      {notifications.length > 1 && (
        <div className="flex justify-end pointer-events-auto mb-1">
          <button 
            onClick={clearAll}
            className="text-xs text-dark-400 hover:text-white bg-dark-800/90 px-2 py-1 rounded backdrop-blur-sm"
          >
            Clear all ({notifications.length})
          </button>
        </div>
      )}

      {/* Notifications */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        {notifications.map(notification => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
      </div>
    </div>
  );
};

export default NotificationContainer;
