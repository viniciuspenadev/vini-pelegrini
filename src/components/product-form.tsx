"use client"

import { useTransition } from "react"
import { createProduct, updateProduct } from "@/lib/actions/products"
import { InputField } from "@/components/ui/input-field"
import { MaskedInput } from "@/components/ui/masked-input"
import { Label } from "@/components/ui/label"
import { LinkButton } from "@/components/ui/link-button"
import { Package, Hash, Tag, Scale, DollarSign, Thermometer, Clock, Weight, Receipt, Barcode } from "lucide-react"
import type { Product } from "@/types/database"

interface Props {
  product?:          Product
  canEditFiscal?:    boolean
  regimeTributario?: number | null
}

// Regime: 1=Simples, 2=Simples-Excesso, 3=Normal, 4=MEI
const ORIGENS = [
  { value: "0", label: "0 — Nacional" },
  { value: "1", label: "1 — Estrangeira (import. direta)" },
  { value: "2", label: "2 — Estrangeira (mercado interno)" },
  { value: "3", label: "3 — Nacional (cont. import. > 40%)" },
  { value: "4", label: "4 — Nacional (PPB)" },
  { value: "5", label: "5 — Nacional (cont. import. ≤ 40%)" },
  { value: "6", label: "6 — Estrangeira (import. sem similar)" },
  { value: "7", label: "7 — Estrangeira (merc. int. sem similar)" },
  { value: "8", label: "8 — Nacional (cont. import. > 70%)" },
]

const CSOSN_OPTS = [
  { value: "101", label: "101 — Trib. Simples c/ permissão crédito" },
  { value: "102", label: "102 — Trib. Simples s/ permissão crédito" },
  { value: "103", label: "103 — Isenção Simples (faixa receita)" },
  { value: "201", label: "201 — Simples c/ ST e crédito" },
  { value: "202", label: "202 — Simples c/ ST s/ crédito" },
  { value: "203", label: "203 — Isenção Simples c/ ST" },
  { value: "300", label: "300 — Imune" },
  { value: "400", label: "400 — Não tributada Simples" },
  { value: "500", label: "500 — ICMS cobrado anteriormente por ST" },
  { value: "900", label: "900 — Outros" },
]

const CST_OPTS = [
  { value: "00", label: "00 — Tributada integralmente" },
  { value: "10", label: "10 — Tributada c/ ST" },
  { value: "20", label: "20 — Com redução de BC" },
  { value: "30", label: "30 — Isenta/Não tributada c/ ST" },
  { value: "40", label: "40 — Isenta" },
  { value: "41", label: "41 — Não tributada" },
  { value: "50", label: "50 — Suspensão" },
  { value: "51", label: "51 — Diferimento" },
  { value: "60", label: "60 — ICMS cobrado anteriormente por ST" },
  { value: "70", label: "70 — Red. BC c/ ST" },
  { value: "90", label: "90 — Outras" },
]

const CST_PIS_COFINS = [
  { value: "01", label: "01 — Tributável (alíq. normal)" },
  { value: "04", label: "04 — Monofásica (alíq. zero)" },
  { value: "06", label: "06 — Alíquota zero" },
  { value: "07", label: "07 — Isenta" },
  { value: "08", label: "08 — Sem incidência" },
  { value: "09", label: "09 — Com suspensão" },
  { value: "49", label: "49 — Outras saídas" },
  { value: "99", label: "99 — Outras operações" },
]

const inputBase = "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-card transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"

