# How to Create the user_notifications Table

## 📋 Prerequisites

- Access to your Supabase project
- Admin or database owner permissions

## 🚀 Step-by-Step Instructions

### Option 1: Using Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your VeloxTopUp project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Execute the Migration**
   - Open the file: `supabase/migrations/create_user_notifications_table.sql`
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

4. **Verify Success**
   - You should see "Success. No rows returned" for each statement
   - No errors should appear in the results panel

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Navigate to your project directory
cd c:\Users\tette\OneDrive\Desktop\VeloxTopUp

# Link to your Supabase project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration
supabase db push
```

### Option 3: Using psql or Database Client

Connect to your Supabase database and run:

```bash
psql -h db.YOUR_PROJECT_REF.supabase.co -p 6543 -U postgres -d postgres -f supabase/migrations/create_user_notifications_table.sql
```

## ✅ Verification Steps

After running the migration, verify everything was created:

### 1. Check Table Exists
```sql
SELECT COUNT(*) FROM user_notifications;
```
Should return `0` (empty table)

### 2. Check Indexes
```sql
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'user_notifications';
```
Should return 4 indexes

### 3. Check RLS Policies
```sql
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'user_notifications';
```
Should return 5 policies

### 4. Check Realtime is Enabled
```sql
SELECT * 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'user_notifications';
```
Should return 1 row

## 🧪 Test with Sample Data

To test the notification system, insert some sample data:

```sql
-- Get your user ID first
SELECT id, email FROM auth.users LIMIT 1;

-- Copy the user ID and replace YOUR_USER_ID below
INSERT INTO user_notifications (user_id, type, title, message, data) VALUES
  ('YOUR_USER_ID', 'order_success', 'Test Notification', 'This is a test notification', '{}');

-- Verify it was inserted
SELECT * FROM user_notifications;
```

## 🔧 Enable Realtime in Supabase Dashboard

If realtime doesn't work, manually enable it:

1. Go to **Database** → **Replication**
2. Find `user_notifications` table
3. Toggle **ON** for realtime
4. Wait ~30 seconds for changes to propagate

## 🎯 Next Steps

Once the table is created:

1. **Restart your app** to load the new notification system
2. **Login to your account**
3. **Make a test purchase** to trigger a notification
4. **Check the notification bell** in the navbar
5. **Go to Settings → PWA Status** to verify everything works

## ⚠️ Troubleshooting

### Error: "permission denied"
- Make sure you're logged in as admin/owner
- Check you're running against the correct database

### Error: "relation already exists"
- The table already exists! This is fine.
- The migration uses `IF NOT EXISTS` to prevent errors

### Error: "policy already exists"
- Policies already created! This is fine.
- Safe to ignore these errors

### Realtime not working
- Check Supabase dashboard → Database → Replication
- Ensure `user_notifications` is enabled
- Wait 30-60 seconds after enabling

### Can't see notifications in app
- Check browser console for errors
- Verify Supabase URL and keys in `.env`
- Make sure you're logged in
- Check RLS policies are correct

## 📞 Need Help?

If you encounter issues:
1. Check the browser console for error messages
2. Verify the table exists in Supabase Dashboard → Table Editor
3. Test inserting a notification manually via SQL Editor
4. Check the `NOTIFICATIONS_AND_PWA_GUIDE.md` for more details

---

**Migration File**: `supabase/migrations/create_user_notifications_table.sql`
**Created**: April 10, 2026
