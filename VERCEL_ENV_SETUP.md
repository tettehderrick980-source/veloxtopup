# Fix Vercel Deployment - Environment Variables Setup

## 🔴 Current Issue

Your Vercel deployment is using the **wrong Supabase project URL**:
- ❌ Using: `undwptrvpesyfsxccenc.supabase.co` (OLD/WRONG)
- ✅ Should be: `xlsrtcfndfsmcjaoswfq.supabase.co` (CORRECT)

This is causing:
- CORS errors on Edge Functions
- 401 Unauthorized on authentication
- Failed API requests

---

## ✅ Solution: Configure Vercel Environment Variables

### **Method 1: Vercel Dashboard (Recommended)**

#### Step 1: Go to Vercel Dashboard
1. Visit: https://vercel.com/dashboard
2. Click on your **VeloxTopUp** project

#### Step 2: Navigate to Environment Variables
1. Click **Settings** tab (top navigation)
2. Click **Environment Variables** (left sidebar)

#### Step 3: Add Environment Variables

Click **"Add New"** and add each variable:

---

**Variable 1:**
```
Name: VITE_SUPABASE_URL
Value: https://xlsrtcfndfsmcjaoswfq.supabase.co
Environment: ✅ Production  ✅ Preview  ✅ Development
```

**Variable 2:**
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsc3J0Y2ZuZGZzbWNqYW9zd2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDUxNTgsImV4cCI6MjA4Njk4MTE1OH0.kYi8EeswcvtrJ37m_DtmPpk2kv99ClnqEnAYykIOUkM
Environment: ✅ Production  ✅ Preview  ✅ Development
```

**Variable 3:**
```
Name: VITE_PAYSTACK_PUBLIC_KEY
Value: pk_live_f6937f94bbd7e8f07049a8c74a1354bc4f312bef
Environment: ✅ Production  ✅ Preview  ✅ Development
```

**Variable 4:**
```
Name: VITE_APP_NAME
Value: VeloxTopUp
Environment: ✅ Production  ✅ Preview  ✅ Development
```

**Variable 5:**
```
Name: VITE_APP_URL
Value: https://veloxtopup.shop
Environment: ✅ Production  ✅ Preview  ✅ Development
```

---

#### Step 4: Save and Redeploy

After adding all variables:

1. Click **"Save"** on each variable
2. Go to **Deployments** tab
3. Find the latest deployment
4. Click **...** (three dots) menu
5. Click **"Redeploy"**
6. Confirm the redeployment

**OR** push a new commit to trigger auto-deployment:
```bash
git add .
git commit -m "fix: update environment variables"
git push origin main
```

---

### **Method 2: Vercel CLI (Alternative)**

If you have Vercel CLI installed:

```bash
# Login to Vercel (if not already)
vercel login

# Add environment variables
vercel env add VITE_SUPABASE_URL
# Enter: https://xlsrtcfndfsmcjaoswfq.supabase.co
# Select: Production, Preview, Development

vercel env add VITE_SUPABASE_ANON_KEY
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Select: Production, Preview, Development

vercel env add VITE_PAYSTACK_PUBLIC_KEY
# Enter: pk_live_f6937f94bbd7e8f07049a8c74a1354bc4f312bef
# Select: Production, Preview, Development

vercel env add VITE_APP_NAME
# Enter: VeloxTopUp
# Select: Production, Preview, Development

vercel env add VITE_APP_URL
# Enter: https://veloxtopup.shop
# Select: Production, Preview, Development

# Redeploy
vercel --prod
```

---

## 🧪 Verify the Fix

After redeployment:

1. **Open the deployed URL**
2. **Open browser console** (F12)
3. **Check for these:**
   - ✅ No CORS errors
   - ✅ No 401 errors
   - ✅ Supabase URL shows: `xlsrtcfndfsmcjaoswfq.supabase.co`
   - ✅ Can sign in successfully
   - ✅ Networks load properly

---

## 🔍 Debugging Tips

### Check Current Environment Variables

In your browser console on the deployed site:
```javascript
// Check if env vars are loaded
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Has Anon Key:', !!import.meta.env.VITE_SUPABASE_ANON_KEY)
```

### View Vercel Environment Variables

```bash
# List all environment variables
vercel env ls

# Pull variables to local .env
vercel env pull
```

---

## ⚠️ Important Notes

1. **Environment variables are NOT automatically synced** from your `.env` file to Vercel
2. You must **manually add them** in Vercel Dashboard or use Vercel CLI
3. Variables starting with `VITE_` are exposed to the browser (this is intentional)
4. **Never commit `.env` files** with real secrets to GitHub
5. After changing env vars, you **MUST redeploy** for changes to take effect

---

## 📋 Checklist

Before testing the deployed app:

- [ ] Added `VITE_SUPABASE_URL` to Vercel
- [ ] Added `VITE_SUPABASE_ANON_KEY` to Vercel
- [ ] Added `VITE_PAYSTACK_PUBLIC_KEY` to Vercel
- [ ] Redeployed the application
- [ ] Waited for deployment to complete
- [ ] Cleared browser cache
- [ ] Tested sign-in functionality
- [ ] Checked browser console for errors

---

## 🆘 Still Having Issues?

If you've configured everything correctly but still see errors:

1. **Check Vercel Build Logs**
   - Go to Deployments → Click latest deployment
   - Check "Build Logs" tab for errors

2. **Verify Supabase Project**
   - Make sure project `xlsrtcfndfsmcjaoswfq` is active
   - Check API key is correct in Supabase Dashboard

3. **Check Edge Functions**
   - Edge Functions need separate secrets in Supabase
   - Run: `supabase functions secrets list`

4. **Force Redeploy**
   ```bash
   git commit --allow-empty -m "force redeploy"
   git push origin main
   ```

---

**Expected Result:** After fixing env vars, your app should work exactly like it does locally!

**Last Updated:** April 10, 2026
