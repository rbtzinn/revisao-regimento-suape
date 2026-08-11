"use client";

import type { DirectorateName } from "@/app/lib/types";

export type DirectorateNavItem = {
  id: DirectorateName;
  label?: string;
  shortLabel?: string;
  total: number;
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
  const reviewed = items.reduce((sum, item) => sum + item.reviewed, 0);

  return (
    <nav aria-label="Filtrar por diretoria" className="min-w-0">
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Diretorias
        </p>
        <span className="text-xs font-medium text-slate-400">
          {items.length} áreas
        </span>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain px-1 pb-2 scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-col lg:gap-2 lg:overflow-visible lg:px-0">
        <DirectorateButton
          label="Todas as diretorias"
          shortLabel="Todas"
          total={total}
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
  reviewed: number;
  active: boolean;
  onClick: () => void;
};

function DirectorateButton({
  label,
  shortLabel,
  total,
  reviewed,
  active,
  onClick,
}: DirectorateButtonProps) {
  const percentage = total > 0 ? Math.round((reviewed / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${label}: ${reviewed} de ${total} setores revisados`}
      className={`group relative min-w-[158px] snap-start overflow-hidden rounded-xl border p-3 text-left transition lg:w-full lg:min-w-0 lg:rounded-2xl ${
        active
          ? "border-cyan-400/70 bg-[#071f3d] text-white shadow-[0_10px_24px_-16px_rgba(7,31,61,0.95)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:bg-cyan-50/40"
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-0.5 ${
          active ? "bg-cyan-400" : "bg-transparent"
        }`}
      />
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-sm font-semibold leading-snug">
          <span className="lg:hidden">{shortLabel ?? label}</span>
          <span className="hidden lg:inline">{label}</span>
        </span>
        <span
          className={`shrink-0 rounded-lg px-2 py-0.5 text-xs font-bold ${
            active
              ? "bg-cyan-300/15 text-cyan-100"
              : "bg-[#071f3d]/[0.06] text-[#071f3d] group-hover:bg-white"
          }`}
        >
          {total}
        </span>
      </span>

      <span
        className={`mt-2 block h-1.5 overflow-hidden rounded-full ${
          active ? "bg-white/15" : "bg-slate-100"
        }`}
      >
        <span
          aria-hidden="true"
          className={`block h-full rounded-full ${
            active ? "bg-cyan-300" : "bg-cyan-600"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </span>
      <span
        className={`mt-1.5 block text-[11px] font-medium ${
          active ? "text-cyan-100/75" : "text-slate-400"
        }`}
      >
        {reviewed} de {total} revisados
      </span>
    </button>
  );
}
