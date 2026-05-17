import { requireModule } from "@/lib/modules"

export default async function PedidosLayout({ children }: { children: React.ReactNode }) {
  await requireModule(["pescados.pedidos", "moveis.projetos"])
  return <>{children}</>
}
