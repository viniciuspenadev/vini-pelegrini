"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getProjectStatusesTemplate } from "@/lib/moveis/default-project-statuses"

async function requireSession() {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")
  return session
}

/**
 * Garante que o tenant tem ao menos 1 status default. Lazy bootstrap —
 * tenants Móveis antigos (criados antes do módulo) ganham os statuses
 * na primeira vez que /moveis/projetos for acessado.
 */
export async function ensureProjectStatusesBootstrap(tenantId: string, segment: string | null) {
  const { count } = await supabaseAdmin
    .from("project_statuses")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)

  if ((count ?? 0) > 0) return

  const tpl = getProjectStatusesTemplate(segment)
  const rows = tpl.map((s, i) => ({
    tenant_id:    tenantId,
    name:         s.name,
    color:        s.color,
    position:     i,
    is_initial:   s.is_initial   ?? false,
    is_won:       s.is_won       ?? false,
    is_completed: s.is_completed ?? false,
    is_cancelled: s.is_cancelled ?? false,
  }))

  await supabaseAdmin.from("project_statuses").insert(rows)
}

/**
 * Gera o próximo `code` (P-YYYY-NNNN) por tenant/ano.
 * Conta projetos do tenant no ano atual + 1. Risco de race condition
 * mínimo num SaaS com 1-2 vendedores criando projetos simultaneamente.
 */
async function nextProjectCode(tenantId: string): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `P-${year}-`

  const { count } = await supabaseAdmin
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .like("code", `${prefix}%`)

  const seq = String((count ?? 0) + 1).padStart(4, "0")
  return `${prefix}${seq}`
}

// ═══════════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════════
export async function createProject(formData: FormData) {
  const session = await requireSession()
  const tenantId = session.user.tenantId

  const customerId       = formData.get("customer_id")      as string
  const name             = (formData.get("name")            as string)?.trim()
  const conversationId   = (formData.get("conversation_id") as string) || null
  const assignedTo       = (formData.get("assigned_to")     as string) || null
  const designerPartner  = (formData.get("designer_partner") as string)?.trim() || null
  const installCep         = (formData.get("install_cep")         as string)?.trim() || null
  const installLogradouro  = (formData.get("install_logradouro")  as string)?.trim() || null
  const installNumero      = (formData.get("install_numero")      as string)?.trim() || null
  const installComplemento = (formData.get("install_complemento") as string)?.trim() || null
  const installBairro      = (formData.get("install_bairro")      as string)?.trim() || null
  const installCidade      = (formData.get("install_cidade")      as string)?.trim() || null
  const installEstado      = (formData.get("install_estado")      as string)?.trim() || null
  const estimatedValue   = parseFloat((formData.get("estimated_value") as string) || "0")
  const expectedInstall  = (formData.get("expected_install_date") as string) || null
  const notes            = (formData.get("notes")           as string)?.trim() || null

  if (!customerId) throw new Error("Cliente obrigatório")
  if (!name)       throw new Error("Nome do projeto obrigatório")

  // Pega o status inicial do tenant
  const { data: initialStatus } = await supabaseAdmin
    .from("project_statuses")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_initial", true)
    .order("position")
    .limit(1)
    .maybeSingle()

  if (!initialStatus) {
    throw new Error("Tenant sem status inicial configurado. Acesse /moveis/projetos para inicializar.")
  }

  const code = await nextProjectCode(tenantId)

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({
      tenant_id:             tenantId,
      customer_id:           customerId,
      conversation_id:       conversationId,
      status_id:             initialStatus.id,
      code,
      name,
      assigned_to:           assignedTo ?? session.user.id,
      designer_partner:      designerPartner,
      install_cep:           installCep,
      install_logradouro:    installLogradouro,
      install_numero:        installNumero,
      install_complemento:   installComplemento,
      install_bairro:        installBairro,
      install_cidade:        installCidade,
      install_estado:        installEstado,
      estimated_value:       isNaN(estimatedValue) ? 0 : estimatedValue,
      expected_install_date: expectedInstall,
      notes,
      created_by:            session.user.id,
    })
    .select("id")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Erro ao criar projeto")

  revalidatePath("/moveis/projetos")
  redirect(`/moveis/projetos/${data.id}`)
}

// ═══════════════════════════════════════════════════════════════
// UPDATE (campos editáveis no detalhe)
// ═══════════════════════════════════════════════════════════════
export async function updateProject(
  id: string,
  data: Partial<{
    name:                  string
    status_id:             string
    assigned_to:           string | null
    designer_partner:      string | null
    install_cep:           string | null
    install_logradouro:    string | null
    install_numero:        string | null
    install_complemento:   string | null
    install_bairro:        string | null
    install_cidade:        string | null
    install_estado:        string | null
    estimated_value:       number | null
    contracted_value:      number | null
    paid_value:            number
    expected_install_date: string | null
    actual_install_date:   string | null
    notes:                 string | null
  }>
) {
  const session = await requireSession()

  const { error } = await supabaseAdmin
    .from("projects")
    .update(data)
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)

  revalidatePath("/moveis/projetos")
  revalidatePath(`/moveis/projetos/${id}`)
}

