const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const SESSION_COOKIE_NAME = "suape_portal_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 12;

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function createSessionToken(secret: string) {
  const payload = toBase64Url(
    encoder.encode(
      JSON.stringify({
        expiresAt: Date.now() + SESSION_DURATION_SECONDS * 1000,
      }),
    ),
  );
  const signature = toBase64Url(await hmac(payload, secret));
  return `${payload}.${signature}`;
}

export async function verifySessionToken(token: string, secret: string) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  const expectedSignature = toBase64Url(await hmac(payload, secret));
  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const parsed = JSON.parse(decoder.decode(fromBase64Url(payload))) as {
      expiresAt?: unknown;
    };
    return (
      typeof parsed.expiresAt === "number" && parsed.expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

export async function passwordsMatch(candidate: string, expected: string) {
  const [candidateHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);

  return safeEqual(
    toBase64Url(new Uint8Array(candidateHash)),
    toBase64Url(new Uint8Array(expectedHash)),
  );
}

export function safeReturnPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  try {
    const url = new URL(value, "https://portal.local");
    if (url.origin !== "https://portal.local" || url.pathname === "/login") {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
