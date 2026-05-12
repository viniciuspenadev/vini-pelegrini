import { SignJWT } from "jose"

// Gera um JWT Supabase customizado com claims do usuário/tenant.
// Esse token é enviado ao PostgREST para aplicar as políticas RLS.
export async function generateSupabaseToken(params: {
  userId: string
  tenantId: string
  role: string
}) {
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)

  return new SignJWT({
    sub: params.userId,
    role: "authenticated",
    app_tenant_id: params.tenantId,
    app_role: params.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret)
}
