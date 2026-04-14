-- ================================================================
-- Fix: Super Admin Role Not Working
-- ================================================================
-- This fixes the issue where gozojoseph122@gmail.com is treated as normal user
-- ================================================================

-- Step 1: Check current role for this user
SELECT id, email, role, created_at, updated_at
FROM public.users
WHERE email = 'gozojoseph122@gmail.com';

-- Step 2: Update to super_admin (if not already)
UPDATE public.users 
SET role = 'super_admin',
    updated_at = NOW()
WHERE email = 'gozojoseph122@gmail.com'
  AND role != 'super_admin';

-- Step 3: Verify the update
SELECT id, email, role, created_at, updated_at
FROM public.users
WHERE email = 'gozojoseph122@gmail.com';

-- Step 4: Also ensure the auth.users metadata has the role
-- This is important for the trigger to work correctly on future logins
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE email = 'gozojoseph122@gmail.com';

-- Step 5: Verify auth.users metadata
SELECT id, email, raw_user_meta_data->>'role' as role
FROM auth.users
WHERE email = 'gozojoseph122@gmail.com';

-- ================================================================
-- IMPORTANT: After running this SQL
-- ================================================================
-- 1. Sign out completely
-- 2. Clear browser cache (Ctrl + Shift + R)
-- 3. Sign in again
-- 4. Check if super admin features work
-- ================================================================
