-- CORRECTED SQL - Fix RLS policies for health_entries table
-- Clear the editor and run this complete version

-- 1. Drop existing restrictive policies for health_entries
DROP POLICY IF EXISTS "Users can view their own entries" ON health_entries;
DROP POLICY IF EXISTS "Users can insert their own entries" ON health_entries;
DROP POLICY IF EXISTS "Users can update their own entries" ON health_entries;
DROP POLICY IF EXISTS "Users can delete their own entries" ON health_entries;

-- 2. Create permissive policies for health_entries
CREATE POLICY "Enable read access for authenticated users" ON health_entries
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Enable insert for authenticated users" ON health_entries
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Enable update for authenticated users" ON health_entries
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Enable delete for authenticated users" ON health_entries
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- 3. Grant necessary permissions for health_entries
GRANT ALL ON health_entries TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 4. Fix ai_conversations policies too
DROP POLICY IF EXISTS "Allow authenticated users to read their conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Allow authenticated users to insert conversations" ON ai_conversations;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON ai_conversations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON ai_conversations;

CREATE POLICY "Enable read access for authenticated users" ON ai_conversations
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Enable insert for authenticated users" ON ai_conversations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- 5. Grant permissions for ai_conversations
GRANT ALL ON ai_conversations TO authenticated;

-- 6. Success message
SELECT 'All RLS policies fixed successfully!' as status;