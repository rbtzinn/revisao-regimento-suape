"use client";

import { useMemo, useState } from "react";
import {
  DirectorateNav,
  ProductHeader,
  ProgressSummary,
  SearchFilters,
  SectorCard,
} from "@/app/components";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/app/components/WorkspaceStates";
import { useCompetencyRecords } from "@/app/hooks/useCompetencyRecords";
import {
  getStructureStatus,
  isRecordCompleted,
  matchesRecordFilter,
  type RecordFilter,
} from "@/app/lib/status";
import { DIRECTORATES, type DirectorateName } from "@/app/lib/types";

const SPREADSHEET_URL =
  "https://docs.google.com/spreadsheets/d/1SkfI6e-l68dvD43PC229rBtV3WEKT2Ikm6wDzo1iEpQ/edit";

function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

function formatSyncTime(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `atualizada às ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  })}`;
}

export function ReviewWorkspace() {
  const data = useCompetencyRecords();
  const [directorate, setDirectorate] = useState<DirectorateName | "all">(
    "Presidência",
  );
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RecordFilter>("all");

  const reviewable = useMemo(
    () => data.records.filter((record) => getStructureStatus(record) !== "removed"),
    [data.records],
  );
  const reviewed = reviewable.filter(isRecordCompleted).length;
  const newStructures = reviewable.filter(
    (record) => getStructureStatus(record) === "new",
  ).length;

  const directorateItems = DIRECTORATES.map((name) => {
    const records = data.records.filter((record) => record.directorate === name);
    const reviewableRecords = records.filter(
      (record) => getStructureStatus(record) !== "removed",
    );
    return {
      id: name,
      total: records.length,
      reviewable: reviewableRecords.length,
      reviewed: reviewableRecords.filter(isRecordCompleted).length,
      shortLabel: name,
    };
  });

  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchable(query.trim());
    return data.records.filter((record) => {
      if (directorate !== "all" && record.directorate !== directorate) return false;
      if (!matchesRecordFilter(record, filter)) return false;
      if (!normalizedQuery) return true;
      return searchable(
        [
          record.previousName,
          record.currentName,
          record.previousCompetence,
          record.newCompetence,
        ].join(" "),
      ).includes(normalizedQuery);
    });
  }, [data.records, directorate, filter, query]);

  const sectionTitle =
    directorate === "all" ? "Todas as diretorias" : directorate;

  return (
    <div className="min-h-screen text-[#0b1f2a]">
      <ProductHeader
        lastSyncAt={formatSyncTime(data.lastSyncAt)}
        spreadsheetUrl={SPREADSHEET_URL}
        isSyncing={data.isSyncing}
        onSync={() => void data.refresh()}
      />

      <main className="mx-auto w-full max-w-[1500px] space-y-4 px-3 py-3 sm:px-5 sm:py-5 lg:px-7 lg:py-6">
        <ProgressSummary
          total={reviewable.length}
          mappedTotal={data.records.length}
          reviewed={reviewed}
          pending={reviewable.length - reviewed}
          newStructures={newStructures}
        />

        <div className="grid min-w-0 gap-4 lg:grid-cols-[230px_minmax(0,1fr)] lg:items-start lg:gap-5">
          <aside className="no-print min-w-0 lg:sticky lg:top-32">
            <DirectorateNav
              items={directorateItems}
              selectedId={directorate}
              onSelect={setDirectorate}
            />
          </aside>

          <section className="min-w-0 space-y-3" aria-labelledby="records-title">
            <div className="flex min-w-0 items-end justify-between gap-3 border-l-4 border-[#f5c400] bg-white px-3 py-2 ring-1 ring-slate-200 sm:px-4 sm:py-3">
              <div className="min-w-0">
                <p className="font-utility text-[10px] font-bold uppercase tracking-[0.16em] text-[#0b6b88] sm:text-xs">
                  Área selecionada
                </p>
                <h2
                  id="records-title"
                  className="mt-0.5 break-words text-xl font-black tracking-[-0.025em] text-[#0b1f2a] sm:text-2xl"
                >
                  {sectionTitle}
                </h2>
              </div>
              <p className="font-utility shrink-0 text-right text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500 sm:text-xs">
                {filteredRecords.length} {filteredRecords.length === 1 ? "setor" : "setores"}
              </p>
            </div>

            <SearchFilters
              query={query}
              status={filter}
              resultCount={filteredRecords.length}
              onQueryChange={setQuery}
              onStatusChange={setFilter}
              onClear={() => {
                setQuery("");
                setFilter("all");
              }}
            />

            {data.isLoading ? <LoadingState /> : null}
            {!data.isLoading && data.loadError && data.records.length === 0 ? (
              <ErrorState message={data.loadError} onRetry={() => void data.refresh()} />
            ) : null}
            {!data.isLoading && !data.loadError && filteredRecords.length === 0 ? (
              <EmptyState />
            ) : null}

            {!data.isLoading && filteredRecords.length > 0 ? (
              <div className="space-y-2.5">
                {filteredRecords.map((record) => (
                  <SectorCard
                    key={record.id}
                    record={record}
                    draft={data.drafts[record.id] ?? record.newCompetence}
                    onDraftChange={(value) => data.updateDraft(record.id, value)}
                    onKeepPrevious={() => data.markPreviousCopied(record.id)}
                    onSave={() => data.saveRecord(record.id)}
                    saveState={data.saveStates[record.id] ?? "idle"}
                    feedbackMessage={data.feedback[record.id]}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-300 bg-[#062d46] px-4 py-4 text-center text-[11px] leading-5 text-slate-200 sm:text-xs">
        Regimento de 2024 · Organograma de 16/06/2026
      </footer>
    </div>
  );
}
