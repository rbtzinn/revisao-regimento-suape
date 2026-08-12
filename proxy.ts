import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/app/lib/auth";

export async function proxy(request: NextRequest) {
  const sessionSecret = process.env.PORTAL_SESSION_SECRET;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = Boolean(
    sessionSecret && token && (await verifySessionToken(token, sessionSecret)),
  );

  if (isAuthenticated) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Sessão expirada. Entre novamente para continuar." },
      { status: 401 },
    );
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "next",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brands/|og.png|login|api/auth).*)",
  ],
};
