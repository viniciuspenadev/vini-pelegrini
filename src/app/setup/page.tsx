import { supabaseAdmin } from "@/lib/supabase"
import { redirect } from "next/navigation"
import { Shield, CheckCircle2 } from "lucide-react"
import { SetupForm } from "./setup-form"
import Link from "next/link"

const ERROR_MESSAGES: Record<string, string> = {
  missing:  "Preencha todos os campos.",
  mismatch: "As senhas não coincidem.",
  weak:     "A senha deve ter no mínimo 8 caracteres.",
  exists:   "Já existe uma conta com esse e-mail.",
  unknown:  "Erro inesperado. Tente novamente.",
}

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; done?: string; email?: string }>
}) {
  const { count } = await supabaseAdmin
    .from("platform_admins")
    .select("id", { count: "exact", head: true })

  const params = await searchParams

  // Já configurado e não veio da tela de sucesso → vai para o god
  if ((count ?? 0) > 0 && !params.done) redirect("/god")

  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="flex justify-center mb-8">
          <div className="size-14 rounded-2xl bg-violet-600 flex items-center justify-center">
            {params.done ? (
              <CheckCircle2 className="size-7 text-white" />
            ) : (
              <Shield className="size-7 text-white" />
            )}
          </div>
        </div>

        {params.done ? (
          /* ── Tela de sucesso ── */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
            <h1 className="text-lg font-bold text-white mb-2">
              Conta criada com sucesso!
            </h1>
            <p className="text-sm text-slate-400 mb-2">
              Seu acesso de administrador foi configurado.
            </p>
            {params.email && (
              <p className="text-xs text-slate-500 mb-6">
                E-mail: <span className="text-violet-400 font-mono">{params.email}</span>
              </p>
            )}
            <p className="text-sm text-slate-300 mb-6">
              Agora faça login com as credenciais que acabou de criar para acessar o God Mode.
            </p>
            <Link
              href="/auth/signin"
              className="block w-full h-10 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center"
            >
              Ir para o login →
            </Link>
          </div>
        ) : (
          /* ── Formulário de cadastro ── */
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h1 className="text-lg font-bold text-white text-center mb-1">
              Criar conta do administrador
            </h1>
            <p className="text-sm text-slate-400 text-center mb-6">
              Crie sua conta exclusiva de plataforma.
              Esta página se desativa após o primeiro cadastro.
            </p>

            {errorMessage && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400 text-center">{errorMessage}</p>
              </div>
            )}

            <SetupForm />
          </div>
        )}

        <p className="text-center text-xs text-slate-600 mt-4">
          {params.done
            ? "Esta URL não estará mais disponível após o login."
            : "Após o cadastro esta URL deixa de funcionar."}
        </p>
      </div>
    </div>
  )
}
