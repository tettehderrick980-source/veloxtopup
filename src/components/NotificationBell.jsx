import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { 
  BellIcon,
  XMarkIcon,
  CheckIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const NotificationIcon = ({ type }) => {
  switch (type) {
    case 'success':
    case 'order_success':
    case 'order_delivered':
      return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
    case 'error':
    case 'order_failed':
    case 'fulfillment_failed':
      return <XCircleIcon className="w-5 h-5 text-red-400" />;
    case 'warning':
    case 'low_balance':
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
    default:
      return <InformationCircleIcon className="w-5 h-5 text-blue-400" />;
  }
};

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const {
    dbNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications
  } = useNotification();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (notificationId, e) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen && unreadCount > 0) {
      // Optionally mark all as read when opening
    }
  };

  const getNotificationRoute = (notification) => {
    if (notification.data?.transaction_id) {
      return `/transactions`;
    }
    return '/dashboard';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button 
        onClick={handleBellClick}
        className="relative p-2 text-dark-300 hover:text-primary-400 hover:bg-dark-800/50 rounded-lg transition-colors"
        title={`${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`}
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl backdrop-blur-sm z-50 max-h-[500px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-600">
            <h3 className="text-lg font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-primary-400 hover:text-primary-300 font-medium"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-dark-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {dbNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="w-12 h-12 text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400 font-medium">No notifications yet</p>
                <p className="text-dark-500 text-sm mt-1">
                  We'll notify you when something happens
                </p>
              </div>
            ) : (
              <div className="divide-y divide-dark-700">
                {dbNotifications.slice(0, 20).map((notification) => (
                  <Link
                    key={notification.id}
                    to={getNotificationRoute(notification)}
                    onClick={() => {
                      if (!notification.is_read) {
                        handleMarkAsRead(notification.id, { stopPropagation: () => {} });
                      }
                      setIsOpen(false);
                    }}
                    className={`block p-4 hover:bg-dark-700/50 transition-colors cursor-pointer ${
                      !notification.is_read ? 'bg-dark-700/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <NotificationIcon type={notification.type} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {notification.title && (
                              <h4 className="text-sm font-semibold text-white mb-1">
                                {notification.title}
                              </h4>
                            )}
                            <p className="text-sm text-dark-300 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-dark-500 mt-1">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                            )}
                            <button
                              onClick={(e) => handleDelete(notification.id, e)}
                              className="p-1 text-dark-500 hover:text-red-400 transition-colors"
                              title="Delete notification"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {dbNotifications.length > 0 && (
            <div className="p-3 border-t border-dark-600">
              <button
                onClick={() => {
                  setIsOpen(false);
                  // Could navigate to a full notifications page
                }}
                className="w-full text-center text-sm text-primary-400 hover:text-primary-300 font-medium py-2"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
