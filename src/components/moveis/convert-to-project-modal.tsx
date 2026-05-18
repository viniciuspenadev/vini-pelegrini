"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { convertConversationToProject } from "@/lib/actions/projects"
import { InputField } from "@/components/ui/input-field"
import { MaskedInput } from "@/components/ui/masked-input"
import { CepInput } from "@/components/ui/cep-input"
import { Label } from "@/components/ui/label"
import {
  Loader2, Save, X, Trophy, MapPin, DollarSign, Calendar, FileText,
  AlertCircle, User, Building2,
} from "lucide-react"

export interface ConvertModalCustomer {
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

interface Props {
  conversationId:  string
  contactLabel:    string                       // push_name / phone / etc
  customer:        ConvertModalCustomer | null  // se null → bloqueia conversão
  onClose:         () => void                   // fecha sem converter (rollback)
  onConverted?:    (projectId: string) => void  // callback após criar
}

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

const inputBase = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

function customerLabel(c: ConvertModalCustomer): string {
  return c.nome_fantasia || c.razao_social || "(sem nome)"
}

export function ConvertToProjectModal({
  conversationId, contactLabel, customer, onClose, onConverted,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const refName        = useRef<HTMLInputElement>(null)
  const refDesigner    = useRef<HTMLInputElement>(null)
  const refLogradouro  = useRef<HTMLInputElement>(null)
  const refNumero      = useRef<HTMLInputElement>(null)
  const refComplemento = useRef<HTMLInputElement>(null)
  const refBairro      = useRef<HTMLInputElement>(null)
  const refCidade      = useRef<HTMLInputElement>(null)
  const refEstado      = useRef<HTMLSelectElement>(null)
  const refExpected    = useRef<HTMLInputElement>(null)
  const refNotes       = useRef<HTMLTextAreaElement>(null)
  const formRef        = useRef<HTMLFormElement>(null)

  function handleAddressFill(addr: { logradouro: string; bairro: string; cidade: string; estado: string }) {
    if (refLogradouro.current) refLogradouro.current.value = addr.logradouro
    if (refBairro.current)     refBairro.current.value     = addr.bairro
    if (refCidade.current)     refCidade.current.value     = addr.cidade
    if (refEstado.current)     refEstado.current.value     = addr.estado
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!customer) return

    const fd = new FormData(e.currentTarget)
    const name = refName.current?.value.trim()
    if (!name) {
      alert("Informe o nome do projeto")
      return
    }

    const estimated = parseFloat(String(fd.get("estimated_value") ?? "0"))

    startTransition(async () => {
      try {
        const res = await convertConversationToProject(conversationId, {
          name,
          designer_partner:      refDesigner.current?.value.trim() || null,
          estimated_value:       isNaN(estimated) ? 0 : estimated,
          expected_install_date: refExpected.current?.value || null,
          notes:                 refNotes.current?.value.trim() || null,
          install_cep:           (fd.get("install_cep") as string)?.trim() || null,
          install_logradouro:    refLogradouro.current?.value.trim()  || null,
          install_numero:        refNumero.current?.value.trim()      || null,
          install_complemento:   refComplemento.current?.value.trim() || null,
          install_bairro:        refBairro.current?.value.trim()      || null,
          install_cidade:        refCidade.current?.value.trim()      || null,
          install_estado:        refEstado.current?.value             || null,
        })
        onConverted?.(res.projectId)
        router.push(`/moveis/projetos/${res.projectId}`)
      } catch (err: any) {
        if (err?.message === "NEXT_REDIRECT" || String(err?.digest ?? "").startsWith("NEXT_REDIRECT")) throw err
        alert(err?.message ?? "Erro ao converter")
      }
    })
  }

  // Default do nome do projeto: nome do cliente
  const defaultName = customer
    ? `Projeto ${customerLabel(customer)}`
    : ""

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-blue-50 rounded-2xl border border-slate-200 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-2xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-green-50 flex items-center justify-center">
              <Trophy className="size-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Converter em projeto</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Conversa de <span className="font-semibold text-slate-700">{contactLabel}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="size-8 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center"
          >
            <X className="size-4" />
          </button>
        </div>

        {!customer ? (
          // Erro: sem cliente vinculado
          <div className="px-6 py-12">
            <div className="bg-white rounded-xl border border-amber-200 p-6 max-w-md mx-auto text-center">
              <AlertCircle className="size-10 text-amber-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-900 mb-1">Sem cliente vinculado</p>
              <p className="text-xs text-slate-500 mb-4">
                Essa conversa ainda não tem cliente vinculado. Abra a conversa e vincule um cliente antes de converter em projeto.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Entendi
              </button>
            </div>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

            {/* Card do cliente */}
            <div className="bg-white rounded-xl border border-blue-200 px-4 py-3">
              <div className="flex items-start gap-2.5">
                {customer.kind === "B2C"
                  ? <User       className="size-4 text-blue-600 shrink-0 mt-0.5" />
                  : <Building2  className="size-4 text-blue-600 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{customerLabel(customer)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {customer.cnpj_cpf && (
                      <span className="text-[11px] font-mono text-slate-500">{customer.cnpj_cpf}</span>
                    )}
                    {customer.kind && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase tracking-wider">
                        {customer.kind === "B2C" ? "PF" : "PJ"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

              {/* Identificação */}
              <Section title="Identificação" icon={<FileText />} className="lg:col-span-7">
                <InputField
                  label="Nome do projeto"
                  name="name"
                  required
                  defaultValue={defaultName}
                  ref={refName}
                  leadingIcon={<FileText />}
                  placeholder='Ex: "Cozinha apto Pinheiros"'
                  maxLength={120}
                />
                <InputField
                  label="Designer / Arquiteto"
                  name="designer_partner"
                  ref={refDesigner}
                  placeholder="Profissional parceiro (opcional)"
                />
              </Section>

              {/* Comercial */}
              <Section title="Comercial e prazo" icon={<DollarSign />} className="lg:col-span-5">
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
                      ref={refExpected}
                      className={`${inputBase} pl-9`}
                    />
                  </div>
                </div>
              </Section>

              {/* Endereço */}
              <Section
                title="Endereço da obra"
                icon={<MapPin />}
                hint="Pré-preenchido com endereço do cliente — edite se for outro local."
                className="lg:col-span-12"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                  <div className="sm:col-span-2">
                    <CepInput
                      name="install_cep"
                      defaultValue={customer.cep ?? ""}
                      onAddressFill={handleAddressFill}
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <InputField label="Logradouro" name="install_logradouro" defaultValue={customer.logradouro ?? ""} placeholder="Rua, Av..." ref={refLogradouro} />
                  </div>
                  <div className="sm:col-span-1">
                    <InputField label="Número" name="install_numero" defaultValue={customer.numero ?? ""} placeholder="100" ref={refNumero} />
                  </div>
                  <div className="sm:col-span-2">
                    <InputField label="Complemento" name="install_complemento" defaultValue={customer.complemento ?? ""} placeholder="Apto, sala..." ref={refComplemento} />
                  </div>
                  <div className="sm:col-span-3">
                    <InputField label="Bairro" name="install_bairro" defaultValue={customer.bairro ?? ""} placeholder="Centro" ref={refBairro} />
                  </div>
                  <div className="sm:col-span-4">
                    <InputField label="Cidade" name="install_cidade" defaultValue={customer.cidade ?? ""} placeholder="São Paulo" ref={refCidade} />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="space-y-1.5">
                      <Label className="text-slate-700">Estado</Label>
                      <select name="install_estado" defaultValue={customer.estado ?? ""} className={inputBase} ref={refEstado}>
                        <option value="">—</option>
                        {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Notas */}
              <Section title="Observações" className="lg:col-span-12">
                <textarea
                  name="notes"
                  ref={refNotes}
                  rows={2}
                  className={`${inputBase} h-auto resize-none py-2`}
                  placeholder="Anotações iniciais sobre o projeto (opcional)"
                />
              </Section>
            </div>

            {/* Ações */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={pending}
                className="h-10 px-4 text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending}
                className="h-10 px-5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-2"
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Trophy className="size-4" />}
                Criar projeto
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
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
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 ${className ?? ""}`}>
      <div className="mb-3 flex items-start gap-2.5">
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
