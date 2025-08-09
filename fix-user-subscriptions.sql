-- Fix user_subscriptions table to include email for better identification
-- Run this in your Supabase SQL Editor

-- Add email column to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update your existing subscription with your email
UPDATE user_subscriptions 
SET email = 'rachael.huckle@hotmail.com' 
WHERE user_id = '3440ab78-bf51-4c17-af1e-6762c2cdd071';

-- Also add a proper subscription_id (you can get this from your Stripe dashboard)
-- UPDATE user_subscriptions 
-- SET subscription_id = 'sub_XXXXXXXXXX' 
-- WHERE user_id = '3440ab78-bf51-4c17-af1e-6762c2cdd071';

-- Create an index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_email ON user_subscriptions(email);

-- Show the updated record
SELECT * FROM user_subscriptions WHERE user_id = '3440ab78-bf51-4c17-af1e-6762c2cdd071';