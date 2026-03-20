-- Fix Super Admin Role Constraint
-- Run this if you get the role constraint error

-- Step 1: Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Step 2: Add updated constraint with super_admin
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('user', 'admin', 'super_admin'));

-- Step 3: Update or insert super admin
INSERT INTO users (
  id,
  email,
  phone,
  role,
  referral_code,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
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

-- Step 4: Create wallet for super admin if not exists
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

-- Verify super admin was created
SELECT * FROM users WHERE email = 'gozojoseph122@gmail.com';
