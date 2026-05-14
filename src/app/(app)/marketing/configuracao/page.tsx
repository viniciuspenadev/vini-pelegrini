import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { supabaseAdmin } from "@/lib/supabase"
import { ConfigPageClient } from "./config-client"

export default async function MarketingConfigPage() {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  // Apenas admin/owner
  if (!["owner", "admin"].includes(session.user.role)) {
    redirect("/marketing")
  }

  const tenantId = session.user.tenantId

  // Busca instância existente
  const { data: instance } = await supabaseAdmin
    .from("whatsapp_instances")
    .select("*")
    .eq("tenant_id", tenantId)
    .single()

  // Busca quick replies
  const { data: quickReplies } = await supabaseAdmin
    .from("chat_quick_replies")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("shortcut")

  return (
    <div className="min-h-full bg-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Configuração do WhatsApp
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Conecte e gerencie sua instância do WhatsApp para o módulo de marketing.
        </p>
      </div>

      <div className="px-6 py-6">
        <ConfigPageClient
          instance={instance}
          quickReplies={quickReplies ?? []}
        />
      </div>
    </div>
  )
}
