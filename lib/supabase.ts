import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sdyqmpcmbrtwibuqtzlc.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_KGUXRer8tdSzLcY9oulJng_S30YuLm4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper para manejar errores
export const handleSupabaseError = (error: any, defaultMessage: string) => {
  console.error('Supabase Error:', error);
  throw new Error(error?.message || defaultMessage);
};