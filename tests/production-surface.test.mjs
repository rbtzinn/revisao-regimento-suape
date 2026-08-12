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
