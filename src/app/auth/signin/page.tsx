"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle } from "lucide-react"

export default function SignInPage() {
  const router  = useRouter()
  const [error,   setError]   = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const form   = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email:    form.get("email"),
      password: form.get("password"),
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("E-mail ou senha inválidos.")
    } else {
      router.push("/")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ── Painel esquerdo — branding (desktop) ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/40" />
        <div className="absolute -bottom-32 -right-16 w-[28rem] h-[28rem] rounded-full bg-blue-700/50" />

        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="size-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-6 ring-1 ring-white/30">
            <svg className="size-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-3">PedidosPro</h1>
          <p className="text-blue-100 text-base leading-relaxed max-w-sm mx-auto">
            Gestão de pedidos inteligente para distribuidoras que querem crescer com controle.
          </p>

          {/* Features */}
          <div className="mt-10 space-y-3 text-left">
            {[
              "Pipeline completo de pedidos",
              "Gestão de clientes e crédito",
              "Controle de rotas e entregas",
              "Relatórios e dashboard em tempo real",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="size-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm text-blue-50">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <div className="size-12 rounded-xl bg-blue-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-600/30">
              <svg className="size-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900">PedidosPro</h1>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Bem-vindo de volta</h2>
              <p className="text-sm text-slate-400 mt-1">Entre com suas credenciais para continuar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  E-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  autoFocus
                  disabled={loading}
                  placeholder="voce@empresa.com"
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    Senha
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Esqueci a senha
                  </button>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:bg-slate-50"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2.5 rounded-lg bg-red-50 border border-red-200 px-3.5 py-3">
                  <AlertCircle className="size-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-slate-400 mt-5">
            Não tem acesso?{" "}
            <a href="#" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors">
              Solicite ao administrador
            </a>
          </p>
        </div>
      </div>

    </div>
  )
}
