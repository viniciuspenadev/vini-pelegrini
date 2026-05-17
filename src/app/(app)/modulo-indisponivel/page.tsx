import Link from "next/link"
import { Lock, ArrowLeft } from "lucide-react"

export default function ModuloIndisponivelPage() {
  return (
    <div className="min-h-full bg-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-8 max-w-md w-full text-center">
        <div className="size-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <Lock className="size-8 text-amber-500" />
        </div>
        <h1 className="text-lg font-bold text-slate-900 mb-2">Módulo indisponível</h1>
        <p className="text-sm text-slate-500 mb-6">
          Este recurso não está liberado para o seu tenant.
          Entre em contato com o administrador da plataforma se acredita que deveria ter acesso.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <ArrowLeft className="size-4" />
          Voltar para o início
        </Link>
      </div>
    </div>
  )
}
