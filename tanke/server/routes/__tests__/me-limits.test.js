import cookieParser from "cookie-parser";
import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Prisma de mentira con lo justo para los topes por cuenta: recuentos y
// altas de favoritas, alertas y avisos.
const db = vi.hoisted(() => {
  const state = { users: [], sessions: [], favorites: [], alerts: [], reports: [] };
  let seq = 0;
  const id = (p) => `${p}-${++seq}`;
  const prisma = {
    state,
    reset() {
      for (const key of Object.keys(state)) state[key].length = 0;
    },
    session: {
      async findUnique({ where }) {
        const s = state.sessions.find((x) => x.tokenHash === where.tokenHash);
        return s ? { ...s, user: state.users.find((u) => u.id === s.userId) } : null;
      },
      async delete() {},
    },
    favorite: {
      async findUnique({ where }) {
        const { userId, stationId } = where.userId_stationId;
        return state.favorites.find((f) => f.userId === userId && f.stationId === stationId) || null;
      },
      async count({ where }) {
        return state.favorites.filter((f) => f.userId === where.userId).length;
      },
      async upsert({ where, create }) {
        const { userId, stationId } = where.userId_stationId;
        let row = state.favorites.find((f) => f.userId === userId && f.stationId === stationId);
        if (!row) {
          row = { id: id("fav"), ...create };
          state.favorites.push(row);
        }
        return row;
      },
    },
    priceAlert: {
      async count({ where }) {
        return state.alerts.filter((a) => a.userId === where.userId && a.active === where.active)
          .length;
      },
      async create({ data }) {
        const row = { id: id("alert"), active: true, ...data };
        state.alerts.push(row);
        return row;
      },
    },
    stationReport: {
      async count({ where }) {
        return state.reports.filter(
          (r) => r.userId === where.userId && r.createdAt >= where.createdAt.gte,
        ).length;
      },
      async create({ data }) {
        const row = { id: id("rep"), createdAt: new Date(), ...data };
        state.reports.push(row);
        return row;
      },
    },
  };
  return prisma;
});

vi.mock("../../db.js", () => ({
  prisma: db,
  requireDb: (_req, _res, next) => next(),
}));

import { attachUser, hashToken } from "../../lib/auth.js";
import { ACCOUNT_LIMITS } from "../../lib/limits.js";
import { registerMeRoutes } from "../me.js";

let server;
let base;

async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      cookie: "tanke_session=tok-user",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", attachUser);
  registerMeRoutes(app);
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  db.reset();
  db.state.users.push({ id: "u-user", email: "user@test", name: "User", role: "user", active: true });
  db.state.sessions.push({
    id: "s2",
    tokenHash: hashToken("tok-user"),
    userId: "u-user",
    expiresAt: new Date(Date.now() + 1e7),
  });
});

const alerta = { provinceId: "35", province: "Las Palmas", fuel: "price95", threshold: 1.2 };

describe("topes por cuenta", () => {
  it("solo acepta provincias reales en las alertas", async () => {
    for (const provinceId of ["35?x=1", "all", "99", ""]) {
      const res = await call("/api/me/alerts", { method: "POST", body: { ...alerta, provinceId } });
      expect(res.status).toBe(400);
    }
    expect((await call("/api/me/alerts", { method: "POST", body: alerta })).status).toBe(201);
  });

  it("limita las alertas activas", async () => {
    for (let i = 0; i < ACCOUNT_LIMITS.activeAlerts; i += 1) {
      db.state.alerts.push({ id: `a${i}`, userId: "u-user", active: true });
    }
    const res = await call("/api/me/alerts", { method: "POST", body: alerta });
    expect(res.status).toBe(400);
    expect(res.data.error).toMatch(/máximo de 20 alertas/);
  });

  it("limita las favoritas pero deja volver a guardar una existente", async () => {
    for (let i = 0; i < ACCOUNT_LIMITS.favorites; i += 1) {
      db.state.favorites.push({ id: `f${i}`, userId: "u-user", stationId: `st-${i}` });
    }
    const nueva = await call("/api/me/favorites", { method: "POST", body: { stationId: "nueva" } });
    expect(nueva.status).toBe(400);

    const repetida = await call("/api/me/favorites", { method: "POST", body: { stationId: "st-3" } });
    expect(repetida.status).toBe(201);
  });

  it("limita los avisos por dia", async () => {
    for (let i = 0; i < ACCOUNT_LIMITS.reportsPerDay; i += 1) {
      db.state.reports.push({ id: `r${i}`, userId: "u-user", createdAt: new Date() });
    }
    const res = await call("/api/me/reports", {
      method: "POST",
      body: { stationId: "1", type: "precio", message: "El precio no cuadra con el surtidor." },
    });
    expect(res.status).toBe(429);
  });
});
