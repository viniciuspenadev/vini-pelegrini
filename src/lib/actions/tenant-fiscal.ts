"use server"

import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

const FISCAL_ROLES = ["owner", "admin", "financeiro"]

export async function saveTenantFiscalConfig(formData: FormData) {
  const session = await auth()
  if (!session?.user?.tenantId) throw new Error("Não autenticado")
  if (!FISCAL_ROLES.includes(session.user.role)) {
    throw new Error("Sem permissão para alterar configurações fiscais")
  }

  const txt = (k: string) => (formData.get(k) as string)?.trim() || null
  const int = (k: string) => {
    const v = formData.get(k) as string | null
    if (!v) return null
    const n = parseInt(v, 10)
    return isNaN(n) ? null : n
  }

  // Certificado A1: só atualiza se um novo arquivo foi enviado (base64)
  const certBase64 = (formData.get("certificado_a1") as string | null)?.trim() || null
  const certSenha  = (formData.get("certificado_senha") as string | null)?.trim() || null
  const certValid  = txt("certificado_validade")

  const payload: Record<string, any> = {
    tenant_id:           session.user.tenantId,
    razao_social:        txt("razao_social"),
    nome_fantasia:       txt("nome_fantasia"),
    cnpj:                txt("cnpj"),
    inscricao_estadual:  txt("inscricao_estadual"),
    inscricao_municipal: txt("inscricao_municipal"),
    regime_tributario:   int("regime_tributario"),
    cnae:                txt("cnae"),
    cep:                 txt("cep"),
    logradouro:          txt("logradouro"),
    numero:              txt("numero"),
    complemento:         txt("complemento"),
    bairro:              txt("bairro"),
    cidade:              txt("cidade"),
    estado:              txt("estado"),
    codigo_ibge:         txt("codigo_ibge"),
    telefone:            txt("telefone"),
    email:               txt("email"),
    ambiente:            int("ambiente") ?? 2,
    serie_nfe:           int("serie_nfe") ?? 1,
    proximo_numero_nfe:  int("proximo_numero_nfe") ?? 1,
    natureza_operacao:   txt("natureza_operacao") ?? "Venda de mercadoria",
    provider:            txt("provider"),
    provider_token:      txt("provider_token"),
    updated_at:          new Date().toISOString(),
  }

  // Só sobrescreve certificado se um novo foi fornecido
  if (certBase64) {
    payload.certificado_a1       = certBase64
    payload.certificado_senha    = certSenha
    payload.certificado_validade = certValid
  }

  const { error } = await supabaseAdmin
    .from("tenant_fiscal_config")
    .upsert(payload, { onConflict: "tenant_id" })

  if (error) throw new Error(error.message)

  revalidatePath("/configuracoes/fiscal")
}
