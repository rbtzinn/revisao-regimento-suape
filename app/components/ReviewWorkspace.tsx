"use client";

import { useMemo, useState } from "react";
import {
  DirectorateNav,
  ProductHeader,
  ProgressSummary,
  SearchFilters,
  SectorCard,
} from "@/app/components";
import { PortalIntro } from "@/app/components/PortalIntro";
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
    const records = reviewable.filter((record) => record.directorate === name);
    return {
      id: name,
      total: records.length,
      reviewed: records.filter(isRecordCompleted).length,
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
    <div className="min-h-screen">
      <ProductHeader
        lastSyncAt={formatSyncTime(data.lastSyncAt)}
        spreadsheetUrl={SPREADSHEET_URL}
        isSyncing={data.isSyncing}
        onSync={() => void data.refresh()}
      />

      <main className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5 lg:px-8 lg:py-7">
        <PortalIntro />
        <ProgressSummary
          total={reviewable.length}
          reviewed={reviewed}
          pending={reviewable.length - reviewed}
          newStructures={newStructures}
        />

        <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-5">
          <aside className="no-print lg:sticky lg:top-28">
            <DirectorateNav
              items={directorateItems}
              selectedId={directorate}
              onSelect={setDirectorate}
            />
          </aside>

          <section className="min-w-0 space-y-4" aria-labelledby="records-title">
            <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-utility text-xs font-bold uppercase tracking-[0.12em] text-sky-800">
                  Competências por setor
                </p>
                <h2
                  id="records-title"
                  className="mt-1 text-2xl font-bold tracking-[-0.035em] text-slate-950"
                >
                  {sectionTitle}
                </h2>
              </div>
              <p className="text-sm text-slate-500">
                Abra um setor para comparar e editar.
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
              <div className="space-y-3">
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

      <footer className="border-t border-slate-200/80 bg-white/70 px-4 py-5 text-center text-xs leading-5 text-slate-500">
        Fonte única: Regimento Interno de 2024 × Organograma de 16/06/2026.
        As alterações salvas são registradas na coluna D da planilha.
      </footer>
    </div>
  );
}
