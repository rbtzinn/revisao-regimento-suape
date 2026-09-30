import { revalidateTag, unstable_cache } from "next/cache";
import type {
  CompetencyUpdateInput,
  CompetencyUpdateResponse,
  RecordsApiResponse,
} from "@/app/lib/types";
import {
  parseFailureResponse,
  parseRecordsResponse,
  parseUpdateResponse,
} from "@/app/lib/server/google-sheets-contract";

const READ_TIMEOUT_MS = 25_000;
const WRITE_TIMEOUT_MS = 30_000;
const READ_RETRY_DELAY_MS = 800;
const FRESH_CACHE_MS = 60_000;
const STALE_CACHE_MS = 15 * 60_000;

type RecordsCache = {
  value: RecordsApiResponse;
  storedAt: number;
};

// Cópia em memória da instância, atualizada a cada gravação.
let recordsCache: RecordsCache | undefined;
let pendingRecordsRequest: Promise<RecordsApiResponse> | undefined;

/**
 * Cópia compartilhada por todas as instâncias da Vercel (Data Cache). Abrir
 * o portal lê daqui, sem esperar o Apps Script. Ela é apagada na hora
 * quando alguém salva pelo portal ou aperta Atualizar, e se renova sozinha
 * em segundo plano depois de alguns minutos, para trazer edições feitas
 * direto na planilha. Falhas do Apps Script não são guardadas.
 */
const RECORDS_TAG = "planilha-registros";
const SHARED_CACHE_SECONDS = 5 * 60;

export type GoogleSheetsErrorKind =
  | "configuration"
  | "timeout"
  | "network"
  | "upstream"
  | "invalid-response"
  | "conflict"
  | "unsupported-field";

export class GoogleSheetsError extends Error {
  constructor(
    readonly kind: GoogleSheetsErrorKind,
    readonly upstreamCode?: string,
    readonly currentValue?: string,
    readonly detail?: string,
  ) {
    super(kind);
    this.name = "GoogleSheetsError";
  }
}

function getConfiguration() {
  const endpoint = process.env.GOOGLE_SHEETS_WEBAPP_URL?.trim();
  const token = process.env.GOOGLE_SHEETS_WEBAPP_TOKEN?.trim();

  if (!endpoint || !token) {
    throw new GoogleSheetsError("configuration");
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new GoogleSheetsError("configuration");
  }

  if (url.protocol !== "https:") {
    throw new GoogleSheetsError("configuration");
  }

  return { url, token };
}

