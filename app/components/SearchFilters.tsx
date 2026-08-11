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
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <label htmlFor="sector-search" className="sr-only">
            Buscar cargo, setor ou competência
          </label>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-lg text-slate-400"
          >
            ⌕
          </span>
          <input
            id="sector-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar cargo, setor ou trecho da competência…"
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="status-filter" className="sr-only">
            Filtrar por status da revisão
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as RecordFilter)
            }
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 outline-none transition hover:border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10"
          >
            {filterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {hasFilters && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="min-h-11 rounded-xl px-3.5 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              Limpar filtros
            </button>
          ) : null}
        </div>
      </div>

      <p className="mt-2 px-1 text-xs text-slate-500" aria-live="polite">
        {resultCount === 1
          ? "1 estrutura encontrada"
          : `${resultCount} estruturas encontradas`}
      </p>
    </section>
  );
}
