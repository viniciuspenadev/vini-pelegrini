"use client"

import { signIn } from "next-auth/react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignInPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const form = new FormData(e.currentTarget)
    const result = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    })

    setLoading(false)
    if (result?.error) {
      setError("Email ou senha inválidos.")
    } else {
      router.push("/")
    }
  }

  if (!mounted) return null;

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900"
      style={{
        backgroundImage: 'url(/bg-login.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay Escuro para contraste */}
      <div className="absolute inset-0 bg-slate-950/40 mix-blend-multiply" />
      
      {/* Elementos Decorativos Flutuantes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />

      {/* Container Principal */}
      <div className="relative w-full max-w-md px-6 z-10">
        
        {/* Cartão Glassmorphic */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-8 sm:p-10 transform transition-all duration-500 opacity-0 translate-y-4 animate-[fadeInUp_0.5s_ease-out_forwards]">
          
          {/* Cabeçalho do Cartão */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 mb-4 ring-1 ring-white/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">PedidosPro</h1>
            <p className="text-blue-100/70 text-sm mt-2">Bem-vindo de volta! Entre na sua conta.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 group">
              <label className="text-sm font-medium text-white/80 ml-1 transition-colors group-focus-within:text-blue-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="voce@empresa.com"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 transition-all duration-300 focus:border-blue-400 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-400/50 hover:bg-white/10"
              />
            </div>

            <div className="space-y-2 group">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-medium text-white/80 transition-colors group-focus-within:text-blue-300" htmlFor="password">
                  Senha
                </label>
                <button type="button" className="text-xs font-medium text-blue-300 hover:text-white transition-colors">
                  Esqueci a senha
                </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 transition-all duration-300 focus:border-blue-400 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-blue-400/50 hover:bg-white/10"
              />
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 animate-[shake_0.5s_ease-in-out]">
                <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-600/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 group"
            >
              {/* Brilho hover */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 bg-white/20 group-hover:opacity-100 pointer-events-none"></div>
              
              {loading ? (
                <span className="flex items-center justify-center gap-2 relative z-10">
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Conectando...
                </span>
              ) : (
                <span className="relative z-10 font-bold tracking-wide">Entrar no Sistema</span>
              )}
            </button>
          </form>

          {/* Rodapé do Cartão */}
          <div className="mt-8 border-t border-white/10 pt-6 text-center">
            <p className="text-sm text-white/50">
              Não tem uma conta?{" "}
              <a href="#" className="font-medium text-blue-300 hover:text-white transition-colors">
                Solicite acesso
              </a>
            </p>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
      `}} />
    </div>
  )
}
