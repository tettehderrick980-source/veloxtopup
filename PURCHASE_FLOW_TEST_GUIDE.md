# Data Bundle Purchase Flow Test Guide

## Overview
This test suite verifies that any user (authenticated or guest) can successfully purchase data bundles through the VeloxTopUp platform.

## What It Tests
1. ✅ **Database Connection** - Supabase connectivity
2. ✅ **Guest User RLS Policies** - Can guests create transactions?
3. ✅ **Authenticated User RLS Policies** - Can logged-in users create transactions?
4. ✅ **Phone Number Validation** - Ghana phone number format validation
5. ✅ **Transaction Status Flow** - pending → processing → delivered
6. ✅ **Edge Function Availability** - Is purchase-data function deployed?
7. ✅ **Required Database Tables** - All necessary tables exist
8. ✅ **Duplicate Transaction Prevention** - Unique constraints working

## Prerequisites
- Node.js 18+ installed
- Dependencies installed: `npm install`
- `.env` file configured with Supabase credentials

## Running the Tests

### Option 1: Direct Execution
```bash
node test-purchase-flow.js
```

### Option 2: Using npm script
Add to `package.json`:
```json
"scripts": {
  "test:purchase": "node test-purchase-flow.js"
}
```

Then run:
```bash
npm run test:purchase
```

## Expected Output
```
======================================================================
🧪 VeloxTopUp - Data Bundle Purchase Flow Test Suite
======================================================================

📦 TEST 1: Database Connection
----------------------------------------------------------------------
✅ Database connection

🔓 TEST 2: Guest User Transaction Creation (RLS Policy)
----------------------------------------------------------------------
✅ Guest transaction creation

🔐 TEST 3: Authenticated User Transaction Creation (RLS Policy)
----------------------------------------------------------------------
✅ Authenticated transaction creation

... (more tests)

======================================================================
📋 TEST SUMMARY
======================================================================
Total Tests: 15
✅ Passed: 15
❌ Failed: 0
======================================================================

🎉 ALL TESTS PASSED! The purchase flow is working correctly.
======================================================================
```

## Interpreting Results

### All Tests Pass ✅
- Any user can purchase data bundles
- RLS policies are correctly configured
- Database schema is complete
- Edge functions are deployed

### Some Tests Fail ❌
Review the failed test details:

**RLS Policy Failures:**
- Check `supabase/migrations/veloxtopup_schema.sql` lines 224-274
- Verify transaction policies allow `user_id IS NULL` (for guests)
- Run migration in Supabase SQL Editor

**Edge Function Failures:**
- Deploy functions: `supabase functions deploy purchase-data`
- Check environment variables in Supabase Dashboard

**Table Missing:**
- Run schema migration: `supabase/migrations/veloxtopup_schema.sql`
- Execute in Supabase SQL Editor

## Test Data Cleanup
The test suite automatically cleans up test transactions and users using the Supabase Service Role Key. If `SUPABASE_SERVICE_ROLE_KEY` is not set in `.env`, cleanup will be skipped.

## Manual Verification
After automated tests, manually verify:
1. Visit `https://veloxtopup.shop`
2. Select a network (MTN, Telecel, AT)
3. Enter a valid Ghana phone number
4. Select a data bundle
5. Complete Paystack payment
6. Verify transaction appears in dashboard

## Troubleshooting

### "Function not found" Error
```bash
# Deploy edge functions
cd supabase/edge-functions
supabase functions deploy purchase-data --project-ref xlsrtcfndfsmcjaoswfq
```

### RLS Policy Errors
```sql
-- Run in Supabase SQL Editor
-- Ensure these policies exist:
CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
    OR auth.uid() IS NULL
  );
```

### Database Connection Failed
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`
- Check Supabase project is active at `https://xlsrtcfndfsmcjaoswfq.supabase.co`
