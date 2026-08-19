import { prisma, requireDb } from "../db.js";
import { wrap } from "../lib/auth.js";

function articlePublic(article) {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    excerpt: article.excerpt,
    body: article.body,
    published: article.published,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    category: article.category,
    tags: (article.tags || []).map((row) => row.tag),
    author: article.author
      ? { name: article.author.name }
      : null,
  };
}

export function registerArticleRoutes(app) {
  app.get(
    "/api/articles",
    requireDb,
    wrap(async (req, res) => {
      const articles = await prisma.article.findMany({
        where: { published: true },
        include: {
          category: true,
          tags: { include: { tag: true } },
          author: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      res.json({ articles: articles.map(articlePublic) });
    }),
  );

  app.get(
    "/api/articles/:slug",
    requireDb,
    wrap(async (req, res) => {
      const article = await prisma.article.findFirst({
        where: { slug: req.params.slug, published: true },
        include: {
          category: true,
          tags: { include: { tag: true } },
          author: { select: { name: true } },
        },
      });
      if (!article) return res.status(404).json({ error: "Artículo no encontrado." });
      res.json({ article: articlePublic(article) });
    }),
  );

  app.get(
    "/api/categories",
    requireDb,
    wrap(async (_req, res) => {
      const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { articles: true } } },
      });
      res.json({ categories });
    }),
  );
}
