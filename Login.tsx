import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

declare global {
  var supabase: any;
  var supabaseAdmin: any;
}

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!globalThis.supabase) {
  globalThis.supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder'
  );
}

if (!globalThis.supabaseAdmin) {
  globalThis.supabaseAdmin = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseServiceRoleKey || 'placeholder',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  );
}

export const supabase = globalThis.supabase;
export const supabaseAdmin = globalThis.supabaseAdmin;
