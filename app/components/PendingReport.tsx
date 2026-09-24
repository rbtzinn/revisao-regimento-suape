import {
  summarizePending,
  type PendingComparison,
} from "@/app/lib/pending-report";
import type { CompetencyRecord } from "@/app/lib/types";

type PendingReportProps = {
  records: CompetencyRecord[];
  generatedAt?: string;
  comparison?: PendingComparison;
};

const TIME_ZONE = "America/Sao_Paulo";

const feminineNumbers = [
  "nenhuma", "uma", "duas", "três", "quatro", "cinco",
  "seis", "sete", "oito", "nove", "dez",
];
const masculineNumbers = [
  "nenhum", "um", "dois", "três", "quatro", "cinco",
  "seis", "sete", "oito", "nove", "dez",
];

function countWord(count: number, gender: "f" | "m") {
  const words = gender === "f" ? feminineNumbers : masculineNumbers;
  return words[count] ?? String(count);
}

function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join("; ")}; e ${items[items.length - 1]}`;
}

function joinNames(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} e ${items[items.length - 1]}`;
}

function toDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function pendingReportDateKey(value?: string) {
  // en-CA formata como AAAA-MM-DD, útil para ordenar os levantamentos.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(
    toDate(value),
  );
}

export function pendingReportFileName(value?: string) {
  const short = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE })
    .format(toDate(value))
    .replaceAll("/", "-");
  return `Levantamento_Pendencias_Revisao_Regimento_SUAPE_${short}`;
}

