import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente público (browser) — sujeito a RLS com anon key
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Cliente servidor privilegiado — ignora RLS, usar apenas em Server Actions / API Routes
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Cliente servidor com JWT do usuário — respeita RLS com claims do usuário
export function createSupabaseWithToken(supabaseToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${supabaseToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
