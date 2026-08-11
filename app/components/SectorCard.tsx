"use client";

import { useId, useState } from "react";
import type { CompetencyRecord } from "@/app/lib/types";
import {
  getStructureStatus,
  isRecordCompleted,
  type SaveState,
} from "@/app/lib/status";
import { CompetenceEditor } from "@/app/components/CompetenceEditor";
import { PreviousCompetence } from "@/app/components/PreviousCompetence";
import { RemovedStructureNotice } from "@/app/components/RemovedStructureNotice";
import { StatusBadge } from "@/app/components/StatusBadge";

type SectorCardProps = {
  record: CompetencyRecord;
  draft: string;
  onDraftChange: (value: string) => void;
  onSave: () => void | Promise<void>;
  onKeepPrevious?: () => void;
  saveState?: SaveState;
  feedbackMessage?: string;
  defaultExpanded?: boolean;
  disabled?: boolean;
};

export function SectorCard({
  record,
  draft,
  onDraftChange,
  onSave,
  onKeepPrevious,
  saveState = "idle",
  feedbackMessage,
  defaultExpanded = false,
  disabled = false,
}: SectorCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const regionId = useId();
  const structureStatus = getStructureStatus(record);
  const isCompleted = isRecordCompleted(record);
  const isNew = structureStatus === "new";
  const isRemoved = structureStatus === "removed";
  const currentName = record.currentName.trim() || "Estrutura sem nome";
  const previousName = record.previousName.trim();
  const displayName = isRemoved && previousName ? previousName : currentName;

  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition ${
        expanded
          ? "border-cyan-300/70 shadow-[0_14px_36px_-26px_rgba(7,31,61,0.7)]"
          : "border-slate-200 hover:border-cyan-200 hover:shadow-md"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-0.5 transition-colors ${
          expanded ? "bg-cyan-400" : "bg-[#071f3d]/15"
        }`}
      />
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={regionId}
        className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 p-3.5 pl-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-500 sm:p-5 sm:pl-5"
      >
        <span
          aria-hidden="true"
          className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border text-xs font-black transition sm:size-9 ${
            expanded
              ? "rotate-180 border-cyan-300 bg-cyan-50 text-[#071f3d]"
              : "border-[#071f3d]/15 bg-[#071f3d]/[0.04] text-[#071f3d]/70"
          }`}
        >
          ↓
        </span>

        <span className="block min-w-0">
          <span className="block break-words text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700 sm:text-xs">
            {record.directorate}
          </span>
          <span className="mt-1 block [overflow-wrap:anywhere] text-[15px] font-bold leading-snug text-[#071f3d] sm:text-lg">
            {displayName}
          </span>
          <span className="mt-1.5 block [overflow-wrap:anywhere] text-xs leading-relaxed text-slate-500 sm:text-sm">
            {isNew ? (
              "Sem correspondência no regimento anterior"
            ) : previousName ? (
              <>
                Antes:{" "}
                <span className="font-medium text-slate-700">
                  {previousName}
                </span>
              </>
            ) : (
              "Nome anterior não informado"
            )}
          </span>
          <span className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5">
            <StatusBadge status={structureStatus} />
            {!isRemoved ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  isCompleted
                    ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                    : "border-amber-300/70 bg-amber-50 text-amber-900"
                }`}
              >
                {isCompleted ? "Concluído" : "Pendente"}
              </span>
            ) : null}
          </span>
        </span>
      </button>

      {expanded ? (
        <div
          id={regionId}
          className="border-t border-slate-100 bg-slate-50/70 px-3 py-4 sm:px-5 sm:py-6"
        >
          <div className="mb-3 flex items-center gap-2 px-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400 sm:mb-4 sm:text-[10px]">
            <span className="shrink-0">Regimento 2024</span>
            <span
              aria-hidden="true"
              className="relative h-px min-w-4 flex-1 bg-gradient-to-r from-[#071f3d]/35 via-cyan-400 to-amber-300"
            >
              <span className="absolute -top-1 right-0 size-2 rounded-full border-2 border-slate-50 bg-amber-400" />
            </span>
            <span className="shrink-0">Situação atual</span>
          </div>

          <div className="grid min-w-0 gap-3 sm:gap-4 xl:grid-cols-2 [&>section]:min-w-0">
            <PreviousCompetence
              previousName={previousName}
              competence={record.previousCompetence}
              isNewStructure={isNew}
            />

            {isRemoved ? (
              <RemovedStructureNotice
                previousName={previousName}
                currentName={currentName}
              />
            ) : (
              <CompetenceEditor
                currentName={currentName}
                previousCompetence={record.previousCompetence}
                savedCompetence={record.newCompetence}
                draft={draft}
                isNewStructure={isNew}
                onDraftChange={onDraftChange}
                onSave={onSave}
                onKeepPrevious={onKeepPrevious}
                saveState={saveState}
                feedbackMessage={feedbackMessage}
                disabled={disabled}
              />
            )}
          </div>
        </div>
      ) : null}
    </article>
  );
}
