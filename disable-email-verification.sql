-- Disable email verification temporarily to bypass rate limits
-- Run this in Supabase SQL Editor

-- Update authentication settings
UPDATE auth.config 
SET 
  enable_signup = true,
  enable_email_confirmations = false,
  mailer_auto_confirm = true;

-- Or alternatively, you can disable email confirmation in the Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Find "Enable email confirmations" 
-- 3. Toggle it OFF
-- 4. Save changes
