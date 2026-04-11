-- ================================================================
-- Fix: Infinite Recursion in Users Table RLS Policies
-- ================================================================
-- This fixes the "infinite recursion detected in policy for relation users" error
-- Run this SQL in your Supabase SQL Editor
-- ================================================================

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "admins_select_all_users" ON public.users;
DROP POLICY IF EXISTS "super_admin_manage_users" ON public.users;
DROP POLICY IF EXISTS "admins_select_all_wallets" ON public.wallets;
DROP POLICY IF EXISTS "super_admin_manage_wallets" ON public.wallets;
DROP POLICY IF EXISTS "admins_select_all_transactions" ON public.transactions;
DROP POLICY IF EXISTS "super_admin_manage_transactions" ON public.transactions;
DROP POLICY IF EXISTS "admins_select_all_referrals" ON public.referrals;
DROP POLICY IF EXISTS "super_admin_manage_referrals" ON public.referrals;

-- Create a secure function to check user role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$;

-- Recreate users policies (simple - users can only see/update themselves)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do everything
DROP POLICY IF EXISTS "service_role_manage_users" ON public.users;
CREATE POLICY "service_role_manage_users"
  ON public.users FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow users to be inserted during signup
DROP POLICY IF EXISTS "users_insert_for_signup" ON public.users;
CREATE POLICY "users_insert_for_signup"
  ON public.users FOR INSERT
  WITH CHECK (true);

-- Wallets policies
DROP POLICY IF EXISTS "wallets_select_own" ON public.wallets;
CREATE POLICY "wallets_select_own"
  ON public.wallets FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wallets_update_own" ON public.wallets;
CREATE POLICY "wallets_update_own"
  ON public.wallets FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_manage_wallets" ON public.wallets;
CREATE POLICY "service_role_manage_wallets"
  ON public.wallets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Transactions policies
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own"
  ON public.transactions FOR UPDATE
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "service_role_manage_transactions" ON public.transactions;
CREATE POLICY "service_role_manage_transactions"
  ON public.transactions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Referrals policies
DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_manage_referrals" ON public.referrals;
CREATE POLICY "service_role_manage_referrals"
  ON public.referrals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ================================================================
-- For Admin Access: Use Custom Claims in JWT (Recommended)
-- ================================================================
-- Instead of querying the users table (which causes recursion),
-- store the role in the user's JWT token as a custom claim.
--
-- To set a custom claim for a user:
-- SELECT auth.users.id, auth.users.email FROM auth.users;
-- Then use the Supabase Management API or Dashboard to set custom claims
--
-- Example policy using JWT custom claims (uncomment if you set up custom claims):
--
-- CREATE POLICY "admins_select_all_users_jwt"
--   ON public.users FOR SELECT
--   USING (
--     auth.uid() = id 
--     OR (auth.jwt() ->> 'role')::TEXT IN ('admin', 'super_admin')
--   );
--
-- For now, admins can access data through the service role (Edge Functions)

-- ================================================================
-- Verification
-- ================================================================
-- Test that the recursion is fixed:
-- SELECT * FROM public.users WHERE id = auth.uid();

-- Check all policies are created:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';