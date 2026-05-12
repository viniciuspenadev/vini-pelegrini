import { auth } from "@/auth"
import { createSupabaseWithToken } from "@/lib/supabase"

// Uso em Server Components e Server Actions.
// Retorna um cliente Supabase com o JWT do usuário autenticado,
// garantindo que o RLS isole os dados por tenant automaticamente.
export async function db() {
  const session = await auth()
  if (!session?.user?.supabaseToken) {
    throw new Error("Não autenticado")
  }
  return createSupabaseWithToken(session.user.supabaseToken)
}
