import {
  getStructureStatus,
  isRecordCompleted,
  structureStatusMeta,
  type RecordFilter,
} from "@/app/lib/status";
import type { CompetencyRecord } from "@/app/lib/types";

/* eslint-disable @next/next/no-img-element -- imagem local usada no relatório impresso */

type PrintReportProps = {
  records: CompetencyRecord[];
  directorateLabel: string;
  filter: RecordFilter;
  query: string;
  generatedAt?: string;
};

const filterLabels: Record<RecordFilter, string> = {
  all: "Todos os status",
  pending: "Pendentes de revisão",
  completed: "Revisão concluída",
  new: "Nova estrutura",
  maintained: "Nome mantido",
  renamed: "Renomeado",
  removed: "Não consta no organograma",
};

function formatDate(value?: string) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function ReportMark() {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/brands/suape-symbol.png"
        alt=""
        width={40}
        height={40}
        className="size-10"
      />
      <div>
        <strong className="block text-lg font-black leading-none tracking-[0.05em] text-[#062d46]">
          SUAPE
        </strong>
        <span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.1em] text-[#0b6b88]">
          Complexo Industrial Portuário
        </span>
      </div>
    </div>
  );
}

function ReportRecord({
  record,
  index,
}: {
  record: CompetencyRecord;
  index: number;
}) {
  const status = getStructureStatus(record);
  const statusLabel = structureStatusMeta[status].label;
  const previousName = record.previousName.trim() || "Não informado";
  const currentName = record.currentName.trim() || "Não informado";
  const newCompetence =
    status === "removed"
      ? "Não se aplica"
      : record.newCompetence.trim() || "Não preenchida";

  return (
    <article className="print-record">
      <header className="print-record__header">
        <div className="min-w-0">
          <p className="print-record__eyebrow">
            {String(index + 1).padStart(2, "0")} · {record.directorate}
          </p>
          <h2>{currentName}</h2>
        </div>
        <div className="print-record__status">
          <span>{statusLabel}</span>
          {status !== "removed" ? (
            <strong>{isRecordCompleted(record) ? "Concluído" : "Pendente"}</strong>
          ) : null}
        </div>
      </header>

      <dl className="print-record__names">
        <div>
          <dt>Regimento de 2024</dt>
          <dd>{previousName}</dd>
        </div>
        <div>
          <dt>Organograma atual</dt>
          <dd>{currentName}</dd>
        </div>
      </dl>

      <div className="print-record__competence print-record__competence--previous">
        <h3>Competência de 2024</h3>
        <p>{record.previousCompetence.trim() || "Sem competência registrada."}</p>
      </div>

      <div className="print-record__competence print-record__competence--new">
        <h3>Competência no novo regimento</h3>
        <p>{newCompetence}</p>
      </div>
    </article>
  );
}

export function PrintReport({
  records,
  directorateLabel,
  filter,
  query,
  generatedAt,
}: PrintReportProps) {
  return (
    <section className="print-report" aria-hidden="true">
      <header className="print-report__masthead">
        <ReportMark />
        <div className="print-report__document-id">
          <span>COMPLIANCE SUAPE</span>
          <strong>Revisão do Regimento Interno</strong>
        </div>
      </header>

      <div className="print-report__title">
        <p>RELATÓRIO DE COMPETÊNCIAS</p>
        <h1>{directorateLabel}</h1>
      </div>

      <dl className="print-report__filters">
        <div>
          <dt>Status</dt>
          <dd>{filterLabels[filter]}</dd>
        </div>
        <div>
          <dt>Busca</dt>
          <dd>{query.trim() || "Sem termo"}</dd>
        </div>
        <div>
          <dt>Registros</dt>
          <dd>{records.length}</dd>
        </div>
        <div>
          <dt>Atualização</dt>
          <dd>{formatDate(generatedAt)}</dd>
        </div>
      </dl>

      <div className="print-report__records">
        {records.map((record, index) => (
          <ReportRecord key={record.id} record={record} index={index} />
        ))}
      </div>

      <footer className="print-report__footer">
        Regimento de 2024 · Organograma de 16/06/2026 · Fonte: planilha de trabalho
      </footer>
    </section>
  );
}
