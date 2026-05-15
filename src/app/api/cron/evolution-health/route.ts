import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import * as evo from "@/lib/evolution-api"

// ═══════════════════════════════════════════════════════════════
// Health-check periódico das instâncias WhatsApp.
// Roda via cron externo (crontab do VPS / pg_cron) a cada 15 min:
//   */15 * * * * curl -H "Authorization: Bearer $CRON_SECRET" \
//                     https://seu-dominio.com/api/cron/evolution-health
//
// Lógica:
// - Para cada instância NÃO marcada como user_disconnected:
//   - Chama getInstanceStatus na Evolution
//   - Atualiza status + last_heartbeat_at
//   - Se state=close e reconnect_attempts < 3, tenta reconectar
//   - Se reconnect_attempts >= 3, marca last_error e para
// ═══════════════════════════════════════════════════════════════

const MAX_ATTEMPTS = 3

export async function GET(req: NextRequest) {
  const auth   = req.headers.get("authorization") ?? ""
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET não configurado no servidor." }, { status: 500 })
  }

  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: instances, error } = await supabaseAdmin
    .from("whatsapp_instances")
    .select("id, tenant_id, evolution_url, evolution_key, instance_name, status, reconnect_attempts, user_disconnected, webhook_url")
    .eq("user_disconnected", false)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: Array<{ id: string; tenant_id: string; action: string; status: string; note?: string }> = []

  for (const inst of instances ?? []) {
    const config = {
      url:          inst.evolution_url,
      apiKey:       inst.evolution_key,
      instanceName: inst.instance_name,
    }

    try {
      const statusResult = await evo.getInstanceStatus(config)
      const state        = statusResult.instance?.state

      const statusMap: Record<string, string> = {
        open:       "connected",
        close:      "disconnected",
        connecting: "connecting",
      }
      const newStatus = statusMap[state ?? "close"] ?? "disconnected"
      const now       = new Date().toISOString()

      // Caso 1 — conectado: zera tentativas, registra heartbeat
      if (newStatus === "connected") {
        await supabaseAdmin
          .from("whatsapp_instances")
          .update({
            status:              "connected",
            last_heartbeat_at:   now,
            reconnect_attempts:  0,
            last_error:          null,
            updated_at:          now,
          })
          .eq("id", inst.id)
        results.push({ id: inst.id, tenant_id: inst.tenant_id, action: "ok", status: "connected" })
        continue
      }

      // Caso 2 — conectando: aguarda próximo ciclo
      if (newStatus === "connecting") {
        await supabaseAdmin
          .from("whatsapp_instances")
          .update({ status: "connecting", last_heartbeat_at: now, updated_at: now })
          .eq("id", inst.id)
        results.push({ id: inst.id, tenant_id: inst.tenant_id, action: "waiting", status: "connecting" })
        continue
      }

      // Caso 3 — desconectado: tenta reconectar se ainda há cota
      const attempts = (inst.reconnect_attempts ?? 0) + 1

      if (attempts > MAX_ATTEMPTS) {
        await supabaseAdmin
          .from("whatsapp_instances")
          .update({
            status:             "disconnected",
            last_heartbeat_at:  now,
            last_error:         `Reconexão automática parou após ${MAX_ATTEMPTS} tentativas. Reescaneie o QR Code.`,
            updated_at:         now,
          })
          .eq("id", inst.id)
        results.push({ id: inst.id, tenant_id: inst.tenant_id, action: "gave_up", status: "disconnected" })
        continue
      }

      // Tenta reconectar via getQrCode (que também triggera reconnect se possível)
      try {
        await evo.getQrCode(config)

        // Re-garante webhook (caso a Evolution tenha resetado)
        if (inst.webhook_url) {
          try { await evo.setWebhook(config, inst.webhook_url) } catch { /* silencioso */ }
        }

        await supabaseAdmin
          .from("whatsapp_instances")
          .update({
            status:              "connecting",
            last_heartbeat_at:   now,
            reconnect_attempts:  attempts,
            last_error:          null,
            updated_at:          now,
          })
          .eq("id", inst.id)

        results.push({
          id:        inst.id,
          tenant_id: inst.tenant_id,
          action:    "reconnect_triggered",
          status:    "connecting",
          note:      `tentativa ${attempts}/${MAX_ATTEMPTS}`,
        })
      } catch (reconnectErr) {
        await supabaseAdmin
          .from("whatsapp_instances")
          .update({
            status:              "disconnected",
            last_heartbeat_at:   now,
            reconnect_attempts:  attempts,
            last_error:          `Reconnect falhou: ${(reconnectErr as Error).message}`,
            updated_at:          now,
          })
          .eq("id", inst.id)

        results.push({
          id:        inst.id,
          tenant_id: inst.tenant_id,
          action:    "reconnect_failed",
          status:    "disconnected",
          note:      (reconnectErr as Error).message,
        })
      }
    } catch (checkErr) {
      // Não conseguiu nem chamar a Evolution (URL fora do ar, key inválida, etc)
      await supabaseAdmin
        .from("whatsapp_instances")
        .update({
          last_heartbeat_at: new Date().toISOString(),
          last_error:        `Health check falhou: ${(checkErr as Error).message}`,
          updated_at:        new Date().toISOString(),
        })
        .eq("id", inst.id)

      results.push({
        id:        inst.id,
        tenant_id: inst.tenant_id,
        action:    "health_check_failed",
        status:    inst.status,
        note:      (checkErr as Error).message,
      })
    }
  }

  return NextResponse.json({
    ok:        true,
    checked:   results.length,
    timestamp: new Date().toISOString(),
    results,
  })
}

// POST com mesma lógica — útil pra alguns agendadores que só fazem POST
export async function POST(req: NextRequest) {
  return GET(req)
}
