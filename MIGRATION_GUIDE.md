# Migration Guide: Edge Functions to Node.js API

## What Has Been Created

### New Backend Structure
```
veloxtopup-api/
├── server.js                    # Main Express server
├── package.json               # Dependencies
├── .env.example               # Environment template
├── README.md                  # Backend documentation
└── src/
    ├── config/
    │   └── database.js        # Supabase connection
    ├── middleware/
    │   ├── errorHandler.js    # Error handling
    │   └── requestLogger.js   # Request logging
    ├── routes/
    │   ├── auth.js            # Authentication routes
    │   ├── purchases.js       # Purchase processing
    │   ├── transactions.js    # Transaction management
    │   ├── webhooks.js        # Webhook handlers
    │   ├── admin.js           # Admin routes
    │   └── users.js           # User routes
    ├── services/
    │   ├── ghDataConnectService.js  # GhDataConnect API
    │   └── paystackService.js       # Paystack API
    └── utils/
        └── logger.js          # Winston logging
```

### New Frontend API Client
```
src/services/api.js          # API client for new backend
```

## Migration Steps

### Step 1: Setup the Backend

1. Navigate to the backend directory:
   ```bash
   cd veloxtopup-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your credentials:
   - SUPABASE_URL (same as frontend)
   - SUPABASE_ANON_KEY (same as frontend)
   - SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard)
   - PAYSTACK_SECRET_KEY (same as before)
   - GH_DATACONNECT_API_KEY (same as before)
   - JWT_SECRET (generate a random string)

### Step 2: Start the Backend

```bash
npm run dev
```

The API will start on `http://localhost:3001`

### Step 3: Update Frontend Environment

Add to your frontend `.env`:
```
VITE_API_URL=http://localhost:3001/api/v1
```

### Step 4: Test the API

1. Health check:
   ```bash
   curl http://localhost:3001/health
   ```

2. Check API endpoints:
   ```bash
   curl http://localhost:3001/api
   ```

## What Has Been Migrated

### From Supabase Edge Functions

| Old (Edge Functions) | New (Node.js API) |
|---------------------|-------------------|
| `purchase-data` | `POST /api/v1/purchases` |
| `process-queued-orders` | `POST /api/v1/admin/process-queue` |
| `send-admin-notification` | `POST /api/v1/admin/notifications` |
| `ghdataconnect-*` | Internal services in `src/services/` |

### Frontend Changes

| Old Code | New Code |
|----------|----------|
| `supabase.functions.invoke('purchase-data', ...)` | `purchaseAPI.createPurchase(...)` |
| Direct Supabase calls for transactions | `transactionAPI.getTransactions(...)` |
| Direct Supabase calls for users | `userAPI.getProfile(...)` |

## API Endpoints Available

### Authentication
- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/signin`
- `GET /api/v1/auth/profile/:userId`
- `PUT /api/v1/auth/profile/:userId`

### Purchases
- `POST /api/v1/purchases` - Create purchase
- `GET /api/v1/purchases/networks` - Get networks
- `GET /api/v1/purchases/bundles/:network` - Get bundles
- `GET /api/v1/purchases/balance` - Check balance

### Transactions
- `GET /api/v1/transactions` - List transactions
- `GET /api/v1/transactions/:id` - Get transaction
- `PUT /api/v1/transactions/:id/status` - Update status
- `POST /api/v1/transactions/:id/refund` - Process refund

### Users
- `GET /api/v1/users/profile` - Get profile
- `PUT /api/v1/users/profile` - Update profile
- `GET /api/v1/users/wallet` - Get wallet
- `GET /api/v1/users/transactions` - Get transactions

### Admin
- `GET /api/v1/admin/dashboard` - Dashboard stats
- `GET /api/v1/admin/users` - List users
- `PUT /api/v1/admin/users/:id` - Update user
- `POST /api/v1/admin/wallets/:id/fund` - Fund wallet

### Webhooks
- `POST /api/v1/webhooks/paystack`
- `POST /api/v1/webhooks/ghdataconnect`

## Next Steps

1. **Test the backend thoroughly**:
   - Run `npm run dev` in the backend
   - Test each endpoint using the API documentation at `/api`
   - Verify Supabase connection works
   - Test GhDataConnect and Paystack integrations

2. **Update remaining frontend components**:
   - Update TransactionsPage to use `transactionAPI`
   - Update DashboardPage to use `userAPI` and `adminAPI`
   - Update AdminDashboard to use `adminAPI`

3. **Deploy the backend**:
   - Choose a hosting platform (Vercel, Railway, Render, etc.)
   - Set environment variables
   - Update frontend VITE_API_URL to point to production

4. **Monitor and maintain**:
   - Check logs in `veloxtopup-api/logs/`
   - Monitor webhook events
   - Set up error tracking (optional)

## Rollback Plan

If issues arise:
1. Keep Supabase Edge Functions running during transition
2. Frontend can fall back to Edge Functions by changing API calls
3. Database remains unchanged (still Supabase)

## Benefits of New Architecture

✅ **Better debugging** - Full Node.js debugging tools  
✅ **More control** - Complete control over business logic  
✅ **Better error handling** - Comprehensive error middleware  
✅ **Professional logging** - Winston logger with structured logs  
✅ **Easier testing** - Can write unit tests for API endpoints  
✅ **Scalability** - Can add caching, queuing, rate limiting  
✅ **Familiar stack** - Express.js is industry standard  

## Support

If you encounter issues:
1. Check backend logs in `veloxtopup-api/logs/`
2. Verify environment variables are set correctly
3. Test Supabase connection independently
4. Check API health endpoint: `GET /health`

## Summary

You've successfully migrated from Supabase Edge Functions to a professional Node.js/Express backend. The new architecture gives you:
- Full control over your API
- Better debugging and logging
- Industry-standard Express.js framework
- Easier testing and maintenance
- Scalable architecture for future growth

The Supabase database and authentication remain unchanged - you're just replacing the Edge Functions with a more robust backend solution.
