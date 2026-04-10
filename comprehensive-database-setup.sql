-- ========================================
-- VeloxTopUp Complete Database Setup
-- ========================================
-- Run this in Supabase SQL Editor
-- This will create all necessary tables and enable RLS

-- ========================================
-- 1. Core Tables
-- ========================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('airtime', 'data', 'wallet_funding', 'refund')),
  network TEXT,
  phone TEXT NOT NULL,
  capacity TEXT,
  cost_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  profit DECIMAL(10,2),
  margin_percentage DECIMAL(5,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'refunded', 'queued')),
  fulfillment_status TEXT DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'processing', 'fulfilled', 'failed', 'queued')),
  reference TEXT UNIQUE NOT NULL,
  payment_reference TEXT,
  vendor_reference TEXT,
  payment_verified_at TIMESTAMP WITH TIME ZONE,
  fulfillment_expires_at TIMESTAMP WITH TIME ZONE,
  needs_refund BOOLEAN DEFAULT FALSE,
  refund_amount DECIMAL(10,2) DEFAULT 0.00,
  customer_notified BOOLEAN DEFAULT FALSE,
  api_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  bonus DECIMAL(10,2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referred_user_id)
);

-- Products/Data Plans table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  network TEXT NOT NULL,
  capacity TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  validity TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys table for external services
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  key TEXT UNIQUE NOT NULL,
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL, -- 'paystack', 'ghdataconnect'
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'email', 'sms', 'push'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. Indexes for Performance
-- ========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference ON transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_network ON products(network);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Referrals indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);

-- Wallets indexes
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Webhook events indexes
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);

-- ========================================
-- 3. Enable Row Level Security (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. RLS Policies
-- ========================================

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Admins can manage users" ON users
    FOR ALL USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Wallets table policies
CREATE POLICY "Users can view own wallet" ON wallets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON wallets
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Transactions table policies
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions" ON transactions
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Products table policies
CREATE POLICY "Products are viewable by everyone" ON products
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage products" ON products
    FOR ALL USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Referrals table policies
CREATE POLICY "Users can view own referrals" ON referrals
    FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id);

CREATE POLICY "Admins can view all referrals" ON referrals
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- API Keys table policies
CREATE POLICY "Service role full access to api_keys" ON api_keys
    FOR ALL USING (auth.role() = 'service_role');

-- Webhook events table policies
CREATE POLICY "Service role full access to webhook_events" ON webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Notifications table policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to notifications" ON notifications
    FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- 5. Functions and Triggers
-- ========================================

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || SUBSTRING(chars, FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 6. Insert Initial Data
-- ========================================

-- Insert API key for frontend
INSERT INTO api_keys (name, key, permissions) 
VALUES 
  ('veloxtopup-frontend-public-key-2024', 'veloxtopup-frontend-public-key-2024', ARRAY['read', 'write'])
ON CONFLICT (key) DO NOTHING;

-- Insert sample products (will be updated from GHDataConnect)
INSERT INTO products (network, capacity, price, cost_price, validity) VALUES
  ('mtn', '1GB', 5.00, 4.50, '30 days'),
  ('mtn', '2GB', 8.00, 7.20, '30 days'),
  ('mtn', '3GB', 12.00, 10.80, '30 days'),
  ('telecel', '1GB', 4.50, 4.05, '30 days'),
  ('telecel', '2GB', 7.00, 6.30, '30 days'),
  ('atbigtime', '1GB', 4.80, 4.32, '30 days'),
  ('atbigtime', '2GB', 7.50, 6.75, '30 days'),
  ('atishare', '1GB', 5.20, 4.68, '30 days'),
  ('atishare', '2GB', 8.50, 7.65, '30 days')
ON CONFLICT DO NOTHING;

-- ========================================
-- 7. Create Super Admin User (run this separately)
-- ========================================

-- Uncomment and run this after creating your first user through the app
/*
-- Update first user to super admin (replace with actual user ID)
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'your-admin-email@example.com';
*/

-- ========================================
-- 8. Views for Common Queries
-- ========================================

-- Transaction summary view
CREATE OR REPLACE VIEW transaction_summary AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_transactions,
  COUNT(*) FILTER (WHERE status = 'delivered') as successful_transactions,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_transactions,
  SUM(selling_price) as total_revenue,
  SUM(profit) as total_profit
FROM transactions
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- User dashboard view
CREATE OR REPLACE VIEW user_dashboard AS
SELECT 
  u.id,
  u.email,
  u.phone,
  u.role,
  w.balance,
  COUNT(t.id) as total_transactions,
  COUNT(t.id) FILTER (WHERE t.status = 'delivered') as successful_transactions,
  COALESCE(SUM(t.selling_price), 0) as total_spent,
  COALESCE(SUM(t.profit), 0) as total_profit_generated,
  u.created_at
FROM users u
LEFT JOIN wallets w ON u.id = w.user_id
LEFT JOIN transactions t ON u.id = t.user_id
GROUP BY u.id, w.balance, u.email, u.phone, u.role, u.created_at;

-- ========================================
-- 9. Cleanup Old Data (Optional)
-- ========================================

-- Function to clean old webhook events (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
    DELETE FROM webhook_events 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- Setup Complete!
-- ========================================

-- Notes:
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Create your first user through the app/registration
-- 3. Then update that user to super admin using the commented section
-- 4. All tables have RLS enabled with appropriate policies
-- 5. Initial sample products are included (update from GHDataConnect API)
-- 6. Views are created for common dashboard queries
