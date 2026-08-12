import {
  createSessionToken,
  passwordsMatch,
  safeReturnPath,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/app/lib/auth";

export const dynamic = "force-dynamic";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function POST(request: Request) {
  const expectedPassword = process.env.PORTAL_ACCESS_PASSWORD;
  const sessionSecret = process.env.PORTAL_SESSION_SECRET;

  if (!expectedPassword || !sessionSecret) {
    return Response.json(
      { error: "A proteção do portal ainda não foi configurada." },
      { status: 503 },
    );
  }

  let input: { password?: unknown; next?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (
    typeof input.password !== "string" ||
    !(await passwordsMatch(input.password, expectedPassword))
  ) {
    return Response.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const response = Response.json({ ok: true, next: safeReturnPath(input.next) });
  const token = await createSessionToken(sessionSecret);
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${token}; Max-Age=${SESSION_DURATION_SECONDS}; Path=/; HttpOnly; SameSite=Strict${COOKIE_OPTIONS.secure ? "; Secure" : ""}`,
  );
  return response;
}

export async function DELETE() {
  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${COOKIE_OPTIONS.secure ? "; Secure" : ""}`,
  );
  return response;
}
