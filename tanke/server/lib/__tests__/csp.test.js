import { createHash } from "node:crypto";
import express from "express";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  buildPolicy,
  cspHeaderName,
  cspMiddleware,
  inlineScriptHashes,
  summarizeReport,
} from "../csp.js";

const sha = (s) => createHash("sha256").update(s).digest("base64");

describe("inlineScriptHashes", () => {
  it("solo cuenta los scripts inline que el navegador ejecuta", () => {
    const html = `
      <script type="application/ld+json">{"@context":"https://schema.org"}</script>
      <script>window.tema = "claro";</script>
      <script type="module" crossorigin src="/assets/index-abc.js"></script>
      <script type="module">import("/x.js");</script>
      <script type="text/template"><b>no</b></script>
    `;
    expect(inlineScriptHashes(html)).toEqual([sha('window.tema = "claro";'), sha('import("/x.js");')]);
  });

  it("normaliza CRLF como hace el parser del navegador", () => {
    const lf = "<script>var a = 1;\nvar b = 2;</script>";
    const crlf = "<script>var a = 1;\r\nvar b = 2;</script>";
    expect(inlineScriptHashes(crlf)).toEqual(inlineScriptHashes(lf));
    expect(inlineScriptHashes(lf)).toEqual([sha("var a = 1;\nvar b = 2;")]);
  });

  it("devuelve una lista vacia sin scripts inline", () => {
    expect(inlineScriptHashes("<html><body></body></html>")).toEqual([]);
  });
});

describe("buildPolicy", () => {
  it("permite los hashes y no toca frame-ancestors", () => {
    const policy = buildPolicy({ scriptHashes: ["abc=", "def="] });
    expect(policy).toContain("script-src 'self' 'sha256-abc=' 'sha256-def='");
    expect(policy).toContain("connect-src 'self' https://tiles.openfreemap.org");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("report-uri /api/csp-report");
    expect(policy).not.toContain("frame-ancestors");
    expect(policy).not.toContain("unsafe-eval");
  });
});

describe("cabecera", () => {
  const nodeEnv = process.env.CSP_ENFORCE;
  afterEach(() => {
    if (nodeEnv === undefined) delete process.env.CSP_ENFORCE;
    else process.env.CSP_ENFORCE = nodeEnv;
  });

  it("va en modo informe salvo que CSP_ENFORCE sea true", () => {
    delete process.env.CSP_ENFORCE;
    expect(cspHeaderName()).toBe("Content-Security-Policy-Report-Only");
    process.env.CSP_ENFORCE = "true";
    expect(cspHeaderName()).toBe("Content-Security-Policy");
    process.env.CSP_ENFORCE = "1";
    expect(cspHeaderName()).toBe("Content-Security-Policy-Report-Only");
  });

  let server;
  let base;
  beforeAll(async () => {
    const app = express();
    app.use(cspMiddleware({ policy: buildPolicy(), enforce: false }));
    app.get("/", (_req, res) => res.send("ok"));
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });
  afterAll(() => new Promise((resolve) => server.close(resolve)));

  it("se envia en cada respuesta", async () => {
    const res = await fetch(base + "/");
    expect(res.headers.get("content-security-policy-report-only")).toContain("default-src 'self'");
    expect(res.headers.get("content-security-policy")).toBeNull();
  });
});

describe("summarizeReport", () => {
  it("entiende el formato de report-uri y recorta los campos", () => {
    const r = summarizeReport({
      "csp-report": {
        "effective-directive": "script-src",
        "blocked-uri": "https://evil.example/x.js",
        "document-uri": "https://tanke.javistudio.dev/",
        "script-sample": "x".repeat(500),
      },
    });
    expect(r).toMatchObject({
      directive: "script-src",
      blocked: "https://evil.example/x.js",
      document: "https://tanke.javistudio.dev/",
    });
    expect(r.sample).toHaveLength(200);
  });

  it("entiende la Reporting API y no revienta con basura", () => {
    const r = summarizeReport([{ body: { effectiveDirective: "img-src", blockedURL: "data:" } }]);
    expect(r).toMatchObject({ directive: "img-src", blocked: "data:", document: "-" });
    expect(summarizeReport(null)).toMatchObject({ directive: "-", blocked: "-" });
    expect(summarizeReport("texto")).toMatchObject({ directive: "-" });
  });
});
