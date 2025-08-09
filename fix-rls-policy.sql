-- Fix RLS policy for ai_conversations table
-- Run this in your Supabase SQL Editor

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON ai_conversations;

-- Create more permissive policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON ai_conversations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users" ON ai_conversations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Also allow updates (in case needed later)
CREATE POLICY "Enable update for authenticated users" ON ai_conversations
    FOR UPDATE USING (auth.uid() = user_id);

-- Test the policy by checking if we can query the table
SELECT 'RLS policies updated successfully!' as status;

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'ai_conversations';