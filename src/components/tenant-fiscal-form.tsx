"use client"

import { useTransition, useState, useRef } from "react"
import { saveTenantFiscalConfig } from "@/lib/actions/tenant-fiscal"
import { InputField } from "@/components/ui/input-field"
import { MaskedInput } from "@/components/ui/masked-input"
import { CepInput } from "@/components/ui/cep-input"
import { Label } from "@/components/ui/label"
import {
  Building2, FileText, Hash, MapPin, Phone, Mail,
  Receipt, Shield, Settings2, Loader2, CheckCircle2, AlertCircle, Upload,
  Check, Cloud, Zap,
} from "lucide-react"
import type { TenantFiscalConfig } from "@/types/database"

interface Props { config: TenantFiscalConfig | null }

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]

const REGIMES = [
  { value: "1", label: "1 — Simples Nacional" },
  { value: "2", label: "2 — Simples Nacional (excesso de sublimite)" },
  { value: "3", label: "3 — Regime Normal (Lucro Presumido/Real)" },
  { value: "4", label: "4 — MEI" },
]

const inputBase = "flex h-9 w-full rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-900 shadow-card transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

function Section({
  title, icon, children, hint, badge, className = "",
}: {
  title: string; icon: React.ReactNode; children: React.ReactNode; hint?: string; badge?: string; className?: string
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <span className="size-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 text-blue-600 [&_svg]:size-3.5">
          {icon}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            {badge && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600 ring-1 ring-blue-100">
                {badge}
              </span>
            )}
          </div>
          {hint && <p className="text-[11px] text-slate-400 mt-0.5">{hint}</p>}
        </div>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  )
}

