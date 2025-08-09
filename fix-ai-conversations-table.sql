-- Create ai_conversations table for chat history
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ai_conversations table
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    user_email TEXT NOT NULL,
    question TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    session_id TEXT, -- Optional: group conversations by session
    response_time_ms INTEGER -- Track response time for analytics
);

-- Enable Row Level Security
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- Create policies for ai_conversations
CREATE POLICY "Users can view their own conversations" ON ai_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON ai_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_email ON ai_conversations(user_email);

-- Update your subscription_id to be your email
UPDATE user_subscriptions 
SET subscription_id = email 
WHERE user_id = '3440ab78-bf51-4c17-af1e-6762c2cdd071';

-- Show the updated subscription record
SELECT * FROM user_subscriptions WHERE user_id = '3440ab78-bf51-4c17-af1e-6762c2cdd071';

-- Show that ai_conversations table is ready
SELECT 'ai_conversations table created successfully!' as status;