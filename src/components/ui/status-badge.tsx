import { cn } from "@/lib/utils"

type StatusVariant =
  | "ativo" | "active"
  | "inativo" | "inactive"
  | "bloqueado" | "blocked"
  | "recebido"
  | "em_separacao"
  | "faturado"
  | "em_rota"
  | "entregue"
  | "aguardando"
  | "trial"
  | string

const VARIANTS: Record<string, { dot: string; label?: string; className: string }> = {
  ativo:         { dot: "bg-green-500",  className: "bg-green-50 text-green-700 ring-green-200" },
  active:        { dot: "bg-green-500",  className: "bg-green-50 text-green-700 ring-green-200" },
  inativo:       { dot: "bg-slate-400",  className: "bg-slate-100 text-slate-600 ring-slate-200" },
  inactive:      { dot: "bg-slate-400",  className: "bg-slate-100 text-slate-600 ring-slate-200" },
  bloqueado:     { dot: "bg-red-500",    className: "bg-red-50 text-red-700 ring-red-200" },
  blocked:       { dot: "bg-red-500",    className: "bg-red-50 text-red-700 ring-red-200" },
  recebido:      { dot: "bg-blue-500",   className: "bg-blue-50 text-blue-700 ring-blue-200" },
  em_separacao:           { dot: "bg-amber-500",  className: "bg-amber-50 text-amber-700 ring-amber-200",   label: "Em Separação" },
  aguardando_faturamento: { dot: "bg-orange-500", className: "bg-orange-50 text-orange-700 ring-orange-200", label: "Ag. Faturamento" },
  faturado:               { dot: "bg-violet-500", className: "bg-violet-50 text-violet-700 ring-violet-200" },
  em_rota:       { dot: "bg-indigo-500", className: "bg-indigo-50 text-indigo-700 ring-indigo-200", label: "Em Rota" },
  entregue:      { dot: "bg-green-500",  className: "bg-green-50 text-green-700 ring-green-200" },
  aguardando:    { dot: "bg-orange-500", className: "bg-orange-50 text-orange-700 ring-orange-200" },
  trial:         { dot: "bg-sky-500",    className: "bg-sky-50 text-sky-700 ring-sky-200" },

  // Tipos de conservação — Engine Pescados
  resfriado:     { dot: "bg-blue-400",   className: "bg-blue-50 text-blue-700 ring-blue-200",     label: "Resfriado" },
  congelado:     { dot: "bg-indigo-400", className: "bg-indigo-50 text-indigo-700 ring-indigo-200", label: "Congelado" },
  fresco:        { dot: "bg-green-400",  className: "bg-green-50 text-green-700 ring-green-200",   label: "Fresco" },
  salgado:       { dot: "bg-amber-400",  className: "bg-amber-50 text-amber-700 ring-amber-200",   label: "Salgado" },
}

interface StatusBadgeProps {
  status:     StatusVariant
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = VARIANTS[status] ?? {
    dot: "bg-slate-400",
    className: "bg-slate-100 text-slate-600 ring-slate-200",
  }

  const label = variant.label ?? status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1",
        variant.className,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", variant.dot)} />
      {label}
    </span>
  )
}
