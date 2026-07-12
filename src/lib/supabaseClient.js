import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof window !== 'undefined' && window.__SUPABASE_URL__
  ? window.__SUPABASE_URL__
  : (import.meta.env.PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co');

const supabaseAnonKey = typeof window !== 'undefined' && window.__SUPABASE_ANON_KEY__
  ? window.__SUPABASE_ANON_KEY__
  : (import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'implicit',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true
  }
});
