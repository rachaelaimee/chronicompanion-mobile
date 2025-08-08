-- Premium Subscriptions Table for ChroniCompanion
-- This table tracks user premium subscriptions across platforms

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription_id TEXT, -- Stripe subscription ID or Google Play order ID
    platform TEXT NOT NULL CHECK (platform IN ('stripe', 'google', 'manual')), -- Payment platform
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')), -- Subscription status
    plan TEXT NOT NULL CHECK (plan IN ('premium')), -- Plan type (extensible for future plans)
    expires_at TIMESTAMP WITH TIME ZONE, -- When subscription expires (NULL for active recurring)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_platform ON user_subscriptions(platform);

-- Enable Row Level Security (RLS)
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own subscriptions (for manual upgrades)
CREATE POLICY "Users can insert own subscriptions" ON user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only service role can update subscriptions (webhook updates)
CREATE POLICY "Service role can update subscriptions" ON user_subscriptions
    FOR UPDATE USING (auth.role() = 'service_role');

-- Only service role can delete subscriptions (for cleanup)
CREATE POLICY "Service role can delete subscriptions" ON user_subscriptions
    FOR DELETE USING (auth.role() = 'service_role');

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_subscriptions_updated_at 
    BEFORE UPDATE ON user_subscriptions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON user_subscriptions TO authenticated;
GRANT ALL ON user_subscriptions TO service_role;

-- Insert a test premium subscription for development (replace with your user ID)
-- You can find your user ID in Supabase Auth > Users
-- INSERT INTO user_subscriptions (user_id, platform, status, plan) 
-- VALUES ('your-user-id-here', 'manual', 'active', 'premium');

COMMENT ON TABLE user_subscriptions IS 'Tracks premium subscriptions across Stripe and Google Play';
COMMENT ON COLUMN user_subscriptions.subscription_id IS 'External subscription ID from payment provider';
COMMENT ON COLUMN user_subscriptions.platform IS 'Payment platform: stripe, google, or manual';
COMMENT ON COLUMN user_subscriptions.status IS 'Subscription status: active, cancelled, expired, past_due';
COMMENT ON COLUMN user_subscriptions.expires_at IS 'Expiration date for non-recurring subscriptions';