"use client"

import { useTransition } from "react"
import { createProduct, updateProduct } from "@/lib/actions/products"
import { InputField } from "@/components/ui/input-field"
import { MaskedInput } from "@/components/ui/masked-input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { LinkButton } from "@/components/ui/link-button"
import { Package, Hash, Tag, Scale, DollarSign, Thermometer, Clock, Weight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Product } from "@/types/database"

interface Props { product?: Product }

const selectClass = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"

function Section({ title, badge, icon, children }: { title: string; badge?: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border bg-muted/30">
        <span className="text-muted-foreground [&_svg]:size-4">{icon}</span>
        <h2 className="font-semibold text-sm text-foreground">{title}</h2>
        {badge && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary ring-1 ring-primary/20">
            {badge}
          </span>
        )}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

export function ProductForm({ product }: Props) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (product) await updateProduct(product.id, fd)
      else await createProduct(fd)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Dados principais */}
      <Section title="Dados do produto" icon={<Package />}>
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
            <Label>Unidade de Medida <span className="text-destructive">*</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
                <Scale />
              </span>
              <select name="unidade_medida" defaultValue={product?.unidade_medida ?? "kg"} className={cn(selectClass, "pl-9")}>
                <option value="kg">kg</option>
                <option value="un">Unidade</option>
                <option value="cx">Caixa</option>
                <option value="g">Grama</option>
                <option value="lt">Litro</option>
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
              <Label>Status</Label>
              <select name="status" defaultValue={product.status} className={selectClass}>
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          )}
        </div>
      </Section>

      {/* Engine Pescados */}
      <Section title="Especificações Pescados" badge="Engine" icon={<Thermometer />}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo de Conservação</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
                <Thermometer />
              </span>
              <select name="tipo_conservacao" defaultValue={product?.metadata?.tipo_conservacao ?? ""} className={cn(selectClass, "pl-9")}>
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
            defaultValue={product?.metadata?.peso_medio_estimado ? String(product.metadata.peso_medio_estimado) : ""}
            leadingIcon={<Weight />}
            placeholder="2,500"
            hint="Base para valor estimado no pedido"
          />
          <div className="space-y-1.5">
            <Label>Venda por Peso Variável</Label>
            <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-border bg-background px-4 py-2.5 hover:bg-muted/50 transition-colors">
              <div className="relative shrink-0">
                <input
                  type="checkbox" name="venda_peso_variavel"
                  defaultChecked={product?.metadata?.venda_peso_variavel ?? false}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-input rounded-full peer peer-checked:bg-primary transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Ativo</p>
                <p className="text-xs text-muted-foreground">Exige ajuste manual pós-pesagem</p>
              </div>
            </label>
          </div>
        </div>
      </Section>

      {/* Ações */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <LinkButton href="/produtos" variant="outline">Cancelar</LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : product ? "Salvar alterações" : "Cadastrar produto"}
        </Button>
      </div>
    </form>
  )
}
