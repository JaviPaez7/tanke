import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Un Prisma de mentira, en memoria, con lo justo que usan estas rutas. Las
// pruebas comprueban permisos, validación y códigos de respuesta con
// peticiones HTTP reales, sin necesitar PostgreSQL.
const db = vi.hoisted(() => {
  const state = {
    users: [],
    sessions: [],
    articles: [],
    categories: [],
    tags: [],
    articleTags: [],
    transactions: 0,
  };
  const withCount = (row, rel) => ({
    ...row,
    _count: { articles: state[rel].filter((r) => r.categoryId === row.id || r.tagId === row.id).length },
  });
  const articleFull = (a) => ({
    ...a,
    category: state.categories.find((c) => c.id === a.categoryId) || null,
    tags: state.articleTags
      .filter((at) => at.articleId === a.id)
      .map((at) => ({ tag: state.tags.find((t) => t.id === at.tagId) })),
    author: state.users.find((u) => u.id === a.authorId) || null,
  });
  const uniqueError = () => Object.assign(new Error("Unique constraint"), { code: "P2002" });
  let seq = 0;
  const id = (p) => `${p}-${++seq}`;

  const prisma = {
    state,
    reset() {
      for (const key of Object.keys(state)) {
        if (Array.isArray(state[key])) state[key].length = 0;
      }
      state.transactions = 0;
    },
    async $transaction(fn) {
      state.transactions += 1;
      return fn(prisma);
    },
    session: {
      async findUnique({ where }) {
        const s = state.sessions.find((x) => x.tokenHash === where.tokenHash);
        return s ? { ...s, user: state.users.find((u) => u.id === s.userId) } : null;
      },
      async deleteMany({ where }) {
        const before = state.sessions.length;
        state.sessions = state.sessions.filter((s) => s.userId !== where.userId);
        return { count: before - state.sessions.length };
      },
      async delete() {},
    },
    user: {
      async findMany() {
        return state.users.map((u) => ({ ...u, _count: { favorites: 0, alerts: 0, reports: 0 } }));
      },
      async findUnique({ where }) {
        return state.users.find((u) => u.id === where.id) || null;
      },
      async update({ where, data }) {
        const u = state.users.find((x) => x.id === where.id);
        Object.assign(u, data);
        return u;
      },
    },
    article: {
      async findMany() {
        return state.articles.map(articleFull);
      },
      async findUnique({ where }) {
        const a = state.articles.find((x) => (where.id ? x.id === where.id : x.slug === where.slug));
        return a ? { ...a } : null;
      },
      async create({ data }) {
        if (state.articles.some((a) => a.slug === data.slug)) throw uniqueError();
        const { tags, ...rest } = data;
        const a = { id: id("art"), createdAt: new Date(), updatedAt: new Date(), ...rest };
        state.articles.push(a);
        for (const t of tags?.create || []) state.articleTags.push({ articleId: a.id, tagId: t.tagId });
        return articleFull(a);
      },
      async update({ where, data }) {
        const a = state.articles.find((x) => x.id === where.id);
        const { tags, ...rest } = data;
        Object.assign(a, rest);
        for (const t of tags?.create || []) state.articleTags.push({ articleId: a.id, tagId: t.tagId });
        return articleFull(a);
      },
      async deleteMany({ where }) {
        const before = state.articles.length;
        state.articles = state.articles.filter((a) => a.id !== where.id);
        return { count: before - state.articles.length };
      },
    },
    articleTag: {
      async deleteMany({ where }) {
        state.articleTags = state.articleTags.filter((at) => at.articleId !== where.articleId);
        return { count: 0 };
      },
    },
    category: {
      async findMany() {
        return state.categories.map((c) => withCount(c, "articles"));
      },
      async findUnique({ where }) {
        const c = state.categories.find((x) => x.id === where.id);
        return c ? withCount(c, "articles") : null;
      },
      async create({ data }) {
        if (state.categories.some((c) => c.slug === data.slug)) throw uniqueError();
        const c = { id: id("cat"), ...data };
        state.categories.push(c);
        return withCount(c, "articles");
      },
      async update({ where, data }) {
        const c = state.categories.find((x) => x.id === where.id);
        if (!c) throw Object.assign(new Error("not found"), { code: "P2025" });
        if (state.categories.some((x) => x.id !== c.id && x.slug === data.slug)) throw uniqueError();
        Object.assign(c, data);
        return withCount(c, "articles");
      },
      async delete({ where }) {
        state.categories = state.categories.filter((c) => c.id !== where.id);
        for (const a of state.articles) if (a.categoryId === where.id) a.categoryId = null;
      },
    },
    tag: {
      async findMany() {
        return state.tags.map((t) => withCount(t, "articleTags"));
      },
      async findUnique({ where }) {
        const t = state.tags.find((x) => x.id === where.id);
        return t ? withCount(t, "articleTags") : null;
      },
      async upsert({ where, create }) {
        let t = state.tags.find((x) => x.slug === where.slug);
        if (!t) {
          t = { id: id("tag"), ...create };
          state.tags.push(t);
        }
        return t;
      },
      async update({ where, data }) {
        const t = state.tags.find((x) => x.id === where.id);
        if (state.tags.some((x) => x.id !== t.id && x.slug === data.slug)) throw uniqueError();
        Object.assign(t, data);
        return withCount(t, "articleTags");
      },
      async delete({ where }) {
        state.tags = state.tags.filter((t) => t.id !== where.id);
        state.articleTags = state.articleTags.filter((at) => at.tagId !== where.id);
      },
    },
  };
  return prisma;
});

