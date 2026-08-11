"use client";

import { useId, useState } from "react";
import type { CompetencyRecord } from "@/app/lib/types";
import {
  getStructureStatus,
  isRecordCompleted,
  type SaveState,
  type StructureStatus,
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

const stripeClasses: Record<StructureStatus, string> = {
  maintained: "bg-sky-500",
  renamed: "bg-emerald-500",
  new: "bg-[#f5c400]",
  removed: "bg-rose-500",
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
      className={`relative min-w-0 overflow-hidden border bg-white transition ${
        expanded
          ? "border-[#0b6b88] shadow-[0_8px_24px_-20px_rgba(6,45,70,0.65)]"
          : "border-slate-300 hover:border-[#0b6b88]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 ${stripeClasses[structureStatus]}`}
      />

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls={regionId}
        className="grid w-full min-w-0 grid-cols-[40px_minmax(0,1fr)] items-start gap-3 py-3 pl-4 pr-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#21b6c7] sm:grid-cols-[44px_minmax(0,1fr)] sm:px-4 sm:pl-5"
      >
        <span
          aria-hidden="true"
          className={`grid size-10 place-items-center rounded-[3px] border text-lg font-light transition sm:size-11 ${
            expanded
              ? "border-[#0b6b88] bg-[#062d46] text-white"
              : "border-slate-300 bg-[#f3f6f6] text-[#0b6b88]"
          }`}
        >
          {expanded ? "−" : "+"}
        </span>

        <span className="block min-w-0">
          <span className="font-utility block break-words text-[9px] font-bold uppercase tracking-[0.15em] text-[#0b6b88] sm:text-[10px]">
            {record.directorate}
          </span>
          <span className="mt-1 block [overflow-wrap:anywhere] text-[15px] font-black leading-snug text-[#0b1f2a] sm:text-[17px]">
            {displayName}
          </span>
          <span className="mt-1 block [overflow-wrap:anywhere] text-xs leading-5 text-slate-600 sm:text-sm">
            {isRemoved ? (
              "Não consta no organograma atual"
            ) : isNew ? (
              "Sem competência em 2024"
            ) : previousName ? (
              <>
                <span className="font-semibold text-slate-500">2024:</span>{" "}
                {previousName}
              </>
            ) : (
              "Nome anterior não informado"
            )}
          </span>
          <span className="mt-2.5 flex min-w-0 flex-wrap items-center gap-1.5">
            <StatusBadge status={structureStatus} />
            {!isRemoved ? (
              <span
                className={`font-utility rounded-[3px] border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] sm:text-[11px] ${
                  isCompleted
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-[#e6ba00] bg-[#fff9d8] text-[#6b5600]"
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
          className="border-t border-slate-300 bg-[#eaf0f1] p-2.5 sm:p-4"
        >
          <div className="grid min-w-0 gap-2.5 xl:grid-cols-2 [&>section]:min-w-0">
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
