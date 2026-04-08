-- VeloxTopUp Database Setup
-- Fresh start with all features we want to implement

-- Step 1: Create users table
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

-- Step 2: Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create enhanced transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('airtime', 'data', 'wallet_funding', 'refund')),
  network TEXT,
  phone TEXT NOT NULL,
  capacity TEXT,
  plan TEXT,
  amount DECIMAL(10,2) NOT NULL,
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

-- Step 4: Create referrals table
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

-- Step 5: Create products table for data plans
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

-- Step 6: Create API keys table for external services
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

-- Step 7: Create notifications table
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

-- Step 8: Create webhook_events table for logging
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('paystack', 'ghdataconnect')),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 9: Enable Row Level Security (only if not already enabled)
DO $$
BEGIN
  ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS wallets ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS referrals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS api_keys ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS webhook_events ENABLE ROW LEVEL SECURITY;
END $$;

-- Step 7: Create RLS Policies
-- Users table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON users
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Admins and Super Admins can view all users'
  ) THEN
    CREATE POLICY "Admins and Super Admins can view all users" ON users
      FOR SELECT USING (
        auth.uid() IN (
          SELECT id FROM users WHERE role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON users
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Super Admins can manage users'
  ) THEN
    CREATE POLICY "Super Admins can manage users" ON users
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Wallet policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wallets' AND policyname = 'Users can view own wallet'
  ) THEN
    CREATE POLICY "Users can view own wallet" ON wallets
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wallets' AND policyname = 'Admins and Super Admins can view all wallets'
  ) THEN
    CREATE POLICY "Admins and Super Admins can view all wallets" ON wallets
      FOR SELECT USING (
        auth.uid() IN (
          SELECT id FROM users WHERE role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'wallets' AND policyname = 'Users can update own wallet'
  ) THEN
    CREATE POLICY "Users can update own wallet" ON wallets
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
END $$;

-- Transaction policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' AND policyname = 'Users can view own transactions'
  ) THEN
    CREATE POLICY "Users can view own transactions" ON transactions
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' AND policyname = 'Admins and Super Admins can view all transactions'
  ) THEN
    CREATE POLICY "Admins and Super Admins can view all transactions" ON transactions
      FOR SELECT USING (
        auth.uid() IN (
          SELECT id FROM users WHERE role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'transactions' AND policyname = 'Super Admins can manage transactions'
  ) THEN
    CREATE POLICY "Super Admins can manage transactions" ON transactions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      );
  END IF;
END $$;

-- Referral policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referrals' AND policyname = 'Users can view own referrals'
  ) THEN
    CREATE POLICY "Users can view own referrals" ON referrals
      FOR SELECT USING (referrer_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referrals' AND policyname = 'Users can view referrals they received'
  ) THEN
    CREATE POLICY "Users can view referrals they received" ON referrals
      FOR SELECT USING (referred_user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'referrals' AND policyname = 'Admins and Super Admins can view all referrals'
  ) THEN
    CREATE POLICY "Admins and Super Admins can view all referrals" ON referrals
      FOR SELECT USING (
        auth.uid() IN (
          SELECT id FROM users WHERE role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Products table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Products are viewable by everyone'
  ) THEN
    CREATE POLICY "Products are viewable by everyone" ON products
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'products' AND policyname = 'Admins can manage products'
  ) THEN
    CREATE POLICY "Admins can manage products" ON products
      FOR ALL USING (
        auth.uid() IN (
          SELECT id FROM users WHERE role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- API keys table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'api_keys' AND policyname = 'Service role full access to api_keys'
  ) THEN
    CREATE POLICY "Service role full access to api_keys" ON api_keys
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Notifications table policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Users can view own notifications'
  ) THEN
    CREATE POLICY "Users can view own notifications" ON notifications
      FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notifications' AND policyname = 'Service role full access to notifications'
  ) THEN
    CREATE POLICY "Service role full access to notifications" ON notifications
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Webhook events policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'webhook_events' AND policyname = 'Super Admins can view webhook events'
  ) THEN
    CREATE POLICY "Super Admins can view webhook events" ON webhook_events
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM users 
          WHERE id = auth.uid() AND role = 'super_admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'webhook_events' AND policyname = 'Service role full access to webhook_events'
  ) THEN
    CREATE POLICY "Service role full access to webhook_events" ON webhook_events
      FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Step 11: Create functions and triggers

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

-- Create trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, role, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    generate_referral_code()
  );
  
  -- Create wallet for new user
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create trigger (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Step 12: Create updated_at triggers
DO $$
BEGIN
  CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_referrals_updated_at BEFORE UPDATE ON referrals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Step 13: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_fulfillment_status ON transactions(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_reference ON transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_products_network ON products(network);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);

-- Step 11: Create default super admin (only if not exists)
-- First check if auth user exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'gozojoseph122@gmail.com'
  ) THEN
    INSERT INTO auth.users (
      id,
      email,
      email_confirmed_at,
      phone,
      created_at,
      updated_at,
      raw_user_meta_data,
      is_super_admin,
      role
    ) VALUES (
      gen_random_uuid(),
      'gozojoseph122@gmail.com',
      NOW(), -- Email confirmed immediately
      NULL,
      NOW(),
      NOW(),
      '{"role": "super_admin"}',
      false,
      'authenticated'
    );
  END IF;
END $$;

-- Create or update user profile for super admin
INSERT INTO users (
  id,
  email,
  phone,
  role,
  referral_code,
  status,
  created_at,
  updated_at
) 
SELECT 
  a.id,
  a.email,
  NULL,
  'super_admin',
  'SUPERADMIN',
  'active',
  NOW(),
  NOW()
FROM auth.users a 
WHERE a.email = 'gozojoseph122@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  status = 'active',
  updated_at = NOW();

-- Create wallet for super admin (if not exists)
INSERT INTO wallets (
  user_id,
  balance,
  created_at,
  updated_at
) 
SELECT 
  u.id,
  0.00,
  NOW(),
  NOW()
FROM users u 
WHERE u.email = 'gozojoseph122@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM wallets w 
  WHERE w.user_id = u.id
);

-- Step 14: Insert initial data
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

-- Step 15: Create views for dashboard queries
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

-- Step 16: Verify setup
SELECT 'Database setup completed successfully' as status;

SELECT 'Super Admin created' as status, 
       u.email, 
       u.role, 
       u.status,
       w.balance
FROM users u
JOIN auth.users a ON u.id = a.id
LEFT JOIN wallets w ON u.id = w.user_id
WHERE u.email = 'gozojoseph122@gmail.com';

-- Note: Set password "Madman$1" in Supabase Dashboard
-- Go to Authentication -> Users -> Select user -> Reset Password
