"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next: nextPath }),
      });
      const result = (await response.json()) as { error?: string; next?: string };
      if (!response.ok) {
        setError(result.error ?? "Não foi possível entrar.");
        return;
      }
      router.replace(result.next ?? "/");
      router.refresh();
    } catch {
      setError("Não foi possível acessar o portal. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-5">
      <div>
        <label
          htmlFor="portal-password"
          className="font-utility text-xs font-bold uppercase tracking-[0.14em] text-[#0b6b88]"
        >
          Senha de acesso
        </label>
        <input
          id="portal-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 h-12 w-full border border-slate-300 bg-white px-4 text-base text-[#0b1f2a] outline-none transition focus:border-[#0b6b88] focus:ring-4 focus:ring-[#21b6c7]/20"
        />
      </div>

      {error ? (
        <p role="alert" className="border-l-4 border-[#b44b42] bg-red-50 px-3 py-2 text-sm font-semibold text-[#8f332c]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-12 w-full items-center justify-center bg-[#f5c400] px-5 text-sm font-black text-[#0b1f2a] transition hover:bg-[#ffdb34] disabled:cursor-wait disabled:opacity-65"
      >
        {isSubmitting ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
