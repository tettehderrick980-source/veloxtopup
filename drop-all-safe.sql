-- ========================================
-- SAFE DROP ALL TABLES AND OBJECTS
-- ========================================
-- ⚠️ WARNING: This will delete ALL data!
-- This version checks for existence before dropping

-- Drop views first (if they exist)
DROP VIEW IF EXISTS transaction_summary CASCADE;
DROP VIEW IF EXISTS user_dashboard CASCADE;

-- Drop triggers (if they exist) - using DO blocks to avoid errors
DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_users_updated_at ON users;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_products_updated_at ON products;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Drop functions (if they exist)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_referral_code() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_webhook_events() CASCADE;

-- Drop all tables in correct order (using IF EXISTS)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any remaining policies (cleanup) - using DO blocks for safety
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON users;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON users;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins and Super Admins can view all users" ON users;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can manage users" ON users;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins and Super Admins can view all wallets" ON wallets;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins and Super Admins can view all transactions" ON transactions;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins can manage products" ON products;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Admins and Super Admins can view all referrals" ON referrals;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access to api_keys" ON api_keys;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access to webhook_events" ON webhook_events;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Service role full access to notifications" ON notifications;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ========================================
-- Alternative: Force drop all tables
-- ========================================

-- If the above doesn't work, use this more aggressive approach:
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(table_name) || ' CASCADE';
        RAISE NOTICE 'Dropped table: %', table_name;
    END LOOP;
END $$;

-- ========================================
-- Verification: Check what's left
-- ========================================

-- Show remaining tables
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Show remaining functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
ORDER BY routine_name;

-- Show remaining views
SELECT table_name, table_schema 
FROM information_schema.views 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- ========================================
-- Complete! Database should now be empty
-- ========================================
