import type { CompetencyRecord } from "@/app/lib/types";

export type StructureStatus = "new" | "maintained" | "renamed" | "removed";

export type RecordFilter =
  | "all"
  | "pending"
  | "completed"
  | StructureStatus;

export type SaveState =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

type StatusMeta = {
  label: string;
  className: string;
};

export const structureStatusMeta: Record<StructureStatus, StatusMeta> = {
  maintained: {
    label: "Nome mantido",
    className: "border-sky-200 bg-sky-50 text-sky-800",
  },
  renamed: {
    label: "Renomeado",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  new: {
    label: "Nova estrutura",
    className: "border-amber-300 bg-amber-50 text-amber-900",
  },
  removed: {
    label: "Não consta no organograma",
    className: "border-rose-200 bg-rose-50 text-rose-800",
  },
};

export const saveStateMeta: Record<SaveState, StatusMeta> = {
  idle: {
    label: "Alterações não salvas",
    className: "text-slate-500",
  },
  saving: {
    label: "Salvando na planilha…",
    className: "text-sky-800",
  },
  saved: {
    label: "Salvo na planilha",
    className: "text-emerald-700",
  },
  error: {
    label: "Não foi possível salvar",
    className: "text-red-700",
  },
  conflict: {
    label: "A planilha foi alterada por outra pessoa",
    className: "text-amber-800",
  },
};

function normalized(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function isNotLocated(value: string, source: "regimento" | "organograma") {
  return normalized(value).includes(`nao localizado no ${source}`);
}

export function getStructureStatus(
  record: CompetencyRecord,
): StructureStatus {
  const previousName = normalized(record.previousName);
  const currentName = normalized(record.currentName);

  if (!previousName || isNotLocated(record.previousName, "regimento")) {
    return "new";
  }

  if (!currentName || isNotLocated(record.currentName, "organograma")) {
    return "removed";
  }

  return previousName === currentName ? "maintained" : "renamed";
}

export function isRecordCompleted(record: CompetencyRecord) {
  return record.newCompetence.trim().length > 0;
}

export function matchesRecordFilter(
  record: CompetencyRecord,
  filter: RecordFilter,
) {
  if (filter === "all") return true;
  if (filter === "completed") {
    return getStructureStatus(record) !== "removed" && isRecordCompleted(record);
  }
  if (filter === "pending") {
    return getStructureStatus(record) !== "removed" && !isRecordCompleted(record);
  }

  return getStructureStatus(record) === filter;
}
