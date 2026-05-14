"use client"

import { useState, useTransition } from "react"
import {
  ListChecks, Plus, Loader2, X, Calendar, User,
  CheckCircle2, Circle,
} from "lucide-react"
import { createOrderTask, toggleOrderTask, deleteOrderTask } from "@/lib/actions/order-tasks"

interface Task {
  id:           string
  title:        string
  done:         boolean
  due_date:     string | null
  assignee_id:  string | null
  completed_at: string | null
  profiles?:    { full_name: string | null; email: string } | null
  assignee?:    { full_name: string | null; email: string } | null
}

interface Props {
  orderId:    string
  tasks:      Task[]
  vendedores: { id: string; full_name: string | null; email: string }[]
}

const DATE_SHORT = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

const inputBase = "h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"

export function OrderTasks({ orderId, tasks, vendedores }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle]       = useState("")
  const [assignee, setAssignee] = useState("")
  const [dueDate, setDueDate]   = useState("")
  const [pending, startTransition] = useTransition()

  const completed = tasks.filter((t) => t.done).length
  const total     = tasks.length
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone   = total > 0 && completed === total

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    startTransition(async () => {
      await createOrderTask(orderId, {
        title,
        assigneeId: assignee || null,
        dueDate:    dueDate || null,
      })
      setTitle("")
      setAssignee("")
      setDueDate("")
      setShowForm(false)
    })
  }

  function handleToggle(taskId: string, currentDone: boolean) {
    startTransition(async () => {
      await toggleOrderTask(taskId, orderId, !currentDone)
    })
  }

  function handleDelete(taskId: string) {
    startTransition(async () => {
      await deleteOrderTask(taskId, orderId)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden">

      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <span className="size-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
          <ListChecks className="size-3.5" />
        </span>
        <p className="text-sm font-semibold text-slate-900">Tarefas</p>
        {total > 0 && (
          <span className={`text-[11px] font-semibold tabular-nums ${allDone ? "text-green-600" : "text-slate-400"}`}>
            {completed}/{total}
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto size-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
        >
          {showForm ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-0.5 bg-slate-100">
          <div
            className={`h-full transition-all duration-500 ${allDone ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="p-3 space-y-1">

        {/* Form de nova tarefa */}
        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
            <input
              autoFocus
              type="text"
              placeholder="Nova tarefa..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputBase}
              disabled={pending}
              maxLength={200}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className={inputBase}
                disabled={pending}
              >
                <option value="">Sem responsável</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.full_name ?? v.email}</option>
                ))}
              </select>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputBase}
                disabled={pending}
              />
            </div>
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => { setShowForm(false); setTitle("") }}
                disabled={pending}
                className="h-7 px-3 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || !title.trim()}
                className="h-7 px-3 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-60 flex items-center gap-1"
              >
                {pending && <Loader2 className="size-3 animate-spin" />}
                Adicionar
              </button>
            </div>
          </form>
        )}

        {/* Lista */}
        {tasks.length === 0 && !showForm ? (
          <div className="px-2 py-6 text-center">
            <ListChecks className="size-5 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Sem tarefas. Adicione um checklist do pedido.</p>
          </div>
        ) : (
          tasks.map((t) => {
            const assigneeName = t.assignee?.full_name ?? t.assignee?.email ?? null
            const today = new Date().toISOString().split("T")[0]
            const isOverdue = !t.done && t.due_date && t.due_date < today

            return (
              <div
                key={t.id}
                className={`group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors ${t.done ? "opacity-60" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(t.id, t.done)}
                  disabled={pending}
                  className="shrink-0 transition-transform hover:scale-110"
                >
                  {t.done ? (
                    <CheckCircle2 className="size-5 text-green-500 fill-green-50" strokeWidth={2} />
                  ) : (
                    <Circle className="size-5 text-slate-300 hover:text-blue-500 transition-colors" strokeWidth={2} />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs ${t.done ? "line-through text-slate-400" : "text-slate-700"}`}>
                    {t.title}
                  </p>
                  {(assigneeName || t.due_date) && (
                    <div className="flex items-center gap-2 mt-0.5">
                      {assigneeName && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                          <User className="size-2.5" />{assigneeName.split(" ")[0]}
                        </span>
                      )}
                      {t.due_date && (
                        <span className={`inline-flex items-center gap-1 text-[10px] ${isOverdue ? "text-red-500 font-semibold" : "text-slate-400"}`}>
                          <Calendar className="size-2.5" />{DATE_SHORT(t.due_date)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(t.id)}
                  disabled={pending}
                  title="Remover"
                  className="shrink-0 size-5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="size-3" />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
