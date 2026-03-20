-- Complete Database Reset
-- This will remove all data and recreate everything correctly

-- Step 1: Drop all tables and functions
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Step 2: Recreate users table with correct schema
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  referral_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create wallets table
CREATE TABLE wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create transactions table
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('airtime', 'data', 'wallet_funding', 'refund')),
  network TEXT,
  phone TEXT NOT NULL,
  plan TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'refunded')),
  reference TEXT UNIQUE NOT NULL,
  payment_reference TEXT,
  api_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create referrals table
CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  bonus DECIMAL(10,2) DEFAULT 0.00,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referred_user_id)
);

-- Step 6: Create webhook_events table
CREATE TABLE webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('paystack', 'ghdataconnect')),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS Policies
-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins and Super Admins can view all users" ON users
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super Admins can manage users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Wallet policies
CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins and Super Admins can view all wallets" ON wallets
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Users can update own wallet" ON wallets
  FOR UPDATE USING (user_id = auth.uid());

-- Transaction policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins and Super Admins can view all transactions" ON transactions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Super Admins can manage transactions" ON transactions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Referral policies
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (referrer_id = auth.uid());

CREATE POLICY "Users can view referrals they received" ON referrals
  FOR SELECT USING (referred_user_id = auth.uid());

CREATE POLICY "Admins and Super Admins can view all referrals" ON referrals
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('admin', 'super_admin')
    )
  );

-- Webhook events policies
CREATE POLICY "Super Admins can view webhook events" ON webhook_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Step 9: Create trigger function for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, role, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    UPPER(SUBSTRING(NEW.email, 1, 8)) || EXTRACT(EPOCH FROM NOW())::text
  );
  
  -- Create wallet for new user
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 11: Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX idx_webhook_events_source ON webhook_events(source);

-- Step 12: Create default super admin
-- First create auth user
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
  NOW(),
  NULL,
  NOW(),
  NOW(),
  '{"role": "super_admin"}',
  false,
  'authenticated'
);

-- Then create user profile
INSERT INTO users (
  id,
  email,
  phone,
  role,
  referral_code,
  status,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'gozojoseph122@gmail.com'),
  'gozojoseph122@gmail.com',
  NULL,
  'super_admin',
  'SUPERADMIN',
  'active',
  NOW(),
  NOW()
);

-- Create wallet for super admin
INSERT INTO wallets (
  user_id,
  balance,
  created_at,
  updated_at
) 
SELECT 
  (SELECT id FROM users WHERE email = 'gozojoseph122@gmail.com'),
  0.00,
  NOW(),
  NOW();

-- Step 13: Verify setup
SELECT 'Database reset completed successfully' as status;

SELECT 'Super Admin created' as status, 
       u.email, 
       u.role, 
       w.balance
FROM users u
JOIN wallets w ON u.id = w.user_id
WHERE u.email = 'gozojoseph122@gmail.com';

-- Note: You still need to set the password "Madman$1" in Supabase Dashboard
-- Go to Authentication -> Users -> Select the user -> Reset Password
