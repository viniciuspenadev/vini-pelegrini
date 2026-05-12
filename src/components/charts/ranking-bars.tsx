"use client"

interface Item {
  label:     string
  value:     number
  formatted: string
  sublabel?: string
}

interface Props {
  items:      Item[]
  emptyText?: string
}

const RANK_COLORS = [
  "bg-amber-400",   // #1 gold
  "bg-slate-300",   // #2 silver
  "bg-orange-300",  // #3 bronze
  "bg-slate-200",
  "bg-slate-200",
]

export function RankingBars({ items, emptyText = "Sem dados" }: Props) {
  if (!items.length) {
    return <p className="text-sm text-slate-400 italic text-center py-4">{emptyText}</p>
  }

  const max = Math.max(...items.map((i) => i.value), 1)

  return (
    <div className="space-y-3.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          {/* Rank badge */}
          <span className={`size-5 rounded-full ${RANK_COLORS[i] ?? "bg-slate-200"} flex items-center justify-center shrink-0`}>
            <span className="text-[10px] font-bold text-white leading-none">{i + 1}</span>
          </span>

          {/* Bar + labels */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="min-w-0 flex-1 mr-2">
                <p className="text-xs font-medium text-slate-800 truncate leading-none">{item.label}</p>
                {item.sublabel && (
                  <p className="text-[10px] text-slate-400 mt-0.5">{item.sublabel}</p>
                )}
              </div>
              <p className="text-xs font-bold text-slate-700 tabular-nums shrink-0">{item.formatted}</p>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
