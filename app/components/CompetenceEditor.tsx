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
    <section className="rounded-2xl border border-teal-200 bg-white p-4 ring-4 ring-teal-700/[0.03] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-600">
            Novo regimento
          </p>
          <h3 className="mt-1 text-sm font-bold text-slate-900">
            Competência após a revisão
          </h3>
        </div>
        <span className="max-w-full truncate rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800">
          {currentName}
        </span>
      </div>

      <label
        htmlFor={textareaId}
        className="mt-4 block text-xs font-semibold text-slate-600"
      >
        Texto que ficará no regimento
      </label>
      <textarea
        id={textareaId}
        value={draft}
        onChange={(event) => onDraftChange(event.target.value)}
        disabled={disabled || isSaving}
        rows={12}
        placeholder={
          isNewStructure
            ? "Escreva a competência completa desta nova estrutura…"
            : "Revise ou mantenha a competência anterior…"
        }
        className="mt-2 min-h-72 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-[15px] leading-7 text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:bg-white focus:ring-4 focus:ring-teal-600/10 disabled:cursor-not-allowed disabled:opacity-60"
      />

      <SaveFeedback
        saveState={saveState}
        feedbackMessage={feedbackMessage}
        isDirty={isDirty}
      />

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {canKeepPrevious ? (
          <button
            type="button"
            onClick={keepPreviousText}
            disabled={disabled || isSaving}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
          >
            Manter texto anterior
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={disabled || isSaving || !isDirty}
          className="min-h-11 rounded-xl bg-teal-800 px-5 text-sm font-bold text-white shadow-sm shadow-teal-900/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          {isSaving ? "Salvando…" : "Salvar alteração"}
        </button>
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

  return (
    <div
      className="mt-3 flex min-h-6 items-start gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {saveState !== "idle" ? (
        <span
          aria-hidden="true"
          className={`mt-1.5 size-2 shrink-0 rounded-full ${
            saveState === "saved"
              ? "bg-emerald-500"
              : saveState === "error"
                ? "bg-red-500"
                : saveState === "conflict"
                  ? "bg-amber-500"
                  : "animate-pulse bg-teal-500"
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
          (saveState === "idle" && !isDirty
            ? "Nenhuma alteração local."
            : meta.label)}
      </p>
    </div>
  );
}
