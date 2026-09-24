import { getStructureStatus, isRecordCompleted } from "@/app/lib/status";
import {
  DIRECTORATES,
  type CompetencyRecord,
  type DirectorateName,
} from "@/app/lib/types";

export const DIRECTORATE_FULL_NAMES: Record<DirectorateName, string> = {
  "Auditoria Interna": "Auditoria Interna",
  Presidência: "Presidência",
  Jurídica: "Diretoria Jurídica",
  "Relações Inst.": "Diretoria de Relações Institucionais e Governamentais",
  "Gestão Portuária": "Diretoria de Desenvolvimento e Gestão Portuária",
  Infraestrutura: "Diretoria de Infraestrutura",
  "Sustentab. Inov.": "Diretoria de Sustentabilidade e Inovação",
  "Adm. Finanças": "Diretoria de Administração e Finanças",
  "Gestão Industrial": "Diretoria de Desenvolvimento e Gestão Industrial",
};

export type PendingGroup = {
  directorate: DirectorateName;
  label: string;
  records: CompetencyRecord[];
};

export type PendingSummary = {
  total: number;
  groups: PendingGroup[];
  areasWithoutPending: string[];
  removedCount: number;
};

export type PendingComparison = {
  previousDate: string;
  concluded: string[];
};

export function isRecordPending(record: CompetencyRecord) {
  return getStructureStatus(record) !== "removed" && !isRecordCompleted(record);
}

export function summarizePending(records: CompetencyRecord[]): PendingSummary {
  const groups: PendingGroup[] = [];
  const areasWithoutPending: string[] = [];

  for (const directorate of DIRECTORATES) {
    const pending = records.filter(
      (record) => record.directorate === directorate && isRecordPending(record),
    );
    if (pending.length > 0) {
      groups.push({
        directorate,
        label: DIRECTORATE_FULL_NAMES[directorate],
        records: pending,
      });
    } else {
      areasWithoutPending.push(DIRECTORATE_FULL_NAMES[directorate]);
    }
  }

  return {
    total: groups.reduce((sum, group) => sum + group.records.length, 0),
    groups,
    areasWithoutPending,
    removedCount: records.filter(
      (record) => getStructureStatus(record) === "removed",
    ).length,
  };
}

/* Histórico local dos levantamentos, usado para informar quais unidades
   passaram a CONCLUÍDO desde o último levantamento de um dia anterior. */

const SNAPSHOT_STORAGE_KEY = "pending-report-snapshots";
const MAX_SNAPSHOTS = 12;

type PendingSnapshot = {
  date: string;
  pendingIds: string[];
};

function readSnapshots(): PendingSnapshot[] {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(SNAPSHOT_STORAGE_KEY) ?? "[]",
    );
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is PendingSnapshot =>
        Boolean(item) &&
        typeof item.date === "string" &&
        Array.isArray(item.pendingIds),
    );
  } catch {
    return [];
  }
}

export function compareWithPreviousSnapshot(
  records: CompetencyRecord[],
  date: string,
): PendingComparison | undefined {
  const previous = readSnapshots()
    .filter((snapshot) => snapshot.date < date)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!previous) return undefined;

  const byId = new Map(records.map((record) => [record.id, record]));
  const concluded = previous.pendingIds.flatMap((id) => {
    const record = byId.get(id);
    if (!record || getStructureStatus(record) === "removed") return [];
    return isRecordCompleted(record) ? [record.currentName.trim()] : [];
  });

  return { previousDate: previous.date, concluded };
}

export function saveSnapshot(records: CompetencyRecord[], date: string) {
  const pendingIds = records.filter(isRecordPending).map((record) => record.id);
  const snapshots = readSnapshots().filter((snapshot) => snapshot.date !== date);
  snapshots.push({ date, pendingIds });
  snapshots.sort((a, b) => a.date.localeCompare(b.date));

  try {
    window.localStorage.setItem(
      SNAPSHOT_STORAGE_KEY,
      JSON.stringify(snapshots.slice(-MAX_SNAPSHOTS)),
    );
  } catch {
    // Sem armazenamento local, o relatório sai sem o comparativo.
  }
}
