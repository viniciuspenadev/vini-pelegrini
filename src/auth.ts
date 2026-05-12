import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase"
import { generateSupabaseToken } from "@/lib/supabase-token"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },

  pages: {
    signIn: "/auth/signin",
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id, email, full_name, password_hash")
          .eq("email", credentials.email)
          .single()

        if (!profile?.password_hash) return null

        const valid = await bcrypt.compare(
          credentials.password as string,
          profile.password_hash
        )
        if (!valid) return null

        // Busca memberships e status de platform admin em paralelo
        const [{ data: memberships }, { data: platformAdmin }] = await Promise.all([
          supabaseAdmin
            .from("tenant_users")
            .select("tenant_id, role")
            .eq("user_id", profile.id)
            .eq("active", true),
          supabaseAdmin
            .from("platform_admins")
            .select("id")
            .eq("user_id", profile.id)
            .single(),
        ])

        const isPlatformAdmin = !!platformAdmin

        // Precisa ter membership ativa OU ser platform admin
        if ((!memberships || memberships.length === 0) && !isPlatformAdmin) return null

        return {
          id:              profile.id,
          email:           profile.email,
          name:            profile.full_name,
          tenantId:        memberships?.[0]?.tenant_id ?? "",
          role:            memberships?.[0]?.role ?? "",
          isPlatformAdmin,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId          = user.id!
        token.tenantId        = (user as any).tenantId
        token.role            = (user as any).role
        token.isPlatformAdmin = (user as any).isPlatformAdmin ?? false
        token.supabaseTokenExp = 0 // força geração na primeira vez
      }

      // Renova o Supabase token quando expira (margem de 5 min)
      const now = Math.floor(Date.now() / 1000)
      if (!token.supabaseToken || (token.supabaseTokenExp as number) - now < 300) {
        token.supabaseToken = await generateSupabaseToken({
          userId: token.userId as string,
          tenantId: token.tenantId as string,
          role: token.role as string,
        })
        token.supabaseTokenExp = now + 3600
      }

      return token
    },

    async session({ session, token }) {
      session.user.id              = token.userId as string
      session.user.tenantId        = token.tenantId as string
      session.user.role            = token.role as any
      session.user.supabaseToken   = token.supabaseToken as string
      session.user.isPlatformAdmin = token.isPlatformAdmin as boolean
      return session
    },
  },
})
