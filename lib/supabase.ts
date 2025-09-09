import { createClient } from '@supabase/supabase-js';

// Lazy initialization to avoid build-time environment variable errors
let _supabase: any = null;
let _supabaseAdmin: any = null;

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
};

// Client-side Supabase client (with anon key)
export const getSupabase = () => {
  if (!_supabase) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
};

// Server-side Supabase client (with service key for admin operations)
export const getSupabaseAdmin = () => {
  if (!_supabaseAdmin) {
    const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = getSupabaseConfig();
    _supabaseAdmin = supabaseServiceKey
      ? createClient(supabaseUrl, supabaseServiceKey)
      : createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabaseAdmin;
};

// Maintain backward compatibility with property access
export const supabase = new Proxy({} as any, {
  get: (target, prop) => {
    const client = getSupabase();
    return client[prop];
  }
});

export const supabaseAdmin = new Proxy({} as any, {
  get: (target, prop) => {
    const client = getSupabaseAdmin();
    return client[prop];
  }
});

// Helper function to test connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await getSupabase()
      .from('clauses')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      message: 'Connected to Supabase successfully',
      data 
    };
  } catch (error) {
    console.error('Connection test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}