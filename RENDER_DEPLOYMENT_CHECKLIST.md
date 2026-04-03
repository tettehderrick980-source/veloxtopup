# VeloxTopUp API - Render Deployment Checklist

This document provides a professional deployment checklist for deploying veloxtopup-api to Render.

---

## 🚀 Pre-Deployment Checklist

### 1. Environment Variables Setup

Before deploying to Render, ensure you have these values ready:

| Variable | Where to Get | Required |
|----------|---------------|----------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → General | ✅ Yes |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon key | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role key | ✅ Yes |
| `JWT_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | ✅ Yes |
| `PAYSTACK_SECRET_KEY` | Paystack Dashboard → Settings → API Keys → Live | ✅ Yes |
| `PAYSTACK_WEBHOOK_SECRET` | Paystack Dashboard → Settings → Webhooks | ✅ Yes |
| `GH_DATACONNECT_API_KEY` | GhDataConnect Dashboard → API Settings | ✅ Yes |
| `SMTP_USER` | Your Gmail address | ✅ Yes |
| `SMTP_PASS` | Gmail App Password (16 chars) | ✅ Yes |
| `CORS_ORIGIN` | Your Vercel frontend URL | ✅ Yes |

### 2. Generate Secure Keys

```bash
# Generate JWT Secret (run in terminal)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Webhook Token for Paystack
node -e "console.log('wh_tok_' + require('crypto').randomBytes(32).toString('hex'))"

# Generate Webhook Token for GhDataConnect  
node -e "console.log('ghd_tok_' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Supabase Database Preparation

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations if needed:
   - `supabase/migrations/` folder contains all migrations
3. Update Row Level Security (RLS) policies for production domain

### 4. Update CORS in Supabase

In Supabase Dashboard → API Settings, add your Render URL to `service_role` key allowed origins if needed.

---

## 📦 Files Created for Deployment

| File | Purpose |
|------|---------|
| `veloxtopup-api/render.yaml` | Render Blueprint for declarative deployment |
| `veloxtopup-api/PROCFILE` | Process file for Render |
| `veloxtopup-api/.env.production.example` | Production environment template |

---

## 🔧 Deployment Options

### Option 1: Using Render Dashboard (Recommended)

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub and select the `veloxtopup` repository
4. Configure:
   - **Name**: `veloxtopup-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Node Version**: `20`
5. Add Environment Variables (from step 1)
6. Click **"Create Web Service"**

### Option 2: Using render.yaml (Blueprint)

1. Commit `render.yaml` to your repository
2. Go to Render Dashboard → Blueprints
3. Import from GitHub
4. Render will automatically create the service

---

## 🔒 Security Checklist

- [ ] JWT_SECRET is unique and not default "veloxtopup"
- [ ] Using Paystack LIVE keys (sk_live_), not test keys
- [ ] CORS_ORIGIN set to exact frontend domain (not wildcard)
- [ ] SUPABASE_SERVICE_ROLE_KEY kept secret in Render
- [ ] SMTP password is Gmail App Password, not regular password
- [ ] Rate limiting enabled (already configured)
- [ ] Helmet.js enabled (already configured in server.js)

---

## 🌐 Webhook Configuration

After deployment, configure webhooks:

### Paystack
1. Go to [Paystack Dashboard](https://dashboard.paystack.com) → Settings → Webhooks
2. Add URL: `https://veloxtopup-api.onrender.com/api/v1/webhooks/paystack/YOUR_TOKEN`
3. Copy webhook secret to Render env vars

### GhDataConnect
1. Go to GhDataConnect Dashboard → Webhooks
2. Add URL: `https://veloxtopup-api.onrender.com/api/v1/webhooks/ghdataconnect/YOUR_TOKEN`

---

## ✅ Verification Steps

After deployment:

1. **Health Check**: Visit `https://veloxtopup-api.onrender.com/health`
2. **API Endpoint**: Visit `https://veloxtopup-api.onrender.com/api`
3. **Test Purchase Flow**: Use frontend to test a purchase

Expected health response:
```json
{
  "status": "OK",
  "timestamp": "2026-04-03T...",
  "uptime": 123.45,
  "environment": "production",
  "version": "1.0.0"
}
```

---

## 📊 Monitoring

### Render Dashboard Features:
- **Logs**: View real-time logs in Render dashboard
- **Metrics**: CPU, Memory, Request metrics
- **Alerts**: Set up email alerts for errors

### Recommended Log Level:
In production, set `LOG_LEVEL=error` to reduce log volume.

---

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check Node version is 20 in Render settings |
| 502 Bad Gateway | Check that PORT is set to 5000 |
| CORS errors | Verify CORS_ORIGIN matches your frontend exactly |
| Database connection error | Verify SUPABASE_URL and keys are correct |
| Webhook not working | Check webhook URL includes the token |
| Email not sending | Verify SMTP credentials and App Password |

---

## 📝 Quick Commands

```bash
# Test locally
cd veloxtopup-api
npm install
npm start

# Test health endpoint
curl https://veloxtopup-api.onrender.com/health
```

---

## 🔄 Updating After Deployment

To update:
1. Push changes to GitHub
2. Render auto-deploys (if auto-deploy enabled)
3. Or manually trigger redeploy in Render dashboard

---

## 📞 Need Help?

- Render Docs: https://render.com/docs
- Supabase Docs: https://supabase.com/docs
- Paystack Support: https://support.paystack.co