async function requestJson(
  url: URL,
  init: RequestInit,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  const elapsed = () => `${Date.now() - startedAt}ms`;

  try {
    const response = await fetch(url, {
      ...init,
      redirect: "follow",
      signal: controller.signal,
    });

    const text = await response.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      // O Google devolve uma página HTML quando o script falha ou está sem
      // permissão; o começo dela aparece nos logs da Vercel.
      throw new GoogleSheetsError(
        "invalid-response",
        undefined,
        undefined,
        `HTTP ${response.status} em ${elapsed()}: ${text
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 200)}`,
      );
    }

    if (!response.ok) {
      const failure = parseFailureResponse(body);
      throw new GoogleSheetsError(
        "upstream",
        failure?.code,
        failure?.currentValue,
        `HTTP ${response.status} em ${elapsed()}: ${failure?.error ?? ""}`,
      );
    }

    // Tempo de cada chamada nos logs da Vercel, para acompanhar a lentidão.
    console.info(`[planilha] ${init.method ?? "GET"} ok em ${elapsed()}`);
    return body;
  } catch (error) {
    if (error instanceof GoogleSheetsError) throw error;
    if (controller.signal.aborted) {
      throw new GoogleSheetsError("timeout", undefined, undefined, `sem resposta em ${elapsed()}`);
    }
    throw new GoogleSheetsError(
      "network",
      undefined,
      undefined,
      `${error instanceof Error ? error.message : String(error)} em ${elapsed()}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function canRetryRead(error: unknown) {
  return (
    error instanceof GoogleSheetsError &&
    (error.kind === "timeout" || error.kind === "network")
  );
}

async function fetchRecordsFromSheet(url: URL, token: string) {
  url.searchParams.set("token", token);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const body = await requestJson(
        url,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        },
        READ_TIMEOUT_MS,
      );
      const result = parseRecordsResponse(body);

      if (result) return result;

      const failure = parseFailureResponse(body);
      if (failure) {
        throw new GoogleSheetsError(
          "upstream",
          failure.code,
          failure.currentValue,
          failure.error,
        );
      }
      throw new GoogleSheetsError(
        "invalid-response",
        undefined,
        undefined,
        "JSON fora do formato esperado",
      );
    } catch (error) {
      if (attempt === 0 && canRetryRead(error)) {
        await wait(READ_RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }

  throw new GoogleSheetsError("network");
}

const readSharedRecords = unstable_cache(
  async () => {
    const { url, token } = getConfiguration();
    return fetchRecordsFromSheet(url, token);
  },
  ["planilha-registros-v1"],
  { tags: [RECORDS_TAG], revalidate: SHARED_CACHE_SECONDS },
);

function expireSharedRecords() {
  revalidateTag(RECORDS_TAG, { expire: 0 });
}

function refreshRecords() {
  if (pendingRecordsRequest) return pendingRecordsRequest;

  pendingRecordsRequest = readSharedRecords()
    .then((result) => {
      recordsCache = { value: result, storedAt: Date.now() };
      return result;
    })
    .finally(() => {
      pendingRecordsRequest = undefined;
    });

  return pendingRecordsRequest;
}

type ListOptions = {
  /** Ignora a cópia antiga e espera a planilha (botão de sincronizar). */
  fresh?: boolean;
};

export async function listCompetencyRecords(
  { fresh = false }: ListOptions = {},
): Promise<RecordsApiResponse> {
  const age = recordsCache ? Date.now() - recordsCache.storedAt : Infinity;

  if (!fresh && recordsCache && age < FRESH_CACHE_MS) {
    return recordsCache.value;
  }

  // Atualizar: descarta a cópia compartilhada e espera a planilha.
  if (fresh) expireSharedRecords();

  try {
    return await refreshRecords();
  } catch (error) {
    if (recordsCache && Date.now() - recordsCache.storedAt < STALE_CACHE_MS) {
      return recordsCache.value;
    }
    throw error;
  }
}

function supportsReviewedCompetence() {
  // Sem cópia em memória, confia no navegador: ele só mostra o campo da
  // coluna E quando a planilha já a enviou.
  if (!recordsCache) return true;
  return recordsCache.value.records.some(
    (record) => record.reviewedCompetence !== null,
  );
}

export async function updateCompetency(
  input: CompetencyUpdateInput,
): Promise<CompetencyUpdateResponse> {
  const { url, token } = getConfiguration();

  // Um Apps Script antigo ignora `field` e gravaria o texto na coluna D.
  if (
    input.field === "reviewedCompetence" &&
    !supportsReviewedCompetence()
  ) {
    throw new GoogleSheetsError("unsupported-field");
  }
  const body = await requestJson(
    url,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ token, ...input }),
    },
    WRITE_TIMEOUT_MS,
  );
  const result = parseUpdateResponse(body);

  if (result) {
    if (recordsCache) {
      recordsCache = {
        value: {
          ...recordsCache.value,
          records: recordsCache.value.records.map((record) =>
            record.id === result.record.id ? result.record : record,
          ),
          generatedAt: result.updatedAt,
        },
        storedAt: Date.now(),
      };
    }
    // As outras instâncias passam a ler a planilha de novo.
    expireSharedRecords();
    return result;
  }

  const failure = parseFailureResponse(body);
  if (failure) {
    const kind = failure.code === "CONFLICT" ? "conflict" : "upstream";
    throw new GoogleSheetsError(kind, failure.code, failure.currentValue);
  }

  throw new GoogleSheetsError("invalid-response");
}
