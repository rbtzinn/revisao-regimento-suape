import { createSign } from "node:crypto";
import {
  DIRECTORATES,
  type CompetencyRecord,
  type CompetencyUpdateInput,
  type CompetencyUpdateResponse,
  type DirectorateName,
  type RecordsApiResponse,
} from "@/app/lib/types";
import { GoogleSheetsError } from "@/app/lib/server/google-sheets-error";

/**
 * Leitura e gravação direto pela API oficial do Google Sheets (v4), com uma
 * conta de serviço. É bem mais rápida que o Apps Script: não há tempo de
 * "acordar" o script nem redirecionamento. Fica ativa quando a variável
 * GOOGLE_SERVICE_ACCOUNT_JSON existe; sem ela o portal usa o Apps Script.
 *
 * Mesmo formato de dados do Apps Script (colunas A:E a partir da linha 7,
 * id = "<gid da aba>:<linha>"), então dá para trocar de um para o outro.
 */

const DEFAULT_SPREADSHEET_ID = "1SkfI6e-l68dvD43PC229rBtV3WEKT2Ikm6wDzo1iEpQ";
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";

const FIRST_DATA_ROW = 7;
const FIELD_COLUMNS = { newCompetence: "D", reviewedCompetence: "E" } as const;

const READ_TIMEOUT_MS = 20_000;
const WRITE_TIMEOUT_MS = 20_000;

type ServiceAccount = {
  clientEmail: string;
  privateKey: string;
  tokenUri: string;
};

let cachedToken: { value: string; expiresAt: number } | undefined;
let pendingToken: Promise<string> | undefined;
let cachedSheetIds: Map<string, number> | undefined;

export function hasServiceAccount() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim());
}

function spreadsheetId() {
  return process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || DEFAULT_SPREADSHEET_ID;
}

/** Aceita o JSON da chave colado inteiro ou em base64. */
function readServiceAccount(): ServiceAccount {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) throw new GoogleSheetsError("configuration");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    throw new GoogleSheetsError("configuration", undefined, undefined, "GOOGLE_SERVICE_ACCOUNT_JSON inválido");
  }

  const value = parsed as Record<string, unknown>;
  const clientEmail = typeof value.client_email === "string" ? value.client_email : "";
  const privateKey =
    typeof value.private_key === "string" ? value.private_key.replace(/\\n/g, "\n") : "";
  if (!clientEmail || !privateKey) {
    throw new GoogleSheetsError(
      "configuration",
      undefined,
      undefined,
      "a chave precisa ter client_email e private_key",
    );
  }
  const tokenUri = typeof value.token_uri === "string" ? value.token_uri : DEFAULT_TOKEN_URI;
  return { clientEmail, privateKey, tokenUri };
}

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

async function request(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  label: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  const elapsed = () => `${Date.now() - startedAt}ms`;

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    let body: unknown;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      throw new GoogleSheetsError(
        "invalid-response",
        undefined,
        undefined,
        `${label}: HTTP ${response.status} em ${elapsed()}`,
      );
    }
    if (!response.ok) {
      const error = (body as { error?: { status?: string; message?: string } | string }).error;
      const code = typeof error === "object" ? error?.status : error;
      const message = typeof error === "object" ? error?.message : undefined;
      throw new GoogleSheetsError(
        response.status === 401 || response.status === 403 ? "configuration" : "upstream",
        code ?? String(response.status),
        undefined,
        `${label}: HTTP ${response.status} em ${elapsed()}: ${message ?? ""}`,
      );
    }
    console.info(`[planilha:api] ${label} ok em ${elapsed()}`);
    return body;
  } catch (error) {
    if (error instanceof GoogleSheetsError) throw error;
    if (controller.signal.aborted) {
      throw new GoogleSheetsError("timeout", undefined, undefined, `${label}: sem resposta em ${elapsed()}`);
    }
    throw new GoogleSheetsError(
      "network",
      undefined,
      undefined,
      `${label}: ${error instanceof Error ? error.message : String(error)} em ${elapsed()}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Token de acesso da conta de serviço (vale 1 hora; renovado antes). */
async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  // Chamadas em paralelo esperam o mesmo pedido de token.
  pendingToken ??= requestAccessToken().finally(() => {
    pendingToken = undefined;
  });
  return pendingToken;
}

async function requestAccessToken() {

  const account = readServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({
      iss: account.clientEmail,
      scope: SCOPE,
      aud: account.tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  let signature: string;
  try {
    signature = createSign("RSA-SHA256")
      .update(`${header}.${claims}`)
      .sign(account.privateKey, "base64url");
  } catch {
    throw new GoogleSheetsError("configuration", undefined, undefined, "private_key inválida");
  }

  const body = (await request(
    account.tokenUri,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${header}.${claims}.${signature}`,
      }),
    },
    READ_TIMEOUT_MS,
    "token",
  )) as { access_token?: string; expires_in?: number };

  if (!body.access_token) throw new GoogleSheetsError("invalid-response", undefined, undefined, "token sem access_token");
  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

