import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the review portal", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="pt-BR">/i);
  assert.match(html, /<title>Revisão do Regimento Interno<\/title>/i);
  assert.match(html, /Revisão concluída/i);
  assert.doesNotMatch(html, /Revise por diretoria/i);
  assert.doesNotMatch(html, /Compare o regimento/i);
  assert.match(html, /Regimento 2024 × organograma atual/i);
  assert.match(html, /Abrir planilha/i);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
});

test("keeps the production surface free of starter artifacts and secrets", async () => {
  const [page, layout, packageJson, apiSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../app/lib/server/google-sheets.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /ReviewWorkspace/);
  assert.match(layout, /Revisão do Regimento Interno/);
  assert.doesNotMatch(layout, /codex-preview|Starter Project|_sites-preview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(apiSource, /GOOGLE_SHEETS_WEBAPP_TOKEN/);
  assert.doesNotMatch(
    `${page}\n${layout}\n${apiSource}`,
    /AKfycbx522leXpik4KUUbRDimweR0gQXtDJr1IbvlM5tbw4yIAtYeF_Z5b-3ySxs6Q9uSS5a/,
  );

  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
  await access(new URL("public/og.png", templateRoot));
});
