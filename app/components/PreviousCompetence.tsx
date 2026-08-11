"use client";

import { useState } from "react";

type PreviousCompetenceProps = {
  previousName: string;
  competence: string;
  isNewStructure: boolean;
};

export function PreviousCompetence({
  previousName,
  competence,
  isNewStructure,
}: PreviousCompetenceProps) {
  const [showFullText, setShowFullText] = useState(false);
  const trimmedCompetence = competence.trim();
  const isLong =
    trimmedCompetence.length > 900 ||
    trimmedCompetence.split(/\r?\n/).length > 12;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Regimento de 2024
          </p>
          <h3 className="mt-1 text-sm font-bold text-slate-800">
            Competência anterior
          </h3>
        </div>
        {!isNewStructure && previousName ? (
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {previousName}
          </span>
        ) : null}
      </div>

      {trimmedCompetence && !isNewStructure ? (
        <div className="relative mt-4">
          <p
            className={`whitespace-pre-wrap text-[15px] leading-7 text-slate-700 ${
              isLong && !showFullText ? "max-h-64 overflow-hidden" : ""
            }`}
          >
            {competence}
          </p>
          {isLong && !showFullText ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent"
            />
          ) : null}
          {isLong ? (
            <button
              type="button"
              onClick={() => setShowFullText((value) => !value)}
              aria-expanded={showFullText}
              className="relative mt-3 min-h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              {showFullText
                ? "Recolher competência"
                : "Ler competência completa"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-violet-200 bg-violet-50 p-4 text-sm leading-relaxed text-violet-800">
          Esta estrutura não possui competência no regimento anterior. O texto
          completo deverá ser redigido ao lado.
        </div>
      )}
    </section>
  );
}
