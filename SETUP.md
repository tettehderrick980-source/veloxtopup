# VeloxTopUp Setup & Deployment Guide

## 🚀 Quick Start

### 1. **Install Dependencies**
```bash
npm install
```

### 2. **Environment Setup**
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your actual values:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
# - VITE_PAYSTACK_PUBLIC_KEY
# - PAYSTACK_SECRET_KEY
# - GH_DATACONNECT_API_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

### 3. **Supabase Database Setup**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create new project or use existing
3. Navigate to **SQL Editor**
4. Run the migration: `supabase/migrations/001_create_tables.sql`
5. Go to **Authentication > Settings** and enable email provider
6. Go to **Settings > API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key

### 4. **Edge Functions Deployment**

#### Option A: Using Docker (Recommended)
```bash
# Run setup script
.\setup-supabase.ps1

# Deploy functions
docker run --rm -v "${PWD}:/work" supabase/cli:latest supabase functions deploy purchase-data
docker run --rm -v "${PWD}:/work" supabase/cli:latest supabase functions deploy paystack-webhook
docker run --rm -v "${PWD}:/work" supabase/cli:latest supabase functions deploy ghdataconnect-webhook
docker run --rm -v "${PWD}:/work" supabase/cli:latest supabase functions deploy verify-paystack-payment
```

#### Option B: Using NPM (Alternative)
```bash
# Install using supported package manager
npm install -g @supabase/supabase-js

# Link project
npx supabase link --project-ref your-project-ref

# Deploy functions
npx supabase functions deploy purchase-data
npx supabase functions deploy paystack-webhook
npx supabase functions deploy ghdataconnect-webhook
npx supabase functions deploy verify-paystack-payment
```

### 5. **Webhook Configuration**

#### Paystack Webhook
1. Go to [Paystack Dashboard](https://dashboard.paystack.co/)
2. Navigate to **Settings > Webhooks**
3. Add webhook URL: `https://veloxtopup.shop/api/paystack-webhook`
4. Select events: `charge.success`
5. Save the webhook secret

#### GhDataConnect Webhook
1. Go to GhDataConnect dashboard
2. Add webhook URL: `https://veloxtopup.shop/api/ghdataconnect-webhook`
3. Select events: `transaction.success`, `transaction.failed`

### 6. **Vercel Deployment**

#### Option A: Using Deploy Script
```bash
# Make script executable (Linux/Mac)
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

#### Option B: Manual Deployment
```bash
# Install Vercel CLI (already done)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### 7. **Vercel Environment Variables**
In Vercel Dashboard > Project > Settings > Environment Variables:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
GH_DATACONNECT_API_KEY=your_ghdataconnect_api_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_APP_NAME=VeloxTopUp
VITE_APP_URL=https://veloxtopup.shop
```

### 8. **Domain Setup**
1. In Vercel dashboard, add custom domain: `veloxtopup.shop`
2. Configure DNS records as provided by Vercel
3. Wait for SSL certificate propagation

## 🔧 Testing Checklist

- [ ] User registration works
- [ ] Email verification received
- [ ] Login successful
- [ ] Wallet funding via Paystack
- [ ] Airtime purchase works
- [ ] Data bundle purchase works
- [ ] Transaction history displays
- [ ] Referral system works
- [ ] Admin dashboard accessible
- [ ] Webhooks receiving events
- [ ] Automatic refunds working

## 🐛 Troubleshooting

### Common Issues

#### Supabase CLI Installation
If npm global install fails, use Docker:
```bash
docker run --rm -v "${PWD}:/work" supabase/cli:latest supabase [command]
```

#### Paystack Integration
- Ensure webhook URL is publicly accessible
- Check webhook secret matches
- Verify CORS settings

#### Edge Functions
- Check environment variables in Supabase dashboard
- Review function logs in Supabase dashboard
- Ensure service role key has correct permissions

#### Database Issues
- Run migration file manually in SQL editor
- Check RLS policies are enabled
- Verify foreign key constraints

## 📱 Features Implemented

### ✅ Core Features
- User authentication (register/login)
- Wallet system with Paystack integration
- Airtime & data bundle purchases
- Transaction history
- Referral system with bonuses
- Guest checkout option

### ✅ Admin Features
- Dashboard with statistics
- User management
- Transaction monitoring
- System settings
- Real-time webhook events

### ✅ Automation (Mode 2)
- Automatic API calls to GhDataConnect
- Webhook-driven processing
- Automatic refunds on failures
- Real-time transaction updates

### ✅ Security
- Row Level Security (RLS)
- Secure API calls via Edge Functions
- Webhook signature verification
- Role-based access control

## 🎨 UI/UX
- Professional black & deep yellow theme
- Mobile responsive design
- Modern React components
- Intuitive navigation

## 📞 Support

For issues with:
- **Supabase**: Check [Supabase Docs](https://supabase.com/docs)
- **Paystack**: Check [Paystack Docs](https://paystack.com/docs)
- **Vercel**: Check [Vercel Docs](https://vercel.com/docs)
- **GhDataConnect**: Contact their support team

---

**🎉 Your VeloxTopUp application is now ready for production!**
