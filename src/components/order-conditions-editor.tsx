"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateOrderConditions } from "@/lib/actions/orders"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Pencil, Check, X, Calendar, Clock, MapPin, CreditCard, Truck, MessageSquare } from "lucide-react"

interface Props {
  orderId:           string
  status:            string
  canEdit:           boolean
  deliveryDate?:     string | null
  deliveryTime?:     string | null
  deliveryAddress?:  string | null
  paymentMethod?:    string | null
  paymentCondition?: string | null
  logisticsNotes?:   string | null
  rotaEntrega?:      string | null
}

const DATE_FULL = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  })

const LOCKED = ["cancelado", "entregue"]

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"

function IconWrap({ children, color = "slate" }: { children: React.ReactNode; color?: "slate" | "amber" | "blue" }) {
  const colors = {
    slate: "bg-slate-100 text-slate-500",
    amber: "bg-amber-50 text-amber-600",
    blue:  "bg-blue-50 text-blue-600",
  }
  return (
    <div className={`mt-0.5 rounded-lg p-1.5 shrink-0 ${colors[color]}`}>
      {children}
    </div>
  )
}

export function OrderConditionsEditor({
  orderId, status, canEdit,
  deliveryDate, deliveryTime, deliveryAddress,
  paymentMethod, paymentCondition, logisticsNotes,
  rotaEntrega,
}: Props) {
  const router           = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()

  const [form, setForm] = useState({
    delivery_date:     deliveryDate     ?? "",
    delivery_time:     deliveryTime     ?? "",
    delivery_address:  deliveryAddress  ?? "",
    payment_method:    paymentMethod    ?? "",
    payment_condition: paymentCondition ?? "",
    logistics_notes:   logisticsNotes   ?? "",
  })

  const allowEdit = canEdit && !LOCKED.includes(status)

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))

  function handleSave() {
    start(async () => {
      await updateOrderConditions(orderId, {
        delivery_date:     form.delivery_date     || null,
        delivery_time:     form.delivery_time     || null,
        delivery_address:  form.delivery_address  || null,
        payment_method:    form.payment_method    || null,
        payment_condition: form.payment_condition || null,
        logistics_notes:   form.logistics_notes   || null,
      })
      setEditing(false)
      router.refresh()
    })
  }

  function handleCancel() {
    setForm({
      delivery_date:     deliveryDate     ?? "",
      delivery_time:     deliveryTime     ?? "",
      delivery_address:  deliveryAddress  ?? "",
      payment_method:    paymentMethod    ?? "",
      payment_condition: paymentCondition ?? "",
      logistics_notes:   logisticsNotes   ?? "",
    })
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">Logística</p>
        {allowEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Pencil className="size-3" /> Editar
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={pending} className="h-6 px-2 text-xs gap-1 text-slate-500">
              <X className="size-3" /> Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={pending} className="h-6 px-2 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white border-0">
              <Check className="size-3" /> {pending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">Data de entrega</label>
              <input type="date" value={form.delivery_date} onChange={set("delivery_date")} className={input} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">Hora preferida</label>
              <input type="time" value={form.delivery_time} onChange={set("delivery_time")} className={input} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1 block">Endereço alternativo</label>
            <input type="text" value={form.delivery_address} onChange={set("delivery_address")} placeholder="Endereço de entrega" className={input} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">Forma de pagamento</label>
              <input type="text" value={form.payment_method} onChange={set("payment_method")} placeholder="Ex: PIX, Boleto" className={input} />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 mb-1 block">Condição</label>
              <input type="text" value={form.payment_condition} onChange={set("payment_condition")} placeholder="Ex: 30/60/90" className={input} />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-slate-400 mb-1 block">Notas de operação</label>
            <textarea
              value={form.logistics_notes}
              onChange={set("logistics_notes")}
              rows={3}
              placeholder="Observações de logística..."
              className={cn(input, "resize-none")}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {deliveryDate ? (
            <div className="flex items-start gap-2.5">
              <IconWrap color="blue"><Calendar className="size-3.5" /></IconWrap>
              <div>
                <p className="text-xs text-slate-400">Previsão de entrega</p>
                <p className="text-sm font-semibold text-slate-900 capitalize">{DATE_FULL(deliveryDate)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Sem data agendada</p>
          )}
          {deliveryTime && (
            <div className="flex items-start gap-2.5">
              <IconWrap><Clock className="size-3.5" /></IconWrap>
              <div>
                <p className="text-xs text-slate-400">Hora preferida</p>
                <p className="text-sm font-semibold text-slate-900">{String(deliveryTime).slice(0, 5)}</p>
              </div>
            </div>
          )}
          {deliveryAddress && (
            <div className="flex items-start gap-2.5">
              <IconWrap><MapPin className="size-3.5" /></IconWrap>
              <div>
                <p className="text-xs text-slate-400">Endereço alternativo</p>
                <p className="text-sm font-semibold text-slate-900">{deliveryAddress}</p>
              </div>
            </div>
          )}
          {rotaEntrega && (
            <div className="flex items-start gap-2.5">
              <IconWrap><Truck className="size-3.5" /></IconWrap>
              <div>
                <p className="text-xs text-slate-400">Rota de envio</p>
                <p className="text-sm font-semibold text-slate-900">{rotaEntrega}</p>
              </div>
            </div>
          )}
          {paymentMethod && (
            <div className="flex items-start gap-2.5">
              <IconWrap><CreditCard className="size-3.5" /></IconWrap>
              <div>
                <p className="text-xs text-slate-400">Pagamento</p>
                <p className="text-sm font-semibold text-slate-900">
                  {paymentMethod}{paymentCondition && ` · ${paymentCondition}`}
                </p>
              </div>
            </div>
          )}
          {logisticsNotes && (
            <div className="flex items-start gap-2.5">
              <IconWrap color="amber"><MessageSquare className="size-3.5" /></IconWrap>
              <div>
                <p className="text-xs text-slate-400">Notas de operação</p>
                <p className="text-sm text-slate-700 leading-relaxed">{logisticsNotes}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
