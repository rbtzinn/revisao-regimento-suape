import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, projectRoot), "utf8");
}

test("uses the standard Next.js runtime and keeps the review workflow", async () => {
  const [packageJson, page, workspace, api] = await Promise.all([
    source("package.json"),
    source("app/page.tsx"),
    source("app/components/ReviewWorkspace.tsx"),
    source("app/api/records/route.ts"),
  ]);

  assert.match(packageJson, /"next": "16\.3\.0"/);
  assert.match(packageJson, /"build": "next build"/);
  assert.doesNotMatch(packageJson, /vinext|wrangler|cloudflare/i);
  assert.match(page, /ReviewWorkspace/);
  assert.match(workspace, /ExportPdfButton/);
  assert.match(workspace, /ProductHeader/);
  assert.match(api, /listCompetencyRecords/);
  assert.match(api, /updateCompetency/);
});

test("protects the portal without exposing integration secrets", async () => {
  const [proxy, authRoute, sheets, envExample] = await Promise.all([
    source("proxy.ts"),
    source("app/api/auth/route.ts"),
    source("app/lib/server/google-sheets.ts"),
    source(".env.example"),
  ]);

  assert.match(proxy, /verifySessionToken/);
  assert.match(proxy, /SESSION_COOKIE_NAME/);
  assert.match(authRoute, /PORTAL_ACCESS_PASSWORD/);
  assert.match(authRoute, /PORTAL_SESSION_SECRET/);
  assert.match(sheets, /GOOGLE_SHEETS_WEBAPP_TOKEN/);
  assert.match(envExample, /SEU_DEPLOYMENT_ID/);
  assert.doesNotMatch(
    `${proxy}\n${authRoute}\n${sheets}\n${envExample}`,
    /AKfycbx522leXpik4KUUbRDimweR0gQXtDJr1IbvlM5tbw4yIAtYeF_Z5b-3ySxs6Q9uSS5a/,
  );

  await assert.rejects(access(new URL(".openai/hosting.json", projectRoot)));
  await access(new URL("public/og.png", projectRoot));
});

test("tolerates Apps Script cold starts without repeated focus requests", async () => {
  const [sheets, hook, api] = await Promise.all([
    source("app/lib/server/google-sheets.ts"),
    source("app/hooks/useCompetencyRecords.ts"),
    source("app/api/records/route.ts"),
  ]);

  assert.match(sheets, /READ_TIMEOUT_MS = 25_000/);
  assert.match(sheets, /FRESH_CACHE_MS = 60_000/);
  assert.match(sheets, /STALE_CACHE_MS = 15 \* 60_000/);
  assert.match(sheets, /pendingRecordsRequest/);
  assert.doesNotMatch(hook, /addEventListener\("focus"/);
  assert.match(hook, /refreshInFlightRef/);
  assert.match(api, /maxDuration = 60/);
});

test("exports the pending survey in the format the chief expects", async () => {
  const [workspace, report, pending] = await Promise.all([
    source("app/components/ReviewWorkspace.tsx"),
    source("app/components/PendingReport.tsx"),
    source("app/lib/pending-report.ts"),
  ]);

  assert.match(workspace, /Levantamento de pendências/);
  assert.match(workspace, /PendingReport/);
  assert.match(report, /LEVANTAMENTO DE PENDÊNCIAS/);
  assert.match(report, /RELAÇÃO DETALHADA DAS PENDÊNCIAS/);
  assert.match(report, /Levantamento_Pendencias_Revisao_Regimento_SUAPE_/);
  assert.match(pending, /compareWithPreviousSnapshot/);
});

test("keeps a reviewed competence column next to the new competence", async () => {
  const [types, contract, card, sheets, appsScript] = await Promise.all([
    source("app/lib/types.ts"),
    source("app/lib/server/google-sheets-contract.ts"),
    source("app/components/SectorCard.tsx"),
    source("app/lib/server/google-sheets.ts"),
    source("apps-script/Code.gs"),
  ]);

  assert.match(types, /reviewedCompetence: string \| null/);
  assert.match(contract, /Versões antigas do Apps Script não enviam a coluna E/);
  assert.match(card, /Competência revisada/);
  assert.match(sheets, /unsupported-field/);
  assert.match(appsScript, /reviewedCompetence: 5/);
  assert.match(appsScript, /function prepararColunaCompetenciaRevisada/);
});

test("shows the org chart fed by the same spreadsheet", async () => {
  const [page, explorer, chart] = await Promise.all([
    source("app/organograma/page.tsx"),
    source("app/components/OrgChartExplorer.tsx"),
    source("app/lib/org-chart.ts"),
  ]);

  assert.match(page, /OrgChartExplorer/);
  assert.match(explorer, /useCompetencyRecords/);
  assert.match(explorer, /searchOrgChart/);
  assert.match(explorer, /Ver todo o organograma/);
  assert.match(explorer, /Voltar para a visualização anterior/);
  assert.match(chart, /Diretoria de Administração e Finanças/);
  assert.doesNotMatch(explorer, /method: "PUT"/);
});

test("offers a large screen to write the reviewed competence and notes", async () => {
  const [page, workspace] = await Promise.all([
    source("app/observacao/page.tsx"),
    source("app/components/ObservationWorkspace.tsx"),
  ]);

  assert.match(page, /ObservationWorkspace/);
  assert.match(workspace, /useCompetencyRecords/);
  assert.match(workspace, /reviewedCompetence/);
  assert.match(workspace, /saveRecord/);
  assert.match(workspace, /Competência de 2024/);
  assert.match(workspace, /Nova competência/);
});

test("can use the official Sheets API instead of Apps Script without moving data", async () => {
  const [sheets, api, envExample] = await Promise.all([
    source("app/lib/server/google-sheets.ts"),
    source("app/lib/server/google-sheets-api.ts"),
    source(".env.example"),
  ]);

  assert.match(sheets, /hasServiceAccount\(\)/);
  assert.match(sheets, /GOOGLE_SHEETS_WEBAPP_TOKEN/);
  assert.match(api, /GOOGLE_SERVICE_ACCOUNT_JSON/);
  assert.match(api, /valueInputOption=RAW/);
  assert.match(api, /"CONFLICT"/);
  assert.match(envExample, /GOOGLE_SERVICE_ACCOUNT_JSON/);
});
