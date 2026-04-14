-- Fix: Add INSERT policy for wallets table
-- Issue: 403 Forbidden when creating wallets
-- The wallets table is missing an INSERT policy for authenticated users

-- Add INSERT policy so users can create their own wallets
DROP POLICY IF EXISTS "wallets_insert_own" ON public.wallets;
CREATE POLICY "wallets_insert_own"
  ON public.wallets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Also allow service role to manage all wallets (for admin operations)
DROP POLICY IF EXISTS "service_role_manage_wallets" ON public.wallets;
CREATE POLICY "service_role_manage_wallets"
  ON public.wallets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
