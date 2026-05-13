"use client"

import { useTransition, useState, useRef } from "react"
import { createCustomer, updateCustomer } from "@/lib/actions/customers"
import { InputField } from "@/components/ui/input-field"
import { MaskedInput } from "@/components/ui/masked-input"
import { CepInput } from "@/components/ui/cep-input"
import { Label } from "@/components/ui/label"
import { LinkButton } from "@/components/ui/link-button"
import {
  Building2, FileText, Phone, Mail, DollarSign,
  CreditCard, MapPin, User, Hash, Truck,
  Clock, Receipt, AlertCircle, Settings2,
} from "lucide-react"
import type { Customer } from "@/types/database"

interface Vendedor { id: string; full_name: string | null; email: string }
interface Props {
  customer?:      Customer
  vendedores?:    Vendedor[]
  canEditStatus?: boolean
}

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]
const CONDICOES      = ["A vista","7 dias","14 dias","21 dias","28 dias","30 dias","45 dias","60 dias"]
const FORMAS_PGTO    = ["PIX","Boleto","TED","Cheque","Duplicata","Cartão de Crédito"]
const REGIMES        = ["Simples Nacional","MEI","Lucro Presumido","Lucro Real"]
const TABELAS_PRECO  = [
  { value: "padrao",   label: "Padrão" },
  { value: "especial", label: "Especial" },
  { value: "atacado",  label: "Atacado" },
]
const STATUS_OPTIONS = [
  { value: "ativo",     label: "Ativo" },
  { value: "inativo",   label: "Inativo" },
  { value: "bloqueado", label: "Bloqueado" },
]

const inputBase = "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-card transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50"

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

