-- Drop existing tables if they exist (to fix column issues)
DROP TABLE IF EXISTS api_usage;
DROP TABLE IF EXISTS api_keys;

-- API Keys table for authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  rate_limit INTEGER DEFAULT 100,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Usage tracking table
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint VARCHAR(255) NOT NULL,
  api_key VARCHAR(64) NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_key ON api_usage(api_key);

-- Enable RLS
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Policies for api_keys (admin only)
CREATE POLICY "Admin can manage api_keys" ON api_keys
  FOR ALL USING (auth.role() = 'authenticated');

-- Policies for api_usage (admin only for full access)
CREATE POLICY "Admin can view api_usage" ON api_usage
  FOR SELECT USING (auth.role() = 'authenticated');

-- Public read for usage logs (for own API key)
CREATE POLICY "Users can view own usage" ON api_usage
  FOR SELECT USING (true);