async function authorizedRequest(path: string, init: RequestInit, timeoutMs: number, label: string) {
  const token = await accessToken();
  return request(
    `${SHEETS_API}/${spreadsheetId()}${path}`,
    { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}`, Accept: "application/json" } },
    timeoutMs,
    label,
  );
}

function quoteSheet(name: string) {
  return `'${name.replace(/'/g, "''")}'`;
}

/** gid de cada aba, que entra no id dos registros (igual ao Apps Script). */
async function sheetIds() {
  if (cachedSheetIds) return cachedSheetIds;
  const body = (await authorizedRequest(
    "?fields=sheets.properties(sheetId,title)",
    { method: "GET" },
    READ_TIMEOUT_MS,
    "abas",
  )) as { sheets?: Array<{ properties?: { sheetId?: number; title?: string } }> };
  const ids = new Map<string, number>();
  for (const sheet of body.sheets ?? []) {
    const { sheetId, title } = sheet.properties ?? {};
    if (typeof sheetId === "number" && typeof title === "string") ids.set(title, sheetId);
  }
  cachedSheetIds = ids;
  return ids;
}

function cell(row: unknown[] | undefined, index: number) {
  const value = row?.[index];
  return value === undefined || value === null ? "" : String(value);
}

function toRecord(
  directorate: DirectorateName,
  sheetId: number,
  rowNumber: number,
  row: unknown[] | undefined,
): CompetencyRecord {
  return {
    id: `${sheetId}:${rowNumber}`,
    directorate,
    sheetId,
    rowNumber,
    previousName: cell(row, 0),
    currentName: cell(row, 1),
    previousCompetence: cell(row, 2),
    newCompetence: cell(row, 3),
    reviewedCompetence: cell(row, 4),
  };
}

function isEmptyRow(row: unknown[] | undefined) {
  return [0, 1, 2, 3].every((index) => cell(row, index).trim() === "");
}

/** Lê as nove abas numa chamada só. */
export async function listRecordsFromApi(): Promise<RecordsApiResponse> {
  const ranges = DIRECTORATES.map(
    (name) => `ranges=${encodeURIComponent(`${quoteSheet(name)}!A${FIRST_DATA_ROW}:E`)}`,
  ).join("&");

  const [ids, body] = await Promise.all([
    sheetIds(),
    authorizedRequest(
      `/values:batchGet?${ranges}&valueRenderOption=FORMATTED_VALUE&majorDimension=ROWS`,
      { method: "GET" },
      READ_TIMEOUT_MS,
      "leitura",
    ) as Promise<{ valueRanges?: Array<{ values?: unknown[][] }> }>,
  ]);

  const records: CompetencyRecord[] = [];
  DIRECTORATES.forEach((directorate, index) => {
    const sheetId = ids.get(directorate);
    if (sheetId === undefined) return;
    const rows = body.valueRanges?.[index]?.values ?? [];
    rows.forEach((row, offset) => {
      if (isEmptyRow(row)) return;
      records.push(toRecord(directorate, sheetId, FIRST_DATA_ROW + offset, row));
    });
  });

  return { ok: true, records, generatedAt: new Date().toISOString() };
}

function normalize(value: string) {
  return value.replace(/\r\n/g, "\n");
}

/**
 * Grava uma célula (D ou E). Antes confere se o texto na planilha ainda é o
 * que a pessoa viu; se outra pessoa mudou, devolve conflito sem gravar.
 */
export async function updateRecordViaApi(
  input: CompetencyUpdateInput,
): Promise<CompetencyUpdateResponse> {
  const sheet = quoteSheet(input.directorate);
  const rowRange = `${sheet}!A${input.rowNumber}:E${input.rowNumber}`;

  const [ids, current] = await Promise.all([
    sheetIds(),
    authorizedRequest(
      `/values/${encodeURIComponent(rowRange)}?valueRenderOption=FORMATTED_VALUE`,
      { method: "GET" },
      WRITE_TIMEOUT_MS,
      "linha",
    ) as Promise<{ values?: unknown[][] }>,
  ]);

  const sheetId = ids.get(input.directorate);
  const row = current.values?.[0] ?? [];
  if (sheetId === undefined || isEmptyRow(row)) {
    throw new GoogleSheetsError("upstream", "NOT_FOUND");
  }

  const column = FIELD_COLUMNS[input.field];
  const columnIndex = column.charCodeAt(0) - "A".charCodeAt(0);
  const currentValue = cell(row, columnIndex);
  if (normalize(currentValue) !== normalize(input.expectedCompetence)) {
    throw new GoogleSheetsError("conflict", "CONFLICT", currentValue);
  }

  // RAW: o texto entra exatamente como foi digitado (um "=" não vira fórmula).
  const cellRange = `${sheet}!${column}${input.rowNumber}`;
  await authorizedRequest(
    `/values/${encodeURIComponent(cellRange)}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ range: cellRange, majorDimension: "ROWS", values: [[input.competence]] }),
    },
    WRITE_TIMEOUT_MS,
    "gravação",
  );

  const updatedRow = [...row];
  while (updatedRow.length < 5) updatedRow.push("");
  updatedRow[columnIndex] = input.competence;

  return {
    ok: true,
    record: toRecord(input.directorate, sheetId, input.rowNumber, updatedRow),
    updatedAt: new Date().toISOString(),
  };
}
