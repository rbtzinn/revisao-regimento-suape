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

let recordsCache: RecordsCache | undefined;
let pendingRecordsRequest: Promise<RecordsApiResponse> | undefined;

export type GoogleSheetsErrorKind =
  | "configuration"
  | "timeout"
  | "network"
  | "upstream"
  | "invalid-response"
  | "conflict";

export class GoogleSheetsError extends Error {
  constructor(
    readonly kind: GoogleSheetsErrorKind,
    readonly upstreamCode?: string,
    readonly currentValue?: string,
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
      throw new GoogleSheetsError("invalid-response");
    }

    if (!response.ok) {
      const failure = parseFailureResponse(body);
      throw new GoogleSheetsError(
        "upstream",
        failure?.code,
        failure?.currentValue,
      );
    }

    return body;
  } catch (error) {
    if (error instanceof GoogleSheetsError) throw error;
    if (controller.signal.aborted) throw new GoogleSheetsError("timeout");
    throw new GoogleSheetsError("network");
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
        );
      }
      throw new GoogleSheetsError("invalid-response");
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

export async function listCompetencyRecords(): Promise<RecordsApiResponse> {
  const now = Date.now();
  if (recordsCache && now - recordsCache.storedAt < FRESH_CACHE_MS) {
    return recordsCache.value;
  }

  if (pendingRecordsRequest) return pendingRecordsRequest;

  const { url, token } = getConfiguration();
  pendingRecordsRequest = fetchRecordsFromSheet(url, token);

  try {
    const result = await pendingRecordsRequest;
    recordsCache = { value: result, storedAt: Date.now() };
    return result;
  } catch (error) {
    if (recordsCache && Date.now() - recordsCache.storedAt < STALE_CACHE_MS) {
      return recordsCache.value;
    }
    throw error;
  } finally {
    pendingRecordsRequest = undefined;
  }
}

export async function updateCompetency(
  input: CompetencyUpdateInput,
): Promise<CompetencyUpdateResponse> {
  const { url, token } = getConfiguration();
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
    return result;
  }

  const failure = parseFailureResponse(body);
  if (failure) {
    const kind = failure.code === "CONFLICT" ? "conflict" : "upstream";
    throw new GoogleSheetsError(kind, failure.code, failure.currentValue);
  }

  throw new GoogleSheetsError("invalid-response");
}
