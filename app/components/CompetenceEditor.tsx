"use client";

import { useId } from "react";
import { saveStateMeta, type SaveState } from "@/app/lib/status";

type CompetenceEditorProps = {
  currentName: string;
  previousCompetence: string;
  savedCompetence: string;
  draft: string;
  isNewStructure: boolean;
  onDraftChange: (value: string) => void;
  onSave: () => void | Promise<void>;
  onKeepPrevious?: () => void;
  saveState: SaveState;
  feedbackMessage?: string;
  disabled: boolean;
};

export function CompetenceEditor({
  currentName,
  previousCompetence,
  savedCompetence,
  draft,
  isNewStructure,
  onDraftChange,
  onSave,
  onKeepPrevious,
  saveState,
  feedbackMessage,
  disabled,
}: CompetenceEditorProps) {
  const textareaId = useId();
  const isSaving = saveState === "saving";
  const isDirty = draft !== savedCompetence;
  const canKeepPrevious = !isNewStructure && previousCompetence.trim().length > 0;

  function keepPreviousText() {
    onDraftChange(previousCompetence);
    onKeepPrevious?.();
  }

  return (
    <section className="border border-slate-300 border-t-4 border-t-[#21b6c7] bg-white">
      <header className="border-b border-slate-200 bg-[#f3f6f6] px-3 py-3 sm:px-4">
        <p className="font-utility text-[10px] font-bold uppercase tracking-[0.15em] text-[#0b6b88]">
          Novo regimento
        </p>
        <h3 className="mt-0.5 text-sm font-black text-[#0b1f2a]">
          Competência após a revisão
        </h3>
        <p className="sr-only">Setor: {currentName}</p>
      </header>

      <div className="p-3 sm:p-4">
        <label
          htmlFor={textareaId}
          className="font-utility block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600"
        >
          Texto final
        </label>
        <textarea
          id={textareaId}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          disabled={disabled || isSaving}
          rows={8}
          placeholder={
            isNewStructure
              ? "Escreva a competência completa desta nova estrutura…"
              : "Revise ou mantenha a competência anterior…"
          }
          className="mt-2 min-h-48 w-full resize-y rounded-[3px] border border-slate-300 bg-[#f8fafa] p-3 text-[14px] leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus:border-[#0b6b88] focus:bg-white focus:ring-2 focus:ring-[#21b6c7]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-64 sm:p-4 sm:text-[15px] sm:leading-7"
        />

        <SaveFeedback
          saveState={saveState}
          feedbackMessage={feedbackMessage}
          isDirty={isDirty}
        />

        <div className="mt-3 grid gap-2 sm:flex sm:justify-end">
          {canKeepPrevious ? (
            <button
              type="button"
              onClick={keepPreviousText}
              disabled={disabled || isSaving}
              className="min-h-11 rounded-[3px] border border-slate-400 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21b6c7]"
            >
              Usar texto de 2024
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={disabled || isSaving || !isDirty}
            className="min-h-11 rounded-[3px] bg-[#f5c400] px-5 text-sm font-black text-[#0b1f2a] transition hover:bg-[#ffda1a] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b6b88]"
          >
            {isSaving ? "Salvando…" : "Salvar competência"}
          </button>
        </div>
      </div>
    </section>
  );
}

type SaveFeedbackProps = {
  saveState: SaveState;
  feedbackMessage?: string;
  isDirty: boolean;
};

function SaveFeedback({
  saveState,
  feedbackMessage,
  isDirty,
}: SaveFeedbackProps) {
  const meta = saveStateMeta[saveState];

  if (saveState === "idle" && !isDirty && !feedbackMessage) return null;

  return (
    <div
      className="mt-2 flex min-h-5 items-start gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {saveState !== "idle" ? (
        <span
          aria-hidden="true"
          className={`mt-1.5 size-2 shrink-0 ${
            saveState === "saved"
              ? "bg-emerald-500"
              : saveState === "error"
                ? "bg-red-500"
                : saveState === "conflict"
                  ? "bg-amber-500"
                  : "animate-pulse bg-[#21b6c7]"
          }`}
        />
      ) : null}
      <p
        className={`text-xs leading-5 ${meta.className}`}
        role={
          saveState === "error" || saveState === "conflict"
            ? "alert"
            : "status"
        }
      >
        {feedbackMessage ??
          (saveState === "idle" && !isDirty ? "Sem alterações." : meta.label)}
      </p>
    </div>
  );
}
