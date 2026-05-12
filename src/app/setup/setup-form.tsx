"use client"

import { useTransition } from "react"
import { setupPlatformAdmin } from "./actions"
import { Loader2 } from "lucide-react"

const inputClass = "w-full h-10 rounded-lg bg-slate-800 border border-slate-700 px-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-colors disabled:opacity-50"

export function SetupForm() {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => setupPlatformAdmin(fd))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Nome completo</label>
        <input
          name="name"
          type="text"
          required
          autoFocus
          disabled={pending}
          placeholder="Seu nome"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">E-mail</label>
        <input
          name="email"
          type="email"
          required
          disabled={pending}
          placeholder="seu@email.com"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Senha</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          disabled={pending}
          placeholder="Mínimo 8 caracteres"
          className={inputClass}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Confirmar senha</label>
        <input
          name="confirm"
          type="password"
          required
          disabled={pending}
          placeholder="Repita a senha"
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full h-10 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Criando conta...
          </>
        ) : (
          "Criar conta e ativar God Mode"
        )}
      </button>
    </form>
  )
}
