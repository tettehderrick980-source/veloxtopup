import { supabase } from '../lib/supabase'

/**
 * Fetch notifications for a user with filtering and pagination options.
 *
 * @param {string} userId - The ID of the user to fetch notifications for
 * @param {Object} options - Query options
 * @param {number} [options.limit=20] - Maximum number of notifications to return
 * @param {number} [options.offset=0] - Number of notifications to skip
 * @param {boolean} [options.unreadOnly=false] - If true, only return unread notifications
 * @param {string} [options.filter='all'] - Filter by notification type ('all', 'orders', 'system')
 * @returns {Promise<{data: Array|null, error: Error|null, count: number}>}
 */
export async function fetchNotifications(userId, { limit = 20, offset = 0, unreadOnly = false, filter = 'all' } = {}) {
  let query = supabase
    .from('user_notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)

  if (unreadOnly) {
    query = query.eq('is_read', false)
  }

  if (filter === 'orders') {
    query = query.or('type.like.order_%,type.like.refund_%')
  } else if (filter === 'system') {
    query = query.in('type', ['low_balance', 'fulfillment_failed', 'system'])
  }

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const { data, error, count } = await query

  return { data, error, count: count || 0 }
}

/**
 * Get the count of unread notifications for a user.
 *
 * @param {string} userId - The ID of the user to count unread notifications for
 * @returns {Promise<number>} - The count of unread notifications
 */
export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from('user_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }

  return count || 0
}

/**
 * Mark a single notification as read.
 *
 * @param {string} notificationId - The ID of the notification to mark as read
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function markAsRead(notificationId) {
  const { data, error } = await supabase
    .from('user_notifications')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('id', notificationId)
    .select()
    .single()

  return { data, error }
}

/**
 * Mark all notifications as read for a user.
 *
 * @param {string} userId - The ID of the user whose notifications should be marked as read
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function markAllAsRead(userId) {
  const { data, error } = await supabase
    .from('user_notifications')
    .update({ is_read: true, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false)
    .select()

  return { data, error }
}

/**
 * Delete a notification by ID.
 *
 * @param {string} notificationId - The ID of the notification to delete
 * @returns {Promise<{error: Error|null}>}
 */
export async function deleteNotification(notificationId) {
  const { error } = await supabase
    .from('user_notifications')
    .delete()
    .eq('id', notificationId)

  return { error }
}

/**
 * Subscribe to real-time notifications for a user.
 *
 * @param {string} userId - The ID of the user to subscribe to notifications for
 * @param {Function} callback - Function to call when a new notification is received
 * @returns {Object} - The Supabase channel (use supabase.removeChannel(channel) to unsubscribe)
 */
export function subscribeToNotifications(userId, callback) {
  const channel = supabase
    .channel(`user-notifications-${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'user_notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new)
        }
      }
    )
    .subscribe()

  return channel
}

/**
 * Create a new notification.
 *
 * @param {Object} notification - The notification data
 * @param {string} notification.userId - The ID of the user to create the notification for
 * @param {string} notification.type - The type of notification (e.g., 'order_success', 'order_failed', 'low_balance')
 * @param {string} notification.title - The title of the notification
 * @param {string} notification.message - The message content of the notification
 * @param {Object} [notification.data] - Additional data associated with the notification
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createNotification({ userId, type, title, message, data = null }) {
  const { data: notificationData, error } = await supabase
    .from('user_notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      data,
      is_read: false,
      created_at: new Date().toISOString()
    })
    .select()
    .single()

  return { data: notificationData, error }
}
