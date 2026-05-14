"use client"

import { useTransition } from "react"
import { createBankAccount, updateBankAccount } from "@/lib/actions/financial"
import { InputField } from "@/components/ui/input-field"
import { MaskedInput } from "@/components/ui/masked-input"
import { Label } from "@/components/ui/label"
import { LinkButton } from "@/components/ui/link-button"
import { CreditCard, Building2, Hash, DollarSign, Settings2 } from "lucide-react"
import type { BankAccount } from "@/types/database"

interface Props { account?: BankAccount }

const TYPES = [
  { value: "corrente",         label: "Conta Corrente" },
  { value: "poupanca",         label: "Conta Poupança" },
  { value: "caixa",            label: "Caixa (físico)" },
  { value: "pix",              label: "Conta PIX" },
  { value: "carteira_digital", label: "Carteira Digital" },
  { value: "outros",           label: "Outros" },
]

const inputBase = "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-card transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

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

export function BankAccountForm({ account }: Props) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (account) await updateBankAccount(account.id, fd)
      else await createBankAccount(fd)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Identificação */}
        <Section title="Identificação" icon={<CreditCard />} hint="Nome de exibição e tipo de conta" className="lg:col-span-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Nome da conta" name="name" required
              defaultValue={account?.name ?? ""}
              leadingIcon={<CreditCard />}
              placeholder="Itaú PJ, Caixa Loja 1, PIX Inter..."
              hint="Como aparece nas listagens"
            />
            <div className="space-y-1.5">
              <Label className="text-slate-700">Tipo <span className="text-red-500">*</span></Label>
              <select
                name="type"
                defaultValue={account?.type ?? "corrente"}
                className={inputBase}
                required
              >
                {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
        </Section>

        {/* Saldo inicial */}
        <Section title="Saldo" icon={<DollarSign />} className="lg:col-span-5">
          {account ? (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Saldo atual</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">
                {Number(account.current_balance).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <p className="text-[11px] text-slate-400">Saldo inicial: {Number(account.initial_balance).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
            </div>
          ) : (
            <MaskedInput
              mask="currency"
              label="Saldo inicial" name="initial_balance"
              defaultValue="0"
              leadingIcon={<DollarSign />}
              prefix="R$"
              hint="Quanto já existe na conta hoje"
            />
          )}
        </Section>

        {/* Dados bancários (opcional) */}
        <Section title="Dados bancários" icon={<Building2 />} hint="Opcional — preencha para contas reais (não-caixa)" className="lg:col-span-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <InputField
                label="Nome do banco" name="bank_name"
                defaultValue={account?.bank_name ?? ""}
                leadingIcon={<Building2 />}
                placeholder="Itaú, Bradesco, Inter..."
              />
            </div>
            <InputField
              label="Código Compe" name="bank_code"
              defaultValue={account?.bank_code ?? ""}
              leadingIcon={<Hash />}
              placeholder="341"
              maxLength={4}
            />
            <InputField
              label="Agência" name="agency"
              defaultValue={account?.agency ?? ""}
              placeholder="0001"
            />
          </div>
          <InputField
            label="Número da conta" name="account_number"
            defaultValue={account?.account_number ?? ""}
            placeholder="12345-6"
          />
        </Section>

        {/* Status — apenas em edição */}
        {account && (
          <Section title="Status" icon={<Settings2 />} className="lg:col-span-12">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={account.active}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Conta ativa</p>
                <p className="text-xs text-slate-400">Contas inativas não aparecem nos formulários de movimentação</p>
              </div>
            </label>
          </Section>
        )}

      </div>

      <div className="flex items-center justify-end gap-3 pt-2 pb-6">
        <LinkButton
          href="/financeiro/contas"
          className="h-9 px-4 text-sm bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg"
        >
          Cancelar
        </LinkButton>
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {pending ? "Salvando..." : account ? "Salvar alterações" : "Cadastrar conta"}
        </button>
      </div>
    </form>
  )
}
