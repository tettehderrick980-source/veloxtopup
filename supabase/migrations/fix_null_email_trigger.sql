-- Fix: Handle null email in user creation trigger
-- Issue: Error 23502 - null value in column "email" violates not-null constraint
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get email with fallback to prevent null violations
  user_email := COALESCE(
    NEW.email, 
    NEW.raw_user_meta_data->>'email',
    'user_' || substring(NEW.id::text from 1 for 8) || '@veloxtopup.shop'
  );
  
  -- Insert user profile with validated email
  INSERT INTO public.users (id, email, phone, role, referral_code)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT), 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create wallet
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
