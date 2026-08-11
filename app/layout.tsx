import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Revisão do Regimento Interno";
const description =
  "Portal de revisão das competências do Regimento de 2024 conforme o organograma atual.";

export const viewport: Viewport = {
  themeColor: "#062e46",
  colorScheme: "light",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const origin = `${protocol}://${host}`;

  return {
    title,
    description,
    icons: {
      icon: "/brands/suape-symbol.png",
      shortcut: "/brands/suape-symbol.png",
      apple: "/brands/suape-symbol.png",
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pt_BR",
      images: [{ url: `${origin}/og.png`, width: 1672, height: 941, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
