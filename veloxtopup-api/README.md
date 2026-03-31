# VeloxTopUp API

Professional Node.js/Express backend API for VeloxTopUp - replacing Supabase Edge Functions with a more robust and scalable solution.

## 🚀 Features

- **Express.js** - Fast, unopinionated web framework
- **Supabase Integration** - Keep using Supabase for database and auth
- **Paystack Integration** - Payment processing with webhook handling
- **GhDataConnect Integration** - Data bundle purchasing
- **Comprehensive Logging** - Winston logger with structured logging
- **Error Handling** - Centralized error handling middleware
- **Rate Limiting** - Protection against abuse
- **CORS Support** - Cross-origin resource sharing configured
- **Input Validation** - Express-validator for request validation
- **Security Headers** - Helmet.js for security
- **API Documentation** - Auto-generated API endpoints list

## 📁 Project Structure

```
veloxtopup-api/
├── src/
│   ├── config/
│   │   └── database.js          # Supabase client configuration
│   ├── controllers/             # Route controllers (if needed)
│   ├── middleware/
│   │   ├── errorHandler.js      # Centralized error handling
│   │   └── requestLogger.js     # Request logging middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── purchases.js         # Data purchase routes
│   │   ├── transactions.js      # Transaction management
│   │   ├── webhooks.js          # Webhook handlers
│   │   ├── admin.js             # Admin routes
│   │   └── users.js             # User profile routes
│   ├── services/
│   │   ├── ghDataConnectService.js  # GhDataConnect API client
│   │   └── paystackService.js       # Paystack API client
│   └── utils/
│       └── logger.js            # Winston logger configuration
├── server.js                    # Main server file
├── package.json                 # Dependencies
└── .env.example                 # Environment variables template
```

## 🛠 Installation

1. **Navigate to the API directory:**
   ```bash
   cd veloxtopup-api
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create environment file:**
   ```bash
   cp .env.example .env
   ```

4. **Edit .env with your configuration:**
   - Set your Supabase credentials
   - Add Paystack API keys
   - Configure GhDataConnect API key
   - Set JWT secret

## 🚀 Running the API

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The API will be available at `http://localhost:3001`

## 📚 API Endpoints

### Health Check
- `GET /health` - Server health status

### API Info
- `GET /api` - API documentation and endpoints list

### Authentication
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/signin` - User login
- `GET /api/v1/auth/profile/:userId` - Get user profile
- `PUT /api/v1/auth/profile/:userId` - Update user profile
- `POST /api/v1/auth/referral/validate` - Validate referral code

### Purchases
- `POST /api/v1/purchases` - Create a new purchase
- `GET /api/v1/purchases/networks` - Get available networks
- `GET /api/v1/purchases/bundles/:network` - Get bundles for network
- `GET /api/v1/purchases/ishare-bundles` - Get iShare bundles
- `GET /api/v1/purchases/balance` - Check API wallet balance
- `GET /api/v1/purchases/health` - Check API health

### Transactions
- `GET /api/v1/transactions` - Get all transactions (with filters)
- `GET /api/v1/transactions/:id` - Get specific transaction
- `PUT /api/v1/transactions/:id/status` - Update transaction status
- `PUT /api/v1/transactions/:id` - Update transaction
- `GET /api/v1/transactions/user/:userId` - Get user transactions
- `GET /api/v1/transactions/stats` - Get transaction statistics
- `POST /api/v1/transactions/:id/refund` - Process refund

### Users
- `GET /api/v1/users/profile` - Get current user profile
- `PUT /api/v1/users/profile` - Update user profile
- `GET /api/v1/users/wallet` - Get user wallet
- `GET /api/v1/users/transactions` - Get user transactions
- `GET /api/v1/users/referrals` - Get user referrals
- `POST /api/v1/users/wallet/fund` - Fund wallet
- `GET /api/v1/users/stats` - Get user statistics

### Admin
- `GET /api/v1/admin/dashboard` - Get dashboard statistics
- `GET /api/v1/admin/users` - Get all users
- `PUT /api/v1/admin/users/:userId` - Update user
- `POST /api/v1/admin/users/:userId/suspend` - Suspend user
- `POST /api/v1/admin/users/:userId/activate` - Activate user
- `GET /api/v1/admin/transactions` - Get all transactions
- `GET /api/v1/admin/wallets` - Get all wallets
- `POST /api/v1/admin/wallets/:userId/fund` - Fund user wallet
- `GET /api/v1/admin/referrals` - Get all referrals
- `GET /api/v1/admin/system/health` - System health check

### Webhooks
- `POST /api/v1/webhooks/paystack` - Paystack webhook handler
- `POST /api/v1/webhooks/ghdataconnect` - GhDataConnect webhook handler
- `GET /api/v1/webhooks/events` - Get webhook events
- `POST /api/v1/webhooks/events/:id/process` - Process webhook event

## 🔐 Environment Variables

```bash
# Server Configuration
NODE_ENV=development
PORT=3001
API_VERSION=v1

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# Paystack Configuration
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret

# GhDataConnect API
GH_DATACONNECT_API_KEY=your_api_key
GH_DATACONNECT_API_URL=https://ghdataconnect.com/api

# Redis Configuration (for queue system)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password

# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
CORS_ORIGIN_PROD=https://veloxtopup.shop
```

## 📊 Logging

Logs are stored in:
- `logs/error.log` - Error logs only
- `logs/combined.log` - All logs
- Console - Development mode only

## 🧪 Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 🔒 Security Features

- **Helmet.js** - Security headers
- **Rate Limiting** - Request throttling
- **CORS** - Cross-origin protection
- **Input Validation** - Request sanitization
- **JWT Authentication** - Secure token-based auth
- **Error Handling** - No sensitive data exposure

## 🚀 Deployment

### Vercel Deployment
1. Create `vercel.json`:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

2. Set environment variables in Vercel dashboard
3. Deploy with `vercel --prod`

### Other Platforms
The API can be deployed to:
- Railway
- Render
- Heroku
- DigitalOcean
- AWS
- Google Cloud
- Azure

## 🔄 Migration from Edge Functions

### Old (Edge Functions):
```javascript
const { data } = await supabase.functions.invoke('purchase-data', {
  body: { network, phone, capacity }
});
```

### New (API):
```javascript
import { purchaseAPI } from '../services/api';

const { data } = await purchaseAPI.createPurchase({
  network, phone, capacity
});
```

## 📱 Frontend Integration

1. **Install the API client:**
   The frontend already has the API client in `src/services/api.js`

2. **Update environment variables:**
   Add to your frontend `.env`:
   ```
   VITE_API_URL=http://localhost:3001/api/v1
   ```

3. **Use the API:**
   ```javascript
   import { purchaseAPI, userAPI, adminAPI } from '../services/api';
   
   // Make API calls
   const networks = await purchaseAPI.getNetworks();
   const transactions = await userAPI.getTransactions();
   ```

## 🆘 Troubleshooting

### Common Issues:

1. **Database connection failed**
   - Check Supabase URL and API keys
   - Ensure Supabase is running

2. **Port already in use**
   - Change PORT in .env file
   - Kill process using the port

3. **CORS errors**
   - Add your frontend URL to CORS_ORIGIN
   - Check the origin in request headers

4. **Rate limiting**
   - Reduce RATE_LIMIT_MAX_REQUESTS
   - Check rate limit headers in response

## 📞 Support

For issues and feature requests, please contact the VeloxTopUp team.

## 📄 License

MIT License - see LICENSE file for details.
