export const DIRECTORATES = [
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
}

export interface CompetencyUpdateInput {
  directorate: DirectorateName;
  rowNumber: number;
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
