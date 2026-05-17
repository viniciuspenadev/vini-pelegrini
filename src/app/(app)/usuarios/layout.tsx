import { requireModule } from "@/lib/modules"

export default async function UsuariosLayout({ children }: { children: React.ReactNode }) {
  await requireModule("core.usuarios")
  return <>{children}</>
}
