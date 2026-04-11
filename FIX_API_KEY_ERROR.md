# Fix "Invalid API Key" Error - Quick Guide

## ✅ What Was Fixed

I removed the **quotes** from your Supabase API keys in the `.env` file. Vite doesn't handle quotes well in environment variables.

**Before:**
```env
VITE_SUPABASE_URL="https://xlsrtcfndfsmcjaoswfq.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGci..."
```

**After:**
```env
VITE_SUPABASE_URL=https://xlsrtcfndfsmcjaoswfq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 🚀 Next Steps (IMPORTANT!)

### **1. Restart Your Development Server**

The environment variables only load when the server starts.

**If your server is running:**
1. Press `Ctrl+C` in the terminal
2. Run: `npm run dev`
3. Wait for the server to start

**If using PowerShell:**
```powershell
# Stop current process (Ctrl+C)
npm run dev
```

### **2. Clear Browser Cache**

Old cached data might still use the wrong API key.

**In your browser:**
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select "Cached images and files"
3. Click "Clear data"

**OR use hard refresh:**
- Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### **3. Test Sign In**

1. Open your app: http://localhost:5173
2. Try to sign in again
3. Check if the error is gone

---

## 🔍 Still Getting the Error?

### **Option 1: Get a Fresh API Key from Supabase**

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `xlsrtcfndfsmcjaoswfq`

2. **Find API Keys**
   - Click **Settings** (gear icon)
   - Click **API**
   - Under **Project API keys**, find:
     - `anon` / `public` key (this is what you need)

3. **Copy the Key**
   - Click the copy icon next to the `anon` key
   - It should start with: `eyJhbGci...`

4. **Update .env file**
   - Open `.env` in your editor
   - Replace the `VITE_SUPABASE_ANON_KEY` value
   - Save the file

5. **Restart server**
   - `Ctrl+C` then `npm run dev`

### **Option 2: Verify Your Project URL**

Make sure your project URL is correct:

```
https://xlsrtcfndfsmcjaoswfq.supabase.co
```

You can find this in:
- Supabase Dashboard → Settings → API → Project URL

### **Option 3: Check Browser Console**

1. Open browser DevTools (`F12`)
2. Go to **Console** tab
3. Try to sign in
4. Look for error messages

Common errors:
- `Invalid API key` → Wrong API key
- `Invalid URL` → Wrong Supabase URL
- `Network error` → Connection issue
- `CORS error` → Supabase configuration issue

---

## 🧪 Test Your Supabase Connection

Create a test file to verify your connection:

**Create: `test-supabase.js`**
```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xlsrtcfndfsmcjaoswfq.supabase.co'
const supabaseKey = 'YOUR_ANON_KEY_HERE' // Replace with your actual key

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
    } else {
      console.log('✅ Connection successful!')
    }
  } catch (err) {
    console.error('❌ Error:', err.message)
  }
}

testConnection()
```

Run it:
```bash
node test-supabase.js
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Invalid API key"
**Solutions:**
- ✅ Remove quotes from `.env` values (already done)
- ✅ Get fresh API key from Supabase Dashboard
- ✅ Restart development server
- ✅ Clear browser cache

### Issue: "Invalid URL"
**Solutions:**
- Check URL format: `https://YOUR_PROJECT.supabase.co`
- No trailing slash
- Must include `https://`

### Issue: "CORS error"
**Solutions:**
1. Go to Supabase Dashboard → Settings → API
2. Under **CORS**, add your URL:
   - `http://localhost:5173` (development)
   - `https://veloxtopup.shop` (production)

### Issue: "Network error"
**Solutions:**
- Check internet connection
- Verify Supabase project is active
- Check if Supabase is down: https://status.supabase.com

---

## 📋 Checklist

Before asking for help, verify:

- [ ] Removed quotes from `.env` values
- [ ] Restarted development server
- [ ] Cleared browser cache
- [ ] API key starts with `eyJhbGci...`
- [ ] URL is `https://xlsrtcfndfsmcjaoswfq.supabase.co`
- [ ] Checked browser console for errors
- [ ] Verified Supabase project is active

---

## 🆘 Still Not Working?

If you've tried everything above and still get the error:

1. **Check the browser console** and copy the exact error message
2. **Verify your Supabase project** is active and not paused
3. **Try a different browser** to rule out browser-specific issues
4. **Check Supabase status**: https://status.supabase.com

---

## 📞 Quick Commands

```bash
# Restart development server
Ctrl+C (stop current)
npm run dev (start new)

# Check if .env is loaded correctly
npm run dev -- --debug

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

---

**Last Updated:** April 10, 2026
**Status:** Quotes removed from `.env` - Server restart required
