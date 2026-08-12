import Image from "next/image";
import { safeReturnPath } from "@/app/lib/auth";
import { LoginForm } from "@/app/login/LoginForm";

type LoginPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-md border border-slate-200 bg-white shadow-[0_24px_70px_rgba(6,45,70,0.14)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <Image
              src="/brands/suape-symbol.png"
              alt="SUAPE"
              width={40}
              height={40}
              className="size-10 object-contain"
              priority
            />
            <strong className="text-lg font-black tracking-[0.04em] text-[#062d46]">
              SUAPE
            </strong>
          </div>
          <Image
            src="/brands/compliance-suape.png"
            alt="Compliance SUAPE"
            width={126}
            height={48}
            className="h-11 w-auto object-contain object-center"
            priority
          />
        </div>

        <div className="border-t-4 border-[#f5c400] px-5 py-7 sm:px-7 sm:py-9">
          <p className="font-utility text-xs font-bold uppercase tracking-[0.16em] text-[#0b6b88]">
            Acesso restrito
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight tracking-[-0.035em] text-[#062d46]">
            Revisão do Regimento Interno
          </h1>
          <LoginForm nextPath={safeReturnPath(params.next)} />
        </div>
      </section>
    </main>
  );
}
