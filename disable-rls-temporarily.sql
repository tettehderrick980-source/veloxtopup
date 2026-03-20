-- Temporary fix: Disable RLS for testing
-- Run this in Supabase SQL Editor to test signup functionality

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE wallets DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable with fixed policies:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
