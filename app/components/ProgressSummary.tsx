type ProgressSummaryProps = {
  total: number;
  mappedTotal?: number;
  reviewed: number;
  pending: number;
  newStructures: number;
};

export function ProgressSummary({
  total,
  mappedTotal = total,
  reviewed,
  pending,
  newStructures,
}: ProgressSummaryProps) {
  const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <section
      aria-labelledby="progress-title"
      className="grid overflow-hidden rounded-[6px] border border-[#062D46]/30 bg-white lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.4fr)]"
    >
      <div className="bg-[#062D46] px-3 py-2.5 text-white sm:px-4 sm:py-3.5 lg:border-r lg:border-white/15">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p
              id="progress-title"
              className="text-[10px] font-black uppercase tracking-[0.15em] text-[#21B6C7]"
            >
              Revisão concluída
            </p>
            <p className="text-2xl font-black tabular-nums tracking-[-0.04em] sm:mt-0.5 sm:text-3xl">
              {percentage}%
            </p>
          </div>
          <p className="pb-0.5 text-right text-xs font-bold tabular-nums text-white/75">
            {reviewed} de {total}
            <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] text-cyan-100/55">
              competências
            </span>
          </p>
        </div>

        <progress
          value={reviewed}
          max={Math.max(total, 1)}
          aria-label={`${percentage}% da revisão concluída`}
          className="mt-2 h-1.5 w-full overflow-hidden accent-[#21B6C7] sm:mt-3 sm:h-2 [&::-moz-progress-bar]:bg-[#21B6C7] [&::-webkit-progress-bar]:bg-white/15 [&::-webkit-progress-value]:bg-[#21B6C7]"
        />
      </div>

      <dl className="grid min-w-0 grid-cols-3 divide-x divide-[#062D46]/15 bg-[#F5F7F7]">
        <Metric
          label="Estruturas mapeadas"
          shortLabel="Estruturas"
          value={mappedTotal}
          accent="navy"
        />
        <Metric
          label="Aguardando revisão"
          shortLabel="Pendentes"
          value={pending}
          accent="yellow"
        />
        <Metric
          label="Novas estruturas"
          shortLabel="Novas"
          value={newStructures}
          accent="cyan"
        />
      </dl>
    </section>
  );
}

type MetricProps = {
  label: string;
  shortLabel: string;
  value: number;
  accent: "navy" | "yellow" | "cyan";
};

const accentClasses: Record<MetricProps["accent"], string> = {
  navy: "bg-[#0B6B88]",
  yellow: "bg-[#F5C400]",
  cyan: "bg-[#21B6C7]",
};

function Metric({ label, shortLabel, value, accent }: MetricProps) {
  return (
    <div className="relative flex min-w-0 flex-col px-2.5 py-2.5 sm:px-4 sm:py-4">
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-1 ${accentClasses[accent]}`}
      />
      <dt className="order-2 mt-0.5 text-[10px] font-bold leading-tight text-[#0B1F2A]/65 sm:text-xs">
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </dt>
      <dd className="order-1 text-xl font-black tabular-nums tracking-[-0.035em] text-[#062D46] sm:text-2xl">
        {value}
      </dd>
    </div>
  );
}
