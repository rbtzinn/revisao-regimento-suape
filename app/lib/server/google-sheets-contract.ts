import {
  type CompetencyRecord,
  type CompetencyUpdateResponse,
  isDirectorateName,
  type RecordsApiResponse,
} from "@/app/lib/types";

type JsonObject = Record<string, unknown>;

export interface SheetFailurePayload {
  ok: false;
  code?: string;
  error?: string;
  currentValue?: string;
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isInteger(value: unknown, minimum: number) {
  return Number.isInteger(value) && Number(value) >= minimum;
}

function isRecord(value: unknown): value is CompetencyRecord {
  if (!isObject(value)) return false;

  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isDirectorateName(value.directorate) &&
    isInteger(value.sheetId, 0) &&
    isInteger(value.rowNumber, 7) &&
    typeof value.previousName === "string" &&
    typeof value.currentName === "string" &&
    typeof value.previousCompetence === "string" &&
    typeof value.newCompetence === "string"
  );
}

export function parseRecordsResponse(value: unknown): RecordsApiResponse | null {
  if (
    !isObject(value) ||
    value.ok !== true ||
    !Array.isArray(value.records) ||
    !value.records.every(isRecord) ||
    typeof value.generatedAt !== "string"
  ) {
    return null;
  }

  return {
    ok: true,
    records: value.records,
    generatedAt: value.generatedAt,
  };
}

export function parseUpdateResponse(
  value: unknown,
): CompetencyUpdateResponse | null {
  if (
    !isObject(value) ||
    value.ok !== true ||
    !isRecord(value.record) ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    ok: true,
    record: value.record,
    updatedAt: value.updatedAt,
  };
}

export function parseFailureResponse(value: unknown): SheetFailurePayload | null {
  if (!isObject(value) || value.ok !== false) return null;

  return {
    ok: false,
    code: typeof value.code === "string" ? value.code : undefined,
    error: typeof value.error === "string" ? value.error : undefined,
    currentValue:
      typeof value.currentValue === "string" ? value.currentValue : undefined,
  };
}