vi.mock("../../db.js", () => ({
  prisma: db,
  requireDb: (_req, _res, next) => next(),
}));
vi.mock("../../jobs.js", () => ({ runSnapshot: vi.fn() }));

import { mountApi } from "../../api.js";
import { hashToken } from "../../lib/auth.js";

let server;
let base;

function seedUsers() {
  db.state.users.push(
    { id: "u-admin", email: "admin@test", name: "Admin", role: "admin", active: true },
    { id: "u-user", email: "user@test", name: "User", role: "user", active: true },
  );
  db.state.sessions.push(
    { id: "s1", tokenHash: hashToken("tok-admin"), userId: "u-admin", expiresAt: new Date(Date.now() + 1e7) },
    { id: "s2", tokenHash: hashToken("tok-user"), userId: "u-user", expiresAt: new Date(Date.now() + 1e7) },
  );
}

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

const cuerpo = "Un cuerpo con más de veinte caracteres para pasar la validación.";

beforeAll(async () => {
  const app = express();
  app.use(express.json({ limit: "200kb" }));
  mountApi(app);
  await new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

beforeEach(() => {
  db.reset();
  seedUsers();
});

describe("permisos del panel", () => {
  it("responde 401 sin sesión, 403 con usuario normal y 200 con admin", async () => {
    expect((await call("/api/admin/users")).status).toBe(401);
    expect((await call("/api/admin/users", { as: "user" })).status).toBe(403);
    const ok = await call("/api/admin/users", { as: "admin" });
    expect(ok.status).toBe(200);
    expect(ok.data.users.map((u) => u.email)).toEqual(["admin@test", "user@test"]);
  });

  it("no deja que el admin se degrade ni se desactive a sí mismo", async () => {
    expect((await call("/api/admin/users/u-admin", { as: "admin", method: "PATCH", body: { role: "user" } })).status).toBe(400);
    expect((await call("/api/admin/users/u-admin", { as: "admin", method: "PATCH", body: { active: false } })).status).toBe(400);
    expect((await call("/api/admin/users/no-existe", { as: "admin", method: "PATCH", body: { active: false } })).status).toBe(404);
  });

  it("desactivar una cuenta cierra sus sesiones", async () => {
    const r = await call("/api/admin/users/u-user", { as: "admin", method: "PATCH", body: { active: false } });
    expect(r.status).toBe(200);
    expect(r.data.user.active).toBe(false);
    expect((await call("/api/admin/users", { as: "user" })).status).toBe(401);
  });
});

describe("guías", () => {
  it("valida al crear y devuelve el mensaje de la regla incumplida", async () => {
    const r = await call("/api/admin/articles", { as: "admin", method: "POST", body: { title: "Ab", body: cuerpo } });
    expect(r.status).toBe(400);
    expect(r.data.error).toMatch(/título/);
    expect(db.state.articles).toHaveLength(0);
  });

  it("crea la guía con sus etiquetas en una transacción y responde 409 al repetir slug", async () => {
    const r = await call("/api/admin/articles", {
      as: "admin",
      method: "POST",
      body: { title: "Guía nueva", body: cuerpo, tags: ["Ahorro", "ahorro"] },
    });
    expect(r.status).toBe(201);
    expect(r.data.article.slug).toBe("guia-nueva");
    expect(r.data.article.tags.map((t) => t.slug)).toEqual(["ahorro"]);
    expect(r.data.article.author.email).toBe("admin@test");
    expect(db.state.transactions).toBe(1);

    const dup = await call("/api/admin/articles", {
      as: "admin",
      method: "POST",
      body: { title: "Guía nueva", body: cuerpo },
    });
    expect(dup.status).toBe(409);
  });

  it("rechaza una categoría que ya no existe", async () => {
    const r = await call("/api/admin/articles", {
      as: "admin",
      method: "POST",
      body: { title: "Guía nueva", body: cuerpo, categoryId: "cat-borrada" },
    });
    expect(r.status).toBe(400);
    expect(r.data.error).toMatch(/categoría/);
  });

  it("al editar valida igual, conserva el slug y sincroniza etiquetas dentro de la transacción", async () => {
    const created = await call("/api/admin/articles", {
      as: "admin",
      method: "POST",
      body: { title: "Guía nueva", body: cuerpo, tags: ["Ahorro", "Canarias"] },
    });
    const id = created.data.article.id;

    expect((await call(`/api/admin/articles/${id}`, { as: "admin", method: "PATCH", body: { title: "Ab" } })).status).toBe(400);

    db.state.transactions = 0;
    const r = await call(`/api/admin/articles/${id}`, {
      as: "admin",
      method: "PATCH",
      body: { title: "Título cambiado", tags: ["Canarias"], published: true },
    });
    expect(r.status).toBe(200);
    expect(r.data.article.slug).toBe("guia-nueva");
    expect(r.data.article.published).toBe(true);
    expect(r.data.article.tags.map((t) => t.slug)).toEqual(["canarias"]);
    expect(db.state.transactions).toBe(1);
    expect((await call("/api/admin/articles/no-existe", { as: "admin", method: "PATCH", body: {} })).status).toBe(404);
  });

  it("no deja robar el slug de otra guía al editar", async () => {
    await call("/api/admin/articles", { as: "admin", method: "POST", body: { title: "Primera guía", body: cuerpo } });
    const second = await call("/api/admin/articles", { as: "admin", method: "POST", body: { title: "Segunda guía", body: cuerpo } });
    const r = await call(`/api/admin/articles/${second.data.article.id}`, {
      as: "admin",
      method: "PATCH",
      body: { slug: "primera-guia" },
    });
    expect(r.status).toBe(409);
  });
});

describe("categorías y etiquetas", () => {
  it("crea, renombra y detecta duplicados", async () => {
    const a = await call("/api/admin/categories", { as: "admin", method: "POST", body: { name: "Ahorro" } });
    expect(a.status).toBe(201);
    expect(a.data.category).toMatchObject({ name: "Ahorro", slug: "ahorro", _count: { articles: 0 } });
    expect((await call("/api/admin/categories", { as: "admin", method: "POST", body: { name: "ahorro" } })).status).toBe(409);
    expect((await call("/api/admin/categories", { as: "admin", method: "POST", body: { name: "A" } })).status).toBe(400);

    const b = await call("/api/admin/categories", { as: "admin", method: "POST", body: { name: "Consejos" } });
    expect((await call(`/api/admin/categories/${b.data.category.id}`, { as: "admin", method: "PATCH", body: { name: "Ahorro" } })).status).toBe(409);
    const renamed = await call(`/api/admin/categories/${b.data.category.id}`, { as: "admin", method: "PATCH", body: { name: "Trucos" } });
    expect(renamed.status).toBe(200);
    expect(renamed.data.category.slug).toBe("trucos");
    expect((await call("/api/admin/categories/no-existe", { as: "admin", method: "PATCH", body: { name: "Trucos" } })).status).toBe(404);
  });

  it("borrar una categoría en uso deja las guías sin categoría y lo cuenta", async () => {
    const cat = (await call("/api/admin/categories", { as: "admin", method: "POST", body: { name: "Ahorro" } })).data.category;
    await call("/api/admin/articles", { as: "admin", method: "POST", body: { title: "Guía nueva", body: cuerpo, categoryId: cat.id } });

    const r = await call(`/api/admin/categories/${cat.id}`, { as: "admin", method: "DELETE" });
    expect(r.status).toBe(200);
    expect(r.data.detached).toBe(1);
    expect(db.state.articles[0].categoryId).toBeNull();
    expect((await call(`/api/admin/categories/${cat.id}`, { as: "admin", method: "DELETE" })).status).toBe(404);
  });

  it("las etiquetas se listan con su uso, se renombran y se borran de las guías", async () => {
    await call("/api/admin/articles", { as: "admin", method: "POST", body: { title: "Guía nueva", body: cuerpo, tags: ["Ahorro", "GLP"] } });
    const list = await call("/api/admin/categories", { as: "admin" });
    expect(list.data.tags.map((t) => [t.slug, t._count.articles])).toEqual([["ahorro", 1], ["glp", 1]]);

    const glp = list.data.tags.find((t) => t.slug === "glp");
    expect((await call(`/api/admin/tags/${glp.id}`, { as: "admin", method: "PATCH", body: { name: "Ahorro" } })).status).toBe(409);
    const del = await call(`/api/admin/tags/${glp.id}`, { as: "admin", method: "DELETE" });
    expect(del.status).toBe(200);
    expect(del.data.detached).toBe(1);
    expect((await call("/api/admin/articles", { as: "admin" })).data.articles[0].tags.map((t) => t.slug)).toEqual(["ahorro"]);
  });

  it("un usuario normal no puede tocar la taxonomía", async () => {
    expect((await call("/api/admin/categories", { as: "user", method: "POST", body: { name: "Ahorro" } })).status).toBe(403);
    expect((await call("/api/admin/tags/x", { as: "user", method: "DELETE" })).status).toBe(403);
  });
});

describe("errores controlados", () => {
  it("un JSON roto devuelve 400 y no 500", async () => {
    const res = await fetch(base + "/api/admin/categories", {
      method: "POST",
      headers: { "content-type": "application/json", cookie: "tanke_session=tok-admin" },
      body: "{rompido",
    });
    expect(res.status).toBe(400);
  });
});
