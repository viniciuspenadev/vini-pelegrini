import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { LinkButton } from "@/components/ui/link-button"
import { ProjectForm } from "@/components/moveis/project-form"
import { getTenantVendedores } from "@/lib/queries"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Props {
  searchParams: Promise<{ customer?: string; conversation?: string }>
}

export default async function NovoProjetoPage({ searchParams }: Props) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  const tenantId       = session.user.tenantId
  const isAdminOrOwner = ["owner", "admin"].includes(session.user.role)

  const { customer: preselectCustomer, conversation: preselectConv } = await searchParams

  const [{ data: customers }, vendedores] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("id, razao_social, nome_fantasia, cnpj_cpf, kind, cep, logradouro, numero, complemento, bairro, cidade, estado")
      .eq("tenant_id", tenantId)
      .eq("status", "ativo")
      .order("razao_social"),
    isAdminOrOwner ? getTenantVendedores(tenantId) : Promise.resolve([]),
  ])

  return (
    <div className="min-h-full bg-blue-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center gap-3">
        <LinkButton href="/moveis/projetos" variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 shrink-0">
          <ChevronLeft className="size-4 text-slate-600" />
        </LinkButton>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-400">Projetos</span>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="font-semibold text-slate-900">Novo projeto</span>
        </div>
      </div>

      <div className="px-6 py-6">
        <ProjectForm
          customers={customers ?? []}
          vendedores={vendedores}
          isAdminOrOwner={isAdminOrOwner}
          preselectCustomerId={preselectCustomer ?? null}
          preselectConversationId={preselectConv ?? null}
        />
      </div>
    </div>
  )
}
