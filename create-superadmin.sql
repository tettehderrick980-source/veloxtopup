-- Create default Super Admin user
-- Run this in Supabase SQL Editor after the migration

-- First, create the auth user
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

-- Then create the user profile with super_admin role
INSERT INTO users (
  id,
  email,
  phone,
  role,
  referral_code,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM auth.users WHERE email = 'gozojoseph122@gmail.com'),
  'gozojoseph122@gmail.com',
  NULL,
  'super_admin',
  'SUPERADMIN',
  NOW(),
  NOW()
);

-- Create wallet for super admin
INSERT INTO wallets (
  user_id,
  balance,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM users WHERE email = 'gozojoseph122@gmail.com'),
  0.00,
  NOW(),
  NOW()
);

-- Note: The password "Madman$1" will need to be set through Supabase Auth
-- or you can use the Supabase Dashboard to create the user with the password
