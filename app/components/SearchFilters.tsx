"use client";

import type { RecordFilter } from "@/app/lib/status";

type SearchFiltersProps = {
  query: string;
  status: RecordFilter;
  resultCount: number;
  onQueryChange: (query: string) => void;
  onStatusChange: (status: RecordFilter) => void;
  onClear?: () => void;
};

const filterOptions: Array<{ value: RecordFilter; label: string }> = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendentes de revisão" },
  { value: "completed", label: "Revisão concluída" },
  { value: "new", label: "Nova estrutura" },
  { value: "maintained", label: "Nome mantido" },
  { value: "renamed", label: "Renomeado" },
  { value: "removed", label: "Não consta no organograma" },
];

export function SearchFilters({
  query,
  status,
  resultCount,
  onQueryChange,
  onStatusChange,
  onClear,
}: SearchFiltersProps) {
  const hasFilters = query.trim().length > 0 || status !== "all";

  return (
    <section
      aria-label="Busca e filtros"
      className="border border-slate-300 bg-white p-3 sm:p-4"
    >
      <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_230px_auto] md:items-end">
        <label className="block min-w-0" htmlFor="sector-search">
          <span className="font-utility mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Buscar
          </span>
          <input
            id="sector-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Cargo, setor ou competência"
            className="min-h-11 w-full rounded-[3px] border border-slate-300 bg-[#f7f9f9] px-3 text-sm text-[#0b1f2a] outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0b6b88] focus:bg-white focus:ring-2 focus:ring-[#21b6c7]/20"
          />
        </label>

        <label className="block min-w-0" htmlFor="status-filter">
          <span className="font-utility mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Status
          </span>
          <select
            id="status-filter"
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as RecordFilter)
            }
            className="min-h-11 w-full rounded-[3px] border border-slate-300 bg-white px-3 text-sm font-semibold text-[#173b4d] outline-none transition hover:border-slate-400 focus:border-[#0b6b88] focus:ring-2 focus:ring-[#21b6c7]/20"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {hasFilters && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="min-h-11 rounded-[3px] border border-[#0b6b88] bg-white px-4 text-sm font-bold text-[#0b6b88] transition hover:bg-[#e9f6f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21b6c7]"
          >
            Limpar
          </button>
        ) : (
          <span className="hidden md:block" aria-hidden="true" />
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {resultCount === 1
          ? "1 estrutura encontrada"
          : `${resultCount} estruturas encontradas`}
      </p>
    </section>
  );
}
