# Fix: Infinite Recursion in RLS Policies

## 🔴 The Problem

Your app shows this error:
```
infinite recursion detected in policy for relation "users"
```

**Why it happens:**
The admin policies query the `users` table to check if you're an admin, but that query triggers the same policy again → infinite loop!

**Example of bad policy:**
```sql
-- ❌ BAD: Queries users table → causes recursion
CREATE POLICY "admins_select_all_users"
  ON public.users FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));
```

---

## ✅ The Fix

### **Step 1: Run the Fix SQL**

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project: `xlsrtcfndfsmcjaoswfq`

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy & Run the Fix**
   - Open file: `supabase/migrations/fix_infinite_recursion_rls.sql`
   - Copy entire contents
   - Paste into SQL Editor
   - Click **"Run"** (Ctrl+Enter)

4. **Expected Result**
   - Should see "Success. No rows returned" for each statement
   - No errors

---

## 🧪 Test the Fix

After running the SQL:

1. **Refresh your deployed app**
   - Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)

2. **Try signing in again**
   - Should work without errors

3. **Check browser console**
   - No more "infinite recursion" errors
   - Should see successful data fetches

---

## 🔍 What the Fix Does

### **Before (❌ Broken):**
```sql
-- Admin policy queries users table → infinite recursion
USING (EXISTS (
  SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
))
```

### **After (✅ Fixed):**
```sql
-- Simple policy - no recursion
USING (auth.uid() = id)

-- Service role for admin operations (Edge Functions)
USING (auth.role() = 'service_role')
```

**Key changes:**
1. ✅ Removed all admin policies that query the `users` table
2. ✅ Users can only see/update their own data
3. ✅ Service role (Edge Functions) has full access
4. ✅ Created secure helper function for role checks
5. ✅ No more infinite recursion!

---

## 📋 Admin Access

**Question:** "How do admins access all data now?"

**Answer:** Through **Edge Functions** using the service role, not direct database queries from the frontend.

This is actually **more secure** because:
- Admin logic runs server-side (Edge Functions)
- Frontend can't bypass security
- Service role bypasses RLS safely
- Better audit trail

---

## ⚠️ Important Notes

1. **Users can only see their own data** from the frontend
2. **Admin dashboard** should use Edge Functions with service role
3. **If you need admin queries from frontend**, use JWT custom claims (advanced)
4. **The fix is more secure** than the original broken policies

---

## 🆘 Still Having Issues?

If you still see errors after running the fix:

1. **Clear browser cache** and hard refresh
2. **Sign out and sign in again**
3. **Check SQL ran successfully** (no errors in SQL Editor)
4. **Verify policies** in Supabase Dashboard → Database → Policies

---

**After fixing this, your app should work perfectly!** 🎉

**File:** `supabase/migrations/fix_infinite_recursion_rls.sql`
**Created:** April 10, 2026
