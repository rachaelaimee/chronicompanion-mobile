-- Fix RLS policies for health_entries table
-- Run this in your Supabase SQL Editor

-- 1. Check current policies on health_entries
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'health_entries';

-- 2. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own entries" ON health_entries;
DROP POLICY IF EXISTS "Users can insert their own entries" ON health_entries;
DROP POLICY IF EXISTS "Users can update their own entries" ON health_entries;
DROP POLICY IF EXISTS "Users can delete their own entries" ON health_entries;

-- 3. Create permissive policies for authenticated users
CREATE POLICY "Enable read access for authenticated users" ON health_entries
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Enable insert for authenticated users" ON health_entries
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Enable update for authenticated users" ON health_entries
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Enable delete for authenticated users" ON health_entries
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- 4. Grant necessary permissions
GRANT ALL ON health_entries TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 5. Also fix ai_conversations while we're at it
DROP POLICY IF EXISTS "Allow authenticated users to read their conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Allow authenticated users to insert conversations" ON ai_conversations;

CREATE POLICY "Enable read access for authenticated users" ON ai_conversations
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Enable insert for authenticated users" ON ai_conversations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Grant permissions for ai_conversations too
GRANT ALL ON ai_conversations TO authenticated;

-- 6. Check that policies are created correctly
SELECT 'All RLS policies fixed successfully!' as status;

-- Show updated policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('health_entries', 'ai_conversations')
ORDER BY tablename, policyname;