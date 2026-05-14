"use client"

import { useTransition } from "react"
import { createPayable } from "@/lib/actions/financial"
import { InputField } from "@/components/ui/input-field"
import { MaskedInput } from "@/components/ui/masked-input"
import { Label } from "@/components/ui/label"
import { LinkButton } from "@/components/ui/link-button"
import { Building2, DollarSign, Calendar, Receipt, FileText, Tag, Hash } from "lucide-react"

interface Category { id: string; name: string; parent_id: string | null; type: string }

interface Props {
  categories: Category[]
}

const PAYMENT_METHODS = [
  { value: "",                label: "— Não definida —" },
  { value: "pix",             label: "PIX" },
  { value: "boleto",          label: "Boleto" },
  { value: "transferencia",   label: "Transferência" },
  { value: "dinheiro",        label: "Dinheiro" },
  { value: "cartao_credito",  label: "Cartão de Crédito" },
  { value: "cartao_debito",   label: "Cartão de Débito" },
  { value: "cheque",          label: "Cheque" },
  { value: "outros",          label: "Outros" },
]

const DOC_TYPES = [
  { value: "",       label: "— Não informado —" },
  { value: "nfe",    label: "NF-e" },
  { value: "nfse",   label: "NFS-e" },
  { value: "recibo", label: "Recibo" },
  { value: "boleto", label: "Boleto" },
  { value: "outros", label: "Outros" },
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
        <span className="size-7 rounded-lg bg-red-50 flex items-center justify-center shrink-0 text-red-600 [&_svg]:size-3.5">
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

function flattenCategories(cats: Category[]): Array<Category & { depth: number }> {
  const roots = cats.filter((c) => !c.parent_id)
  const result: Array<Category & { depth: number }> = []
  function walk(parent: Category, depth: number) {
    result.push({ ...parent, depth })
    cats.filter((c) => c.parent_id === parent.id).forEach((c) => walk(c, depth + 1))
  }
  roots.forEach((r) => walk(r, 0))
  return result
}

export function PagamentoForm({ categories }: Props) {
  const [pending, startTransition] = useTransition()
  const flatCats = flattenCategories(categories)

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await createPayable(fd)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        <Section title="Pagamento" icon={<Receipt />} hint="Fornecedor e descrição" className="lg:col-span-7">
          <InputField
            label="Descrição" name="description" required
            leadingIcon={<FileText />}
            placeholder="Ex: Conta de energia, aluguel galpão, NF Fornecedor X..."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Fornecedor" name="supplier_name" required
              leadingIcon={<Building2 />}
              placeholder="Nome do fornecedor"
            />
            <InputField
              label="CNPJ/CPF do fornecedor" name="supplier_cnpj"
              leadingIcon={<Hash />}
              placeholder="00.000.000/0000-00"
            />
          </div>
        </Section>

        <Section title="Valor & Vencimento" icon={<DollarSign />} className="lg:col-span-5">
          <MaskedInput
            mask="currency"
            label="Valor" name="amount" required
            leadingIcon={<DollarSign />}
            prefix="R$"
          />
          <div className="space-y-1.5">
            <Label className="text-slate-700">Data de vencimento <span className="text-red-500">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Calendar className="size-4" />
              </span>
              <input
                type="date"
                name="due_date"
                required
                defaultValue={new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]}
                className={`${inputBase} pl-9`}
              />
            </div>
          </div>
        </Section>

        <Section title="Documento & Categorização" icon={<Tag />} hint="Opcional, mas ajuda no controle e DRE" className="lg:col-span-12">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Tipo de documento</Label>
              <select name="document_type" className={inputBase} defaultValue="">
                {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <InputField
              label="Número do documento" name="document_number"
              placeholder="123456"
            />
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-slate-700">Categoria</Label>
              <select name="category_id" className={inputBase} defaultValue="">
                <option value="">— Sem categoria —</option>
                {flatCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {"  ".repeat(c.depth)}{c.depth > 0 ? "↳ " : ""}{c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Forma de pagamento prevista</Label>
              <select name="payment_method" className={inputBase} defaultValue="">
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Observações</Label>
            <textarea
              name="notes"
              rows={2}
              className={`${inputBase} h-auto resize-none py-2`}
              placeholder="Informações internas sobre este pagamento..."
            />
          </div>
        </Section>

      </div>

      <div className="flex items-center justify-end gap-3 pt-2 pb-6">
        <LinkButton
          href="/financeiro/pagamentos"
          className="h-9 px-4 text-sm bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg"
        >
          Cancelar
        </LinkButton>
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-5 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {pending ? "Salvando..." : "Lançar pagamento"}
        </button>
      </div>
    </form>
  )
}