function formatDateKey(key: string) {
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

export function PendingReport({
  records,
  generatedAt,
  comparison,
}: PendingReportProps) {
  const date = toDate(generatedAt);
  const longDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: TIME_ZONE,
  }).format(date);
  const shortDate = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
  }).format(date);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
  })
    .format(date)
    .replace(":", "h");

  const summary = summarizePending(records);
  const areaCount = summary.groups.length;
  const pendingLabel = summary.total === 1 ? "pendência" : "pendências";
  const byCount = [...summary.groups].sort(
    (a, b) => b.records.length - a.records.length,
  );
  const footerText = `Revisão do Regimento Interno  |  ${shortDate}  |  Página `;

  const groupOffsets = summary.groups.map((_, index) =>
    summary.groups
      .slice(0, index)
      .reduce((sum, group) => sum + group.records.length, 0),
  );

  return (
    <section className="pending-report" aria-hidden="true">
      <style>{`@page pendencias { @bottom-center { content: ${JSON.stringify(footerText)} counter(page); color: #64748b; font-size: 7.5pt; font-family: Aptos, "Segoe UI", Arial, sans-serif; } }`}</style>

      <div className="pending-report__page">
        <header className="pending-report__masthead">
          <strong>SUAPE - COMPLEXO INDUSTRIAL PORTUÁRIO</strong>
          <span>COMPLIANCE SUAPE</span>
        </header>

        <h1 className="pending-report__title">LEVANTAMENTO DE PENDÊNCIAS</h1>
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
            <dt>Status</dt>
            <dd>
              {summary.total} {pendingLabel}
            </dd>
          </div>
        </dl>

        <p className="pending-report__text">
          <strong>Objetivo.</strong> Apresentar a situação das unidades que
          permanecem com status PENDENTE no processo de revisão das competências
          do Regimento Interno, conforme relatório atualizado da plataforma de
          acompanhamento da revisão.
        </p>

        <div className="pending-report__highlight">
          <div className="pending-report__highlight-number">
            <strong>{summary.total}</strong>
            <span>{pendingLabel.toUpperCase()}</span>
          </div>
          <p>
            {summary.total === 0
              ? "Não há unidades com status PENDENTE na data-base deste levantamento."
              : areaCount === 1
                ? `As pendências estão concentradas em uma área: ${summary.groups[0].label}.`
                : `As pendências estão concentradas em ${countWord(areaCount, "f")} áreas: ${joinNames(summary.groups.map((group) => group.label))}.`}
          </p>
        </div>

        {summary.total > 0 ? (
          <>
            <h2 className="pending-report__section-title">
              Distribuição das pendências por área
            </h2>
            <table className="pending-report__table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Área</th>
                  <th scope="col">Pendências</th>
                </tr>
              </thead>
              <tbody>
                {summary.groups.map((group, index) => (
                  <tr key={group.directorate}>
                    <td>{index + 1}</td>
                    <td>{group.label}</td>
                    <td>{group.records.length}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td />
                  <td>TOTAL</td>
                  <td>{summary.total}</td>
                </tr>
              </tfoot>
            </table>
          </>
        ) : null}

        {summary.areasWithoutPending.length > 0 ? (
          <p className="pending-report__small">
            Áreas sem pendências registradas:{" "}
            {joinList(summary.areasWithoutPending)}.
          </p>
        ) : null}

        <p className="pending-report__note">
          Observação: o levantamento considera exclusivamente{" "}
          {summary.total === 1
            ? "o registro exibido"
            : `os ${summary.total} registros exibidos`}{" "}
          com status PENDENTE no relatório atualizado de competências.
          {summary.removedCount > 0
            ? summary.removedCount === 1
              ? ' O registro identificado como "NÃO CONSTA NO ORGANOGRAMA" não foi somado às pendências.'
              : ` Os ${countWord(summary.removedCount, "m")} registros identificados como "NÃO CONSTA NO ORGANOGRAMA" não foram somados às pendências.`
            : null}
        </p>
      </div>

      <div className="pending-report__page pending-report__page--break">
        <header className="pending-report__masthead">
          <strong>SUAPE - COMPLEXO INDUSTRIAL PORTUÁRIO</strong>
          <span>COMPLIANCE SUAPE</span>
        </header>

        <h1 className="pending-report__title">RELAÇÃO DETALHADA DAS PENDÊNCIAS</h1>
        <p className="pending-report__caption">
          Unidades com status PENDENTE no relatório de competências
        </p>

        {summary.groups.map((group, groupIndex) => (
          <section key={group.directorate} className="pending-report__group">
            <h2>
              {group.label.toUpperCase()} - {group.records.length}{" "}
              {group.records.length === 1 ? "PENDÊNCIA" : "PENDÊNCIAS"}
            </h2>
            <table className="pending-report__items">
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col">Unidade</th>
                </tr>
              </thead>
              <tbody>
                {group.records.map((record, index) => (
                  <tr key={record.id}>
                    <td>
                      {String(groupOffsets[groupIndex] + index + 1).padStart(2, "0")}
                    </td>
                    <td>{record.currentName.trim() || "Não informado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        {summary.total > 0 ? (
          <p className="pending-report__text">
            <strong>Síntese para acompanhamento.</strong>{" "}
            {areaCount === 1
              ? `${summary.total === 1 ? "A pendência está concentrada" : `As ${summary.total} pendências estão concentradas`} em ${byCount[0].label}.`
              : `As ${summary.total} pendências estão distribuídas em ${countWord(areaCount, "f")} áreas: ${joinNames(byCount.map((group) => `${group.label} (${group.records.length})`))}.`}
          </p>
        ) : null}

        {comparison ? (
          <p className="pending-report__text">
            {comparison.concluded.length === 0
              ? `Em relação ao levantamento de ${formatDateKey(comparison.previousDate)}, nenhuma unidade passou a CONCLUÍDO.`
              : comparison.concluded.length === 1
                ? `Em relação ao levantamento de ${formatDateKey(comparison.previousDate)}, uma unidade passou a CONCLUÍDO: ${comparison.concluded[0]}.`
                : `Em relação ao levantamento de ${formatDateKey(comparison.previousDate)}, ${countWord(comparison.concluded.length, "f")} unidades passaram a CONCLUÍDO: ${joinList(comparison.concluded)}.`}
          </p>
        ) : null}

        <p className="pending-report__source">
          Fonte: Plataforma Revisão do Regimento Interno - Relatório de
          Competências, atualização de {shortDate} às {time}.
        </p>
      </div>
    </section>
  );
}
