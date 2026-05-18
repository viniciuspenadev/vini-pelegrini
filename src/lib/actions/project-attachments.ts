"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

const BUCKET = "project-attachments"

async function requireSession() {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")
  return session
}

// ═══════════════════════════════════════════════════════════════
// Upload — recebe FormData com `file`, `kind`, `environment_id` (opt), `title` (opt)
// ═══════════════════════════════════════════════════════════════
export async function uploadProjectAttachment(projectId: string, formData: FormData) {
  const session = await requireSession()

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) throw new Error("Nenhum arquivo enviado")

  const kind          = (formData.get("kind") as string) || "other"
  const environmentId = (formData.get("environment_id") as string) || null
  const title         = (formData.get("title") as string)?.trim() || null

  // Path: tenant/project/[env|geral]/timestamp_filename
  const safeName  = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")
  const envSeg    = environmentId ?? "geral"
  const storagePath = `${session.user.tenantId}/${projectId}/${envSeg}/${Date.now()}_${safeName}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert:      false,
    })
  if (uploadErr) throw new Error(`Storage: ${uploadErr.message}`)

  const { error: dbErr } = await supabaseAdmin.from("project_attachments").insert({
    tenant_id:       session.user.tenantId,
    project_id:      projectId,
    environment_id:  environmentId,
    kind,
    file_name:       file.name,
    file_size_bytes: file.size,
    mime_type:       file.type || null,
    storage_path:    storagePath,
    title,
    uploaded_by:     session.user.id,
  })

  if (dbErr) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath])
    throw new Error(dbErr.message)
  }

  revalidatePath(`/moveis/projetos/${projectId}`)
}

export async function deleteProjectAttachment(attachmentId: string, projectId: string) {
  const session = await requireSession()

  const { data: att } = await supabaseAdmin
    .from("project_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("tenant_id", session.user.tenantId)
    .single()

  if (!att) throw new Error("Anexo não encontrado")

  await supabaseAdmin.storage.from(BUCKET).remove([att.storage_path])

  await supabaseAdmin
    .from("project_attachments")
    .delete()
    .eq("id", attachmentId)
    .eq("tenant_id", session.user.tenantId)

  revalidatePath(`/moveis/projetos/${projectId}`)
}

/** Gera URL assinada de download (válida 5 min) */
export async function getProjectAttachmentSignedUrl(storagePath: string): Promise<string> {
  const session = await requireSession()

  // Defesa em profundidade: caminho começa com tenant_id
  if (!storagePath.startsWith(`${session.user.tenantId}/`)) {
    throw new Error("Acesso negado")
  }

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 300)

  if (error || !data) throw new Error(error?.message ?? "Erro ao gerar URL")
  return data.signedUrl
}
