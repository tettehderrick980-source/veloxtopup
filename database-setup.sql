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

-- Step 3: Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
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

-- Step 5: Create webhook_events table for logging
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('paystack', 'ghdataconnect')),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Enable Row Level Security (only if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'wallets'
  ) THEN
    ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'transactions'
  ) THEN
    ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'referrals'
  ) THEN
    ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'webhook_events'
  ) THEN
    ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
  END IF;
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

-- Step 8: Create trigger function for new users
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

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);

-- Step 11: Create default super admin
-- Create super admin auth user with email confirmed
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

-- Create user profile for super admin
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
)
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  status = 'active',
  updated_at = NOW();

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
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM wallets w 
  JOIN users u ON w.user_id = u.id 
  WHERE u.email = 'gozojoseph122@gmail.com'
);

-- Step 12: Verify setup
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
