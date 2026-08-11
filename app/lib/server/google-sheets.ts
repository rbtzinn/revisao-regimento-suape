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

const REQUEST_TIMEOUT_MS = 12_000;

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

async function requestJson(url: URL, init: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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

export async function listCompetencyRecords(): Promise<RecordsApiResponse> {
  const { url, token } = getConfiguration();
  url.searchParams.set("token", token);

  const body = await requestJson(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const result = parseRecordsResponse(body);

  if (!result) {
    const failure = parseFailureResponse(body);
    if (failure) {
      throw new GoogleSheetsError(
        "upstream",
        failure.code,
        failure.currentValue,
      );
    }
    throw new GoogleSheetsError("invalid-response");
  }

  return result;
}

export async function updateCompetency(
  input: CompetencyUpdateInput,
): Promise<CompetencyUpdateResponse> {
  const { url, token } = getConfiguration();
  const body = await requestJson(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ token, ...input }),
  });
  const result = parseUpdateResponse(body);

  if (result) return result;

  const failure = parseFailureResponse(body);
  if (failure) {
    const kind = failure.code === "CONFLICT" ? "conflict" : "upstream";
    throw new GoogleSheetsError(kind, failure.code, failure.currentValue);
  }

  throw new GoogleSheetsError("invalid-response");
}
