import { prisma, requireDb } from "../db.js";
import { requireAdmin, slugify, wrap } from "../lib/auth.js";
import { runSnapshot } from "../jobs.js";

const REPORT_STATES = ["pending", "reviewed", "dismissed"];

function articleAdmin(article) {
  return {
    ...article,
    tags: (article.tags || []).map((row) => row.tag),
    author: article.author
      ? { id: article.author.id, name: article.author.name, email: article.author.email }
      : null,
  };
}

async function syncTags(names = []) {
  const clean = [...new Set(names.map((n) => String(n).trim()).filter(Boolean))];
  const tags = [];
  for (const name of clean) {
    const slug = slugify(name);
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug },
    });
    tags.push(tag);
  }
  return tags;
}

export function registerAdminRoutes(app) {
  app.get(
    "/api/admin/users",
    requireDb,
    requireAdmin,
    wrap(async (_req, res) => {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          _count: { select: { favorites: true, alerts: true, reports: true } },
        },
      });
      res.json({ users });
    }),
  );

  app.patch(
    "/api/admin/users/:id",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      if (req.params.id === req.user.id && req.body?.role === "user") {
        return res.status(400).json({ error: "No puedes quitarte el rol de admin." });
      }
      if (req.params.id === req.user.id && req.body?.active === false) {
        return res.status(400).json({ error: "No puedes desactivar tu propia cuenta." });
      }

      const data = {};
      if (req.body?.role === "user" || req.body?.role === "admin") data.role = req.body.role;
      if (typeof req.body?.active === "boolean") data.active = req.body.active;

      const user = await prisma.user.update({
        where: { id: req.params.id },
        data,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
        },
      });

      if (data.active === false) {
        await prisma.session.deleteMany({ where: { userId: user.id } });
      }

      res.json({ user });
    }),
  );

  app.get(
    "/api/admin/articles",
    requireDb,
    requireAdmin,
    wrap(async (_req, res) => {
      const articles = await prisma.article.findMany({
        include: {
          category: true,
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: "desc" },
      });
      res.json({ articles: articles.map(articleAdmin) });
    }),
  );

  app.post(
    "/api/admin/articles",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const title = String(req.body?.title || "").trim();
      const body = String(req.body?.body || "").trim();
      const excerpt = String(req.body?.excerpt || "").trim();
      const slug = slugify(req.body?.slug || title);
      if (title.length < 4) return res.status(400).json({ error: "El título es demasiado corto." });
      if (body.length < 20) return res.status(400).json({ error: "El cuerpo es demasiado corto." });
      if (!slug) return res.status(400).json({ error: "El slug no es válido." });

      const tags = await syncTags(req.body?.tags || []);
      const article = await prisma.article.create({
        data: {
          title,
          slug,
          excerpt,
          body,
          published: Boolean(req.body?.published),
          categoryId: req.body?.categoryId || null,
          authorId: req.user.id,
          tags: { create: tags.map((tag) => ({ tagId: tag.id })) },
        },
        include: {
          category: true,
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true, email: true } },
        },
      });
      res.status(201).json({ article: articleAdmin(article) });
    }),
  );

  app.patch(
    "/api/admin/articles/:id",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: "Artículo no encontrado." });

      const data = {};
      if (req.body?.title != null) data.title = String(req.body.title).trim();
      if (req.body?.body != null) data.body = String(req.body.body).trim();
      if (req.body?.excerpt != null) data.excerpt = String(req.body.excerpt).trim();
      if (req.body?.slug != null) data.slug = slugify(req.body.slug);
      if (typeof req.body?.published === "boolean") data.published = req.body.published;
      if (req.body?.categoryId !== undefined) data.categoryId = req.body.categoryId || null;

      if (Array.isArray(req.body?.tags)) {
        const tags = await syncTags(req.body.tags);
        await prisma.articleTag.deleteMany({ where: { articleId: existing.id } });
        data.tags = { create: tags.map((tag) => ({ tagId: tag.id })) };
      }

      const article = await prisma.article.update({
        where: { id: existing.id },
        data,
        include: {
          category: true,
          tags: { include: { tag: true } },
          author: { select: { id: true, name: true, email: true } },
        },
      });
      res.json({ article: articleAdmin(article) });
    }),
  );

  app.delete(
    "/api/admin/articles/:id",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const { count } = await prisma.article.deleteMany({
        where: { id: req.params.id },
      });
      if (count === 0) {
        return res.status(404).json({ error: "Artículo no encontrado." });
      }
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/admin/categories",
    requireDb,
    requireAdmin,
    wrap(async (_req, res) => {
      const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
      const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
      res.json({ categories, tags });
    }),
  );

  app.post(
    "/api/admin/categories",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const name = String(req.body?.name || "").trim();
      const slug = slugify(req.body?.slug || name);
      if (name.length < 2) return res.status(400).json({ error: "Nombre demasiado corto." });
      const category = await prisma.category.create({ data: { name, slug } });
      res.status(201).json({ category });
    }),
  );

  app.delete(
    "/api/admin/categories/:id",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const { count } = await prisma.category.deleteMany({
        where: { id: req.params.id },
      });
      if (count === 0) {
        return res.status(404).json({ error: "Categoría no encontrada." });
      }
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/admin/reports",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const status = String(req.query.status || "");
      if (status && !REPORT_STATES.includes(status)) {
        return res.status(400).json({ error: "Estado no válido." });
      }
      const reports = await prisma.stationReport.findMany({
        where: status ? { status } : undefined,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      res.json({ reports });
    }),
  );

  app.patch(
    "/api/admin/reports/:id",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const status = String(req.body?.status || "");
      if (!REPORT_STATES.includes(status)) {
        return res.status(400).json({ error: "Estado no válido." });
      }
      const report = await prisma.stationReport.update({
        where: { id: req.params.id },
        data: { status },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      res.json({ report });
    }),
  );

  app.get(
    "/api/admin/ingestion",
    requireDb,
    requireAdmin,
    wrap(async (_req, res) => {
      const runs = await prisma.ingestionRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 20,
      });
      const snapshots = await prisma.priceSnapshot.count();
      res.json({ runs, snapshots });
    }),
  );

  app.post(
    "/api/admin/ingestion/run",
    requireDb,
    requireAdmin,
    wrap(async (_req, res) => {
      const run = await runSnapshot(prisma, { force: true });
      res.json({ run });
    }),
  );
}