// ═══════════════════════════════════════════════════════════════
// CONVERT conversation → project
// ═══════════════════════════════════════════════════════════════
// Chamado quando vendedor arrasta conversa pra stage `is_won` no
// kanban. Cria projeto vinculado à conversa, herdando cliente,
// vendedor e endereço. Conversa é movida pro stage `is_won` e
// marcada como resolved.
export async function convertConversationToProject(
  conversationId: string,
  data: {
    name:                  string
    designer_partner?:     string | null
    estimated_value?:      number | null
    expected_install_date?: string | null
    notes?:                string | null
    // Endereço da obra (default: residencial do cliente)
    install_cep?:          string | null
    install_logradouro?:   string | null
    install_numero?:       string | null
    install_complemento?:  string | null
    install_bairro?:       string | null
    install_cidade?:       string | null
    install_estado?:       string | null
  }
) {
  const session  = await requireSession()
  const tenantId = session.user.tenantId

  // 1) Carrega a conversa + contato + cliente
  const { data: conv } = await supabaseAdmin
    .from("chat_conversations")
    .select(`
      id, pipeline_id, stage_id, assigned_to,
      chat_contacts ( id, customer_id )
    `)
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .single()

  if (!conv) throw new Error("Conversa não encontrada")

  const contact = (conv as any).chat_contacts
  if (!contact?.customer_id) {
    throw new Error("Esta conversa não tem cliente vinculado. Vincule um cliente antes de converter em projeto.")
  }

  // 2) Status inicial do projeto
  const { data: initialStatus } = await supabaseAdmin
    .from("project_statuses")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("is_initial", true)
    .order("position")
    .limit(1)
    .maybeSingle()

  if (!initialStatus) {
    throw new Error("Tenant sem status inicial de projeto configurado.")
  }

  // 3) Stage `is_won` do pipeline da conversa (pra resolver a conversa)
  const { data: wonStage } = await supabaseAdmin
    .from("pipeline_stages")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("pipeline_id", conv.pipeline_id)
    .eq("is_won", true)
    .order("position")
    .limit(1)
    .maybeSingle()

  if (!wonStage) {
    throw new Error("Pipeline sem stage de conversão (is_won) configurado.")
  }

  // 4) Cria o projeto
  const code = await nextProjectCode(tenantId)
  const { data: project, error: pErr } = await supabaseAdmin
    .from("projects")
    .insert({
      tenant_id:             tenantId,
      customer_id:           contact.customer_id,
      conversation_id:       conversationId,
      status_id:             initialStatus.id,
      code,
      name:                  data.name.trim(),
      assigned_to:           conv.assigned_to ?? session.user.id,
      designer_partner:      data.designer_partner?.trim()    || null,
      install_cep:           data.install_cep?.trim()         || null,
      install_logradouro:    data.install_logradouro?.trim()  || null,
      install_numero:        data.install_numero?.trim()      || null,
      install_complemento:   data.install_complemento?.trim() || null,
      install_bairro:        data.install_bairro?.trim()      || null,
      install_cidade:        data.install_cidade?.trim()      || null,
      install_estado:        data.install_estado?.trim()      || null,
      estimated_value:       data.estimated_value ?? 0,
      expected_install_date: data.expected_install_date || null,
      notes:                 data.notes?.trim() || null,
      created_by:            session.user.id,
    })
    .select("id")
    .single()

  if (pErr || !project) throw new Error(pErr?.message ?? "Erro ao criar projeto")

  // 5) Move a conversa pro stage Convertido + marca como resolved
  await supabaseAdmin
    .from("chat_conversations")
    .update({
      stage_id:   wonStage.id,
      status:     "resolved",
      won_at:     new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)

  // 6) Mensagem sistema marcando a conversão
  await supabaseAdmin.from("chat_messages").insert({
    conversation_id: conversationId,
    tenant_id:       tenantId,
    sender_type:     "system",
    content_type:    "text",
    content:         `🏆 Conversa convertida em projeto ${code} — "${data.name.trim()}"`,
    status:          "delivered",
    is_private_note: false,
  })

  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing")
  revalidatePath("/moveis/projetos")

  return { projectId: project.id, code }
}

// ═══════════════════════════════════════════════════════════════
// DELETE — só owner/admin
// ═══════════════════════════════════════════════════════════════
export async function deleteProject(id: string) {
  const session = await requireSession()
  if (!["owner", "admin"].includes(session.user.role)) throw new Error("Sem permissão")

  await supabaseAdmin
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath("/moveis/projetos")
  redirect("/moveis/projetos")
}