function CheckboxField({
  name, label, checked, onChange, hint,
}: {
  name: string; label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
      />
      <div>
        <span className="text-sm text-slate-700 group-hover:text-slate-900 transition-colors font-medium">
          {label}
        </span>
        {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
      </div>
    </label>
  )
}

export function CustomerForm({ customer, vendedores, canEditStatus = false }: Props) {
  const [pending, startTransition] = useTransition()
  const [isentoIE, setIsentoIE]           = useState(customer?.isento_ie ?? false)
  const [contribuinte, setContribuinte]   = useState(customer?.contribuinte_icms ?? false)

  const refLogradouro = useRef<HTMLInputElement>(null)
  const refBairro     = useRef<HTMLInputElement>(null)
  const refCidade     = useRef<HTMLInputElement>(null)
  const refEstado     = useRef<HTMLSelectElement>(null)
  const refIbge       = useRef<HTMLInputElement>(null)

  function handleAddressFill(addr: { logradouro: string; bairro: string; cidade: string; estado: string; ibge: string }) {
    if (refLogradouro.current) refLogradouro.current.value = addr.logradouro
    if (refBairro.current)     refBairro.current.value     = addr.bairro
    if (refCidade.current)     refCidade.current.value     = addr.cidade
    if (refEstado.current)     refEstado.current.value     = addr.estado
    if (refIbge.current)       refIbge.current.value       = addr.ibge
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      if (customer) await updateCustomer(customer.id, fd)
      else await createCustomer(fd)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

      {/* ── 1. Identificação ── */}
      <Section
        title="Identificação"
        icon={<Building2 />}
        hint="Dados cadastrais e regime tributário"
        className="lg:col-span-12"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InputField
            label="Razão Social" name="razao_social" required
            defaultValue={customer?.razao_social}
            leadingIcon={<Building2 />}
            placeholder="Empresa Ltda."
          />
          <InputField
            label="Nome Fantasia" name="nome_fantasia"
            defaultValue={customer?.nome_fantasia ?? ""}
            placeholder="Como é conhecida no mercado"
          />
          <MaskedInput
            mask="cnpj-cpf"
            label="CNPJ / CPF" name="cnpj_cpf" required
            defaultValue={customer?.cnpj_cpf ?? ""}
            leadingIcon={<Hash />}
            placeholder="00.000.000/0001-00"
          />
          <div className="space-y-1.5">
            <Label className="text-slate-700">Inscrição Estadual</Label>
            <InputField
              name="inscricao_estadual"
              defaultValue={customer?.inscricao_estadual ?? ""}
              disabled={isentoIE}
              leadingIcon={<FileText />}
              placeholder="000.000.000.000"
            />
            <CheckboxField
              name="isento_ie"
              label="Isento de IE"
              checked={isentoIE}
              onChange={setIsentoIE}
            />
          </div>
        </div>

        {/* Regime tributário */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-2 border-t border-slate-100">
          <div className="space-y-1.5">
            <Label className="text-slate-700">Regime Tributário</Label>
            <select
              name="regime_tributario"
              defaultValue={customer?.regime_tributario ?? ""}
              className={inputBase}
            >
              <option value="">— Não informado —</option>
              {REGIMES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-2 flex flex-col justify-end pb-1">
            <CheckboxField
              name="contribuinte_icms"
              label="Contribuinte de ICMS"
              checked={contribuinte}
              onChange={setContribuinte}
              hint="Marque se o cliente é contribuinte (tem IE ativa)"
            />
          </div>
        </div>
      </Section>

      {/* ── 2. Endereço ── */}
      <Section
        title="Endereço"
        icon={<MapPin />}
        hint="CEP preenche automaticamente logradouro, bairro, cidade e estado"
        className="lg:col-span-12"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <CepInput
              defaultValue={customer?.cep ?? ""}
              onAddressFill={handleAddressFill}
            />
          </div>
          <div className="sm:col-span-4">
            <InputField
              label="Logradouro" name="logradouro"
              defaultValue={customer?.logradouro ?? ""}
              placeholder="Rua, Av., Rodovia..."
              ref={refLogradouro}
            />
          </div>
          <div className="sm:col-span-1">
            <InputField label="Número" name="numero" defaultValue={customer?.numero ?? ""} placeholder="100" />
          </div>
          <div className="sm:col-span-2">
            <InputField label="Complemento" name="complemento" defaultValue={customer?.complemento ?? ""} placeholder="Galpão, Sala..." />
          </div>
          <div className="sm:col-span-3">
            <InputField
              label="Bairro" name="bairro"
              defaultValue={customer?.bairro ?? ""}
              placeholder="Centro"
              ref={refBairro}
            />
          </div>
          <div className="sm:col-span-4">
            <InputField
              label="Cidade" name="cidade"
              defaultValue={customer?.cidade ?? ""}
              placeholder="São Paulo"
              ref={refCidade}
            />
          </div>
          <div className="sm:col-span-2">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Estado</Label>
              <select
                name="estado"
                defaultValue={customer?.estado ?? ""}
                className={inputBase}
                ref={refEstado}
              >
                <option value="">—</option>
                {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>

          {/* Código IBGE (fiscal) */}
          <div className="sm:col-span-6">
            <div className="space-y-1.5">
              <Label className="text-slate-700">
                Código IBGE do Município <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <input
                  type="text"
                  name="codigo_ibge"
                  defaultValue={customer?.codigo_ibge ?? ""}
                  ref={refIbge}
                  readOnly
                  className={`${inputBase} bg-slate-50 font-mono text-slate-600 cursor-not-allowed max-w-[200px]`}
                  placeholder="Preencha o CEP"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Preenchido automaticamente pelo CEP — obrigatório para emissão de NF-e.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── 3. Entrega & Logística ── */}
      <Section
        title="Entrega & Logística"
        icon={<Truck />}
        hint="Informações para o time de separação e motoristas"
        className="lg:col-span-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InputField
            label="Rota de Entrega" name="rota_entrega"
            defaultValue={customer?.rota_entrega ?? ""}
            leadingIcon={<Truck />}
            placeholder="Ex: Zona Sul – Terça e Quinta"
          />
          <InputField
            label="Janela de Entrega" name="janela_entrega"
            defaultValue={customer?.janela_entrega ?? ""}
            leadingIcon={<Clock />}
            placeholder="Ex: 8h–12h, Após 14h"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-slate-700">Instruções para o Motorista</Label>
          <textarea
            name="instrucoes_entrega"
            defaultValue={customer?.instrucoes_entrega ?? ""}
            rows={2}
            className={`${inputBase} h-auto resize-none py-2`}
            placeholder="Ex: Entrar pelo portão lateral, ligar 30 min antes, solicitar Marcos no recebimento..."
          />
        </div>
      </Section>

      {/* ── 4. Contatos ── */}
      <Section
        title="Contatos"
        icon={<Phone />}
        hint="Telefones e e-mails da empresa e do responsável pela compra"
        className="lg:col-span-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MaskedInput
            mask="phone"
            label="Telefone Principal" name="telefone"
            defaultValue={customer?.telefone ?? ""}
            leadingIcon={<Phone />}
            placeholder="(11) 3333-4444"
          />
          <InputField
            label="Comprador / Responsável" name="comprador_nome"
            defaultValue={customer?.comprador_nome ?? ""}
            leadingIcon={<User />}
            placeholder="Nome do contato"
          />
          <MaskedInput
            mask="phone"
            label="WhatsApp do Comprador" name="comprador_whatsapp"
            defaultValue={customer?.comprador_whatsapp ?? ""}
            leadingIcon={<Phone />}
            placeholder="(11) 99999-9999"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
          <InputField
            label="E-mail Financeiro" name="email_financeiro" type="email"
            defaultValue={customer?.email_financeiro ?? ""}
            leadingIcon={<Mail />}
            placeholder="financeiro@empresa.com"
          />
          <div className="space-y-1.5">
            <InputField
              label="E-mail para NF-e" name="email_nfe" type="email"
              defaultValue={customer?.email_nfe ?? ""}
              leadingIcon={<Receipt />}
              placeholder="nfe@empresa.com"
            />
            <p className="text-[11px] text-slate-400">
              Se diferente do e-mail financeiro, a NF-e será enviada para este endereço.
            </p>
          </div>
        </div>
      </Section>

      {/* ── 5. Dados Comerciais ── */}
      <Section
        title="Dados Comerciais"
        icon={<DollarSign />}
        hint="Condições de venda, crédito e vendedor responsável"
        className="lg:col-span-12"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-slate-700">Tabela de Preço</Label>
            <select name="tabela_preco" defaultValue={customer?.tabela_preco ?? "padrao"} className={inputBase}>
              {TABELAS_PRECO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Condição de Pagamento</Label>
            <select name="condicao_pagamento" defaultValue={customer?.condicao_pagamento ?? "A vista"} className={inputBase}>
              {CONDICOES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-700">Forma de Pagamento</Label>
            <select name="forma_pagamento" defaultValue={customer?.forma_pagamento ?? ""} className={inputBase}>
              <option value="">— Não definida —</option>
              {FORMAS_PGTO.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MaskedInput
            mask="currency"
            label="Limite de Crédito" name="limite_credito"
            defaultValue={customer?.limite_credito ? String(customer.limite_credito) : "0"}
            leadingIcon={<CreditCard />}
            prefix="R$"
          />
          <div className="space-y-1.5">
            <Label className="text-slate-700">Desconto Padrão</Label>
            <div className="relative flex items-center">
              <input
                type="number" name="desconto_padrao"
                min="0" max="100" step="0.5"
                defaultValue={customer?.desconto_padrao ?? 0}
                className={`${inputBase} pr-8`}
              />
              <span className="absolute right-3 text-sm text-slate-400 pointer-events-none">%</span>
            </div>
            <p className="text-[11px] text-slate-400">Aplicado automaticamente nos pedidos.</p>
          </div>
          {vendedores && vendedores.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-slate-700">Vendedor Responsável</Label>
              <select name="vendedor_id" defaultValue={customer?.vendedor_id ?? ""} className={inputBase}>
                <option value="">— Sem responsável —</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.full_name ?? v.email}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Section>

      {/* ── 6. Situação & Observações ── */}
      <Section
        title="Situação & Observações"
        icon={<Settings2 />}
        className="lg:col-span-12"
      >
        {canEditStatus && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Status do Cliente</Label>
              <select name="status" defaultValue={customer?.status ?? "ativo"} className={inputBase}>
                {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {customer?.status === "bloqueado" && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 sm:self-end sm:mb-0.5">
                <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
                <span>Cliente bloqueado não recebe novos pedidos.</span>
              </div>
            )}
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-slate-700">Observações Internas</Label>
          <textarea
            name="observacoes"
            defaultValue={customer?.observacoes ?? ""}
            rows={3}
            className={`${inputBase} h-auto resize-none py-2`}
            placeholder="Informações relevantes para a equipe sobre este cliente..."
          />
        </div>
      </Section>

      </div>

      {/* ── Ações ── */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-6">
        <LinkButton
          href={customer ? `/clientes/${customer.id}` : "/clientes"}
          className="h-9 px-4 text-sm bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg"
        >
          Cancelar
        </LinkButton>
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
        >
          {pending ? "Salvando..." : customer ? "Salvar alterações" : "Cadastrar cliente"}
        </button>
      </div>

    </form>
  )
}
