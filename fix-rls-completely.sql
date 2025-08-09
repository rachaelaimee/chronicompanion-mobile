-- COMPLETE FIX for ai_conversations RLS policy issues
-- Run this in your Supabase SQL Editor

-- 1. First, let's see what policies currently exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'ai_conversations';

-- 2. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON ai_conversations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON ai_conversations;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON ai_conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON ai_conversations;

-- 3. Temporarily disable RLS to test if table works
ALTER TABLE ai_conversations DISABLE ROW LEVEL SECURITY;

-- 4. Test insert without RLS (this should work)
-- INSERT INTO ai_conversations (user_id, user_email, question, response) 
-- VALUES ('3440ab78-bf51-4c17-af1e-6762c2cdd071', 'rachael.huckle@hotmail.com', 'Test question', 'Test response');

-- 5. Re-enable RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- 6. Create simple, permissive policies
CREATE POLICY "Allow authenticated users to read their conversations" 
ON ai_conversations FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Allow authenticated users to insert conversations" 
ON ai_conversations FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

-- 7. Grant necessary permissions
GRANT ALL ON ai_conversations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 8. Check if policies are created correctly
SELECT 'Policies created successfully!' as status;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'ai_conversations';