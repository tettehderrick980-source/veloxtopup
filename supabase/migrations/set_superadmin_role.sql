-- ================================================================
-- Fix: Set Super Admin Role
-- ================================================================
-- Run this in Supabase SQL Editor to set your super admin role
-- ================================================================

-- Step 1: Check all users and their current roles
-- Find your superadmin email in this list
SELECT id, email, role, created_at
FROM public.users
ORDER BY created_at DESC;

-- Step 2: Update the role to super_admin
-- IMPORTANT: Replace the email below with YOUR actual superadmin email
UPDATE public.users 
SET role = 'super_admin',
    updated_at = NOW()
WHERE email = 'your-superadmin-email@example.com';  -- ← CHANGE THIS!

-- Step 3: Verify the update worked
SELECT id, email, role, created_at, updated_at
FROM public.users
WHERE role = 'super_admin';

-- ================================================================
-- Alternative: Set role by user ID (more precise)
-- ================================================================
-- If you know your user ID from Step 1, use this instead:
-- UPDATE public.users 
-- SET role = 'super_admin',
--     updated_at = NOW()
-- WHERE id = 'YOUR-USER-ID-HERE';  -- ← Paste your ID from Step 1

-- ================================================================
-- IMPORTANT NOTES:
-- ================================================================
-- 1. First run Step 1 to see all users
-- 2. Find your email in the list
-- 3. Replace 'your-superadmin-email@example.com' with your actual email
-- 4. Run Step 2 to update the role
-- 5. Run Step 3 to verify it worked
-- 6. Sign out and sign in again to refresh your session
-- 7. The superadmin features should now work!

