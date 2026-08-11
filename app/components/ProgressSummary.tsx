type ProgressSummaryProps = {
  total: number;
  reviewed: number;
  pending: number;
  newStructures: number;
};

export function ProgressSummary({
  total,
  reviewed,
  pending,
  newStructures,
}: ProgressSummaryProps) {
  const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <section
      aria-labelledby="progress-title"
      className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-[1.6fr_repeat(3,1fr)]"
    >
      <div className="relative col-span-3 overflow-hidden rounded-2xl border border-cyan-300/15 bg-[#071f3d] p-4 text-white shadow-[0_14px_35px_-22px_rgba(7,31,61,0.85)] sm:p-5 md:col-span-2 xl:col-span-1">
        <span
          aria-hidden="true"
          className="absolute -right-8 -top-12 size-32 rounded-full border border-cyan-300/15"
        />
        <div className="relative flex items-start justify-between gap-3 sm:gap-4">
          <div>
            <p
              id="progress-title"
              className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300 sm:text-xs"
            >
              Progresso geral
            </p>
            <p className="mt-0.5 text-3xl font-black tracking-[-0.05em] sm:mt-1 sm:text-4xl">
              {percentage}%
            </p>
          </div>
          <div className="rounded-xl border border-cyan-100/15 bg-cyan-50/10 px-2.5 py-1.5 text-right sm:px-3 sm:py-2">
            <p className="text-[10px] text-cyan-100/70 sm:text-xs">
              Concluídos
            </p>
            <p className="text-xs font-bold tabular-nums sm:text-sm">
              {reviewed} / {total}
            </p>
          </div>
        </div>
        <progress
          value={reviewed}
          max={Math.max(total, 1)}
          aria-label={`${percentage}% da revisão concluída`}
          className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full accent-cyan-300 sm:mt-5 sm:h-2 [&::-moz-progress-bar]:bg-cyan-300 [&::-webkit-progress-bar]:bg-white/15 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-cyan-300"
        />
        <p className="relative mt-2 hidden text-xs leading-relaxed text-slate-300 sm:block">
          Cada competência salva é refletida diretamente na planilha de trabalho.
        </p>
      </div>

      <MetricCard
        label="Estruturas mapeadas"
        shortLabel="Estruturas"
        value={total}
        detail="no organograma atual"
        tone="navy"
      />
      <MetricCard
        label="Aguardando revisão"
        shortLabel="Pendentes"
        value={pending}
        detail="competências pendentes"
        tone="yellow"
      />
      <MetricCard
        label="Novas estruturas"
        shortLabel="Novas"
        value={newStructures}
        detail="exigem texto completo"
        tone="cyan"
      />
    </section>
  );
}

type MetricCardProps = {
  label: string;
  shortLabel: string;
  value: number;
  detail: string;
  tone: "navy" | "yellow" | "cyan";
};

const metricToneClasses: Record<MetricCardProps["tone"], string> = {
  navy: "border-[#071f3d]/10 bg-[#071f3d]/[0.06] text-[#071f3d]",
  yellow: "border-amber-300/60 bg-amber-100/80 text-amber-900",
  cyan: "border-cyan-300/50 bg-cyan-50 text-cyan-800",
};

const metricMark: Record<MetricCardProps["tone"], string> = {
  navy: "#",
  yellow: "!",
  cyan: "+",
};

function MetricCard({
  label,
  shortLabel,
  value,
  detail,
  tone,
}: MetricCardProps) {
  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-[0_8px_24px_-20px_rgba(7,31,61,0.65)] sm:min-h-32 sm:justify-between sm:rounded-2xl sm:p-4">
      <div
        className={`grid size-7 place-items-center rounded-lg border text-xs font-black sm:size-9 sm:rounded-xl sm:text-sm ${metricToneClasses[tone]}`}
        aria-hidden="true"
      >
        {metricMark[tone]}
      </div>
      <div className="mt-2 min-w-0 sm:mt-4">
        <p className="text-xl font-black tabular-nums tracking-[-0.04em] text-[#071f3d] sm:text-2xl">
          {value}
        </p>
        <p className="text-[10px] font-bold leading-tight text-slate-600 sm:hidden">
          {shortLabel}
        </p>
        <p className="hidden text-sm font-semibold text-slate-700 sm:block">
          {label}
        </p>
        <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">
          {detail}
        </p>
      </div>
    </div>
  );
}
