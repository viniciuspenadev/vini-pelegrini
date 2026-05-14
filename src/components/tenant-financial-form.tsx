"use client"

import { useTransition, useState } from "react"
import { saveFinancialConfig } from "@/lib/actions/financial"
import { InputField } from "@/components/ui/input-field"
import { Label } from "@/components/ui/label"
import {
  Zap, CreditCard, Calendar, Settings2, Loader2, CheckCircle2,
} from "lucide-react"
import type { TenantFinancialConfig, BankAccount } from "@/types/database"

interface Props {
  config:       TenantFinancialConfig | null
  bankAccounts: Pick<BankAccount, "id" | "name">[]
}

const TRIGGER_STATUSES = [
  { value: "recebido",               label: "Recebido" },
  { value: "em_separacao",           label: "Em Separação" },
  { value: "aguardando_faturamento", label: "Aguardando Faturamento" },
  { value: "faturado",               label: "Faturado (recomendado)" },
  { value: "em_rota",                label: "Em Rota" },
  { value: "entregue",               label: "Entregue" },
]

const PAYMENT_METHODS = [
  { value: "pix",            label: "PIX" },
  { value: "boleto",         label: "Boleto" },
  { value: "transferencia",  label: "Transferência" },
  { value: "dinheiro",       label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito",  label: "Cartão de Débito" },
  { value: "outros",         label: "Outros" },
]

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

const inputBase = "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-card transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

function Section({
  title, icon, children, hint, className = "",
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; hint?: string; className?: string
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <span className="size-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-blue-600 [&_svg]:size-3.5">
          {icon}
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

export function TenantFinancialForm({ config, bankAccounts }: Props) {
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [autoGen, setAutoGen] = useState(config?.auto_generate_receivables ?? true)
  const [showDre, setShowDre] = useState(config?.show_dre ?? true)

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaved(false)
    startTransition(async () => {
      await saveFinancialConfig(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Auto-geração */}
        <Section
          title="Geração automática de recebimentos"
          icon={<Zap />}
          hint="Quando um pedido muda de status, gera recebimentos automaticamente"
          className="lg:col-span-7"
        >
          <label className="flex items-start gap-3 cursor-pointer p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <div className="relative shrink-0 mt-0.5">
              <input
                type="checkbox"
                name="auto_generate_receivables"
                checked={autoGen}
                onChange={(e) => setAutoGen(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">Ativar geração automática</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Pedidos geram recebimentos no banco quando atingem o status escolhido. A condição de pagamento do cliente define se será 1 recebimento ou parcelas.
              </p>
            </div>
          </label>

          {autoGen && (
            <div className="space-y-1.5 pt-2">
              <Label className="text-slate-700">Status que dispara a geração</Label>
              <select
                name="trigger_status"
                defaultValue={config?.trigger_status ?? "faturado"}
                className={inputBase}
              >
                {TRIGGER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Recomendado: <code className="font-mono">faturado</code> (após NF-e emitida)
              </p>
            </div>
          )}
        </Section>

        {/* Defaults */}
        <Section
          title="Padrões"
          icon={<CreditCard />}
          hint="Valores sugeridos automaticamente em novos lançamentos"
          className="lg:col-span-5"
        >
          <div className="space-y-1.5">
            <Label className="text-slate-700">Conta bancária padrão</Label>
            <select
              name="default_bank_account_id"
              defaultValue={config?.default_bank_account_id ?? ""}
              className={inputBase}
            >
              <option value="">— Não definida —</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {bankAccounts.length === 0 && (
              <p className="text-[11px] text-amber-600">
                Nenhuma conta cadastrada. <a href="/financeiro/contas/nova" className="font-semibold underline">Criar primeira conta</a>.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Forma de pagamento padrão</Label>
            <select
              name="default_payment_method"
              defaultValue={config?.default_payment_method ?? "boleto"}
              className={inputBase}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </Section>

        {/* DRE */}
        <Section
          title="DRE & Ano Fiscal"
          icon={<Calendar />}
          hint="Configurações de demonstrativo financeiro"
          className="lg:col-span-12"
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative shrink-0">
              <input
                type="checkbox"
                name="show_dre"
                checked={showDre}
                onChange={(e) => setShowDre(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Exibir DRE no Fluxo de Caixa</p>
              <p className="text-xs text-slate-400">Mostra agrupamento por categoria no relatório</p>
            </div>
          </label>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Início do ano fiscal</Label>
              <select
                name="fiscal_year_start_month"
                defaultValue={config?.fiscal_year_start_month != null ? String(config.fiscal_year_start_month) : "1"}
                className={inputBase}
              >
                {MONTHS.map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">Geralmente Janeiro</p>
            </div>
          </div>
        </Section>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 pb-6">
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <CheckCircle2 className="size-4" /> Configurações salvas
          </span>
        )}
        <button
          type="submit"
          disabled={pending}
          className="ml-auto h-10 px-6 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          {pending ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </form>
  )
}
