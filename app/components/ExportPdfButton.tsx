"use client";

type ExportPdfButtonProps = {
  disabled?: boolean;
  resultCount: number;
  onExport: () => void;
};

export function ExportPdfButton({
  disabled = false,
  resultCount,
  onExport,
}: ExportPdfButtonProps) {
  const label = resultCount === 1 ? "registro" : "registros";

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled || resultCount === 0}
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-[#062d46] bg-[#062d46] px-3.5 text-xs font-black text-white transition hover:bg-[#0b6b88] disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c400] sm:text-sm"
      aria-label={"Exportar " + resultCount + " " + label + " em PDF"}
    >
      <span aria-hidden="true" className="text-base leading-none">
        ↓
      </span>
      Exportar PDF
    </button>
  );
}
