"use client";

/* eslint-disable @next/next/no-img-element -- marcas locais com recorte preciso */

type ProductHeaderProps = {
  title?: string;
  subtitle?: string;
  lastSyncAt?: string;
  spreadsheetUrl?: string;
  isSyncing?: boolean;
  onSync?: () => void;
  onSignOut?: () => void;
};

function ComplianceMark() {
  return (
    <>
      <div
        className="relative h-9 w-9 overflow-hidden sm:hidden"
        role="img"
        aria-label="Símbolo do Compliance SUAPE"
      >
        <img
          src="/brands/compliance-suape.png"
          alt=""
          width={842}
          height={596}
          className="absolute left-[-46px] top-[-60px] w-[220px] max-w-none"
        />
      </div>

      <div
        className="relative hidden h-11 w-[150px] overflow-hidden sm:block"
        role="img"
        aria-label="Compliance SUAPE"
      >
        <img
          src="/brands/compliance-suape.png"
          alt=""
          width={842}
          height={596}
          className="absolute left-[-53px] top-[-68px] w-[252px] max-w-none"
        />
      </div>
    </>
  );
}

function BrandStrip() {
  return (
    <div className="border-b border-[#062D46]/15 bg-white px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-12 w-full max-w-[1600px] items-center justify-between sm:h-16">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/brands/suape-symbol.png"
            alt="Símbolo de SUAPE"
            width={40}
            height={40}
            className="size-8 shrink-0 sm:size-10"
          />
          <div className="hidden sm:block">
            <strong className="block text-lg font-black leading-none tracking-[0.04em] text-[#062D46]">
              SUAPE
            </strong>
            <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.11em] text-[#0B6B88]">
              Complexo Industrial Portuário
            </span>
          </div>
        </div>

        <ComplianceMark />
      </div>
    </div>
  );
}

function SheetIcon() {
  return (
    <span
      aria-hidden="true"
      className="grid size-4 grid-cols-2 gap-0.5"
    >
      <span className="bg-current" />
      <span className="bg-current" />
      <span className="bg-current" />
      <span className="bg-current" />
    </span>
  );
}

function SignOutIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d="M10 5H5v14h5" />
      <path d="M13 8l4 4-4 4" />
      <path d="M8 12h9" />
    </svg>
  );
}

export function ProductHeader({
  title = "Revisão do Regimento Interno",
  subtitle = "Regimento 2024 × organograma atual",
  lastSyncAt,
  spreadsheetUrl,
  isSyncing = false,
  onSync,
  onSignOut,
}: ProductHeaderProps) {
  const syncLabel = lastSyncAt
    ? `Planilha conectada. Última sincronização: ${lastSyncAt}`
    : "Planilha conectada";

  return (
    <header className="no-print relative z-40 sm:sticky sm:top-0">
      <BrandStrip />

      <div className="border-b border-black/20 bg-[#062D46] px-4 py-1.5 text-white sm:px-6 sm:py-2.5 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="max-w-[18rem] text-sm font-extrabold leading-tight tracking-[-0.015em] text-white sm:max-w-none sm:truncate sm:text-lg">
              {title}
            </h1>
            <p className="sr-only">{subtitle}</p>
          </div>

          <div className="no-print flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span
              role="status"
              aria-label={syncLabel}
              title={syncLabel}
              className="hidden size-11 items-center justify-center border border-cyan-200/30 bg-[#0B6B88] text-cyan-100 sm:inline-flex sm:w-auto sm:gap-2 sm:px-3"
            >
              <span
                aria-hidden="true"
                className="size-2.5 bg-[#21B6C7] outline outline-2 outline-cyan-100/15"
              />
              <span className="hidden text-xs font-bold sm:inline">Conectada</span>
            </span>

            {onSync ? (
              <button
                type="button"
                onClick={onSync}
                disabled={isSyncing}
                aria-label={isSyncing ? "Atualizando dados" : "Atualizar dados"}
                title={isSyncing ? "Atualizando dados" : "Atualizar dados"}
                className="inline-flex size-11 items-center justify-center border border-white/25 bg-white/[0.06] text-white hover:bg-white/15 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C400] focus-visible:ring-offset-2 focus-visible:ring-offset-[#062D46] sm:w-auto sm:gap-2 sm:px-3"
              >
                <span
                  aria-hidden="true"
                  className={`text-lg leading-none ${isSyncing ? "animate-spin" : ""}`}
                >
                  ↻
                </span>
                <span className="hidden text-xs font-bold sm:inline">
                  {isSyncing ? "Atualizando" : "Atualizar"}
                </span>
              </button>
            ) : null}

            {spreadsheetUrl ? (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Abrir planilha em uma nova aba"
                title="Abrir planilha"
                className="inline-flex size-11 items-center justify-center bg-[#F5C400] text-[#0B1F2A] hover:bg-[#ffdb34] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#062D46] sm:w-auto sm:gap-2 sm:px-3.5"
              >
                <SheetIcon />
                <span className="hidden text-xs font-black sm:inline">Planilha</span>
              </a>
            ) : null}

            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                aria-label="Sair do portal"
                title="Sair"
                className="inline-flex size-11 items-center justify-center border border-white/25 bg-white/[0.06] text-white hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#062D46] sm:w-auto sm:gap-2 sm:px-3"
              >
                <SignOutIcon />
                <span className="hidden text-xs font-bold sm:inline">Sair</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
