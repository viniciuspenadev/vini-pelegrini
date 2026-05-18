"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"
import { getPipelineTemplate, type PipelineTemplate } from "@/lib/marketing/default-pipelines"

async function requireSession() {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")
  return session
}

async function requireAdmin() {
  const session = await requireSession()
  if (!["owner", "admin"].includes(session.user.role)) throw new Error("Sem permissão")
  return session
}

// ═══════════════════════════════════════════════════════════════
// Bootstrap — primeiro acesso cria pipeline padrão do segmento
// ═══════════════════════════════════════════════════════════════
export async function ensurePipelineBootstrap(tenantId: string, segment: string | null, createdBy?: string) {
  const { count } = await supabaseAdmin
    .from("pipelines")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)

  if ((count ?? 0) > 0) return

  const template: PipelineTemplate = getPipelineTemplate(segment)

  const { data: pipeline, error: pErr } = await supabaseAdmin
    .from("pipelines")
    .insert({
      tenant_id:   tenantId,
      name:        template.name,
      description: template.description,
      color:       template.color,
      is_default:  true,
      position:    0,
      active:      true,
      created_by:  createdBy ?? null,
    })
    .select("id")
    .single()

  if (pErr || !pipeline) throw new Error(pErr?.message ?? "Erro criando pipeline padrão")

  const stages = template.stages.map((s, i) => ({
    pipeline_id:     pipeline.id,
    tenant_id:       tenantId,
    name:            s.name,
    color:           s.color,
    position:        s.is_triage ? -1 : i,   // triagem fica antes do funil real
    probability_pct: s.probability_pct,
    is_won:          s.is_won    ?? false,
    is_lost:         s.is_lost   ?? false,
    is_triage:       s.is_triage ?? false,
    show_in_kanban:  s.show_in_kanban ?? !(s.is_triage ?? false),
  }))

  await supabaseAdmin.from("pipeline_stages").insert(stages)

  await supabaseAdmin
    .from("tenant_marketing_config")
    .upsert({ tenant_id: tenantId, default_pipeline_id: pipeline.id }, { onConflict: "tenant_id" })
}

// ═══════════════════════════════════════════════════════════════
// CRUD Pipelines (funis)
// ═══════════════════════════════════════════════════════════════
export async function createPipeline(name: string, description?: string, color?: string) {
  const session = await requireAdmin()

  // próxima posição
  const { data: last } = await supabaseAdmin
    .from("pipelines")
    .select("position")
    .eq("tenant_id", session.user.tenantId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabaseAdmin
    .from("pipelines")
    .insert({
      tenant_id:   session.user.tenantId,
      name:        name.trim(),
      description: description?.trim() || null,
      color:       color || "#3B82F6",
      position:    (last?.position ?? -1) + 1,
      created_by:  session.user.id,
    })
    .select("id")
    .single()

  if (error || !data) throw new Error(error?.message ?? "Erro ao criar")
  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing/pipeline/configuracao")
  return { id: data.id }
}

export async function updatePipeline(id: string, data: Partial<{ name: string; description: string | null; color: string }>) {
  const session = await requireAdmin()

  const { error } = await supabaseAdmin
    .from("pipelines")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)
  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing/pipeline/configuracao")
}

export async function deletePipeline(id: string) {
  const session = await requireAdmin()

  // Verifica se é o default
  const { data: p } = await supabaseAdmin
    .from("pipelines")
    .select("is_default")
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (p?.is_default) throw new Error("Não é possível excluir o funil padrão. Defina outro como padrão antes.")

  // Verifica se tem conversas vinculadas
  const { count } = await supabaseAdmin
    .from("chat_conversations")
    .select("id", { count: "exact", head: true })
    .eq("pipeline_id", id)

  if ((count ?? 0) > 0) {
    throw new Error(`Funil tem ${count} conversa(s) vinculada(s). Mova-as para outro funil antes.`)
  }

  await supabaseAdmin.from("pipelines").delete().eq("id", id).eq("tenant_id", session.user.tenantId)

  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing/pipeline/configuracao")
}

