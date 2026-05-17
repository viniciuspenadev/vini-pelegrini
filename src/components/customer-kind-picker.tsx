"use client"

import { useRouter } from "next/navigation"
import { KIND_OPTIONS } from "@/lib/customer-kinds"
import type { CustomerKind } from "@/lib/customer-kinds"

interface Props {
  onSelect?: (kind: CustomerKind) => void
  /** Base URL — o componente appendea `?kind=B2B` ou `?kind=B2C` */
  baseHref?: string
}

/**
 * Step inicial do cadastro de cliente — escolher PF ou PJ.
 * Card grande com ícone, descrição e cor. UX deliberadamente clara.
 */
export function CustomerKindPicker({ onSelect, baseHref }: Props) {
  const router = useRouter()

  function handleClick(kind: CustomerKind) {
    if (onSelect) {
      onSelect(kind)
    } else if (baseHref) {
      const sep = baseHref.includes("?") ? "&" : "?"
      router.push(`${baseHref}${sep}kind=${kind}`)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          Qual o tipo de cliente?
        </h2>
        <p className="text-sm text-slate-500">
          A escolha define quais campos serão pedidos no cadastro.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {KIND_OPTIONS.map((opt) => {
          const Icon = opt.icon
          return (
            <button
              key={opt.kind}
              type="button"
              onClick={() => handleClick(opt.kind)}
              className="group relative bg-white rounded-2xl border-2 border-slate-200 hover:border-blue-400 shadow-card hover:shadow-lg transition-all p-6 text-left"
              style={{ borderColor: undefined }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = opt.color }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="size-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: opt.color + "15", color: opt.color }}
                >
                  <Icon className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-slate-900">{opt.label}</h3>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ backgroundColor: opt.color + "20", color: opt.color }}
                    >
                      {opt.shortLabel}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {opt.description}
                  </p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
