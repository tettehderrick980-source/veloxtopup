-- ================================================================
-- VeloxTopUp Database Schema
-- Automated Airtime & Data Bundle Reselling Platform
-- ================================================================
-- Run this in Supabase SQL Editor on a fresh project
-- ================================================================


-- ================================================================
-- SECTION 1: TABLES
-- ================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id                       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                    TEXT UNIQUE NOT NULL,
  phone                    TEXT,
  role                     TEXT NOT NULL DEFAULT 'user'
                             CHECK (role IN ('user', 'admin', 'super_admin')),
  status                   TEXT NOT NULL DEFAULT 'active'
                             CHECK (status IN ('active', 'suspended', 'banned')),
  referral_code            TEXT UNIQUE NOT NULL,
  notification_preferences JSONB NOT NULL DEFAULT '{"email": true, "sms": false, "marketing": false}',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wallets table (one wallet per user)
CREATE TABLE IF NOT EXISTS public.wallets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  balance    DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions table (data bundle purchases)
CREATE TABLE IF NOT EXISTS public.transactions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- User info
  user_id                UUID REFERENCES public.users(id) ON DELETE SET NULL,
  guest_email            TEXT,
  -- Purchase details
  type                   TEXT NOT NULL CHECK (type IN ('data', 'airtime', 'wallet_funding', 'refund')),
  network                TEXT,
  phone                  TEXT NOT NULL,
  plan                   TEXT,
  capacity               TEXT,
  -- Pricing
  amount                 DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  cost_price             DECIMAL(10,2),
  selling_price          DECIMAL(10,2),
  profit                 DECIMAL(10,2),
  margin_percentage      DECIMAL(5,2),
  -- Payment
  reference              TEXT UNIQUE NOT NULL,
  payment_reference      TEXT,
  payment_verified_at    TIMESTAMPTZ,
  -- Order status
  status                 TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'cancelled', 'refunded')),
  fulfillment_status     TEXT NOT NULL DEFAULT 'pending'
                           CHECK (fulfillment_status IN ('pending', 'queued', 'processing', 'fulfilled', 'failed', 'expired', 'cancelled', 'refunded')),
  fulfillment_attempts   INT NOT NULL DEFAULT 0,
  fulfillment_expires_at TIMESTAMPTZ,
  -- Vendor
  vendor_reference       TEXT,
  api_response           JSONB,
  -- Refund
  needs_refund           BOOLEAN NOT NULL DEFAULT FALSE,
  refund_status          TEXT NOT NULL DEFAULT 'none'
                           CHECK (refund_status IN ('none', 'pending', 'completed', 'failed')),
  refund_reference       TEXT,
  refund_reason          TEXT,
  -- Admin alerts
  low_balance_alert_sent BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notified_at      TIMESTAMPTZ,
  -- User support
  user_report            TEXT,
  user_report_email      TEXT,
  user_report_phone      TEXT,
  reported_at            TIMESTAMPTZ,
  -- Timestamps
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  bonus            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'confirmed', 'paid')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referrer_id, referred_user_id)
);

-- Webhook events table (Paystack & GhDataConnect)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL CHECK (source IN ('paystack', 'ghdataconnect')),
  event_type    TEXT NOT NULL,
  payload       JSONB NOT NULL,
  processed     BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL CHECK (type IN ('low_balance', 'order_queued', 'order_expired', 'fulfillment_failed', 'refund_initiated')),
  subject    TEXT NOT NULL,
  message    TEXT,
  data       JSONB,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ================================================================
