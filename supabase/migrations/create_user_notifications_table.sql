-- =====================================================
-- User Notifications Table Migration
-- VeloxTopUp - In-App Notification System
-- =====================================================

-- 1. Create the user_notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id 
  ON user_notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read 
  ON user_notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at 
  ON user_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created 
  ON user_notifications(user_id, created_at DESC);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON user_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role can insert notifications (for edge functions)
CREATE POLICY "Service role can insert notifications"
  ON user_notifications
  FOR INSERT
  WITH CHECK (true);

-- Service role can manage all notifications
CREATE POLICY "Service role can manage all notifications"
  ON user_notifications
  USING (true)
  WITH CHECK (true);

-- 5. Enable Realtime for live notifications
-- This allows the app to subscribe to new notifications in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE user_notifications;

-- 6. Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to auto-update updated_at on row updates
CREATE TRIGGER update_user_notifications_updated_at
  BEFORE UPDATE ON user_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Add comments for documentation
COMMENT ON TABLE user_notifications IS 'Stores in-app notifications for users';
COMMENT ON COLUMN user_notifications.id IS 'Unique identifier for the notification';
COMMENT ON COLUMN user_notifications.user_id IS 'Reference to the user who owns this notification';
COMMENT ON COLUMN user_notifications.type IS 'Type of notification (e.g., order_success, order_failed, low_balance)';
COMMENT ON COLUMN user_notifications.title IS 'Short title for the notification';
COMMENT ON COLUMN user_notifications.message IS 'Detailed message content';
COMMENT ON COLUMN user_notifications.data IS 'Additional JSON data (e.g., transaction_id, order details)';
COMMENT ON COLUMN user_notifications.is_read IS 'Whether the user has read this notification';
COMMENT ON COLUMN user_notifications.created_at IS 'When the notification was created';
COMMENT ON COLUMN user_notifications.updated_at IS 'When the notification was last updated';

-- =====================================================
-- Sample Notifications (Optional - for testing)
-- =====================================================

-- Uncomment the lines below to insert sample notifications for testing
-- Replace 'YOUR_USER_ID' with an actual user ID from your database

/*
INSERT INTO user_notifications (user_id, type, title, message, data, is_read) VALUES
  ('YOUR_USER_ID', 'order_success', 'Order Delivered!', 'Your MTN data bundle has been successfully delivered to 0241234567', 
   '{"transaction_id": "123e4567-e89b-12d3-a456-426614174000", "network": "mtn", "phone": "0241234567"}', false),
  
  ('YOUR_USER_ID', 'order_failed', 'Order Failed', 'Your recent order failed to process. Please contact support if payment was made.', 
   '{"transaction_id": "123e4567-e89b-12d3-a456-426614174001", "network": "telecel"}', false),
  
  ('YOUR_USER_ID', 'low_balance', 'Low Wallet Balance', 'Your API wallet balance is running low. Please top up to continue processing orders.', 
   '{"balance": 50.00, "threshold": 100.00}', false),
  
  ('YOUR_USER_ID', 'refund_processed', 'Refund Processed', 'A refund of GH₵25.00 has been processed to your wallet for transaction #VTU1234567890.', 
   '{"amount": 25.00, "transaction_id": "VTU1234567890"}', true);
*/

-- =====================================================
-- Verification Queries (Optional)
-- =====================================================

-- Verify table was created
-- SELECT COUNT(*) FROM user_notifications;

-- Verify indexes
-- SELECT indexname FROM pg_indexes WHERE tablename = 'user_notifications';

-- Verify RLS policies
-- SELECT policyname FROM pg_policies WHERE tablename = 'user_notifications';

-- Verify realtime is enabled
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