export function TenantFiscalForm({ config }: Props) {
  const [pending, startTransition] = useTransition()
  const [saved,   setSaved]        = useState(false)
  const [certPreview, setCertPreview] = useState<string | null>(null)
  const [provider, setProvider]    = useState(config?.provider ?? "")

  const refLogradouro = useRef<HTMLInputElement>(null)
  const refBairro     = useRef<HTMLInputElement>(null)
  const refCidade     = useRef<HTMLInputElement>(null)
  const refEstado     = useRef<HTMLSelectElement>(null)
  const refIbge       = useRef<HTMLInputElement>(null)
  const refCertBase64 = useRef<HTMLInputElement>(null)

  function handleAddressFill(addr: { logradouro: string; bairro: string; cidade: string; estado: string; ibge: string }) {
    if (refLogradouro.current) refLogradouro.current.value = addr.logradouro
    if (refBairro.current)     refBairro.current.value     = addr.bairro
    if (refCidade.current)     refCidade.current.value     = addr.cidade
    if (refEstado.current)     refEstado.current.value     = addr.estado
    if (refIbge.current)       refIbge.current.value       = addr.ibge
  }

  function handleCertFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // dataURL: data:application/x-pkcs12;base64,XXXXXX → pega só o base64
      const b64 = result.split(",")[1] ?? ""
      if (refCertBase64.current) refCertBase64.current.value = b64
      setCertPreview(`${file.name} (${Math.round(file.size / 1024)} KB)`)
    }
    reader.readAsDataURL(file)
  }

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setSaved(false)
    startTransition(async () => {
      await saveTenantFiscalConfig(fd)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

      {/* 1 ── Identificação do Emitente */}
      <Section
        title="Identificação do Emitente"
        icon={<Building2 />}
        hint="Dados cadastrais da empresa que emitirá as NF-e"
        className="lg:col-span-12"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InputField
            label="Razão Social" name="razao_social" required
            defaultValue={config?.razao_social ?? ""}
            leadingIcon={<Building2 />}
            placeholder="MarineFoods Comércio de Pescados Ltda"
          />
          <InputField
            label="Nome Fantasia" name="nome_fantasia"
            defaultValue={config?.nome_fantasia ?? ""}
            placeholder="MarineFoods"
          />
          <MaskedInput
            mask="cnpj-cpf"
            label="CNPJ" name="cnpj" required
            defaultValue={config?.cnpj ?? ""}
            leadingIcon={<Hash />}
            placeholder="00.000.000/0001-00"
          />
          <InputField
            label="Inscrição Estadual" name="inscricao_estadual" required
            defaultValue={config?.inscricao_estadual ?? ""}
            leadingIcon={<FileText />}
            placeholder="000.000.000.000"
          />
          <InputField
            label="Inscrição Municipal" name="inscricao_municipal"
            defaultValue={config?.inscricao_municipal ?? ""}
            placeholder="Se houver"
          />
          <InputField
            label="CNAE Principal" name="cnae"
            defaultValue={config?.cnae ?? ""}
            placeholder="4634-6/02"
            hint="Atividade econômica principal"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 pt-2 border-t border-slate-100">
          <div className="space-y-1.5">
            <Label className="text-slate-700">
              Regime Tributário <span className="text-red-500">*</span>
            </Label>
            <select
              name="regime_tributario"
              defaultValue={config?.regime_tributario != null ? String(config.regime_tributario) : ""}
              className={inputBase}
              required
            >
              <option value="">— Selecione —</option>
              {REGIMES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <p className="text-[11px] text-slate-400">Define se produtos usam CSOSN (Simples) ou CST (Normal).</p>
          </div>
        </div>
      </Section>

      {/* 2 ── Endereço */}
      <Section
        title="Endereço do Emitente"
        icon={<MapPin />}
        hint="Endereço fiscal da matriz — usado em todas as NF-e"
        className="lg:col-span-12"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
          <div className="sm:col-span-2">
            <CepInput
              defaultValue={config?.cep ?? ""}
              onAddressFill={handleAddressFill}
            />
          </div>
          <div className="sm:col-span-4">
            <InputField
              label="Logradouro" name="logradouro" required
              defaultValue={config?.logradouro ?? ""}
              placeholder="Rua, Av., Rodovia..."
              ref={refLogradouro}
            />
          </div>
          <div className="sm:col-span-1">
            <InputField label="Número" name="numero" required defaultValue={config?.numero ?? ""} placeholder="100" />
          </div>
          <div className="sm:col-span-2">
            <InputField label="Complemento" name="complemento" defaultValue={config?.complemento ?? ""} placeholder="Galpão, Sala..." />
          </div>
          <div className="sm:col-span-3">
            <InputField
              label="Bairro" name="bairro" required
              defaultValue={config?.bairro ?? ""}
              placeholder="Centro"
              ref={refBairro}
            />
          </div>
          <div className="sm:col-span-3">
            <InputField
              label="Cidade" name="cidade" required
              defaultValue={config?.cidade ?? ""}
              placeholder="São Paulo"
              ref={refCidade}
            />
          </div>
          <div className="sm:col-span-1">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Estado <span className="text-red-500">*</span></Label>
              <select
                name="estado"
                defaultValue={config?.estado ?? ""}
                className={inputBase}
                ref={refEstado}
                required
              >
                <option value="">—</option>
                {ESTADOS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          <div className="sm:col-span-2">
            <div className="space-y-1.5">
              <Label className="text-slate-700">Código IBGE <span className="text-red-500">*</span></Label>
              <input
                type="text"
                name="codigo_ibge"
                defaultValue={config?.codigo_ibge ?? ""}
                ref={refIbge}
                readOnly
                required
                className={`${inputBase} bg-slate-50 font-mono text-slate-600 cursor-not-allowed`}
                placeholder="Preencha o CEP"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
          <MaskedInput
            mask="phone"
            label="Telefone" name="telefone"
            defaultValue={config?.telefone ?? ""}
            leadingIcon={<Phone />}
            placeholder="(11) 3333-4444"
          />
          <InputField
            label="E-mail" name="email" type="email" required
            defaultValue={config?.email ?? ""}
            leadingIcon={<Mail />}
            placeholder="fiscal@empresa.com"
          />
        </div>
      </Section>

      {/* 3 ── Provider & Configuração */}
      <Section
        title="Provider & Configuração de Emissão"
        icon={<Settings2 />}
        hint="Escolha o serviço de emissão e configure certificado, ambiente e numeração"
        className="lg:col-span-12"
      >
        {/* Hidden input que carrega o valor real do select */}
        <input type="hidden" name="provider" value={provider} />

        {/* Cards de seleção */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-2xl">

          {/* Focus NFe */}
          <button
            type="button"
            onClick={() => setProvider(provider === "focus_nfe" ? "" : "focus_nfe")}
            className={`
              group relative text-left p-5 rounded-xl border-2 transition-all
              ${provider === "focus_nfe"
                ? "border-blue-600 bg-blue-50/40 shadow-sm shadow-blue-600/10"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }
            `}
          >
            {provider === "focus_nfe" && (
              <span className="absolute top-3 right-3 size-6 rounded-full bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-600/30">
                <Check className="size-3.5 text-white" strokeWidth={3} />
              </span>
            )}

            {/* Logo mark */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex size-11 items-center justify-center rounded-xl transition-colors ${
                provider === "focus_nfe" ? "bg-violet-600 text-white" : "bg-violet-50 text-violet-600"
              }`}>
                <Zap className="size-5" strokeWidth={2.25} />
              </div>
              <div>
                <p className="text-base font-bold text-slate-900 leading-tight">Focus NFe</p>
                <p className="text-[11px] text-slate-400 mt-0.5">focusnfe.com.br</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              API consolidada, líder no Brasil. Documentação completa e SDKs oficiais.
            </p>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                NF-e
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                NFC-e
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                CT-e
              </span>
            </div>
          </button>

          {/* Nuvem Fiscal — desabilitado */}
          <div
            aria-disabled="true"
            className="relative text-left p-5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 cursor-not-allowed select-none"
          >
            <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">
              em breve
            </span>

            {/* Logo mark */}
            <div className="flex items-center gap-3 mb-3 opacity-60">
              <div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <Cloud className="size-5" strokeWidth={2.25} />
              </div>
              <div>
                <p className="text-base font-bold text-slate-400 leading-tight">Nuvem Fiscal</p>
                <p className="text-[11px] text-slate-300 mt-0.5">nuvemfiscal.com.br</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Integração ainda não disponível.
            </p>

            <div className="flex flex-wrap gap-1.5 opacity-50">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                NF-e
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                NFC-e
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                NFS-e
              </span>
            </div>
          </div>
        </div>

        {/* Empty state: nenhum provider selecionado */}
        {!provider && (
          <div className="mt-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 p-8 text-center">
            <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Settings2 className="size-5 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Selecione um provider</p>
            <p className="text-xs text-slate-400">
              Escolha Focus NFe ou Nuvem Fiscal acima para configurar certificado, ambiente e numeração.
            </p>
          </div>
        )}

        {/* Painel de configuração do provider selecionado */}
        {provider && (
        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/40 p-5 space-y-5">

          {/* Header do painel */}
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
            <span className={`flex size-7 items-center justify-center rounded-lg ${
              provider === "focus_nfe" ? "bg-violet-600 text-white" : "bg-cyan-600 text-white"
            }`}>
              {provider === "focus_nfe" ? <Zap className="size-3.5" strokeWidth={2.5} /> : <Cloud className="size-3.5" strokeWidth={2.5} />}
            </span>
            <p className="text-sm font-semibold text-slate-900">
              Configurando {provider === "focus_nfe" ? "Focus NFe" : "Nuvem Fiscal"}
            </p>
          </div>

          {/* Token API */}
          <InputField
            label="Token de API"
            name="provider_token"
            type="password"
            defaultValue={config?.provider_token ?? ""}
            placeholder={provider === "focus_nfe" ? "Token Focus NFe" : "Token Nuvem Fiscal"}
            hint={`Obtenha em ${provider === "focus_nfe" ? "app.focusnfe.com.br" : "app.nuvemfiscal.com.br"} após criar a conta`}
          />

          {/* Certificado A1 */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="size-3.5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Certificado Digital A1</p>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
                Obrigatório
              </span>
            </div>

            {config?.certificado_a1 && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-3.5 py-2.5 flex items-center gap-2 text-xs text-green-700">
                <CheckCircle2 className="size-3.5 shrink-0" />
                Certificado já configurado.
                {config.certificado_validade && (
                  <span className="ml-auto font-medium">
                    Válido até {new Date(config.certificado_validade).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-slate-700">
                  Arquivo .pfx {!config?.certificado_a1 && <span className="text-red-500">*</span>}
                </Label>
                <label className="flex items-center gap-3 cursor-pointer rounded-lg border-2 border-dashed border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 transition-colors px-4 py-3">
                  <Upload className="size-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 flex-1 truncate">
                    {certPreview ?? "Selecionar .pfx"}
                  </span>
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handleCertFile}
                    className="sr-only"
                  />
                </label>
                <input
                  type="hidden"
                  name="certificado_a1"
                  ref={refCertBase64}
                  defaultValue=""
                />
              </div>

              <InputField
                label={`Senha${!config?.certificado_a1 ? " *" : ""}`}
                name="certificado_senha"
                type="password"
                placeholder={config?.certificado_a1 ? "•••• (manter)" : "Senha do .pfx"}
              />

              <InputField
                label="Validade"
                name="certificado_validade"
                type="date"
                defaultValue={config?.certificado_validade ?? ""}
              />
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-start gap-2 text-[11px] text-amber-800">
              <AlertCircle className="size-3 shrink-0 mt-0.5" />
              <span>
                O <code className="font-mono text-amber-900">.pfx</code> será enviado ao {provider === "focus_nfe" ? "Focus NFe" : "Nuvem Fiscal"} (armazenamento encriptado no provider) e não fica em nosso banco.
              </span>
            </div>
          </div>

          {/* Configuração de Emissão */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <Receipt className="size-3.5 text-slate-400" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Configuração de Emissão</p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-slate-700">Ambiente <span className="text-red-500">*</span></Label>
                <select
                  name="ambiente"
                  defaultValue={config?.ambiente != null ? String(config.ambiente) : "2"}
                  className={inputBase}
                  required
                >
                  <option value="2">2 — Homologação (testes)</option>
                  <option value="1">1 — Produção (real)</option>
                </select>
              </div>
              <InputField
                label="Série NF-e *"
                name="serie_nfe"
                type="number"
                min="1"
                defaultValue={config?.serie_nfe != null ? String(config.serie_nfe) : "1"}
              />
              <InputField
                label="Próximo número *"
                name="proximo_numero_nfe"
                type="number"
                min="1"
                defaultValue={config?.proximo_numero_nfe != null ? String(config.proximo_numero_nfe) : "1"}
                hint="Precisa estar sincronizado com a SEFAZ"
              />
            </div>

            <InputField
              label="Natureza de Operação Padrão"
              name="natureza_operacao"
              defaultValue={config?.natureza_operacao ?? "Venda de mercadoria"}
              placeholder="Venda de mercadoria"
            />
          </div>

          {/* Aviso geral */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-3.5 py-2.5 flex items-start gap-2 text-xs text-blue-800">
            <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
            <span>
              Recomendamos começar em <strong>Homologação</strong>. Após emissões bem-sucedidas, mude para Produção — aí as NF-e têm validade fiscal real.
            </span>
          </div>
        </div>
        )}
      </Section>

      </div>

      {/* Ações */}
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
