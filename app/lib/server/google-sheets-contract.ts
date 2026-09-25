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

function parseRecord(value: unknown): CompetencyRecord | null {
  if (!isObject(value)) return null;

  const isValid =
    typeof value.id === "string" &&
    value.id.length > 0 &&
    isDirectorateName(value.directorate) &&
    isInteger(value.sheetId, 0) &&
    isInteger(value.rowNumber, 7) &&
    typeof value.previousName === "string" &&
    typeof value.currentName === "string" &&
    typeof value.previousCompetence === "string" &&
    typeof value.newCompetence === "string" &&
    (value.reviewedCompetence === undefined ||
      value.reviewedCompetence === null ||
      typeof value.reviewedCompetence === "string");
  if (!isValid) return null;

  // Versões antigas do Apps Script não enviam a coluna E.
  const record = value as unknown as CompetencyRecord;
  return {
    id: record.id,
    directorate: record.directorate,
    sheetId: record.sheetId,
    rowNumber: record.rowNumber,
    previousName: record.previousName,
    currentName: record.currentName,
    previousCompetence: record.previousCompetence,
    newCompetence: record.newCompetence,
    reviewedCompetence:
      typeof value.reviewedCompetence === "string"
        ? value.reviewedCompetence
        : null,
  };
}

export function parseRecordsResponse(value: unknown): RecordsApiResponse | null {
  if (
    !isObject(value) ||
    value.ok !== true ||
    !Array.isArray(value.records) ||
    typeof value.generatedAt !== "string"
  ) {
    return null;
  }

  const records = value.records.map(parseRecord);
  if (records.some((record) => record === null)) return null;

  return {
    ok: true,
    records: records as CompetencyRecord[],
    generatedAt: value.generatedAt,
  };
}

export function parseUpdateResponse(
  value: unknown,
): CompetencyUpdateResponse | null {
  const record = isObject(value) ? parseRecord(value.record) : null;
  if (
    !isObject(value) ||
    value.ok !== true ||
    !record ||
    typeof value.updatedAt !== "string"
  ) {
    return null;
  }

  return {
    ok: true,
    record,
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
