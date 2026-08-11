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
    <section className="border border-slate-300 bg-white">
      <header className="border-b border-slate-200 bg-[#f3f6f6] px-3 py-3 sm:px-4">
        <p className="font-utility text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
          Regimento de 2024
        </p>
        <h3 className="mt-0.5 text-sm font-black text-[#0b1f2a]">
          Competência anterior
        </h3>
        {!isNewStructure && previousName ? (
          <p className="mt-1 break-words text-xs leading-5 text-slate-600">
            Função em 2024: <strong>{previousName}</strong>
          </p>
        ) : null}
      </header>

      {trimmedCompetence && !isNewStructure ? (
        <div className="relative p-3 sm:p-4">
          <p
            className={`whitespace-pre-wrap [overflow-wrap:anywhere] text-[14px] leading-6 text-slate-700 sm:text-[15px] sm:leading-7 ${
              isLong && !showFullText ? "max-h-64 overflow-hidden" : ""
            }`}
          >
            {competence}
          </p>
          {isLong && !showFullText ? (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-14 h-20 bg-gradient-to-t from-white to-transparent"
            />
          ) : null}
          {isLong ? (
            <button
              type="button"
              onClick={() => setShowFullText((value) => !value)}
              aria-expanded={showFullText}
              className="relative mt-3 min-h-11 rounded-[3px] border border-[#0b6b88] bg-white px-3 text-sm font-bold text-[#0b6b88] transition hover:bg-[#e9f6f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#21b6c7]"
            >
              {showFullText ? "Recolher texto" : "Ler texto completo"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="m-3 border-l-4 border-[#f5c400] bg-[#fff9d8] p-4 text-sm leading-6 text-[#5b4a00] sm:m-4">
          Sem texto no regimento de 2024.
        </div>
      )}
    </section>
  );
}
