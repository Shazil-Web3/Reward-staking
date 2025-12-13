import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY; // Fallback for testing, but warn

// Debugging: Log if variables are missing
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Supabase Config Missing. Defaults will be used.");
}

// Prevent crash by using a safe fallback
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
