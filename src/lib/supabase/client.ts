import { createClient } from '@supabase/supabase-js'

// We check if the environment variables are available. Since they are public, Next.js handles injecting them.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Provide a better error message if the environment variables are missing during runtime.
if (!supabaseUrl || supabaseUrl === 'https://YOUR_PROJECT_ID.supabase.co') {
  console.warn('⚠️ Missing or placeholder NEXT_PUBLIC_SUPABASE_URL. Please set it in .env.local')
}

if (!supabaseAnonKey || supabaseAnonKey === 'YOUR_ANON_KEY') {
  console.warn('⚠️ Missing or placeholder NEXT_PUBLIC_SUPABASE_ANON_KEY. Please set it in .env.local')
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')
