-- Fix: Prevent Fallback Email Creation
-- This ensures all users have real emails, not user_123@veloxtopup.shop

-- Option 1: Make email REQUIRED (rejects signup without email)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get email - NO FALLBACK, must have real email
  user_email := COALESCE(
    NEW.email, 
    NEW.raw_user_meta_data->>'email'
  );
  
  -- If no email, raise an error
  IF user_email IS NULL THEN
    RAISE EXCEPTION 'Email is required for user registration';
  END IF;
  
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

-- Option 2: Keep fallback but log it for review
-- Uncomment this if you want to allow fallback emails but track them
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
  is_fallback BOOLEAN := false;
BEGIN
  -- Get email with fallback
  user_email := COALESCE(
    NEW.email, 
    NEW.raw_user_meta_data->>'email'
  );
  
  -- If still null, create fallback and flag it
  IF user_email IS NULL THEN
    user_email := 'user_' || substring(NEW.id::text from 1 for 8) || '@veloxtopup.shop';
    is_fallback := true;
    
    -- Log this for admin review
    RAISE NOTICE 'Fallback email created for user: %', NEW.id;
  END IF;
  
  -- Insert user profile
  INSERT INTO public.users (id, email, phone, role, referral_code, updated_at)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT), 1, 8)),
    CASE WHEN is_fallback THEN NOW() ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create wallet
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
*/
