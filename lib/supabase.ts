import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sdyqmpcmbrtwibuqtzlc.supabase.co';
const supabaseAnonKey = 'sb_publishable_KGUXRer8tdSzLcY9oulJng_S30YuLm4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper para manejar errores
export const handleSupabaseError = (error: any, defaultMessage: string) => {
  console.error('Supabase Error:', error);
  throw new Error(error?.message || defaultMessage);
};