import { useEffect, useLayoutEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigationType,
  useSearchParams,
} from "react-router-dom";
import { api } from "../api/client";
import { PageShell } from "../components/AppChrome";
import { AlertBox, EmptyState } from "../components/ui";
import { formatDay } from "../lib/format";
import { PageHero } from "../../shared/pageChrome.js";

let returnPosition = null;

export default function Guides() {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();
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

  // Al volver desde una guía, espera a que las tarjetas recuperen su altura
  // antes de restaurar el scroll; el navegador puede limitarlo durante la carga.
  useLayoutEffect(() => {
    if (loading || navigationType !== "POP" || returnPosition?.key !== location.key) {
      return;
    }
    window.scrollTo(0, returnPosition.y);
    returnPosition = null;
  }, [loading, location.key, navigationType]);

  // El filtro vive en la URL (?categoria=ahorro) para poder compartir el
  // enlace y para que "atrás" deshaga el filtro.
  function pick(slug) {
    setParams(slug ? { categoria: slug } : {});
  }

  const usable = categories.filter((c) =>
    articles.some((a) => a.category?.id === c.id),
  );
  const visible = current
    ? articles.filter((a) => a.category?.slug === current)
    : articles;
  const selected = usable.find((c) => c.slug === current);

  const filterClass = (active) =>
    `flex min-h-12 items-center justify-between gap-5 rounded-2xl px-4 py-3 text-left text-sm font-bold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${
      active
        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none"
        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-indigo-50 hover:ring-indigo-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800 dark:hover:bg-slate-800"
    }`;

  return (
    <PageShell>
      <PageHero
        linkComponent={Link}
        eyebrow="Guías de Tanke"
        title="Reposta con mejores decisiones."
        lead="Aprende a comparar precios, calcular el coste real de un depósito y elegir el combustible adecuado para tu coche."
        breadcrumbs={[{ href: "/", label: "Inicio" }, { label: "Guías" }]}
        actions={[{ href: "/", label: "Comparar precios →" }]}
        metadata={!loading && !error && <span>{articles.length} {articles.length === 1 ? "guía práctica" : "guías prácticas"}</span>}
      />

      {usable.length > 0 && (
        <section className="mb-9 mt-8" aria-labelledby="guide-topics">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-400">
                Explora
              </p>
              <h2 id="guide-topics" className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                Elige un tema
              </h2>
            </div>
            <p aria-live="polite" className="text-sm text-slate-500 dark:text-slate-400">
              {visible.length} {visible.length === 1 ? "resultado" : "resultados"}
            </p>
          </div>
          <nav aria-label="Filtrar por categoría" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              className={filterClass(!current)}
              aria-pressed={!current}
              onClick={() => pick("")}
            >
              <span>Todas las guías</span>
              <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${!current ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
                {articles.length}
              </span>
            </button>
            {usable.map((category) => {
              const active = current === category.slug;
              const count = articles.filter((article) => article.category?.id === category.id).length;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={filterClass(active)}
                  aria-pressed={active}
                  onClick={() => pick(category.slug)}
                >
                  <span>{category.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${active ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>
        </section>
      )}
      {error && (
        <div className="mb-4">
          <AlertBox>{error}</AlertBox>
        </div>
      )}
      {loading && <p role="status" className="text-slate-600 dark:text-slate-300">Cargando guías…</p>}
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
            state={{ fromGuides: true }}
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              ) {
                return;
              }
              returnPosition = { key: location.key, y: window.scrollY };
            }}
            className="group flex min-h-64 flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500 dark:hover:shadow-none sm:p-7"
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                {article.category?.name || "Guía"}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {formatDay(article.createdAt)}
              </span>
            </div>
            <h2 className="text-xl font-black leading-snug tracking-tight group-hover:text-indigo-700 dark:group-hover:text-indigo-300 sm:text-2xl">
              {article.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {article.excerpt}
            </p>
            <span className="mt-auto inline-flex items-center gap-2 pt-7 text-sm font-black text-indigo-700 dark:text-indigo-300">
              Leer guía <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
            </span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}
