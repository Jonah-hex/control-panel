import { createBrowserClient } from '@supabase/ssr'

const FALLBACK_SUPABASE_URL = 'http://127.0.0.1:54321'
const FALLBACK_SUPABASE_ANON_KEY = 'missing-supabase-anon-key'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if ((!supabaseUrl || !supabaseAnonKey) && process.env.NODE_ENV !== 'production') {
    console.warn(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Using fallback values to keep the app running in development.'
    )
  }

  return createBrowserClient(
    supabaseUrl || FALLBACK_SUPABASE_URL,
    supabaseAnonKey || FALLBACK_SUPABASE_ANON_KEY
  )
}