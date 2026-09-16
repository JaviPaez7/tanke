import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { PageShell } from "../components/AppChrome";
import { AlertBox, EmptyState } from "../components/ui";
import { formatDay } from "../lib/format";

export default function Guides() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const current = params.get("categoria") || "";

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.articles(), api.categories().catch(() => ({ categories: [] }))])
      .then(([a, c]) => {
        if (cancelled) return;
        setArticles(a.articles);
        setCategories(c.categories);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // El filtro vive en la URL (?categoria=ahorro) para poder compartir el
  // enlace y para que "atrás" deshaga el filtro.
  function pick(slug) {
    setParams(slug ? { categoria: slug } : {}, { replace: true });
  }

  const usable = categories.filter((c) =>
    articles.some((a) => a.category?.id === c.id),
  );
  const visible = current
    ? articles.filter((a) => a.category?.slug === current)
    : articles;
  const selected = usable.find((c) => c.slug === current);

  const chip = (active) =>
    `rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide transition-colors cursor-pointer ${
      active
        ? "bg-indigo-600 text-white"
        : "bg-white text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
    }`;

  return (
    <PageShell title="Guías de ahorro">
      <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-2xl">
        Cómo leer Tanke, cuándo merece la 98 y qué umbral poner en una alerta.
        Las escribe el equipo y se publican desde el panel.
      </p>
      {usable.length > 0 && (
        <nav aria-label="Filtrar por categoría" className="mb-8 flex flex-wrap gap-2">
          <button
            type="button"
            className={chip(!current)}
            aria-pressed={!current}
            onClick={() => pick("")}
          >
            Todas
          </button>
          {usable.map((category) => (
            <button
              key={category.id}
              type="button"
              className={chip(current === category.slug)}
              aria-pressed={current === category.slug}
              onClick={() => pick(category.slug)}
            >
              {category.name}
            </button>
          ))}
        </nav>
      )}
      {error && (
        <div className="mb-4">
          <AlertBox>{error}</AlertBox>
        </div>
      )}
      {loading && (
        <p className="text-slate-600 dark:text-slate-300">Cargando guías…</p>
      )}
      {!loading && articles.length === 0 && !error && (
        <EmptyState title="Aún no hay guías publicadas">
          En cuanto un admin publique un artículo, aparecerá aquí.
        </EmptyState>
      )}
      {!loading && articles.length > 0 && visible.length === 0 && (
        <EmptyState title="Nada en esta categoría">
          {selected
            ? `Todavía no hay guías publicadas en «${selected.name}».`
            : "Esa categoría no existe."}{" "}
          <button
            type="button"
            className="font-bold text-indigo-600 cursor-pointer"
            onClick={() => pick("")}
          >
            Ver todas
          </button>
        </EmptyState>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((article) => (
          <Link
            key={article.id}
            to={`/guias/${article.slug}`}
            className="block bg-white dark:bg-slate-900 rounded-3xl p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-black mb-2">{article.title}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {article.excerpt}
            </p>
            <p className="text-xs text-slate-500 mt-4">
              {article.category?.name ? `${article.category.name} · ` : ""}
              {formatDay(article.createdAt)}
            </p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
