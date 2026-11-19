import { memo } from "react";
import { DIRECTORATE_FULL_NAMES } from "@/app/lib/pending-report";
import { getStructureStatus } from "@/app/lib/status";
import { DIRECTORATES, type CompetencyRecord, type DirectorateName } from "@/app/lib/types";

const TIME_ZONE = "America/Sao_Paulo";

type DirectorateSummary = {
  directorate: DirectorateName;
  label: string;
  eligible: number;
  done: number;
  missing: CompetencyRecord[];
};

/**
 * Setores que já têm a nova competência escrita, mas ainda sem observação
 * salva na planilha (coluna E). Usa só o que está salvo, não rascunhos.
 */
export function summarizeMissingObservations(records: CompetencyRecord[]) {
  const groups: DirectorateSummary[] = DIRECTORATES.map((directorate) => {
    const eligible = records.filter(
      (record) =>
        record.directorate === directorate &&
        getStructureStatus(record) !== "removed" &&
        record.newCompetence.trim() !== "",
    );
    const missing = eligible.filter((record) => !(record.reviewedCompetence ?? "").trim());
    return {
      directorate,
      label: DIRECTORATE_FULL_NAMES[directorate],
      eligible: eligible.length,
      done: eligible.length - missing.length,
      missing,
    };
  });

  const eligible = groups.reduce((sum, group) => sum + group.eligible, 0);
  const missing = groups.reduce((sum, group) => sum + group.missing.length, 0);
  const withoutNewCompetence = records.filter(
    (record) =>
      getStructureStatus(record) !== "removed" && record.newCompetence.trim() === "",
  ).length;

  return { groups, eligible, missing, done: eligible - missing, withoutNewCompetence };
}

function toDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function observationReportFileName(value?: string) {
  const short = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE })
    .format(toDate(value))
    .replaceAll("/", "-");
  return `Observacoes_Pendentes_Revisao_Regimento_SUAPE_${short}`;
}

function percent(part: number, total: number) {
  if (total === 0) return "—";
  return `${Math.round((part / total) * 100)}%`;
}

function Masthead() {
  return (
    <header className="pending-report__masthead">
      <strong>SUAPE - COMPLEXO INDUSTRIAL PORTUÁRIO</strong>
      <span>COMPLIANCE SUAPE</span>
    </header>
  );
}

