import cookieParser from "cookie-parser";
import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Prisma de mentira para el flujo de verificacion: usuarios, sesiones,
// enlaces de verificacion y de recuperacion. Las rutas se prueban con HTTP
// real y el transporte de correo capturado.
const db = vi.hoisted(() => {
  const state = { users: [], sessions: [], verifications: [], resets: [] };
  let seq = 0;
  const id = (p) => `${p}-${++seq}`;
  const matches = (row, where) =>
    Object.entries(where).every(([key, value]) => {
      if (value && typeof value === "object" && !(value instanceof Date)) {
        if ("not" in value) return row[key] !== value.not;
        if ("gt" in value) return row[key] > value.gt;
      }
      return row[key] === value;
    });
  const prisma = {
    state,
    reset() {
      for (const key of Object.keys(state)) state[key].length = 0;
    },
    $transaction: (fn) => fn(prisma),
    session: {
      async findUnique({ where }) {
        const s = state.sessions.find((x) => x.tokenHash === where.tokenHash);
        return s ? { ...s, user: state.users.find((u) => u.id === s.userId) } : null;
      },
      async create({ data }) {
        const row = { id: id("s"), ...data };
        state.sessions.push(row);
        return row;
      },
      async delete() {},
    },
    user: {
      async findUnique({ where }) {
        return (
          state.users.find((u) => (where.id ? u.id === where.id : u.email === where.email)) || null
        );
      },
      async create({ data }) {
        const row = { id: id("u"), role: "user", active: true, emailVerifiedAt: null, ...data };
        state.users.push(row);
        return row;
      },
      async update({ where, data }) {
        const row = state.users.find((u) => u.id === where.id);
        Object.assign(row, data);
        return row;
      },
    },
    emailVerification: {
      async deleteMany({ where }) {
        const before = state.verifications.length;
        state.verifications = state.verifications.filter((v) => !matches(v, where));
        return { count: before - state.verifications.length };
      },
      async create({ data }) {
        const row = { id: id("v"), usedAt: null, createdAt: new Date(), ...data };
        state.verifications.push(row);
        return row;
      },
      async findUnique({ where }) {
        const v = state.verifications.find((x) => x.tokenHash === where.tokenHash);
        return v ? { ...v, user: state.users.find((u) => u.id === v.userId) } : null;
      },
      async findFirst({ where }) {
        return state.verifications.find((v) => matches(v, where)) || null;
      },
      async updateMany({ where, data }) {
        const rows = state.verifications.filter((v) => matches(v, where));
        rows.forEach((v) => Object.assign(v, data));
        return { count: rows.length };
      },
    },
    passwordReset: {
      async deleteMany({ where }) {
        const before = state.resets.length;
        state.resets = state.resets.filter((r) => r.userId !== where.userId);
        return { count: before - state.resets.length };
      },
    },
  };
  return prisma;
});

const mail = vi.hoisted(() => ({ sent: [] }));

vi.mock("../../db.js", () => ({ prisma: db, requireDb: (_req, _res, next) => next() }));
vi.mock("../../lib/mailer.js", async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    sendEmail: vi.fn(async (message) => {
      mail.sent.push(message);
      return { delivered: true };
    }),
  };
});

import { attachUser, hashPassword, hashToken } from "../../lib/auth.js";
import { registerAuthRoutes } from "../auth.js";

let server;
let base;

// Valores de prueba con nombre: un escaner de secretos los tomaba por
// contraseñas reales.
const CLAVE_ANA = "clave-de-prueba-larga";
const CLAVE_NUEVA = "una-clave-decente-2026";

