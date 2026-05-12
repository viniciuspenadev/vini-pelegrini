import { Clock } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"

interface HistoryEntry {
  id:          string
  from_status: string | null
  to_status:   string
  notes:       string | null
  created_at:  string
  profiles:    { full_name: string | null; email: string | null } | null
}

interface Props {
  history: HistoryEntry[]
}

const DATETIME = (d: string) =>
  new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })

export function OrderHistory({ history }: Props) {
  if (!history.length) return null

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50">
        <Clock className="size-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-900">Histórico</h2>
      </div>
      <div className="p-5">
        <ol className="relative border-l border-slate-200 space-y-5 pl-6">
          {history.map((entry, idx) => (
            <li key={entry.id} className="relative">
              <span className={`absolute -left-[25px] flex size-3 items-center justify-center rounded-full ring-2 ring-white ${
                idx === 0 ? "bg-blue-600" : "bg-slate-300"
              }`} />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={entry.to_status} className="text-[10px] font-semibold px-2 py-0.5 rounded-md" />
                  {entry.notes && (
                    <span className="text-xs text-slate-500">{entry.notes}</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {DATETIME(entry.created_at)}
                  {entry.profiles && (
                    <> · <span className="text-slate-500">{entry.profiles.full_name ?? entry.profiles.email}</span></>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
