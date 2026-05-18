"use client"

import { useState, useTransition, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { createProject } from "@/lib/actions/projects"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { InputField } from "@/components/ui/input-field"
import { MaskedInput } from "@/components/ui/masked-input"
import { CepInput } from "@/components/ui/cep-input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, MapPin, DollarSign, Calendar, FileText, User, Building2 } from "lucide-react"

interface Customer {
  id:            string
  razao_social:  string | null
  nome_fantasia: string | null
  cnpj_cpf:      string | null
  kind:          "B2B" | "B2C" | null
  cep:           string | null
  logradouro:    string | null
  numero:        string | null
  complemento:   string | null
  bairro:        string | null
  cidade:        string | null
  estado:        string | null
}

interface Vendedor {
  id:        string
  full_name: string | null
  email:     string
}

interface Props {
  customers:               Customer[]
  vendedores:              Vendedor[]
  isAdminOrOwner:          boolean
  preselectCustomerId:     string | null
  preselectConversationId: string | null
}

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

const inputBase = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

function customerLabel(c: Customer): string {
  return c.nome_fantasia || c.razao_social || "(sem nome)"
}

function customerAddressPreview(c: Customer): string {
  const parts = [
    c.logradouro && c.numero ? `${c.logradouro}, ${c.numero}` : c.logradouro,
    c.bairro,
    c.cidade && c.estado ? `${c.cidade}/${c.estado}` : c.cidade,
  ].filter(Boolean)
  return parts.join(" — ")
}

export function ProjectForm({
  customers, vendedores, isAdminOrOwner,
  preselectCustomerId, preselectConversationId,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [customerId, setCustomerId] = useState<string>(preselectCustomerId ?? "")

  // Refs para preencher endereço quando o usuário seleciona cliente OU quando CEP retorna
  const refLogradouro  = useRef<HTMLInputElement>(null)
  const refNumero      = useRef<HTMLInputElement>(null)
  const refComplemento = useRef<HTMLInputElement>(null)
  const refBairro      = useRef<HTMLInputElement>(null)
  const refCidade      = useRef<HTMLInputElement>(null)
  const refEstado      = useRef<HTMLSelectElement>(null)

  // Opções do combobox — busca por nome OU CPF/CNPJ via label/sublabel
  const customerOptions: ComboboxOption[] = useMemo(() => customers.map((c) => {
    const docPart  = c.cnpj_cpf ?? null
    const cityPart = c.cidade && c.estado ? `${c.cidade}/${c.estado}` : c.cidade ?? null
    const sublabel = [docPart, cityPart].filter(Boolean).join(" · ")
    return {
      value:    c.id,
      label:    customerLabel(c),
      sublabel: sublabel || undefined,
    }
  }), [customers])

  const selectedCustomer = customers.find((c) => c.id === customerId) ?? null

  function handleAddressFill(addr: { logradouro: string; bairro: string; cidade: string; estado: string }) {
    if (refLogradouro.current) refLogradouro.current.value = addr.logradouro
    if (refBairro.current)     refBairro.current.value     = addr.bairro
    if (refCidade.current)     refCidade.current.value     = addr.cidade
    if (refEstado.current)     refEstado.current.value     = addr.estado
  }

  function handleSelectCustomer(id: string) {
    setCustomerId(id)
    const c = customers.find((x) => x.id === id)
    if (!c) return
    // Pré-preenche endereço da obra com o residencial do cliente — editável
    if (refLogradouro.current)  refLogradouro.current.value  = c.logradouro  ?? ""
    if (refNumero.current)      refNumero.current.value      = c.numero      ?? ""
    if (refComplemento.current) refComplemento.current.value = c.complemento ?? ""
    if (refBairro.current)      refBairro.current.value      = c.bairro      ?? ""
    if (refCidade.current)      refCidade.current.value      = c.cidade      ?? ""
    if (refEstado.current)      refEstado.current.value      = c.estado      ?? ""
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!customerId) {
      alert("Selecione o cliente")
      return
    }
    const fd = new FormData(e.currentTarget)
    fd.set("customer_id", customerId)
    if (preselectConversationId) fd.set("conversation_id", preselectConversationId)

    startTransition(async () => {
      try {
        await createProject(fd)
      } catch (err: any) {
        // O Next sinaliza redirect lançando uma exceção "NEXT_REDIRECT".
        // Re-lançar pra que o framework intercepte e faça o redirect normalmente.
        if (err?.message === "NEXT_REDIRECT" || String(err?.digest ?? "").startsWith("NEXT_REDIRECT")) {
          throw err
        }
        alert(err?.message ?? "Erro ao criar projeto")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── Cliente ── */}
        <Section
          title="Cliente"
          icon={<User />}
          hint="A quem este projeto pertence"
          className="lg:col-span-7"
        >
          <Combobox
            options={customerOptions}
            value={customerId}
            onChange={handleSelectCustomer}
            placeholder="Selecione o cliente..."
            searchPlaceholder="Buscar por nome, CPF ou CNPJ..."
          />

          {selectedCustomer && (
            <div className="mt-3 p-3 rounded-lg border border-blue-200 bg-blue-50/40">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedCustomer.kind === "B2C"
                    ? <User       className="size-4 text-blue-600 shrink-0" />
                    : <Building2  className="size-4 text-blue-600 shrink-0" />}
                  <p className="text-sm font-bold text-slate-900 truncate">{customerLabel(selectedCustomer)}</p>
                </div>
                {selectedCustomer.kind && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-600 uppercase tracking-wider shrink-0">
                    {selectedCustomer.kind === "B2C" ? "PF" : "PJ"}
                  </span>
                )}
              </div>
              {selectedCustomer.cnpj_cpf && (
                <p className="text-[11px] font-mono text-slate-500 pl-6">{selectedCustomer.cnpj_cpf}</p>
              )}
              <p className="text-[11px] text-slate-500 truncate pl-6">
                {customerAddressPreview(selectedCustomer) || "Sem endereço cadastrado"}
              </p>
            </div>
          )}
        </Section>

        {/* ── Comercial e prazo ── */}
        <Section
          title="Comercial e prazo"
          icon={<DollarSign />}
          className="lg:col-span-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <MaskedInput
              mask="currency"
              label="Valor estimado"
              name="estimated_value"
              leadingIcon={<DollarSign />}
              prefix="R$"
              defaultValue={0}
            />
            <div className="space-y-1.5">
              <Label className="text-slate-700">Instalação prevista</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Calendar className="size-4" />
                </span>
                <input
                  type="date"
                  name="expected_install_date"
                  className={`${inputBase} pl-9`}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ── Identificação do projeto ── */}
        <Section
          title="Identificação do projeto"
          icon={<FileText />}
          className="lg:col-span-12"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InputField
              label="Nome do projeto"
              name="name"
              required
              leadingIcon={<FileText />}
              placeholder='Ex: "Cozinha apto Pinheiros"'
              maxLength={120}
            />
            <InputField
              label="Designer / Arquiteto parceiro"
              name="designer_partner"
              placeholder="Profissional parceiro (opcional)"
            />
            <div className="space-y-1.5">
              <Label className="text-slate-700">Vendedor responsável</Label>
              {isAdminOrOwner ? (
                <select name="assigned_to" defaultValue="" className={inputBase}>
                  <option value="">— Eu —</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>{v.full_name || v.email}</option>
                  ))}
                </select>
              ) : (
                <input value="Eu" disabled className={`${inputBase} bg-slate-50 text-slate-500`} />
              )}
            </div>
          </div>
        </Section>

        {/* ── Endereço da obra ── */}
        <Section
          title="Endereço da obra"
          icon={<MapPin />}
          hint="Pré-preenchido com o endereço do cliente — edite se for outro local. CEP completa logradouro, bairro, cidade e estado."
          className="lg:col-span-12"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <CepInput
                key={`cep-${customerId}`}
                name="install_cep"
                defaultValue={selectedCustomer?.cep ?? ""}
                onAddressFill={handleAddressFill}
              />
            </div>
            <div className="sm:col-span-4">
              <InputField
                label="Logradouro"
                name="install_logradouro"
                defaultValue={selectedCustomer?.logradouro ?? ""}
                placeholder="Rua, Av., Rodovia..."
                ref={refLogradouro}
              />
            </div>
            <div className="sm:col-span-1">
              <InputField
                label="Número"
                name="install_numero"
                defaultValue={selectedCustomer?.numero ?? ""}
                placeholder="100"
                ref={refNumero}
              />
            </div>
            <div className="sm:col-span-2">
              <InputField
                label="Complemento"
                name="install_complemento"
                defaultValue={selectedCustomer?.complemento ?? ""}
                placeholder="Apto, sala, ref..."
                ref={refComplemento}
              />
            </div>
            <div className="sm:col-span-3">
              <InputField
                label="Bairro"
                name="install_bairro"
                defaultValue={selectedCustomer?.bairro ?? ""}
                placeholder="Centro"
                ref={refBairro}
              />
            </div>
            <div className="sm:col-span-4">
              <InputField
                label="Cidade"
                name="install_cidade"
                defaultValue={selectedCustomer?.cidade ?? ""}
                placeholder="São Paulo"
                ref={refCidade}
              />
            </div>
            <div className="sm:col-span-2">
              <div className="space-y-1.5">
                <Label className="text-slate-700">Estado</Label>
                <select
                  name="install_estado"
                  defaultValue={selectedCustomer?.estado ?? ""}
                  className={inputBase}
                  ref={refEstado}
                  key={`estado-${customerId}`}
                >
                  <option value="">—</option>
                  {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Observações ── */}
        <Section title="Observações" className="lg:col-span-12">
          <textarea
            name="notes"
            rows={3}
            className={`${inputBase} h-auto resize-none py-2`}
            placeholder="Anotações internas, preferências do cliente, prazos importantes..."
          />
        </Section>
      </div>

      {/* Ações — sempre full width */}
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-10 px-4 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending || !customerId}
          className="h-10 px-5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-2"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Criar projeto
        </button>
      </div>
    </form>
  )
}

function Section({
  title, hint, icon, className, children,
}: {
  title:      string
  hint?:      string
  icon?:      React.ReactNode
  className?: string
  children:   React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-card p-5 ${className ?? ""}`}>
      <div className="mb-4 flex items-start gap-2.5">
        {icon && (
          <div className="size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 [&>svg]:size-4">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
