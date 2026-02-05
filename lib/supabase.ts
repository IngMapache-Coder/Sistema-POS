import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper para manejar errores
export const handleSupabaseError = (error: any, defaultMessage: string) => {
  console.error('Supabase Error:', error);
  throw new Error(error?.message || defaultMessage);
};