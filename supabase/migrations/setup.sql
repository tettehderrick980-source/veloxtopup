-- ============================================================
-- VeloxTopUp - Complete Database Setup
-- Run this in Supabase SQL Editor for a fresh database
-- ============================================================

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  guest_email TEXT,
  type TEXT NOT NULL CHECK (type IN ('airtime', 'data', 'wallet_funding', 'refund')),
  network TEXT,
  phone TEXT NOT NULL,
  plan TEXT,
  amount DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  selling_price DECIMAL(10,2),
  profit DECIMAL(10,2),
  margin_percentage DECIMAL(5,2),
  capacity TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'success', 'failed', 'cancelled', 'refunded')),
  fulfillment_status TEXT DEFAULT 'pending' CHECK (fulfillment_status IN ('pending', 'queued', 'processing', 'fulfilled', 'failed', 'expired', 'cancelled', 'refunded')),
  fulfillment_expires_at TIMESTAMPTZ,
  fulfillment_attempts INT DEFAULT 0,
  reference TEXT UNIQUE NOT NULL,
  payment_reference TEXT,
  vendor_reference TEXT,
  payment_verified_at TIMESTAMPTZ,
  needs_refund BOOLEAN DEFAULT FALSE,
  refund_status TEXT DEFAULT 'none' CHECK (refund_status IN ('none', 'pending', 'completed', 'failed')),
  refund_reference TEXT,
  refund_reason TEXT,
  low_balance_alert_sent BOOLEAN DEFAULT FALSE,
  admin_notified_at TIMESTAMPTZ,
  user_report TEXT,
  user_report_email TEXT,
  user_report_phone TEXT,
  reported_at TIMESTAMPTZ,
  api_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  bonus DECIMAL(10,2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referrer_id, referred_user_id)
);

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('paystack', 'ghdataconnect')),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('low_balance', 'order_queued', 'order_expired', 'fulfillment_failed', 'refund_initiated')),
  subject TEXT NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_fulfillment_status ON transactions(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_fulfillment_expires ON transactions(fulfillment_expires_at) WHERE fulfillment_status IN ('pending', 'queued', 'processing');
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read ON admin_notifications(is_read) WHERE is_read = FALSE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "Super Admins can manage users" ON users FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- Wallets policies
CREATE POLICY "Users can view own wallet" ON wallets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own wallet" ON wallets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Admins can view all wallets" ON wallets FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "Super Admins can manage wallets" ON wallets FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert transactions" ON transactions FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Users can update own transactions" ON transactions FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "Super Admins can manage transactions" ON transactions FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- Referrals policies
CREATE POLICY "Users can view own referrals" ON referrals FOR SELECT USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());
CREATE POLICY "Admins can view all referrals" ON referrals FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Webhook events policies
CREATE POLICY "Super Admins can view webhook events" ON webhook_events FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin'));

-- Admin notifications policies
CREATE POLICY "Admins can view notifications" ON admin_notifications FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));
CREATE POLICY "Admins can update notifications" ON admin_notifications FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- ============================================================
-- TRIGGER: Auto-create user profile + wallet on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referral TEXT;
BEGIN
  referral := UPPER(SUBSTRING(MD5(NEW.id::text), 1, 8));

  INSERT INTO public.users (id, email, phone, role, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    referral
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SUPER ADMIN SETUP
-- NOTE: Create the admin user in Supabase Dashboard first:
-- Authentication -> Users -> Add User
-- Email: gozojoseph122@gmail.com
-- Then run the block below to assign super_admin role
-- ============================================================

UPDATE users
SET role = 'super_admin', status = 'active', updated_at = NOW()
WHERE email = 'gozojoseph122@gmail.com';

SELECT 'Database setup completed successfully!' AS status;
