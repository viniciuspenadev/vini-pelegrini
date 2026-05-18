import Link from "next/link"
import { redirect, notFound } from "next/navigation"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { getTenantVendedores } from "@/lib/queries"
import { ProjectDetailClient } from "@/components/moveis/project-detail-client"
import { LinkButton } from "@/components/ui/link-button"
import { ChevronLeft, ChevronRight } from "lucide-react"

export default async function ProjetoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect("/auth/signin")

  const { id } = await params
  const tenantId = session.user.tenantId
  const isAdminOrOwner = ["owner", "admin"].includes(session.user.role)

  const [
    { data: project },
    { data: statuses },
    vendedores,
    { data: environments },
    { data: attachments },
  ] = await Promise.all([
    supabaseAdmin
      .from("projects")
      .select(`
        *,
        customers ( id, razao_social, nome_fantasia, kind, telefone, email_financeiro, comprador_whatsapp ),
        profiles!projects_assigned_to_fkey ( id, full_name, email ),
        chat_conversations ( id, subject )
      `)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single(),
    supabaseAdmin
      .from("project_statuses")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("position"),
    isAdminOrOwner ? getTenantVendedores(tenantId) : Promise.resolve([]),
    supabaseAdmin
      .from("project_environments")
      .select("*")
      .eq("project_id", id)
      .eq("tenant_id", tenantId)
      .order("position"),
    supabaseAdmin
      .from("project_attachments")
      .select("id, environment_id, kind, file_name, file_size_bytes, mime_type, storage_path, title, uploaded_by, uploaded_at, profiles!project_attachments_uploaded_by_fkey ( full_name )")
      .eq("project_id", id)
      .eq("tenant_id", tenantId)
      .order("uploaded_at", { ascending: false }),
  ])

  if (!project) notFound()

  return (
    <div className="min-h-full bg-blue-50">
      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center gap-3">
        <LinkButton href="/moveis/projetos" variant="ghost" size="icon" className="h-8 w-8 rounded-lg bg-slate-100 hover:bg-slate-200 shrink-0">
          <ChevronLeft className="size-4 text-slate-600" />
        </LinkButton>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/moveis/projetos" className="text-slate-400 hover:text-slate-600">Projetos</Link>
          <ChevronRight className="size-3.5 text-slate-300" />
          <span className="text-xs font-mono font-semibold text-slate-900">{project.code}</span>
        </div>
      </div>

      <div className="px-6 py-6">
        <ProjectDetailClient
          project={project as any}
          statuses={(statuses ?? []) as any}
          vendedores={vendedores}
          environments={(environments ?? []) as any}
          attachments={(attachments ?? []) as any}
          isAdminOrOwner={isAdminOrOwner}
        />
      </div>
    </div>
  )
}
