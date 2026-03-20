-- Configure test email service to avoid rate limits
-- Run this in Supabase SQL Editor

-- Update mailer settings to use a test service
UPDATE auth.config 
SET 
  mailer_url = 'https://resend.com',
  mailer_from_email = 'onboarding@resend.dev',
  mailer_from_name = 'VeloxTopUp';

-- Or use Supabase's built-in test email service:
-- In Supabase Dashboard:
-- 1. Go to Authentication > Settings
-- 2. Under "Email Templates" > "Confirm signup"
-- 3. Use the test email service
