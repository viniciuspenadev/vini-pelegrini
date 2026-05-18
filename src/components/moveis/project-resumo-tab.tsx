"use client"

import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { updateProject } from "@/lib/actions/projects"
import { InputField } from "@/components/ui/input-field"
import { MaskedInput } from "@/components/ui/masked-input"
import { CepInput } from "@/components/ui/cep-input"
import { Label } from "@/components/ui/label"
import { Loader2, Save, MapPin, DollarSign, Calendar, FileText } from "lucide-react"

interface Vendedor {
  id:        string
  full_name: string | null
  email:     string
}

interface Project {
  id:                    string
  name:                  string
  assigned_to:           string | null
  designer_partner:      string | null
  install_cep:           string | null
  install_logradouro:    string | null
  install_numero:        string | null
  install_complemento:   string | null
  install_bairro:        string | null
  install_cidade:        string | null
  install_estado:        string | null
  estimated_value:       number | null
  contracted_value:      number | null
  paid_value:            number
  expected_install_date: string | null
  actual_install_date:   string | null
  notes:                 string | null
}

interface Props {
  project:        Project
  vendedores:     Vendedor[]
  isAdminOrOwner: boolean
}

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

const inputBase = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

const BRL = (v: number | null | undefined) =>
  v != null ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"