export async function setDefaultPipeline(id: string) {
  const session = await requireAdmin()

  // Tira o flag de todos
  await supabaseAdmin
    .from("pipelines")
    .update({ is_default: false })
    .eq("tenant_id", session.user.tenantId)

  // Marca o novo
  await supabaseAdmin
    .from("pipelines")
    .update({ is_default: true })
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  // Atualiza config
  await supabaseAdmin
    .from("tenant_marketing_config")
    .upsert({ tenant_id: session.user.tenantId, default_pipeline_id: id }, { onConflict: "tenant_id" })

  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing/pipeline/configuracao")
}

// ═══════════════════════════════════════════════════════════════
// CRUD Stages
// ═══════════════════════════════════════════════════════════════
export async function createStage(pipelineId: string, data: { name: string; color?: string; probability_pct?: number; is_won?: boolean; is_lost?: boolean; show_in_kanban?: boolean }) {
  const session = await requireAdmin()

  const { data: last } = await supabaseAdmin
    .from("pipeline_stages")
    .select("position")
    .eq("pipeline_id", pipelineId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabaseAdmin.from("pipeline_stages").insert({
    pipeline_id:     pipelineId,
    tenant_id:       session.user.tenantId,
    name:            data.name.trim(),
    color:           data.color ?? "#94A3B8",
    position:        (last?.position ?? -1) + 1,
    probability_pct: data.probability_pct ?? 50,
    is_won:          data.is_won ?? false,
    is_lost:         data.is_lost ?? false,
    show_in_kanban:  data.show_in_kanban ?? true,
  })

  if (error) throw new Error(error.message)
  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing/pipeline/configuracao")
}

export async function updateStage(id: string, data: Partial<{ name: string; color: string; probability_pct: number; position: number; is_won: boolean; is_lost: boolean; show_in_kanban: boolean }>) {
  const session = await requireAdmin()

  const { error } = await supabaseAdmin
    .from("pipeline_stages")
    .update(data)
    .eq("id", id)
    .eq("tenant_id", session.user.tenantId)

  if (error) throw new Error(error.message)
  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing/pipeline/configuracao")
}

export async function deleteStage(id: string) {
  const session = await requireAdmin()

  const { count } = await supabaseAdmin
    .from("chat_conversations")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", id)
    .eq("tenant_id", session.user.tenantId)

  if ((count ?? 0) > 0) {
    throw new Error(`Estágio tem ${count} conversa(s). Mova-as antes de excluir.`)
  }

  await supabaseAdmin.from("pipeline_stages").delete().eq("id", id).eq("tenant_id", session.user.tenantId)
  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing/pipeline/configuracao")
}

export async function reorderStages(pipelineId: string, orderedIds: string[]) {
  const session = await requireAdmin()

  // Atualiza posição uma por uma (Supabase não tem batch UPDATE com diferentes valores)
  await Promise.all(
    orderedIds.map((id, position) =>
      supabaseAdmin
        .from("pipeline_stages")
        .update({ position })
        .eq("id", id)
        .eq("tenant_id", session.user.tenantId)
        .eq("pipeline_id", pipelineId)
    )
  )

  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing/pipeline/configuracao")
}

// ═══════════════════════════════════════════════════════════════
// Mover conversa entre estágios (drag-and-drop do Kanban)
// ═══════════════════════════════════════════════════════════════
export async function moveConversation(
  conversationId: string,
  newStageId:     string,
  newPosition:    number,
) {
  const session = await requireSession()

  const { data: conv } = await supabaseAdmin
    .from("chat_conversations")
    .select("stage_id, pipeline_id")
    .eq("id", conversationId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!conv) throw new Error("Conversa não encontrada")

  const { data: newStage } = await supabaseAdmin
    .from("pipeline_stages")
    .select("id, pipeline_id, name, is_won, is_lost")
    .eq("id", newStageId)
    .single()

  if (!newStage) throw new Error("Estágio inválido")

  const updates: Record<string, any> = {
    stage_id:      newStageId,
    pipeline_id:   newStage.pipeline_id,
    card_position: newPosition,
    updated_at:    new Date().toISOString(),
  }

  if (newStage.is_won) {
    updates.won_at  = new Date().toISOString()
    updates.lost_at = null
  } else if (newStage.is_lost) {
    updates.lost_at = new Date().toISOString()
    updates.won_at  = null
  } else {
    updates.won_at  = null
    updates.lost_at = null
  }

  await supabaseAdmin
    .from("chat_conversations")
    .update(updates)
    .eq("id", conversationId)
    .eq("tenant_id", session.user.tenantId)

  // Atualiza lifecycle do contato quando o deal é ganho
  if (newStage.is_won) {
    // Busca contact_id da conversa
    const { data: convWithContact } = await supabaseAdmin
      .from("chat_conversations")
      .select("contact_id")
      .eq("id", conversationId)
      .single()

    if (convWithContact?.contact_id) {
      await supabaseAdmin
        .from("chat_contacts")
        .update({
          lifecycle_stage:      "customer",
          lifecycle_changed_at: new Date().toISOString(),
          updated_at:           new Date().toISOString(),
        })
        .eq("id", convWithContact.contact_id)
        .eq("tenant_id", session.user.tenantId)
    }
  }

  // Insere mensagem sistema marcando a transição
  if (conv.stage_id !== newStageId) {
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: conversationId,
      tenant_id:       session.user.tenantId,
      sender_type:     "system",
      content_type:    "text",
      content:         newStage.is_won
        ? `🏆 Negócio ganho! Conversa movida para "${newStage.name}"`
        : newStage.is_lost
        ? `❌ Negócio perdido. Conversa movida para "${newStage.name}"`
        : `Conversa movida para "${newStage.name}"`,
      status:          "delivered",
      is_private_note: false,
    })
  }

  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing")
}

