"use client";

type ExportPdfButtonProps = {
  disabled?: boolean;
  resultCount: number;
  onExport: () => void;
  label?: string;
  variant?: "primary" | "secondary";
};

const variantClassNames = {
  primary:
    "border-[#062d46] bg-[#062d46] text-white hover:bg-[#0b6b88]",
  secondary:
    "border-[#062d46] bg-white text-[#062d46] hover:bg-[#e9eff0]",
};

export function ExportPdfButton({
  disabled = false,
  resultCount,
  onExport,
  label = "Exportar PDF",
  variant = "primary",
}: ExportPdfButtonProps) {
  const unit = resultCount === 1 ? "registro" : "registros";

  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled || resultCount === 0}
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border px-3.5 text-xs font-black transition disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5c400] sm:text-sm ${variantClassNames[variant]}`}
      aria-label={label + ": " + resultCount + " " + unit + " em PDF"}
    >
      <span aria-hidden="true" className="text-base leading-none">
        ↓
      </span>
      {label}
    </button>
  );
}
