-- Create AI Conversations table for ChroniCompanion
-- This table stores AI chat history for persistence across sessions

CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_created_at ON ai_conversations(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own conversations
CREATE POLICY "Users can view own AI conversations" ON ai_conversations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own conversations
CREATE POLICY "Users can insert own AI conversations" ON ai_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own conversations (if needed)
CREATE POLICY "Users can update own AI conversations" ON ai_conversations
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own conversations (if needed)
CREATE POLICY "Users can delete own AI conversations" ON ai_conversations
    FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_conversations_updated_at 
    BEFORE UPDATE ON ai_conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON ai_conversations TO authenticated;
GRANT ALL ON ai_conversations TO service_role;