# VeloxTopUp Purchase Flow - How It Works

## Overview
The purchase flow has been enhanced with a **dual-path system** that ensures 100% reliability:

1. **Primary Path**: Frontend-driven purchase (immediate user feedback)
2. **Backup Path**: Webhook-driven purchase (catches dropped connections)

---

## Purchase Flow Diagram

```
User submits order
        ↓
Frontend: Create transaction in Supabase (status: pending)
        ↓
Frontend: Initialize Paystack payment
        ↓
User completes payment
        ↓
Paystack Webhook fires → Backend verifies payment
        ↓
        ├─ Frontend Path: onSuccess callback triggers purchase
        └─ Webhook Path: Backend auto-triggers purchase (backup)
        ↓
Purchase Service calls GhDataConnect API
        ↓
        ├─ Success: Data delivered, user notified
        └─ Failure: Auto-retry scheduled (3 attempts)
        ↓
If all retries fail → Automatic refund to wallet
```

---

## Key Components

### 1. Frontend Flow (@`src/components/BuyForm.jsx`)
**What happens:**
1. User selects network, enters phone number, chooses bundle
2. Form validates Ghana phone number format
3. Creates transaction in Supabase with `status: 'pending'`
4. Opens Paystack payment popup
5. After successful payment:
   - Updates transaction to `status: 'processing'`
   - Calls `purchaseAPI.createPurchase()`
   - Polls for delivery status
   - Shows real-time status updates to user

**Why it works:**
- Immediate user feedback with transaction status
- Real-time updates as order progresses
- Prevents duplicate orders with transaction locking

---

### 2. Webhook Backup (@`veloxtopup-api/src/routes/webhooks.js`)
**What happens:**
1. Paystack sends webhook event after payment
2. Backend verifies payment signature
3. Finds transaction by payment reference
4. **NEW**: Automatically triggers `purchaseService.fulfillOrder()`
5. Handles success/failure with retry logic

**Why it's needed:**
- User might close browser before frontend callback completes
- Network issues might interrupt frontend flow
- Ensures every paid order gets fulfilled

---

### 3. Purchase Service (@`veloxtopup-api/src/services/purchaseService.js`)
**Responsibilities:**
- Calls GhDataConnect API to deliver data
- Prevents double-delivery (checks existing status)
- Classifies errors as retryable or permanent
- Implements retry logic with exponential backoff

**Methods:**
```javascript
fulfillOrder()      // Main purchase fulfillment
retryOrder()        // Manual retry with attempt tracking
isRetryableError()  // Determines if error warrants retry
```

---

### 4. Notification Service (@`veloxtopup-api/src/services/notificationService.js`)
**Responsibilities:**
- Sends email confirmations via SMTP
- Sends push notifications to mobile devices
- Handles both authenticated users and guest orders
- Gracefully degrades if services not configured

**Notification Triggers:**
| Event | Email | Push |
|-------|-------|------|
| Order Confirmation | ✅ | ✅ |
| Delivery Success | ✅ | ✅ |
| Delivery Failure | ✅ | ✅ |
| Payment Receipt | ✅ | ❌ |
| Low Balance | ❌ | ✅ |
| Refund | ✅ | ✅ |

---

### 5. Auto-Retry & Refund (@`veloxtopup-api/src/services/orderRetryService.js`)
**What happens on failure:**
1. Order marked as `fulfillment_status: 'failed'`
2. Added to Bull queue with 5-minute delay
3. Retried up to 3 times with exponential backoff
4. If all retries fail:
   - Order marked as `status: 'refunded'`
   - Amount credited back to user's wallet
   - Refund notification sent

**Why this matters:**
- Users never lose money on failed orders
- Automatic recovery from temporary API issues
- No manual intervention needed

---

## Database Schema Updates

Required columns in `transactions` table:
```sql
fulfillment_status      -- 'pending', 'processing', 'fulfilled', 'failed', 'refunded'
retry_count             -- Number of retry attempts
retry_scheduled_at      -- When next retry is scheduled
refunded_at             -- When refund was processed
refund_reason           -- Why refund was issued
delivered_at            -- When data was delivered
vendor_reference        -- Reference from GhDataConnect
api_response            -- JSON response from vendor
error_message           -- Error details if failed
```

---

## Configuration

### Required Environment Variables

```bash
# Paystack (already configured)
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...

# Email (SMTP - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Push Notifications (optional)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Redis (required for retry queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Webhook Security
PAYSTACK_WEBHOOK_TOKEN=your_webhook_token
```

---

## Testing the Flow

### Test 1: Normal Purchase
1. Select MTN network
2. Enter valid Ghana phone (024...)
3. Select bundle
4. Complete Paystack payment
5. **Expected**: Data delivered within 30 seconds, success notification

### Test 2: Webhook Backup
1. Start purchase
2. Close browser immediately after Paystack payment
3. **Expected**: Order still fulfilled via webhook within 2 minutes

### Test 3: Failed Order Recovery
1. Use invalid phone number (to force failure)
2. Complete payment
3. **Expected**: 
   - Order fails
   - 3 retry attempts over 15 minutes
   - Automatic refund to wallet
   - Failure notification sent

### Test 4: Duplicate Prevention
1. Submit order
2. Try to submit identical order immediately
3. **Expected**: Error: "Please wait X seconds before placing another order"

---

## Monitoring & Debugging

### Logs to Watch
```bash
# Successful purchase
grep "Data purchase fulfilled successfully" logs/app.log

# Failed purchase with retry
grep "scheduled for retry" logs/app.log

# Refund processed
grep "Refund processed" logs/app.log

# Webhook received
grep "Webhook verified" logs/app.log
```

### Key Metrics
- **Success Rate**: Successful deliveries / Total orders
- **Retry Rate**: Orders requiring retry / Total orders
- **Refund Rate**: Refunded orders / Total orders
- **Webhook Backup Usage**: Webhook fulfillments / Frontend fulfillments

---

## Advantages of This Architecture

1. **100% Reliability**: Dual-path system ensures no paid order is lost
2. **Auto-Recovery**: Failed orders retry automatically without manual intervention
3. **User Trust**: Automatic refunds for unfulfillable orders
4. **Scalable**: Queue-based retry system handles high volume
5. **Observable**: Full logging and notification trail
6. **Professional**: Email/push notifications keep users informed

---

## Next Steps

1. **Configure SMTP**: Add email credentials to `.env`
2. **Set up Redis**: Required for retry queue (can use Redis Cloud free tier)
3. **Test Webhook**: Configure Paystack webhook URL with token
4. **Configure VAPID**: Generate keys for push notifications (optional)
5. **Monitor**: Check logs after first few real orders

---

## Troubleshooting

### Issue: Orders stuck in "processing"
**Check:**
- GhDataConnect API credentials
- API balance/sufficent funds
- Network connectivity to vendor API

### Issue: Emails not sending
**Check:**
- SMTP credentials in `.env`
- Email service logs: `grep "Email" logs/app.log`
- Mailtrap or SMTP provider dashboard

### Issue: Retries not working
**Check:**
- Redis connection: `redis-cli ping`
- Queue status in logs: `grep "retry" logs/app.log`
- Bull queue dashboard (if configured)

---

## Support

For issues or questions:
- Email: veloxtopupgh@gmail.com
- Phone: +233 531649960
