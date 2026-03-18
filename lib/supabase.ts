import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// TODO: Replace with your Supabase project URL
const supabaseUrl = 'https://nlmtbflnzykjuwqigctt.supabase.co';

// TODO: Replace with your Supabase anon key
const supabaseAnonKey = 'sb_publishable_vJgbsCzLmz8cwrz7QAGNVg_l8VDn2YZ';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});
