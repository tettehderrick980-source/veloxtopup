# VeloxTopUp Professional Deployment Guide

This guide covers deploying the **Frontend to Vercel** and the **Backend logic to Supabase Edge Functions**.

---

## Prerequisites

- GitHub repository connected to your project
- Vercel account (sign up at vercel.com)
- Supabase project already running
- Supabase CLI installed locally

---

## Part 1: Deploy Frontend to Vercel

Your frontend is already configured with Vercel! The `vercel.json` handles SPA routing. Just ensure your environment variables are ready.

### Step 2: Update Environment Variables for Frontend

Create or update `.env.local` in the root with:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Step 3: Deploy to Vercel

1. **Go to [Vercel Dashboard](https://vercel.com/dashboard)**
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository (`veloxtopup`)
4. Configure:
   - Framework Preset: **Vite**
   - Build Command: `npm run build` (or leave blank - Vercel detects automatically)
   - Output Directory: `dist`
5. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Click **Deploy**

### Step 4: Note Your Vercel URL

After deployment, Vercel will give you a URL like: `https://veloxtopup-abc123.vercel.app`

---

## Part 2: Deploy Supabase Edge Functions

### Step 1: Login and Link
```bash
supabase login
supabase link --project-ref your-supabase-project-id
```

### Step 2: Set Edge Function Secrets
Store your API keys securely in the Supabase environment:
```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx
supabase secrets set GH_DATACONNECT_API_KEY=your_key
```

### Step 3: Deploy Logic
Deploy each function individually or all at once:
```bash
supabase functions deploy purchase-data
supabase functions deploy verify-paystack-payment
supabase functions deploy paystack-webhook
supabase functions deploy ghdataconnect-webhook
```

### Step 3: Deploy via Render Dashboard

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub and select the `veloxtopup` repository
4. Select the `veloxtopup-api` folder (or set root directory to `veloxtopup-api`)
5. Configure:
   - Name: `veloxtopup-api`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
6. Add these **Environment Variables**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `your-anon-key` |
| `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` |
| `JWT_SECRET` | `generate-a-strong-random-string` |
| `PAYSTACK_SECRET_KEY` | `sk_live_xxx` |
| `PAYSTACK_WEBHOOK_SECRET` | `your-webhook-secret` |
| `GH_DATACONNECT_API_KEY` | `your-api-key` |
| `GH_DATACONNECT_API_URL` | `https://ghdataconnect.com/api` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASS` | `your-app-password` |
| `CORS_ORIGIN` | `https://your-frontend.vercel.app` |

7. Click **"Create Web Service"**

### Step 4: Wait for Build & Get Backend URL

Once deployed, Render will give you a URL like: `https://veloxtopup-api.onrender.com`

---

## Part 3: Connect Frontend to Backend

### Update Vercel Environment Variables

After backend deployment, go back to Vercel:

1. Go to your project settings → **Environment Variables**
2. Update `VITE_API_BASE_URL` with your Render URL:
   ```
   VITE_API_BASE_URL=https://veloxtopup-api.onrender.com
   ```
3. Redeploy (or wait for auto-deploy)

---

## Part 4: Configure Webhooks

### Paystack Webhook

1. Go to [Paystack Dashboard](https://dashboard.paystack.com) → **Settings** → **Webhooks**
2. Add your Render webhook URL:
   ```
   https://veloxtopup-api.onrender.com/api/v1/webhooks/paystack
   ```
3. Copy the webhook secret and add to Render env vars: `PAYSTACK_WEBHOOK_SECRET`

### GhDataConnect Webhook (if applicable)

1. Log into GhDataConnect dashboard
2. Set webhook URL to:
   ```
   https://veloxtopup-api.onrender.com/api/v1/webhooks/ghdataconnect
   ```

---

## Part 5: Verify Deployment

1. **Frontend**: Visit your Vercel URL - the app should load
2. **Backend API**: Visit `https://veloxtopup-api.onrender.com/api/v1/health` (if health endpoint exists)
3. **Test a purchase flow**: Try buying airtime to ensure frontend → backend → payment works

---

## Quick Commands Reference

### Local Development

```bash
# Frontend
npm run dev

# Backend
cd veloxtopup-api
npm run dev
```

### Build Frontend Manually

```bash
npm run build
# Output in dist/ folder
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Ensure `CORS_ORIGIN` in Render matches your Vercel URL exactly |
| 404 on refresh (Vercel) | The vercel.json already handles this - should work |
| API not connecting | Check VITE_API_BASE_URL env var in Vercel |
| Build failed on Render | Ensure Node version is 18+ in Render settings |

---

## Summary of URLs

After deployment, you'll have:

- **Frontend**: `https://your-project.vercel.app`
- **Backend API**: `https://veloxtopup-api.onrender.com`
- **Supabase**: `https://your-project.supabase.co`

Update your Supabase Row Level Security policies to allow requests from your Vercel domain.