// ═══════════════════════════════════════════════════════════════
// Atualizar dados de "negócio" da conversa
// ═══════════════════════════════════════════════════════════════
export async function updateConversationDealInfo(
  conversationId: string,
  data: {
    pipeline_id?:         string | null
    estimated_value?:     number | null
    expected_close_date?: string | null
    lost_reason?:         string | null
  },
) {
  const session = await requireSession()

  await supabaseAdmin
    .from("chat_conversations")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", conversationId)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing")
}

// ═══════════════════════════════════════════════════════════════
// Marcar conversa como Ganha/Perdida — move pro stage correspondente
// ═══════════════════════════════════════════════════════════════
export async function markConversationWonLost(
  conversationId: string,
  kind:           "won" | "lost",
  reason?:        string,
) {
  const session = await requireSession()

  const { data: conv } = await supabaseAdmin
    .from("chat_conversations")
    .select("pipeline_id")
    .eq("id", conversationId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!conv?.pipeline_id) throw new Error("Conversa sem funil. Atribua a um funil primeiro.")

  // Acha o primeiro estágio is_won/is_lost do mesmo funil
  const { data: target } = await supabaseAdmin
    .from("pipeline_stages")
    .select("id")
    .eq("tenant_id", session.user.tenantId)
    .eq("pipeline_id", conv.pipeline_id)
    .eq(kind === "won" ? "is_won" : "is_lost", true)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!target) throw new Error(`Funil sem estágio marcado como ${kind === "won" ? "Ganho" : "Perdido"}.`)

  await moveConversation(conversationId, target.id, 0)

  if (kind === "lost" && reason) {
    await supabaseAdmin
      .from("chat_conversations")
      .update({ lost_reason: reason })
      .eq("id", conversationId)
      .eq("tenant_id", session.user.tenantId)
  }

  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing")
}

// ═══════════════════════════════════════════════════════════════
// Atribuir conversa a um pipeline (se ainda não tem)
// ═══════════════════════════════════════════════════════════════
export async function assignConversationToPipeline(
  conversationId: string,
  pipelineId:     string,
) {
  const session = await requireSession()

  // Pega o primeiro stage do pipeline
  const { data: firstStage } = await supabaseAdmin
    .from("pipeline_stages")
    .select("id")
    .eq("pipeline_id", pipelineId)
    .eq("tenant_id", session.user.tenantId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!firstStage) throw new Error("Funil sem estágios")

  await supabaseAdmin
    .from("chat_conversations")
    .update({
      pipeline_id:   pipelineId,
      stage_id:      firstStage.id,
      card_position: 0,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", conversationId)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath("/marketing/pipeline")
  revalidatePath("/marketing")
}
