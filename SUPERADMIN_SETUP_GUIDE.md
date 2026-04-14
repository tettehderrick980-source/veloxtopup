# 🔐 Super Admin Setup Guide

**For:** gozojoseph122@gmail.com  
**Status:** Needs SQL migration

---

## 🎯 Problem

Your account has `role = 'user'` but needs `role = 'super_admin'` to access admin features.

---

## 🔧 Solution: Run SQL in Supabase

### **Step 1: Open SQL Editor**

Go to: https://supabase.com/dashboard/project/xlsrtcfndfsmcjaoswfq/sql/new

---

### **Step 2: Find Your User Account**

Run this to see all users:

```sql
SELECT id, email, role, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;
```

**Look for your email** in the results. You'll see something like:

```
id              | email                        | role  | created_at
abc-123-def     | gozojoseph122@gmail.com      | user  | 2024-04-13
xyz-789-ghi     | user_e590c265@veloxtopup.shop| user  | 2024-04-13
```

---

### **Step 3: Update to Super Admin**

**Option A: If you see gozojoseph122@gmail.com in the list**

```sql
-- Update public.users
UPDATE public.users 
SET role = 'super_admin',
    updated_at = NOW()
WHERE email = 'gozojoseph122@gmail.com';

-- Update auth.users metadata (CRITICAL!)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE email = 'gozojoseph122@gmail.com';

-- Verify
SELECT 
  pu.email,
  pu.role as database_role,
  au.raw_user_meta_data->>'role' as auth_role
FROM public.users pu
JOIN auth.users au ON pu.id = au.id
WHERE pu.email = 'gozojoseph122@gmail.com';
```

**Option B: If you see a different email (your actual login)**

Replace the email in the SQL above with your actual email from Step 2.

**Option C: If you want to use a specific user ID**

```sql
-- Replace 'YOUR-USER-ID-HERE' with the ID from Step 2
UPDATE public.users 
SET role = 'super_admin',
    updated_at = NOW()
WHERE id = 'YOUR-USER-ID-HERE';

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE id = 'YOUR-USER-ID-HERE';

-- Verify
SELECT 
  pu.email,
  pu.role,
  au.raw_user_meta_data->>'role' as auth_role
FROM public.users pu
JOIN auth.users au ON pu.id = au.id
WHERE pu.id = 'YOUR-USER-ID-HERE';
```

---

### **Step 4: Verify It Worked**

The last SELECT query should return:

```
email                      | database_role | auth_role
gozojoseph122@gmail.com    | super_admin   | super_admin
```

✅ Both columns must show `super_admin`

---

## 🔄 After Running SQL

### **1. Sign Out Completely**
- Click profile menu → "Sign Out"
- Close all browser tabs
- Wait 10 seconds

### **2. Clear Browser Cache**
```
Press: Ctrl + Shift + Delete
Select: Cached images and files
Click: Clear data
```

### **3. Sign In Again**
- Go to https://veloxtopup.shop/login
- Sign in with your super admin email

### **4. Verify Super Admin Access**

Open browser console (F12) and check for:

```
[Auth] User role from database: super_admin | Email: your-email@example.com
```

You should see:
- ✅ "Super Admin" badge in navbar
- ✅ Can access `/admin` route
- ✅ Can see all users in admin dashboard
- ✅ Can see all transactions
- ✅ Can manage wallets
- ✅ Can view analytics

---

## 🎯 What This Changes

### **Before (User Role)**
```
❌ No admin dashboard access
❌ Can only see own transactions
❌ Can only manage own wallet
❌ No user management
❌ No analytics
```

### **After (Super Admin Role)**
```
✅ Full admin dashboard access
✅ Can see ALL users
✅ Can see ALL transactions
✅ Can manage ALL wallets
✅ Can view analytics
✅ Can process refunds
✅ Can retry failed orders
✅ Full system control
```

---

## 🔍 How Role Checking Works

### **In the App (AuthContext.jsx)**

```javascript
const { data, error } = await db.getUserProfile(userId);
console.log('[Auth] User role from database:', data?.role);
setUserProfile(data); // Includes role
```

### **Route Protection (App.jsx)**

```javascript
<Route 
  path="/admin" 
  element={
    userProfile?.role === 'super_admin' ? 
      <SuperAdminDashboardPage /> :
    userProfile?.role === 'admin' ?
      <AdminDashboardPage /> :
      <Navigate to="/dashboard" />
  } 
/>
```

### **Navbar Display**

```javascript
{(userProfile?.role === 'admin' || userProfile?.role === 'super_admin') && (
  <Link to="/admin">
    {userProfile?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
  </Link>
)}
```

---

## ⚠️ Important Notes

### **Why Two Tables?**

Supabase has TWO user tables:

| Table | Purpose | Why Update Both? |
|-------|---------|------------------|
| `auth.users` | Authentication | Contains login credentials & metadata |
| `public.users` | Application | Contains profile, role, phone, etc. |

The database trigger reads from `auth.users.raw_user_meta_data` when creating profiles, so **both must have the correct role**.

### **Database Trigger**

```sql
-- This runs when user signs up
INSERT INTO public.users (role)
VALUES (
  COALESCE(NEW.raw_user_meta_data->>'role', 'user')
);
```

If `auth.users` doesn't have the role in metadata, it defaults to `'user'`.

---

## 🆘 Troubleshooting

### **Issue: Still seeing "user" role after SQL**

**Solution:**
1. Make sure you ran BOTH UPDATE statements (public.users AND auth.users)
2. Sign out completely
3. Clear cache (Ctrl + Shift + Delete)
4. Sign in again
5. Check console logs

### **Issue: Email not found in database**

**Solution:**
1. Run: `SELECT email FROM public.users ORDER BY created_at DESC LIMIT 10;`
2. Find your actual email
3. Use that email in the UPDATE statement

### **Issue: No super admin features showing**

**Solution:**
1. Check console: `[Auth] User role from database: ???`
2. If it shows 'user', the SQL didn't work - run it again
3. If it shows 'super_admin' but features don't work, hard refresh (Ctrl + Shift + R)

---

## 📋 Quick Checklist

- [ ] Run SQL to find your user account
- [ ] Update public.users role to 'super_admin'
- [ ] Update auth.users metadata role to 'super_admin'
- [ ] Verify both tables show 'super_admin'
- [ ] Sign out completely
- [ ] Clear browser cache
- [ ] Sign in again
- [ ] Check console logs show 'super_admin'
- [ ] Access /admin dashboard
- [ ] Verify all super admin features work

---

## ✅ Expected Result

After completing all steps:

```
Login: gozojoseph122@gmail.com
Role: super_admin
Access: Full admin dashboard
Features: All enabled
Status: ✅ Working
```

---

**Need help?** Check the console logs and share what you see!

---

*Created: April 13, 2026*  
*Last Updated: April 13, 2026*
