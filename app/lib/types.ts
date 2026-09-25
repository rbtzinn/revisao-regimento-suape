export const DIRECTORATES = [
  "Auditoria Interna",
  "Presidência",
  "Jurídica",
  "Relações Inst.",
  "Gestão Portuária",
  "Infraestrutura",
  "Sustentab. Inov.",
  "Adm. Finanças",
  "Gestão Industrial",
] as const;

export type DirectorateName = (typeof DIRECTORATES)[number];

export interface CompetencyRecord {
  id: string;
  directorate: DirectorateName;
  sheetId: number;
  rowNumber: number;
  previousName: string;
  currentName: string;
  previousCompetence: string;
  newCompetence: string;
  /** Coluna E. `null` enquanto o Apps Script publicado não lê essa coluna. */
  reviewedCompetence: string | null;
}

export const COMPETENCY_FIELDS = ["newCompetence", "reviewedCompetence"] as const;

export type CompetencyField = (typeof COMPETENCY_FIELDS)[number];

export interface CompetencyUpdateInput {
  directorate: DirectorateName;
  rowNumber: number;
  field: CompetencyField;
  competence: string;
  expectedCompetence: string;
}

export interface RecordsApiResponse {
  ok: true;
  records: CompetencyRecord[];
  generatedAt: string;
}

export interface CompetencyUpdateResponse {
  ok: true;
  record: CompetencyRecord;
  updatedAt: string;
}

export interface ApiErrorResponse {
  ok: false;
  error: string;
  code?: string;
  currentValue?: string;
}

export function isDirectorateName(value: unknown): value is DirectorateName {
  return (
    typeof value === "string" &&
    (DIRECTORATES as readonly string[]).includes(value)
  );
}

export function isCompetencyField(value: unknown): value is CompetencyField {
  return (
    typeof value === "string" &&
    (COMPETENCY_FIELDS as readonly string[]).includes(value)
  );
}
