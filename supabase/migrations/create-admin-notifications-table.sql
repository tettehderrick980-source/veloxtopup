-- Create admin_notifications table for storing admin alerts
-- This stores email and web app notifications for the admin

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('low_balance', 'order_queued', 'order_expired', 'fulfillment_failed', 'refund_initiated')),
  subject TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read) WHERE is_read = false;

-- Add comments for documentation
COMMENT ON TABLE admin_notifications IS 'Stores admin notifications for low balance alerts, queued orders, and system events';
COMMENT ON COLUMN admin_notifications.type IS 'Notification type: low_balance, order_queued, order_expired, fulfillment_failed, refund_initiated';
COMMENT ON COLUMN admin_notifications.data IS 'JSON object containing notification-specific data';
