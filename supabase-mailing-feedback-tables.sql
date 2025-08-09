-- Mailing List and Feedback Tables for ChroniCompanion
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create mailing_list table
CREATE TABLE IF NOT EXISTS mailing_list (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    source TEXT DEFAULT 'unknown', -- premium_settings, footer, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create user_feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    feedback TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    source TEXT DEFAULT 'unknown', -- premium_settings, contact_form, etc.
    is_reviewed BOOLEAN DEFAULT false,
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_mailing_list_email ON mailing_list(email);
CREATE INDEX IF NOT EXISTS idx_mailing_list_active ON mailing_list(is_active);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_submitted ON user_feedback(submitted_at);

-- Enable Row Level Security
ALTER TABLE mailing_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mailing_list
CREATE POLICY "Anyone can subscribe to mailing list" ON mailing_list
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own subscription" ON mailing_list
    FOR SELECT USING (true); -- Public for now, could be restricted later

-- RLS Policies for user_feedback
CREATE POLICY "Anyone can submit feedback" ON user_feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own feedback" ON user_feedback
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Grant permissions
GRANT ALL ON mailing_list TO authenticated;
GRANT ALL ON mailing_list TO anon;
GRANT ALL ON user_feedback TO authenticated;
GRANT ALL ON user_feedback TO anon;

COMMENT ON TABLE mailing_list IS 'Email subscribers for newsletters and updates';
COMMENT ON TABLE user_feedback IS 'User feedback, suggestions, and questions';