-- VeloxTopUp Database Cleanup
-- Drop all existing tables, policies, and functions for fresh start

-- Disable triggers first (use CASCADE to drop dependent objects)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

-- Drop all functions (use CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop all policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins and Super Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Super Admins can manage users" ON users;

DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
DROP POLICY IF EXISTS "Admins and Super Admins can view all wallets" ON wallets;
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins and Super Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Super Admins can manage transactions" ON transactions;

DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can view referrals they received" ON referrals;
DROP POLICY IF EXISTS "Admins and Super Admins can view all referrals" ON referrals;

DROP POLICY IF EXISTS "Super Admins can view webhook events" ON webhook_events;

-- Drop all tables (in correct order to handle dependencies)
DROP TABLE IF EXISTS webhook_events CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any remaining indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_referral_code;
DROP INDEX IF EXISTS idx_wallets_user_id;
DROP INDEX IF EXISTS idx_transactions_user_id;
DROP INDEX IF EXISTS idx_transactions_status;
DROP INDEX IF EXISTS idx_transactions_reference;
DROP INDEX IF EXISTS idx_referrals_referrer_id;
DROP INDEX IF EXISTS idx_referrals_referred_user_id;
DROP INDEX IF EXISTS idx_webhook_events_source;

-- Clean up any remaining auth users (optional - be careful with this)
-- Uncomment the line below if you want to remove all auth users except the super admin
-- DELETE FROM auth.users WHERE email != 'gozojoseph122@gmail.com';

SELECT 'Database cleanup completed. Ready for fresh setup.' as status;
