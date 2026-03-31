-- Add notification_preferences column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "marketing": false}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN users.notification_preferences IS 'User notification preferences: email, sms, marketing (JSON object)';

-- Update existing users to have default notification preferences
UPDATE users 
SET notification_preferences = '{"email": true, "sms": true, "marketing": false}'::jsonb
WHERE notification_preferences IS NULL;
