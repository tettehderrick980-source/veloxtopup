-- Create Super Admin with Auth Confirmation
-- This creates the user in both auth.users and users tables

-- Step 1: Create the auth user with email confirmed
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

-- Step 2: Create the user profile
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
)
ON CONFLICT (email) DO UPDATE SET
  role = 'super_admin',
  updated_at = NOW();

-- Step 3: Create wallet for super admin
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

-- Step 4: Verify creation
SELECT 
  u.id,
  u.email,
  u.role,
  a.email_confirmed_at,
  w.balance
FROM users u
JOIN auth.users a ON u.id = a.id
LEFT JOIN wallets w ON u.id = w.user_id
WHERE u.email = 'gozojoseph122@gmail.com';

-- Note: You still need to set the password "Madman$1" through Supabase Dashboard
-- Go to Authentication -> Users -> Select the user -> Reset Password
