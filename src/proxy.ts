import { NextRequest, NextResponse } from "next/server"

const PUBLIC_ROUTES = ["/auth/signin", "/auth/signup"]
// Rotas sempre acessíveis, independente de autenticação
const OPEN_ROUTES   = ["/setup", "/p/", "/api/pdf/", "/api/webhooks/"]

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isNextInternal =
    pathname.startsWith("/_next") || pathname.startsWith("/api/auth")

  if (isNextInternal) return NextResponse.next()

  // Rotas abertas passam sempre (setup de bootstrap)
  if (OPEN_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r))

  const sessionCookie =
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token")

  const isAuthenticated = !!sessionCookie

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }

  if (isAuthenticated && isPublic) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
