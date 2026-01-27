import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        "CRITICAL: Supabase URL or Anon Key is missing! \n" +
        "1. Create a file named .env in your root directory. \n" +
        "2. Add: VITE_SUPABASE_URL=your_url \n" +
        "3. Add: VITE_SUPABASE_ANON_KEY=your_key"
    );
}

// Only create the client if we have a URL, otherwise export a dummy or null
export const supabase = (supabaseUrl && supabaseAnonKey)
    ? createClient(supabaseUrl, supabaseAnonKey)
    : (null as any);