-- SECTION 2: INDEXES
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_users_email            ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role             ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_referral_code    ON public.users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_status           ON public.users(status);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id        ON public.wallets(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id          ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference        ON public.transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status           ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_fulfillment      ON public.transactions(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_transactions_network          ON public.transactions(network);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at       ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_queued_expires   ON public.transactions(fulfillment_expires_at)
  WHERE fulfillment_status = 'queued';
CREATE INDEX IF NOT EXISTS idx_transactions_needs_refund     ON public.transactions(needs_refund)
  WHERE needs_refund = TRUE;

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id      ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON public.referrals(referred_user_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_source     ON public.webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed  ON public.webhook_events(processed);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_is_read  ON public.admin_notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created  ON public.admin_notifications(created_at DESC);


-- ================================================================
-- SECTION 3: ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- Users policies
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "admins_select_all_users" ON public.users;
CREATE POLICY "admins_select_all_users"
  ON public.users FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "super_admin_manage_users" ON public.users;
CREATE POLICY "super_admin_manage_users"
  ON public.users FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ----------------------------------------------------------------
-- Wallets policies
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "wallets_select_own" ON public.wallets;
CREATE POLICY "wallets_select_own"
  ON public.wallets FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wallets_update_own" ON public.wallets;
CREATE POLICY "wallets_update_own"
  ON public.wallets FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_select_all_wallets" ON public.wallets;
CREATE POLICY "admins_select_all_wallets"
  ON public.wallets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "super_admin_manage_wallets" ON public.wallets;
CREATE POLICY "super_admin_manage_wallets"
  ON public.wallets FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ----------------------------------------------------------------
-- Transactions policies
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
CREATE POLICY "transactions_select_own"
  ON public.transactions FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "transactions_insert_own" ON public.transactions;
CREATE POLICY "transactions_insert_own"
  ON public.transactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "transactions_update_own" ON public.transactions;
CREATE POLICY "transactions_update_own"
  ON public.transactions FOR UPDATE
  USING (
    user_id = auth.uid()
    OR user_id IS NULL
    OR auth.uid() IS NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
    OR auth.uid() IS NULL
  );

DROP POLICY IF EXISTS "service_role_manage_transactions" ON public.transactions;
CREATE POLICY "service_role_manage_transactions"
  ON public.transactions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admins_select_all_transactions" ON public.transactions;
CREATE POLICY "admins_select_all_transactions"
  ON public.transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "super_admin_manage_transactions" ON public.transactions;
CREATE POLICY "super_admin_manage_transactions"
  ON public.transactions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ----------------------------------------------------------------
-- Referrals policies
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "referrals_select_own" ON public.referrals;
CREATE POLICY "referrals_select_own"
  ON public.referrals FOR SELECT
  USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

DROP POLICY IF EXISTS "admins_select_all_referrals" ON public.referrals;
CREATE POLICY "admins_select_all_referrals"
  ON public.referrals FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "super_admin_manage_referrals" ON public.referrals;
CREATE POLICY "super_admin_manage_referrals"
  ON public.referrals FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ----------------------------------------------------------------
-- Webhook events policies (super admin only)
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "super_admin_manage_webhook_events" ON public.webhook_events;
CREATE POLICY "super_admin_manage_webhook_events"
  ON public.webhook_events FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
  ));

-- ----------------------------------------------------------------
-- Admin notifications policies
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "admins_select_notifications" ON public.admin_notifications;
CREATE POLICY "admins_select_notifications"
  ON public.admin_notifications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "admins_update_notifications" ON public.admin_notifications;
CREATE POLICY "admins_update_notifications"
  ON public.admin_notifications FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

DROP POLICY IF EXISTS "super_admin_manage_notifications" ON public.admin_notifications;
CREATE POLICY "super_admin_manage_notifications"
  ON public.admin_notifications FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin'
  ));


-- ================================================================
-- SECTION 4: FUNCTIONS & TRIGGERS
-- ================================================================

-- Auto-create user profile and wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, phone, role, referral_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    UPPER(SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT), 1, 8))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_wallets_updated_at ON public.wallets;
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_referrals_updated_at ON public.referrals;
CREATE TRIGGER trg_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ================================================================
-- SECTION 5: SUPER ADMIN SETUP
-- ================================================================
-- IMPORTANT: Before running this section:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" and create:
--    Email: gozojoseph122@gmail.com
--    Password: (your chosen password)
-- 3. Then run the UPDATE below to assign super_admin role

UPDATE public.users
SET role = 'super_admin', status = 'active', updated_at = NOW()
WHERE email = 'gozojoseph122@gmail.com';


-- ================================================================
-- SECTION 6: VERIFY SETUP
-- ================================================================

SELECT 'Tables created' AS check, COUNT(*) AS count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'wallets', 'transactions', 'referrals', 'webhook_events', 'admin_notifications');

SELECT 'Setup complete ✅' AS status;


-- ================================================================
-- SECTION 7: SCHEDULED JOB - PROCESS QUEUED ORDERS
-- ================================================================
-- Runs every 5 minutes to fulfill queued orders via pg_cron

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing schedule if any (idempotent)
SELECT cron.unschedule('process-queued-orders') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'process-queued-orders'
);

-- Schedule process-queued-orders to run every 5 minutes
SELECT cron.schedule(
  'process-queued-orders',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://xlsrtcfndfsmcjaoswfq.supabase.co/functions/v1/process-queued-orders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb
  );
  $$
);


-- ============================================
-- SECTION 8: USER NOTIFICATIONS
-- In-app notification system for users and admins
-- ============================================

-- User notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'order_delivered', 'order_failed', 'order_queued', 'order_expired',
        'refund_initiated', 'refund_completed',
        'low_balance', 'fulfillment_failed', 'system'
    )),
    title TEXT NOT NULL,
    message TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread 
    ON public.user_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created 
    ON public.user_notifications(user_id, created_at DESC);

-- RLS policies
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
CREATE POLICY "Users can view own notifications" ON public.user_notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;
CREATE POLICY "Users can update own notifications" ON public.user_notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.user_notifications;
CREATE POLICY "Users can delete own notifications" ON public.user_notifications
    FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all notifications" ON public.user_notifications;
CREATE POLICY "Service role can manage all notifications" ON public.user_notifications
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable Supabase Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;