function parseCurrency(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

export function ProjectResumoTab({ project, vendedores, isAdminOrOwner }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [assignedTo, setAssigned] = useState(project.assigned_to ?? "")
  const [dirty, setDirty]         = useState(false)

  const refName             = useRef<HTMLInputElement>(null)
  const refDesigner         = useRef<HTMLInputElement>(null)
  const refLogradouro       = useRef<HTMLInputElement>(null)
  const refNumero           = useRef<HTMLInputElement>(null)
  const refComplemento      = useRef<HTMLInputElement>(null)
  const refBairro           = useRef<HTMLInputElement>(null)
  const refCidade           = useRef<HTMLInputElement>(null)
  const refEstado           = useRef<HTMLSelectElement>(null)
  const refExpectedDate     = useRef<HTMLInputElement>(null)
  const refActualDate       = useRef<HTMLInputElement>(null)
  const refNotes            = useRef<HTMLTextAreaElement>(null)
  const formRef             = useRef<HTMLFormElement>(null)

  function markDirty() { setDirty(true) }

  function handleAddressFill(addr: { logradouro: string; bairro: string; cidade: string; estado: string }) {
    if (refLogradouro.current) refLogradouro.current.value = addr.logradouro
    if (refBairro.current)     refBairro.current.value     = addr.bairro
    if (refCidade.current)     refCidade.current.value     = addr.cidade
    if (refEstado.current)     refEstado.current.value     = addr.estado
    markDirty()
  }

  function handleSave() {
    if (!formRef.current) return
    const fd = new FormData(formRef.current)

    const estimated  = parseCurrency(String(fd.get("estimated_value")  ?? ""))
    const contracted = parseCurrency(String(fd.get("contracted_value") ?? ""))
    const paid       = parseCurrency(String(fd.get("paid_value")       ?? ""))

    startTransition(async () => {
      try {
        await updateProject(project.id, {
          name:                  refName.current?.value.trim() || project.name,
          assigned_to:           assignedTo || null,
          designer_partner:      refDesigner.current?.value.trim() || null,
          install_cep:           (fd.get("install_cep") as string)?.trim() || null,
          install_logradouro:    refLogradouro.current?.value.trim()  || null,
          install_numero:        refNumero.current?.value.trim()      || null,
          install_complemento:   refComplemento.current?.value.trim() || null,
          install_bairro:        refBairro.current?.value.trim()      || null,
          install_cidade:        refCidade.current?.value.trim()      || null,
          install_estado:        refEstado.current?.value             || null,
          estimated_value:       estimated,
          contracted_value:      contracted || null,
          paid_value:            paid,
          expected_install_date: refExpectedDate.current?.value || null,
          actual_install_date:   refActualDate.current?.value   || null,
          notes:                 refNotes.current?.value.trim() || null,
        })
        setDirty(false)
        router.refresh()
      } catch (err: any) {
        alert(err?.message ?? "Erro ao salvar")
      }
    })
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => { e.preventDefault(); handleSave() }}
      onInput={markDirty}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── Identificação ── */}
        <Section title="Identificação" icon={<FileText />} className="lg:col-span-7">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Nome do projeto"
              name="name"
              defaultValue={project.name}
              maxLength={120}
              ref={refName}
              leadingIcon={<FileText />}
            />
            <InputField
              label="Designer / Arquiteto"
              name="designer_partner"
              defaultValue={project.designer_partner ?? ""}
              placeholder="Profissional parceiro (opcional)"
              ref={refDesigner}
            />
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-slate-700">Vendedor</Label>
              {isAdminOrOwner ? (
                <select
                  value={assignedTo}
                  onChange={(e) => { setAssigned(e.target.value); markDirty() }}
                  className={inputBase}
                >
                  <option value="">— Sem vendedor —</option>
                  {vendedores.map((v) => (
                    <option key={v.id} value={v.id}>{v.full_name || v.email}</option>
                  ))}
                </select>
              ) : (
                <input
                  disabled
                  value={vendedores.find((v) => v.id === assignedTo)?.full_name ?? "—"}
                  className={`${inputBase} bg-slate-50 text-slate-500`}
                />
              )}
            </div>
          </div>
        </Section>

        {/* ── Comercial ── */}
        <Section title="Comercial" icon={<DollarSign />} className="lg:col-span-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MaskedInput
              mask="currency"
              label="Estimado"
              name="estimated_value"
              defaultValue={project.estimated_value ?? 0}
              leadingIcon={<DollarSign />}
              prefix="R$"
            />
            <MaskedInput
              mask="currency"
              label="Contratado"
              name="contracted_value"
              defaultValue={project.contracted_value ?? 0}
              leadingIcon={<DollarSign />}
              prefix="R$"
            />
            <MaskedInput
              mask="currency"
              label="Pago"
              name="paid_value"
              defaultValue={project.paid_value ?? 0}
              leadingIcon={<DollarSign />}
              prefix="R$"
            />
          </div>
          {project.contracted_value != null && Number(project.contracted_value) > 0 && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Pago: <span className="font-bold text-green-700">{((Number(project.paid_value ?? 0) / Number(project.contracted_value)) * 100).toFixed(0)}%</span></span>
                <span>Saldo: <span className="font-bold text-slate-700">{BRL(Number(project.contracted_value) - Number(project.paid_value ?? 0))}</span></span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (Number(project.paid_value ?? 0) / Number(project.contracted_value)) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </Section>

        {/* ── Endereço da obra ── */}
        <Section
          title="Endereço da obra"
          icon={<MapPin />}
          hint="CEP completa logradouro, bairro, cidade e estado automaticamente."
          className="lg:col-span-8"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <CepInput
                name="install_cep"
                defaultValue={project.install_cep ?? ""}
                onAddressFill={handleAddressFill}
              />
            </div>
            <div className="sm:col-span-4">
              <InputField label="Logradouro" name="install_logradouro" defaultValue={project.install_logradouro ?? ""} placeholder="Rua, Av., Rodovia..." ref={refLogradouro} />
            </div>
            <div className="sm:col-span-1">
              <InputField label="Número" name="install_numero" defaultValue={project.install_numero ?? ""} placeholder="100" ref={refNumero} />
            </div>
            <div className="sm:col-span-2">
              <InputField label="Complemento" name="install_complemento" defaultValue={project.install_complemento ?? ""} placeholder="Apto, sala..." ref={refComplemento} />
            </div>
            <div className="sm:col-span-3">
              <InputField label="Bairro" name="install_bairro" defaultValue={project.install_bairro ?? ""} placeholder="Centro" ref={refBairro} />
            </div>
            <div className="sm:col-span-4">
              <InputField label="Cidade" name="install_cidade" defaultValue={project.install_cidade ?? ""} placeholder="São Paulo" ref={refCidade} />
            </div>
            <div className="sm:col-span-2">
              <div className="space-y-1.5">
                <Label className="text-slate-700">Estado</Label>
                <select name="install_estado" defaultValue={project.install_estado ?? ""} className={inputBase} ref={refEstado}>
                  <option value="">—</option>
                  {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Datas ── */}
        <Section title="Datas de instalação" icon={<Calendar />} className="lg:col-span-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Prevista</Label>
              <input
                type="date"
                name="expected_install_date"
                defaultValue={project.expected_install_date ?? ""}
                ref={refExpectedDate}
                className={inputBase}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-700">Realizada</Label>
              <input
                type="date"
                name="actual_install_date"
                defaultValue={project.actual_install_date ?? ""}
                ref={refActualDate}
                className={inputBase}
              />
            </div>
          </div>
        </Section>

        {/* ── Observações ── */}
        <Section title="Observações" className="lg:col-span-12">
          <textarea
            name="notes"
            defaultValue={project.notes ?? ""}
            ref={refNotes}
            rows={4}
            className={`${inputBase} h-auto resize-none py-2`}
            placeholder="Anotações internas, preferências do cliente, prazos importantes..."
          />
        </Section>
      </div>

      {/* Ações */}
      <div className="flex items-center justify-end pt-2">
        <button
          type="submit"
          disabled={pending || !dirty}
          className="h-10 px-5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60 flex items-center gap-2"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {dirty ? "Salvar alterações" : "Salvo"}
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
