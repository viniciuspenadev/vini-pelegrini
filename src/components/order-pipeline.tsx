"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { advanceOrderStatus, cancelOrder, duplicateOrder } from "@/lib/actions/orders"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, ArrowRight, XCircle, Copy, Lock } from "lucide-react"

const STEPS = [
  { key: "recebido",               label: "Recebido",          shortLabel: "Recebido" },
  { key: "em_separacao",           label: "Em Separação",      shortLabel: "Separação" },
  { key: "aguardando_faturamento", label: "Ag. Faturamento",   shortLabel: "Ag. Fat." },
  { key: "faturado",               label: "Faturado",          shortLabel: "Faturado" },
  { key: "em_rota",                label: "Em Rota",           shortLabel: "Em Rota" },
  { key: "entregue",               label: "Entregue",          shortLabel: "Entregue" },
]

// Ação disponível para avançar DO status atual
const NEXT_ACTION: Record<string, { label: string; roles: string[] }> = {
  recebido: {
    label: "Iniciar Separação",
    roles: ["owner", "admin", "vendedor", "financeiro"],
  },
  // em_separacao é avançado via OrderWeightsForm ("Enviar para Faturamento")
  aguardando_faturamento: {
    label: "Confirmar Faturamento",
    roles: ["owner", "admin", "financeiro"],
  },
  faturado: {
    label: "Saiu para Entrega",
    roles: ["owner", "admin", "financeiro"],
  },
  em_rota: {
    label: "Confirmar Entrega",
    roles: ["owner", "admin", "financeiro"],
  },
}

interface Props {
  orderId:   string
  status:    string
  userRole:  string
  canEdit:   boolean
}

export function OrderPipeline({ orderId, status, userRole, canEdit }: Props) {
  const [pending,   startTransition]  = useTransition()
  const [duplicating, startDuplicate] = useTransition()
  const router = useRouter()

  const currentIndex = STEPS.findIndex((s) => s.key === status)
  const isFinal      = status === "entregue" || status === "cancelado"

  const nextAction   = NEXT_ACTION[status]
  const canAdvance   = nextAction && nextAction.roles.includes(userRole)

  function handleAdvance() {
    startTransition(async () => {
      await advanceOrderStatus(orderId)
      router.refresh()
    })
  }

  function handleCancel() {
    if (!confirm("Cancelar este pedido? Esta ação não pode ser desfeita.")) return
    startTransition(async () => {
      await cancelOrder(orderId)
      router.refresh()
    })
  }

  function handleDuplicate() {
    if (!confirm("Duplicar este pedido? Um novo pedido será criado com os mesmos itens.")) return
    startDuplicate(async () => {
      await duplicateOrder(orderId)
    })
  }

  return (
    <div className="space-y-5">
      {/* Steps visuais */}
      {status === "cancelado" ? (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <XCircle className="size-4 text-red-500" />
          <span className="text-sm font-medium text-red-700">Pedido cancelado</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {STEPS.map((step, idx) => {
            const done      = idx < currentIndex
            const current   = idx === currentIndex
            const isWaiting = step.key === "aguardando_faturamento" && current
            return (
              <div key={step.key} className="flex items-center gap-1 shrink-0">
                <div className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  done      && "bg-green-100 text-green-700",
                  current && !isWaiting && "bg-blue-600 text-white",
                  isWaiting && "bg-amber-100 text-amber-700 ring-1 ring-amber-300",
                  !done && !current && "bg-slate-100 text-slate-500"
                )}>
                  {done
                    ? <CheckCircle2 className="size-3.5" />
                    : <Circle className="size-3.5" />
                  }
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{step.shortLabel}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <ArrowRight className="size-3.5 text-slate-300 shrink-0" />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Aviso para financeiro quando aguardando */}
      {status === "aguardando_faturamento" && (
        <div className="flex items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3">
          <div className="mt-0.5 size-5 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-orange-600">NF</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-900">Aguardando confirmação do faturamento</p>
            <p className="text-xs text-orange-700 mt-0.5">
              A pesagem foi confirmada. O financeiro deve revisar os valores e emitir a Nota Fiscal antes de confirmar.
            </p>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Botão de avançar status — só aparece se a ação existe e o role tem permissão */}
        {canEdit && !isFinal && nextAction && (
          canAdvance ? (
            <Button onClick={handleAdvance} disabled={pending}>
              {pending ? "Processando..." : nextAction.label}
              <ArrowRight className="size-4" />
            </Button>
          ) : (
            /* Exibe bloqueado para roles sem permissão */
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
              <Lock className="size-3.5" />
              {nextAction.label} — requer financeiro/admin
            </div>
          )
        )}

        {/* em_separacao: avançar é pelo form de pesagem */}
        {status === "em_separacao" && !isFinal && (
          <p className="text-xs text-muted-foreground italic">
            ↑ Confirme a pesagem acima para enviar ao faturamento
          </p>
        )}

        <Button
          variant="outline"
          onClick={handleDuplicate}
          disabled={duplicating}
        >
          <Copy className="size-4" />
          {duplicating ? "Duplicando..." : "Duplicar pedido"}
        </Button>

        {canEdit && !isFinal && (
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={pending}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Cancelar pedido
          </Button>
        )}
      </div>
    </div>
  )
}