async function call(path, { method = "GET", body, as } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(as ? { cookie: `tanke_session=tok-${as}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

function tokenFromLastMail() {
  const last = mail.sent.at(-1);
  return new URL(last.text.match(/https?:\S+\/verificar\?token=\S+/)[0]).searchParams.get("token");
}

// La comprobacion en Have I Been Pwned no debe salir a internet desde los
// tests: se intercepta solo esa URL y el resto de fetch sigue siendo real.
const realFetch = globalThis.fetch;

beforeAll(async () => {
  vi.stubGlobal("fetch", (url, opts) =>
    String(url).startsWith("https://api.pwnedpasswords.com/")
      ? Promise.resolve({ ok: true, text: async () => "" })
      : realFetch(url, opts),
  );

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", attachUser);
  registerAuthRoutes(app);
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  vi.unstubAllGlobals();
  await new Promise((resolve) => server.close(resolve));
});

let passwordHash;
beforeEach(async () => {
  db.reset();
  mail.sent.length = 0;
  passwordHash ??= await hashPassword(CLAVE_ANA);
  db.state.users.push({
    id: "u-ana",
    email: "ana@example.com",
    name: "Ana",
    role: "user",
    active: true,
    emailVerifiedAt: null,
    passwordHash,
  });
  db.state.sessions.push({
    id: "s-ana",
    tokenHash: hashToken("tok-ana"),
    userId: "u-ana",
    expiresAt: new Date(Date.now() + 1e7),
  });
});

describe("verificacion de email", () => {
  it("el registro abre sesion y manda el enlace de verificacion", async () => {
    const res = await call("/api/auth/register", {
      method: "POST",
      body: { email: "nuevo@example.com", name: "Nuevo", password: CLAVE_NUEVA },
    });
    expect(res.status).toBe(201);
    expect(res.data.user.emailVerified).toBe(false);
    expect(mail.sent).toHaveLength(1);
    expect(mail.sent[0].to).toBe("nuevo@example.com");
    expect(mail.sent[0].subject).toMatch(/Confirma tu email/);
  });

  it("el enlace verifica la direccion sin abrir sesion", async () => {
    await call("/api/auth/verify/resend", { method: "POST", as: "ana" });
    const token = tokenFromLastMail();

    const res = await call("/api/auth/verify", { method: "POST", body: { token } });
    expect(res.status).toBe(200);
    expect(res.data.user.emailVerified).toBe(true);
    expect(res.data.changedEmail).toBe(false);
    expect(db.state.sessions).toHaveLength(1);

    const again = await call("/api/auth/verify", { method: "POST", body: { token } });
    expect(again.status).toBe(400);
  });

  it("reenviar con el email ya verificado responde 400", async () => {
    db.state.users[0].emailVerifiedAt = new Date();
    const res = await call("/api/auth/verify/resend", { method: "POST", as: "ana" });
    expect(res.status).toBe(400);
    expect(mail.sent).toHaveLength(0);
  });

  it("cambiar el email pide contraseña, avisa a la antigua y no cambia hasta confirmar", async () => {
    const sinClave = await call("/api/auth/me", {
      method: "PATCH",
      as: "ana",
      body: { name: "Ana", email: "ana.nueva@example.com" },
    });
    expect(sinClave.status).toBe(401);

    const res = await call("/api/auth/me", {
      method: "PATCH",
      as: "ana",
      body: { name: "Ana", email: "ana.nueva@example.com", password: CLAVE_ANA },
    });
    expect(res.status).toBe(200);
    expect(res.data.user.email).toBe("ana@example.com");
    expect(res.data.pendingEmail).toBe("ana.nueva@example.com");

    expect(mail.sent.map((m) => m.to)).toEqual(["ana.nueva@example.com", "ana@example.com"]);
    expect(mail.sent[1].subject).toMatch(/cambiar el email/);

    const me = await call("/api/auth/me", { as: "ana" });
    expect(me.data.pendingEmail).toBe("ana.nueva@example.com");

    const token = new URL(
      mail.sent[0].text.match(/https?:\S+\/verificar\?token=\S+/)[0],
    ).searchParams.get("token");
    const confirmed = await call("/api/auth/verify", { method: "POST", body: { token } });
    expect(confirmed.status).toBe(200);
    expect(confirmed.data.changedEmail).toBe(true);
    expect(db.state.users[0].email).toBe("ana.nueva@example.com");
    expect(db.state.users[0].emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("si otra cuenta ocupa la direccion antes de confirmar, responde 409", async () => {
    await call("/api/auth/me", {
      method: "PATCH",
      as: "ana",
      body: { name: "Ana", email: "libre@example.com", password: CLAVE_ANA },
    });
    const token = new URL(
      mail.sent[0].text.match(/https?:\S+\/verificar\?token=\S+/)[0],
    ).searchParams.get("token");
    db.state.users.push({ id: "u-otro", email: "libre@example.com", active: true });

    const res = await call("/api/auth/verify", { method: "POST", body: { token } });
    expect(res.status).toBe(409);
    expect(db.state.users[0].email).toBe("ana@example.com");
  });
});
