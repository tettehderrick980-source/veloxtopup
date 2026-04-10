import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { subscribeToNotifications, fetchNotifications, getUnreadCount } from '../services/notifications';
import { supabase } from '../lib/supabase';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [dbNotifications, setDbNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [subscription, setSubscription] = useState(null);

  // Fetch notifications from database when user logs in
  useEffect(() => {
    if (!user?.id) {
      setDbNotifications([]);
      setUnreadCount(0);
      return;
    }

    const loadNotifications = async () => {
      try {
        const { data, count } = await Promise.all([
          fetchNotifications(user.id, { limit: 50 }),
          getUnreadCount(user.id)
        ]);
        
        setDbNotifications(data || []);
        setUnreadCount(count || 0);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();

    // Subscribe to real-time notifications
    const channel = subscribeToNotifications(user.id, (newNotification) => {
      setDbNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show toast notification for new database notification
      addToast({
        type: getNotificationType(newNotification.type),
        title: newNotification.title,
        message: newNotification.message,
        duration: 8000
      });
    });

    setSubscription(channel);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  // Toast notifications (UI only, not persisted)
  const addToast = useCallback((notification) => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    const newNotification = {
      id,
      type: notification.type || 'info',
      title: notification.title || '',
      message: notification.message,
      duration: notification.duration || 5000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newNotification.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setNotifications([]);
  }, []);

  // Database notification actions
  const markAsRead = useCallback(async (notificationId) => {
    try {
      const { markAsRead: markRead } = await import('../services/notifications');
      await markRead(notificationId);
      
      setDbNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { markAllAsRead: markAllRead } = await import('../services/notifications');
      await markAllRead(user.id);
      
      setDbNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.id]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      const { deleteNotification: deleteNotif } = await import('../services/notifications');
      await deleteNotif(notificationId);
      
      setDbNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, count } = await Promise.all([
        fetchNotifications(user.id, { limit: 50 }),
        getUnreadCount(user.id)
      ]);
      
      setDbNotifications(data || []);
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    }
  }, [user?.id]);

  // Convenience methods for toast notifications
  const success = useCallback((message, options = {}) => {
    return addToast({ type: 'success', message, ...options });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ type: 'error', message, duration: 8000, ...options });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({ type: 'warning', message, ...options });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ type: 'info', message, ...options });
  }, [addToast]);

  const value = {
    // Toast notifications (temporary UI notifications)
    toasts: notifications,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    
    // Database notifications (persistent)
    dbNotifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
    
    // Legacy support
    notifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

// Helper function to map notification types to toast types
function getNotificationType(type) {
  if (type.includes('success') || type.includes('delivered') || type.includes('completed')) {
    return 'success';
  }
  if (type.includes('failed') || type.includes('error') || type.includes('expired')) {
    return 'error';
  }
  if (type.includes('warning') || type.includes('low_balance')) {
    return 'warning';
  }
  return 'info';
}

export default NotificationContext;
