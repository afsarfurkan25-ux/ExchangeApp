import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: "DROP TRIGGER IF EXISTS hash_member_password ON public.members; DROP FUNCTION IF EXISTS hash_password();" })
    console.log('Result:', data, error)
}

test()
