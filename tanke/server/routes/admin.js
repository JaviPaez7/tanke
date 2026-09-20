import { prisma, requireDb } from "../db.js";
import {
  hashPassword,
  isEmail,
  passwordProblem,
  requireAdmin,
  wrap,
} from "../lib/auth.js";
import {
  isUniqueViolation,
  parseArticleInput,
  parseTaxonomyInput,
  syncTags,
} from "../lib/content.js";
import { runSnapshot } from "../jobs.js";

const REPORT_STATES = ["pending", "reviewed", "dismissed"];

const ARTICLE_INCLUDE = {
  category: true,
  tags: { include: { tag: true } },
  author: { select: { id: true, name: true, email: true } },
};

function articleAdmin(article) {
  return {
    ...article,
    tags: (article.tags || []).map((row) => row.tag),
    author: article.author
      ? { id: article.author.id, name: article.author.name, email: article.author.email }
      : null,
  };
}

// La categoría llega como id desde el selector; si alguien la borró en otra
// pestaña, mejor un 400 claro que un error de clave foránea.
async function categoryExists(id) {
  if (!id) return true;
  const found = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  return Boolean(found);
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
          emailVerifiedAt: true,
          createdAt: true,
          _count: { select: { favorites: true, alerts: true, reports: true } },
        },
      });
      res.json({ users });
    }),
  );

  app.post(
    "/api/admin/users",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      const name = String(req.body?.name || "").trim();
      const password = String(req.body?.password || "");
      const role = req.body?.role === "admin" ? "admin" : "user";
      const emailVerified = req.body?.emailVerified === true;

      if (!isEmail(email)) {
        return res.status(400).json({ error: "El email no es válido." });
      }
      if (name.length < 2 || name.length > 60) {
        return res
          .status(400)
          .json({ error: "El nombre debe tener entre 2 y 60 caracteres." });
      }
      if (req.body?.role && !["user", "admin"].includes(req.body.role)) {
        return res.status(400).json({ error: "El rol no es válido." });
      }
      const problem = await passwordProblem(password, { email });
      if (problem) return res.status(400).json({ error: problem });

      const existing = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing) {
        return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
      }

      try {
        const user = await prisma.user.create({
          data: {
            email,
            name,
            passwordHash: await hashPassword(password),
            role,
            active: true,
            emailVerifiedAt: emailVerified ? new Date() : null,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            active: true,
            emailVerifiedAt: true,
            createdAt: true,
            _count: { select: { favorites: true, alerts: true, reports: true } },
          },
        });
        res.status(201).json({ user });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
        }
        throw error;
      }
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
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: "No hay nada que cambiar." });
      }

      const existing = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: { id: true },
      });
      if (!existing) return res.status(404).json({ error: "Usuario no encontrado." });

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
        include: ARTICLE_INCLUDE,
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
      const parsed = parseArticleInput(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      const { tags = [], ...data } = parsed.data;

      if (!(await categoryExists(data.categoryId))) {
        return res.status(400).json({ error: "Esa categoría ya no existe." });
      }
      const taken = await prisma.article.findUnique({
        where: { slug: data.slug },
        select: { id: true },
      });
      if (taken) return res.status(409).json({ error: "Ya existe una guía con ese slug." });

      try {
        const article = await prisma.$transaction(async (tx) => {
          const tagRows = await syncTags(tx, tags);
          return tx.article.create({
            data: {
              ...data,
              published: data.published ?? false,
              categoryId: data.categoryId ?? null,
              authorId: req.user.id,
              tags: { create: tagRows.map((tag) => ({ tagId: tag.id })) },
            },
            include: ARTICLE_INCLUDE,
          });
        });
        res.status(201).json({ article: articleAdmin(article) });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return res.status(409).json({ error: "Ya existe una guía con ese slug." });
        }
        throw error;
      }
    }),
  );

  app.patch(
    "/api/admin/articles/:id",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const existing = await prisma.article.findUnique({ where: { id: req.params.id } });
      if (!existing) return res.status(404).json({ error: "Artículo no encontrado." });

      const parsed = parseArticleInput(req.body, { partial: true });
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      const { tags, ...data } = parsed.data;

      if (data.categoryId !== undefined && !(await categoryExists(data.categoryId))) {
        return res.status(400).json({ error: "Esa categoría ya no existe." });
      }
      if (data.slug && data.slug !== existing.slug) {
        const taken = await prisma.article.findUnique({
          where: { slug: data.slug },
          select: { id: true },
        });
        if (taken) return res.status(409).json({ error: "Ya existe una guía con ese slug." });
      }

      try {
        // Etiquetas y contenido van en la misma transacción: antes se borraban
        // las relaciones y, si el update fallaba, la guía se quedaba sin ellas.
        const article = await prisma.$transaction(async (tx) => {
          if (tags) {
            const tagRows = await syncTags(tx, tags);
            await tx.articleTag.deleteMany({ where: { articleId: existing.id } });
            data.tags = { create: tagRows.map((tag) => ({ tagId: tag.id })) };
          }
          return tx.article.update({
            where: { id: existing.id },
            data,
            include: ARTICLE_INCLUDE,
          });
        });
        res.json({ article: articleAdmin(article) });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return res.status(409).json({ error: "Ya existe una guía con ese slug." });
        }
        throw error;
      }
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

  // Categorías y etiquetas viajan juntas: el panel las pinta en la misma
  // pantalla y el formulario de guía necesita ambas. `_count` dice cuántas
  // guías usan cada una para avisar antes de borrar.
  app.get(
    "/api/admin/categories",
    requireDb,
    requireAdmin,
    wrap(async (_req, res) => {
      const [categories, tags] = await Promise.all([
        prisma.category.findMany({
          orderBy: { name: "asc" },
          include: { _count: { select: { articles: true } } },
        }),
        prisma.tag.findMany({
          orderBy: { name: "asc" },
          include: { _count: { select: { articles: true } } },
        }),
      ]);
      res.json({ categories, tags });
    }),
  );

  app.post(
    "/api/admin/categories",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const parsed = parseTaxonomyInput(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      try {
        const category = await prisma.category.create({
          data: parsed.data,
          include: { _count: { select: { articles: true } } },
        });
        res.status(201).json({ category });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return res.status(409).json({ error: "Ya existe una categoría con ese nombre." });
        }
        throw error;
      }
    }),
  );

  app.patch(
    "/api/admin/categories/:id",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const parsed = parseTaxonomyInput(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      try {
        const category = await prisma.category.update({
          where: { id: req.params.id },
          data: parsed.data,
          include: { _count: { select: { articles: true } } },
        });
        res.json({ category });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return res.status(409).json({ error: "Ya existe una categoría con ese nombre." });
        }
        if (error?.code === "P2025") {
          return res.status(404).json({ error: "Categoría no encontrada." });
        }
        throw error;
      }
    }),
  );

  // Borrar una categoría no borra sus guías: la relación es opcional y la base
  // las deja "sin categoría" (ON DELETE SET NULL). Se devuelve cuántas se han
  // quedado así para que el panel lo diga con claridad.
  app.delete(
    "/api/admin/categories/:id",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const category = await prisma.category.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { articles: true } } },
      });
      if (!category) return res.status(404).json({ error: "Categoría no encontrada." });

      await prisma.category.delete({ where: { id: category.id } });
      res.json({ ok: true, detached: category._count.articles });
    }),
  );

  app.patch(
    "/api/admin/tags/:id",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const parsed = parseTaxonomyInput(req.body);
      if (parsed.error) return res.status(400).json({ error: parsed.error });
      try {
        const tag = await prisma.tag.update({
          where: { id: req.params.id },
          data: parsed.data,
          include: { _count: { select: { articles: true } } },
        });
        res.json({ tag });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return res.status(409).json({ error: "Ya existe una etiqueta con ese nombre." });
        }
        if (error?.code === "P2025") {
          return res.status(404).json({ error: "Etiqueta no encontrada." });
        }
        throw error;
      }
    }),
  );

  // Las filas de ArticleTag cuelgan de Tag con onDelete: Cascade, así que la
  // etiqueta desaparece de todas las guías sin tocarlas.
  app.delete(
    "/api/admin/tags/:id",
    requireDb,
    requireAdmin,
    wrap(async (req, res) => {
      const tag = await prisma.tag.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { articles: true } } },
      });
      if (!tag) return res.status(404).json({ error: "Etiqueta no encontrada." });

      await prisma.tag.delete({ where: { id: tag.id } });
      res.json({ ok: true, detached: tag._count.articles });
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
      const { count } = await prisma.stationReport.updateMany({
        where: { id: req.params.id },
        data: { status },
      });
      if (count === 0) return res.status(404).json({ error: "Aviso no encontrado." });

      const report = await prisma.stationReport.findUnique({
        where: { id: req.params.id },
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