function Section({
  title, badge, icon, children, className = "",
}: {
  title: string; badge?: string; icon: React.ReactNode; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <span className="size-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-blue-600 [&_svg]:size-3.5">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {badge && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-100">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

export function ProductForm({ product, canEditFiscal = false, regimeTributario }: Props) {
  const [pending, startTransition] = useTransition()
  const isSimples = regimeTributario === 1 || regimeTributario === 2 || regimeTributario === 4

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (product) await updateProduct(product.id, fd)
      else await createProduct(fd)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

      {/* Dados principais */}
      <Section title="Dados do produto" icon={<Package />} className="lg:col-span-7">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <InputField
              label="Nome" name="nome" required
              defaultValue={product?.nome}
              leadingIcon={<Package />}
              placeholder="Salmão Norueguês"
            />
          </div>
          <InputField
            label="SKU" name="sku"
            defaultValue={product?.sku ?? ""}
            leadingIcon={<Hash />}
            placeholder="SAL-001"
            hint="Código interno de identificação"
          />
          <InputField
            label="Categoria" name="categoria"
            defaultValue={product?.categoria ?? ""}
            leadingIcon={<Tag />}
            placeholder="Salmão, Camarão, Peixe..."
          />
          <div className="space-y-1.5">
            <Label className="text-slate-700">
              Unidade de Medida <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 [&_svg]:size-4">
                <Scale />
              </span>
              <select
                name="unidade_medida"
                defaultValue={product?.unidade_medida ?? "kg"}
                className={`${inputBase} pl-9`}
              >
                <option value="kg">kg — Quilograma</option>
                <option value="un">un — Unidade</option>
                <option value="cx">cx — Caixa</option>
                <option value="g">g — Grama</option>
                <option value="lt">lt — Litro</option>
              </select>
            </div>
          </div>
          <MaskedInput
            mask="currency"
            label="Preço Base" name="preco_base" required
            defaultValue={product?.preco_base ? String(product.preco_base) : "0"}
            leadingIcon={<DollarSign />}
            prefix="R$"
          />
          {product && (
            <div className="space-y-1.5">
              <Label className="text-slate-700">Status</Label>
              <select name="status" defaultValue={product.status} className={inputBase}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          )}
        </div>
      </Section>

      {/* Engine Pescados */}
      <Section title="Especificações Pescados" badge="Engine" icon={<Thermometer />} className="lg:col-span-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-slate-700">Tipo de Conservação</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 [&_svg]:size-4">
                <Thermometer />
              </span>
              <select
                name="tipo_conservacao"
                defaultValue={product?.metadata?.tipo_conservacao ?? ""}
                className={`${inputBase} pl-9`}
              >
                <option value="">— Selecione —</option>
                <option value="resfriado">Resfriado</option>
                <option value="congelado">Congelado</option>
                <option value="fresco">Fresco</option>
                <option value="salgado">Salgado</option>
              </select>
            </div>
          </div>
          <InputField
            label="Dias de Validade" name="dias_validade"
            type="number" min="1"
            defaultValue={product?.metadata?.dias_validade ?? ""}
            leadingIcon={<Clock />}
            placeholder="7"
            hint="Shelf-life para controle de lote (PEPS)"
          />
          <MaskedInput
            mask="decimal"
            label="Peso Médio Estimado (kg)" name="peso_medio_estimado"
            defaultValue={
              product?.metadata?.peso_medio_estimado
                ? String(product.metadata.peso_medio_estimado)
                : ""
            }
            leadingIcon={<Weight />}
            placeholder="2,500"
            hint="Base para valor estimado no pedido"
          />

          {/* Toggle — venda por peso variável */}
          <div className="space-y-1.5">
            <Label className="text-slate-700">Venda por Peso Variável</Label>
            <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2.5 hover:bg-slate-50 transition-colors">
              <div className="relative shrink-0">
                <input
                  type="checkbox"
                  name="venda_peso_variavel"
                  defaultChecked={product?.metadata?.venda_peso_variavel ?? false}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Ativo</p>
                <p className="text-xs text-slate-400">Exige ajuste manual pós-pesagem</p>
              </div>
            </label>
          </div>
        </div>
      </Section>

      {/* Fiscal — visível apenas para admin/owner/financeiro */}
      {canEditFiscal && (
        <Section title="Fiscal" badge="NF-e" icon={<Receipt />} className="lg:col-span-12">
          {!regimeTributario && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3.5 py-2.5 mb-2 text-xs text-amber-800">
              ⚠ Configure o regime tributário do tenant em <span className="font-mono">/configuracoes/fiscal</span> para
              habilitar a seleção de CST/CSOSN correta. Sem isso, mostramos ambos.
            </div>
          )}

          {/* Classificação fiscal + Origem + CFOP em uma única linha em telas grandes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InputField
              label="NCM" name="ncm" required
              defaultValue={product?.ncm ?? ""}
              leadingIcon={<Hash />}
              placeholder="03044100"
              hint="8 dígitos — Nomenclatura Comum do Mercosul"
              maxLength={8}
            />
            <InputField
              label="CEST" name="cest"
              defaultValue={product?.cest ?? ""}
              leadingIcon={<Hash />}
              placeholder="0000000"
              hint="Se houver ST"
              maxLength={7}
            />
            <div className="space-y-1.5">
              <Label className="text-slate-700">Origem da Mercadoria <span className="text-red-500">*</span></Label>
              <select
                name="origem"
                defaultValue={product?.origem != null ? String(product.origem) : "0"}
                className={inputBase}
              >
                {ORIGENS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <InputField
              label="CFOP Padrão" name="cfop_padrao"
              defaultValue={product?.cfop_padrao ?? ""}
              placeholder="5102"
              hint="5xxx dentro do estado · 6xxx fora"
              maxLength={4}
            />
          </div>

          {/* ICMS — CSOSN ou CST conforme regime */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2 border-t border-slate-100">
            {(isSimples || !regimeTributario) && (
              <div className="space-y-1.5">
                <Label className="text-slate-700">CSOSN (Simples Nacional)</Label>
                <select
                  name="csosn_icms"
                  defaultValue={product?.csosn_icms ?? ""}
                  className={inputBase}
                >
                  <option value="">— Selecione —</option>
                  {CSOSN_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            {(!isSimples || !regimeTributario) && (
              <div className="space-y-1.5">
                <Label className="text-slate-700">CST ICMS (Regime Normal)</Label>
                <select
                  name="cst_icms"
                  defaultValue={product?.cst_icms ?? ""}
                  className={inputBase}
                >
                  <option value="">— Selecione —</option>
                  {CST_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}
            <InputField
              label="Alíquota ICMS (%)" name="aliquota_icms"
              type="number" step="0.01" min="0" max="100"
              defaultValue={product?.aliquota_icms != null ? String(product.aliquota_icms) : ""}
              placeholder="18.00"
              hint="Apenas se aplicável ao CST/CSOSN"
            />
          </div>

          {/* PIS / COFINS */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-slate-100">
            <div className="space-y-1.5">
              <Label className="text-slate-700">CST PIS</Label>
              <select
                name="cst_pis"
                defaultValue={product?.cst_pis ?? "01"}
                className={inputBase}
              >
                {CST_PIS_COFINS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <InputField
              label="Alíq. PIS (%)" name="aliquota_pis"
              type="number" step="0.01" min="0" max="100"
              defaultValue={product?.aliquota_pis != null ? String(product.aliquota_pis) : "1.65"}
              placeholder="1.65"
            />
            <div className="space-y-1.5">
              <Label className="text-slate-700">CST COFINS</Label>
              <select
                name="cst_cofins"
                defaultValue={product?.cst_cofins ?? "01"}
                className={inputBase}
              >
                {CST_PIS_COFINS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <InputField
              label="Alíq. COFINS (%)" name="aliquota_cofins"
              type="number" step="0.01" min="0" max="100"
              defaultValue={product?.aliquota_cofins != null ? String(product.aliquota_cofins) : "7.60"}
              placeholder="7.60"
            />
          </div>

          {/* Código de barras */}
          <div className="pt-2 border-t border-slate-100">
            <div className="max-w-md">
              <InputField
                label="Código de Barras (EAN)" name="ean"
                defaultValue={product?.ean ?? ""}
                leadingIcon={<Barcode />}
                placeholder="7891234567890"
                hint="13 dígitos (EAN-13) — opcional"
                maxLength={14}
              />
            </div>
          </div>
        </Section>
      )}

      </div>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-6">
        <LinkButton
          href="/produtos"
          className="h-9 px-4 text-sm bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg"
        >
          Cancelar
        </LinkButton>
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {pending ? "Salvando..." : product ? "Salvar alterações" : "Cadastrar produto"}
        </button>
      </div>
    </form>
  )
}
