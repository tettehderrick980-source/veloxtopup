# Super Admin Setup Instructions

## Method 1: Supabase Dashboard (Recommended)

### Step 1: Create Auth User
1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add user"**
3. Enter:
   - **Email**: `gozojoseph122@gmail.com`
   - **Password**: `Madman$1`
   - **Auto-confirm**: ✅ Check this box
4. Click **"Save"**

### Step 2: Set User Role
Run this SQL in Supabase SQL Editor:
```sql
-- Update the user role to super_admin
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'gozojoseph122@gmail.com';

-- If user doesn't exist in users table, create it
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

-- Create wallet if not exists
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
```

### Step 3: Verify
```sql
-- Verify super admin was created
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
```

## Method 2: SQL Script (If Dashboard Not Available)

Run `create-superadmin-auth.sql` in Supabase SQL Editor, then manually set password in Dashboard.

## Login Credentials
- **Email**: `gozojoseph122@gmail.com`
- **Password**: `Madman$1`
- **URL**: `https://vite-react-phi-lilac-25.vercel.app/login`

## After Login
- Navigate to `/admin` to access Super Admin Dashboard
- You should see "Super Admin" in the navigation
- Full system oversight and control available

## Troubleshooting
If you get "Email not confirmed" error:
1. Ensure **Auto-confirm** was checked when creating user
2. Or run: `UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = 'gozojoseph122@gmail.com';`
