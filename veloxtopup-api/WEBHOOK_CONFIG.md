# Webhook Configuration Guide

This document lists the secure webhook URLs with unique tokens for Paystack and GhDataConnect.

## Overview

Each webhook now uses a unique, cryptographically secure token in the URL path. This provides:
- **Security**: URLs are unguessable and resistant to brute force
- **Isolation**: Each service has its own token
- **Rotation**: Tokens can be rotated without changing code

## Current Webhook URLs

### 1. Paystack Webhook

**Webhook URL**: `{BASE_URL}/api/v1/webhooks/paystack/{TOKEN}`

**Generated URL**:
```
https://veloxtopup.shop/api/v1/webhooks/paystack/wh_tok_06f078952b3ef0b40f8122d6e65e2f4a5babf53564d7c583be9f86055aad679c
```

**Environment Variable**:
```env
PAYSTACK_WEBHOOK_TOKEN=wh_tok_06f078952b3ef0b40f8122d6e65e2f4a5babf53564d7c583be9f86055aad679c
```

**Events to Subscribe To**:
- [x] `charge.success` - Payment successful
- [x] `charge.failed` - Payment failed
- [x] `transfer.success` - Transfer/payout successful
- [x] `transfer.failed` - Transfer/payout failed

---

### 2. GhDataConnect Webhook

**Webhook URL**: `{BASE_URL}/api/v1/webhooks/ghdataconnect/{TOKEN}`

**Generated URL**:
```
https://veloxtopup.shop/api/v1/webhooks/ghdataconnect/ghd_tok_7f534ae8f86055aad679cbdc0af24170d24f5ede7c4fb445d4201eb2b25b6a98
```

**Environment Variable**:
```env
GH_DATACONNECT_WEBHOOK_TOKEN=ghd_tok_7f534ae8f86055aad679cbdc0af24170d24f5ede7c4fb445d4201eb2b25b6a98
```

**Events to Subscribe To**:
- Order status updates
- Delivery confirmations
- Failed delivery notifications

---

## Configuration Steps

### 1. Paystack Dashboard

1. Log in to [Paystack Dashboard](https://dashboard.paystack.com)
2. Go to **Settings** → **API Keys & Webhooks**
3. In the **Webhook URL** field, enter the full URL with token:
   ```
   https://veloxtopup.shop/api/v1/webhooks/paystack/wh_tok_06f078952b3ef0b40f8122d6e65e2f4a5babf53564d7c583be9f86055aad679c
   ```
4. Save the configuration
5. Copy the **Webhook Secret** from Paystack and add to `.env`:
   ```env
   PAYSTACK_WEBHOOK_SECRET=whsec_your_secret_from_paystack
   ```

### 2. GhDataConnect Dashboard

1. Log in to [GhDataConnect Dashboard](https://ghdataconnect.com)
2. Navigate to **API Settings** or **Webhooks**
3. Add your webhook URL with token:
   ```
   https://veloxtopup.shop/api/v1/webhooks/ghdataconnect/ghd_tok_7f534ae8f86055aad679cbdc0af24170d24f5ede7c4fb445d4201eb2b25b6a98
   ```
4. Save the configuration

---

## Environment Variables

Add these to your `.env` file:

```env
# Paystack
PAYSTACK_SECRET_KEY=sk_test_70a1058a90bb7d696e463e18fd4fc9b77110364f
PAYSTACK_WEBHOOK_SECRET=your_paystack_webhook_secret_here
PAYSTACK_WEBHOOK_TOKEN=wh_tok_06f078952b3ef0b40f8122d6e65e2f4a5babf53564d7c583be9f86055aad679c

# GhDataConnect
GH_DATACONNECT_API_KEY=150|Be1FtGzsHkEW5J6pLGSuqFD3FlyhPWJSPSHBkKJN0acac98b
GH_DATACONNECT_API_URL=https://ghdataconnect.com/api
GH_DATACONNECT_WEBHOOK_TOKEN=ghd_tok_7f534ae8f86055aad679cbdc0af24170d24f5ede7c4fb445d4201eb2b25b6a98
```

---

## Quick Reference

| Service | Webhook URL | Token Status |
|---------|-------------|--------------|
| Paystack | `/api/v1/webhooks/paystack/wh_tok_...` | ✅ Generated |
| GhDataConnect | `/api/v1/webhooks/ghdataconnect/ghd_tok_...` | ✅ Generated |

---

## Security Features

1. **Token Validation**: All webhook requests are validated against stored tokens
2. **Timing-Safe Comparison**: Prevents timing attacks during token validation
3. **IP Logging**: Failed attempts are logged with IP addresses
4. **Cryptographic Randomness**: 32 bytes of entropy per token (64 hex characters)
5. **Service Prefixes**: `wh_tok_` for Paystack, `ghd_tok_` for GhDataConnect

---

## Testing Webhooks Locally

### Using ngrok

```bash
# Install ngrok
npm install -g ngrok

# Expose local API
ngrok http 3001

# Get the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### Update .env for Local Testing

```env
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

### Test URLs

- Paystack: `https://abc123.ngrok.io/api/v1/webhooks/paystack/wh_tok_06f078952b3ef0b40f8122d6e65e2f4a5babf53564d7c583be9f86055aad679c`
- GhDataConnect: `https://abc123.ngrok.io/api/v1/webhooks/ghdataconnect/ghd_tok_7f534ae8f86055aad679cbdc0af24170d24f5ede7c4fb445d4201eb2b25b6a98`

---

## Troubleshooting

### 401 Unauthorized Error

- Check that the token in the URL matches the environment variable
- Verify environment variables are loaded (restart server if needed)
- Check server logs for token validation attempts

### Webhook Not Receiving Events

1. Verify the full URL is correct (including the token)
2. Ensure HTTPS is used for production
3. Check that the API server is accessible from the internet
4. Review firewall/network settings

---

## Admin Endpoints

View webhook events:
```bash
GET /api/v1/webhooks/events?source=paystack
GET /api/v1/webhooks/events?source=ghdataconnect
```

Manually process an event:
```bash
POST /api/v1/webhooks/events/{id}/process
```

---

## Files Updated

- `veloxtopup-api/.env.example` - Added webhook token variables
- `veloxtopup-api/src/routes/webhooks.js` - Added token validation middleware
- `veloxtopup-api/src/utils/webhookManager.js` - New utility for URL management
- `veloxtopup-api/WEBHOOK_CONFIG.md` - This documentation