function ObservationReportView({
  records,
  generatedAt,
}: {
  records: CompetencyRecord[];
  generatedAt?: string;
}) {
  const date = toDate(generatedAt);
  const longDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: TIME_ZONE,
  }).format(date);
  const shortDate = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  })
    .format(date)
    .replace(":", "h");

  const summary = summarizeMissingObservations(records);
  const pendingGroups = summary.groups.filter((group) => group.missing.length > 0);
  const completeGroups = summary.groups.filter(
    (group) => group.eligible > 0 && group.missing.length === 0,
  );
  const missingLabel = summary.missing === 1 ? "setor sem observação" : "setores sem observação";
  const footerText = `Observações da revisão  |  ${shortDate}  |  Página `;

  const offsets = pendingGroups.map((_, index) =>
    pendingGroups.slice(0, index).reduce((sum, group) => sum + group.missing.length, 0),
  );

  return (
    <section className="pending-report observation-report" aria-hidden="true">
      <style>{`@page pendencias { @bottom-center { content: ${JSON.stringify(footerText)} counter(page); color: #64748b; font-size: 7.5pt; font-family: Aptos, "Segoe UI", Arial, sans-serif; } }`}</style>

      <div className="pending-report__page">
        <Masthead />

        <h1 className="pending-report__title">OBSERVAÇÕES PENDENTES</h1>
        <p className="pending-report__subtitle">Revisão do Regimento Interno</p>

        <dl className="pending-report__meta">
          <div>
            <dt>Data-base</dt>
            <dd>{longDate}</dd>
          </div>
          <div>
            <dt>Atualização</dt>
            <dd>{time}</dd>
          </div>
          <div>
            <dt>Concluído</dt>
            <dd>
              {summary.done} de {summary.eligible} ({percent(summary.done, summary.eligible)})
            </dd>
          </div>
        </dl>

        <p className="pending-report__text">
          <strong>Objetivo.</strong> Relacionar os setores que já têm a nova
          competência escrita, mas ainda não receberam a revisão na coluna de
          observações (competência revisada e observações), separados por
          diretoria.
        </p>

        <div className="pending-report__highlight">
          <div className="pending-report__highlight-number">
            <strong>{summary.missing}</strong>
            <span>{summary.missing === 1 ? "PENDENTE" : "PENDENTES"}</span>
          </div>
          <div className="observation-report__progress">
            <p>
              {summary.missing === 0
                ? "Todos os setores com nova competência já têm observação registrada."
                : `${summary.missing} ${missingLabel} em ${pendingGroups.length} ${pendingGroups.length === 1 ? "diretoria" : "diretorias"}.`}
            </p>
            <div className="observation-report__bar" aria-hidden="true">
              <span
                style={{
                  width: summary.eligible ? `${(summary.done / summary.eligible) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        </div>

        <h2 className="pending-report__section-title">Placar por diretoria</h2>
        <table className="pending-report__table observation-report__table">
          <thead>
            <tr>
              <th scope="col">Diretoria</th>
              <th scope="col">Com observação</th>
              <th scope="col">Faltam</th>
            </tr>
          </thead>
          <tbody>
            {summary.groups
              .filter((group) => group.eligible > 0)
              .map((group) => (
                <tr key={group.directorate}>
                  <td>{group.label}</td>
                  <td>
                    {group.done} de {group.eligible} · {percent(group.done, group.eligible)}
                  </td>
                  <td className={group.missing.length > 0 ? "is-missing" : "is-done"}>
                    {group.missing.length > 0 ? group.missing.length : "✓"}
                  </td>
                </tr>
              ))}
          </tbody>
          <tfoot>
            <tr>
              <td>TOTAL</td>
              <td>
                {summary.done} de {summary.eligible} · {percent(summary.done, summary.eligible)}
              </td>
              <td>{summary.missing}</td>
            </tr>
          </tfoot>
        </table>

        <p className="pending-report__note" style={{ marginTop: "4mm" }}>
          Critério: entram setores do organograma atual com a nova competência
          preenchida e a observação vazia na planilha. Textos ainda não salvos
          não são considerados.
          {summary.withoutNewCompetence > 0
            ? ` ${summary.withoutNewCompetence} ${summary.withoutNewCompetence === 1 ? "setor ainda não tem" : "setores ainda não têm"} a nova competência escrita e não ${summary.withoutNewCompetence === 1 ? "foi contado" : "foram contados"}.`
            : ""}
        </p>
      </div>

      {pendingGroups.length > 0 ? (
        <div className="pending-report__page pending-report__page--break">
          <Masthead />

          <h1 className="pending-report__title">SETORES SEM OBSERVAÇÃO</h1>
          <p className="pending-report__caption">
            Nova competência escrita, aguardando a revisão na coluna de observações
          </p>

          {pendingGroups.map((group, groupIndex) => (
            <section key={group.directorate} className="pending-report__group">
              <h2>
                {group.label.toUpperCase()} - {group.missing.length}{" "}
                {group.missing.length === 1 ? "PENDENTE" : "PENDENTES"}
              </h2>
              <table className="pending-report__items">
                <thead>
                  <tr>
                    <th scope="col">Item</th>
                    <th scope="col">Setor</th>
                  </tr>
                </thead>
                <tbody>
                  {group.missing.map((record, index) => (
                    <tr key={record.id}>
                      <td>{String(offsets[groupIndex] + index + 1).padStart(2, "0")}</td>
                      <td>
                        {record.currentName.trim() ||
                          record.previousName.trim() ||
                          "Não informado"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          {completeGroups.length > 0 ? (
            <p className="pending-report__small">
              Diretorias com todas as observações feitas:{" "}
              {completeGroups.map((group) => group.label).join("; ")}.
            </p>
          ) : null}

          <p className="pending-report__source">
            Fonte: Plataforma Revisão do Regimento Interno - Observações da
            revisão, atualização de {shortDate} às {time}.
          </p>
        </div>
      ) : null}
    </section>
  );
}

/** Relatório escondido que só aparece na impressão (Salvar como PDF). */
export const ObservationReport = memo(ObservationReportView);
