import {
  type ApiErrorResponse,
  type CompetencyUpdateInput,
  isDirectorateName,
} from "@/app/lib/types";
import {
  GoogleSheetsError,
  listCompetencyRecords,
  updateCompetency,
} from "@/app/lib/server/google-sheets";

export const dynamic = "force-dynamic";

const JSON_HEADERS = { "Cache-Control": "no-store" };
const MAX_REQUEST_SIZE = 100_000;

function errorResponse(
  error: string,
  status: number,
  extras: Pick<ApiErrorResponse, "code" | "currentValue"> = {},
) {
  return Response.json(
    { ok: false, error, ...extras } satisfies ApiErrorResponse,
    { status, headers: JSON_HEADERS },
  );
}

function sheetsErrorResponse(error: unknown) {
  if (!(error instanceof GoogleSheetsError)) {
    return errorResponse("Não foi possível concluir a operação.", 500);
  }

  switch (error.kind) {
    case "configuration":
      return errorResponse(
        "A integração com a planilha ainda não foi configurada.",
        503,
      );
    case "timeout":
      return errorResponse(
        "A planilha demorou demais para responder. Tente novamente.",
        504,
      );
    case "network":
      return errorResponse(
        "Não foi possível acessar a planilha. Tente novamente.",
        502,
      );
    case "conflict":
      return errorResponse(
        "Este texto foi alterado por outra pessoa. Recarregue os dados antes de salvar novamente.",
        409,
        { code: error.upstreamCode, currentValue: error.currentValue },
      );
    case "invalid-response":
      return errorResponse(
        "A planilha respondeu em um formato inesperado.",
        502,
      );
    default:
      return errorResponse(
        "A planilha recusou a operação. Confira os dados e tente novamente.",
        502,
        { code: error.upstreamCode },
      );
  }
}

function parseUpdateInput(value: unknown): CompetencyUpdateInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const input = value as Record<string, unknown>;
  if (
    !isDirectorateName(input.directorate) ||
    !Number.isInteger(input.rowNumber) ||
    Number(input.rowNumber) < 7 ||
    typeof input.competence !== "string" ||
    typeof input.expectedCompetence !== "string"
  ) {
    return null;
  }

  return {
    directorate: input.directorate,
    rowNumber: Number(input.rowNumber),
    competence: input.competence,
    expectedCompetence: input.expectedCompetence,
  };
}

async function readUpdateInput(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_SIZE) return null;

  const text = await request.text();
  if (!text || text.length > MAX_REQUEST_SIZE) return null;

  try {
    return parseUpdateInput(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const result = await listCompetencyRecords();
    return Response.json(result, { headers: JSON_HEADERS });
  } catch (error) {
    return sheetsErrorResponse(error);
  }
}

async function saveCompetency(request: Request) {
  const input = await readUpdateInput(request);
  if (!input) {
    return errorResponse(
      "Informe diretoria, linha, competência e versão atual válidas.",
      400,
    );
  }

  try {
    const result = await updateCompetency(input);
    return Response.json(result, { headers: JSON_HEADERS });
  } catch (error) {
    return sheetsErrorResponse(error);
  }
}

export async function POST(request: Request) {
  return saveCompetency(request);
}

export async function PUT(request: Request) {
  return saveCompetency(request);
}
