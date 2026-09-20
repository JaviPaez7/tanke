import express from "express";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { rateLimit, userKey } from "../lib/auth.js";
import { rejectCrossSite } from "../lib/csrf.js";

// Las dos defensas que van delante de todas las rutas de /api: el corte de
// peticiones de otros sitios y el limitador. Se prueban con HTTP real para
// que las cabeceras lleguen tal cual las manda un navegador.
let server;
let base;
const nodeEnv = process.env.NODE_ENV;

beforeAll(async () => {
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());

  app.use("/api", rejectCrossSite);
  app.post("/api/echo", (_req, res) => res.json({ ok: true }));
  app.get("/api/echo", (_req, res) => res.json({ ok: true }));

  app.get("/api/limited", rateLimit({ max: 2 }), (_req, res) => res.json({ ok: true }));
  app.get(
    "/api/per-user",
    (req, _res, next) => {
      req.user = { id: req.get("x-user") };
      next();
    },
    rateLimit({ max: 1, key: userKey }),
    (_req, res) => res.json({ ok: true }),
  );

  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));
afterEach(() => {
  process.env.NODE_ENV = nodeEnv;
});

async function call(path, { method = "GET", headers = {} } = {}) {
  const res = await fetch(base + path, { method, headers });
  return { status: res.status, headers: res.headers, data: await res.json().catch(() => null) };
}

describe("rejectCrossSite", () => {
  it("corta escrituras que el navegador marca como de otro sitio", async () => {
    for (const site of ["cross-site", "same-site"]) {
      const res = await call("/api/echo", {
        method: "POST",
        headers: { "sec-fetch-site": site },
      });
      expect(res.status).toBe(403);
    }
  });

  it("deja pasar same-origin, navegaciones directas y clientes sin cabeceras", async () => {
    for (const headers of [{ "sec-fetch-site": "same-origin" }, { "sec-fetch-site": "none" }, {}]) {
      const res = await call("/api/echo", { method: "POST", headers });
      expect(res.status).toBe(200);
    }
  });

  it("no toca las lecturas", async () => {
    const res = await call("/api/echo", { headers: { "sec-fetch-site": "cross-site" } });
    expect(res.status).toBe(200);
  });

  it("en produccion compara Origin con APP_URL si no hay Sec-Fetch-Site", async () => {
    process.env.NODE_ENV = "production";
    process.env.APP_URL = "https://tanke.javistudio.dev";

    const ajena = await call("/api/echo", {
      method: "POST",
      headers: { origin: "https://evil.example" },
    });
    expect(ajena.status).toBe(403);

    const propia = await call("/api/echo", {
      method: "POST",
      headers: { origin: "https://tanke.javistudio.dev" },
    });
    expect(propia.status).toBe(200);
  });
});

describe("rateLimit", () => {
  it("devuelve 429 con cabeceras estandar al pasar el cupo", async () => {
    expect((await call("/api/limited")).status).toBe(200);
    expect((await call("/api/limited")).status).toBe(200);

    const third = await call("/api/limited");
    expect(third.status).toBe(429);
    expect(third.data.error).toMatch(/Demasiados intentos/);
    // Formato draft-7: una sola cabecera RateLimit con limit/remaining/reset.
    expect(third.headers.get("ratelimit")).toMatch(/limit=2, remaining=0/);
    expect(third.headers.get("retry-after")).toBeTruthy();
    expect(third.headers.get("x-ratelimit-limit")).toBeNull();
  });

  it("con `key` cuenta por usuario y no por IP", async () => {
    expect((await call("/api/per-user", { headers: { "x-user": "a" } })).status).toBe(200);
    expect((await call("/api/per-user", { headers: { "x-user": "a" } })).status).toBe(429);
    // Misma IP, otro usuario: cupo aparte.
    expect((await call("/api/per-user", { headers: { "x-user": "b" } })).status).toBe(200);
  });
});
