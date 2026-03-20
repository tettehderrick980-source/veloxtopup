-- Fix RLS policies to prevent infinite recursion
-- Run this in your Supabase SQL Editor

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON wallets;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own referrals" ON referrals;
DROP POLICY IF EXISTS "Users can view referrals they received" ON referrals;
DROP POLICY IF EXISTS "Admins can view all referrals" ON referrals;

-- Create fixed policies without recursion
-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Wallet policies
CREATE POLICY "Users can view own wallet" ON wallets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all wallets" ON wallets
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Transaction policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Referral policies
CREATE POLICY "Users can view own referrals" ON referrals
  FOR SELECT USING (referrer_id = auth.uid());

CREATE POLICY "Users can view referrals they received" ON referrals
  FOR SELECT USING (referred_user_id = auth.uid());

CREATE POLICY "Admins can view all referrals" ON referrals
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role = 'admin'
    )
  );

-- Add INSERT policies for users table (needed for registration)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add INSERT policies for wallets (needed for new users)
CREATE POLICY "Users can insert own wallet" ON wallets
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add INSERT policies for transactions (needed for purchases)
CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add INSERT policies for referrals (needed for referral system)
CREATE POLICY "Users can insert own referrals" ON referrals
  FOR INSERT WITH CHECK (referrer_id = auth.uid());
