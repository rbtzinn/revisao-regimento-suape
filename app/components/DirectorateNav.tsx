"use client";

import type { DirectorateName } from "@/app/lib/types";

export type DirectorateNavItem = {
  id: DirectorateName;
  label?: string;
  shortLabel?: string;
  total: number;
  reviewable: number;
  reviewed: number;
};

type DirectorateNavProps = {
  items: DirectorateNavItem[];
  selectedId: DirectorateName | "all";
  onSelect: (id: DirectorateName | "all") => void;
};

export function DirectorateNav({
  items,
  selectedId,
  onSelect,
}: DirectorateNavProps) {
  const total = items.reduce((sum, item) => sum + item.total, 0);
  const reviewable = items.reduce((sum, item) => sum + item.reviewable, 0);
  const reviewed = items.reduce((sum, item) => sum + item.reviewed, 0);

  return (
    <nav
      aria-label="Filtrar por diretoria"
      className="w-full min-w-0 max-w-full overflow-hidden rounded-[6px] border border-[#062D46]/20 bg-[#F5F7F7] p-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
    >
      <div className="mb-1.5 flex items-center justify-between border-b border-[#062D46]/15 px-1 pb-1.5 lg:mb-2 lg:pb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#062D46]">
          Diretorias
        </p>
        <span className="text-[10px] font-bold tabular-nums text-[#0B6B88]">
          {items.length} áreas
        </span>
      </div>

      <div className="flex w-full max-w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-px-0 pb-1 [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
        <DirectorateButton
          label="Todas as diretorias"
          shortLabel="Todas"
          total={total}
          reviewable={reviewable}
          reviewed={reviewed}
          active={selectedId === "all"}
          onClick={() => onSelect("all")}
        />

        {items.map((item) => (
          <DirectorateButton
            key={item.id}
            label={item.label ?? item.id}
            shortLabel={item.shortLabel}
            total={item.total}
            reviewable={item.reviewable}
            reviewed={item.reviewed}
            active={selectedId === item.id}
            onClick={() => onSelect(item.id)}
          />
        ))}
      </div>
    </nav>
  );
}

type DirectorateButtonProps = {
  label: string;
  shortLabel?: string;
  total: number;
  reviewable: number;
  reviewed: number;
  active: boolean;
  onClick: () => void;
};

function DirectorateButton({
  label,
  shortLabel,
  total,
  reviewable,
  reviewed,
  active,
  onClick,
}: DirectorateButtonProps) {
  const percentage = reviewable > 0 ? Math.round((reviewed / reviewable) * 100) : 0;
  const removed = total - reviewable;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-current={active ? "true" : undefined}
      aria-label={`${label}: ${total} setores mapeados; ${reviewed} de ${reviewable} para revisão concluídos${removed > 0 ? `; ${removed} fora do organograma` : ""}`}
      className={`group relative min-h-16 w-[142px] flex-none snap-start overflow-hidden rounded-[4px] border px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C400] focus-visible:ring-inset lg:min-h-[70px] lg:w-full lg:min-w-0 lg:snap-none lg:px-2.5 lg:py-2 ${
        active
          ? "border-[#062D46] bg-[#062D46] text-white"
          : "border-[#062D46]/20 bg-white text-[#0B1F2A] hover:border-[#0B6B88] hover:bg-cyan-50/40"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${
          active ? "bg-[#F5C400]" : "bg-transparent"
        }`}
      />

      <span className="flex min-w-0 items-start justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-extrabold leading-snug">
          <span className="lg:hidden">{shortLabel ?? label}</span>
          <span className="hidden lg:inline">{label}</span>
        </span>
        <span
          className={`shrink-0 px-1.5 py-0.5 text-[10px] font-black tabular-nums ${
            active
              ? "bg-[#0B6B88] text-white"
              : "bg-[#F5F7F7] text-[#062D46]"
          }`}
        >
          {total}
        </span>
      </span>

      <span
        className={`mt-1.5 block h-1 overflow-hidden ${
          active ? "bg-white/20" : "bg-[#062D46]/10"
        }`}
      >
        <span
          aria-hidden="true"
          className={`block h-full ${
            active ? "bg-[#21B6C7]" : "bg-[#0B6B88]"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </span>

      <span
        className={`mt-1 block text-[9px] font-semibold tabular-nums sm:text-[10px] ${
          active ? "text-cyan-100/75" : "text-[#0B1F2A]/50"
        }`}
      >
        {reviewed}/{reviewable} revisados{removed > 0 ? ` · ${removed} fora` : ""}
      </span>
    </button>
  );
}
