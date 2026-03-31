-- Add user report fields to transactions table for failed purchase support
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS user_report TEXT,
ADD COLUMN IF NOT EXISTS user_report_email TEXT,
ADD COLUMN IF NOT EXISTS user_report_phone TEXT,
ADD COLUMN IF NOT EXISTS reported_at TIMESTAMPTZ;
