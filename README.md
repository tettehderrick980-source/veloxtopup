# VeloxTopUp - Automated Airtime & Data Bundle Reselling Platform

A full-stack web application for automated airtime and data bundle reselling with wallet system, referral bonuses, and admin dashboard.

## Features

- **User System**: Registration/login with Supabase authentication, guest checkout
- **Wallet System**: Fund wallet via Paystack, real-time balance updates
- **Automated Purchases**: Mode 2 automation with GhDataConnect API integration
- **Referral System**: Unique referral links with bonus tracking
- **Admin Dashboard**: Monitor transactions, users, and system settings
- **Webhook Integration**: Paystack and GhDataConnect webhooks for automation
- **Mobile Responsive**: Professional black and deep yellow theme

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Supabase (Database + Auth + Edge Functions)
- **Payments**: Paystack
- **API Integration**: GhDataConnect
- **Deployment**: Vercel

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your environment variables
4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

See `.env.example` for all required environment variables.

## Database Schema

The application uses the following Supabase tables:
- `users`: User profiles and authentication
- `wallets`: User wallet balances
- `transactions`: Purchase transactions and history
- `referrals`: Referral relationships and bonuses

## Deployment

The application is configured for Vercel deployment with domain `veloxtopup.shop`.

## API Endpoints

### Edge Functions
- `/api/verify-paystack-payment`: Verify Paystack payments
- `/api/purchase-data`: Process data bundle purchases
- `/api/paystack-webhook`: Handle Paystack webhooks
- `/api/ghdataconnect-webhook`: Handle GhDataConnect webhooks

## Security

- All API calls secured through Supabase RLS
- Webhook signatures verified
- Environment variables for sensitive data
- Role-based access control

## License

MIT License
