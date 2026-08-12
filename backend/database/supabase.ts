import { createClient } from '@supabase/supabase-js';

// Safely access process.env for Node.js environments
const nodeEnvUrl = typeof process !== 'undefined' && process.env ? (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) : undefined;
const nodeEnvKey = typeof process !== 'undefined' && process.env ? (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY) : undefined;

// Safely access import.meta.env for Vite browser environments
const viteEnvUrl = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_URL : undefined;
const viteEnvKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env.VITE_SUPABASE_ANON_KEY : undefined;

const supabaseUrl = viteEnvUrl || nodeEnvUrl;
const supabaseAnonKey = viteEnvKey || nodeEnvKey;

export const isSupabaseConfigured = () => !!supabaseUrl && !!supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Database sync will not work.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);
