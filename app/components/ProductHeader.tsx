"use client";

/* eslint-disable @next/next/no-img-element -- logos locais, sem redimensionamento remoto */

type ProductHeaderProps = {
  title?: string;
  subtitle?: string;
  lastSyncAt?: string;
  spreadsheetUrl?: string;
  isSyncing?: boolean;
  onSync?: () => void;
};

function BrandLockup() {
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="flex shrink-0 items-center gap-2.5">
        <img
          src="/brands/suape-symbol.png"
          alt="Símbolo de SUAPE"
          width={42}
          height={42}
          className="size-9 sm:size-10"
        />
        <div className="leading-none">
          <strong className="block text-lg font-black tracking-[0.04em] text-white sm:text-xl">
            SUAPE
          </strong>
          <span className="mt-1 hidden whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.08em] text-sky-200 xl:block">
            Complexo Industrial Portuário
          </span>
        </div>
      </div>

      <span aria-hidden="true" className="h-9 w-px shrink-0 bg-white/20" />

      <div
        className="relative h-10 w-[116px] shrink-0 overflow-hidden sm:w-[160px]"
        aria-label="Compliance SUAPE"
        role="img"
      >
        <img
          src="/brands/compliance-suape-white.png"
          alt=""
          width={842}
          height={596}
          className="absolute left-1/2 top-1/2 w-[198px] max-w-none -translate-x-1/2 -translate-y-1/2 sm:w-[255px]"
        />
      </div>
    </div>
  );
}

export function ProductHeader({
  title = "Revisão do Regimento Interno",
  subtitle = "Regimento 2024 × organograma atual",
  lastSyncAt,
  spreadsheetUrl,
  isSyncing = false,
  onSync,
}: ProductHeaderProps) {
  return (
    <header className="relative top-0 z-40 border-b border-white/10 bg-[linear-gradient(105deg,#062e46_0%,#0a4564_55%,#0b5671_100%)] px-4 py-3 text-white shadow-[0_12px_35px_rgba(6,46,70,0.16)] sm:sticky sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-[1600px] gap-3 lg:grid-cols-[auto_minmax(280px,1fr)_auto] lg:items-center lg:gap-7">
        <BrandLockup />

        <div className="min-w-0 border-t border-white/10 pt-3 lg:border-0 lg:pt-0">
          <p className="font-utility truncate text-[10px] font-bold uppercase tracking-[0.16em] text-amber-300 sm:text-xs">
            Grupo de trabalho · Regimento interno
          </p>
          <h1 className="mt-0.5 truncate text-lg font-extrabold tracking-[-0.025em] text-white sm:text-xl">
            {title}
          </h1>
          <p className="hidden text-xs text-sky-100/75 sm:block sm:text-sm">{subtitle}</p>
        </div>

        <div className="no-print flex min-w-0 items-center gap-2 lg:justify-end">
          <div className="hidden min-h-10 items-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 text-xs font-semibold text-emerald-100 sm:inline-flex">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgba(110,231,183,0.12)]"
            />
            <span>
              Planilha conectada
              {lastSyncAt ? (
                <span className="hidden text-emerald-100/65 2xl:inline">
                  {" "}· {lastSyncAt}
                </span>
              ) : null}
            </span>
          </div>

          {onSync ? (
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              aria-label={isSyncing ? "Atualizando dados" : "Atualizar dados"}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/10 px-3 text-sm font-bold text-white transition hover:bg-white/15 disabled:cursor-wait disabled:opacity-60 sm:flex-none"
            >
              <span aria-hidden="true" className={isSyncing ? "animate-spin" : ""}>
                ↻
              </span>
              <span className="ml-1.5 sm:hidden md:inline">
                {isSyncing ? "Atualizando" : "Atualizar"}
              </span>
            </button>
          ) : null}

          {spreadsheetUrl ? (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-amber-400 px-3.5 text-sm font-extrabold text-slate-950 shadow-sm transition hover:bg-amber-300 sm:flex-none"
            >
              Planilha <span aria-hidden="true" className="ml-1.5">↗</span>
            </a>
          ) : null}
        </div>
      </div>
    </header>
  );
}
