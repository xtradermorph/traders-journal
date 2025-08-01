import { supabase } from '@/lib/supabase';

export const getTrades = async (filters: any) => {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data;
}; 