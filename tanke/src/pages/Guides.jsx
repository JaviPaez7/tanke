import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { PageShell } from "../components/AppChrome";
import { AlertBox, EmptyState } from "../components/ui";
import { formatDay } from "../lib/format";

export default function Guides() {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .articles()
      .then((data) => setArticles(data.articles))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageShell title="Guías de ahorro">
      <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-2xl">
        Cómo leer Tanke, cuándo merece la 98 y qué umbral poner en una alerta.
        Las escribe el equipo y se publican desde el panel.
      </p>
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
      <div className="grid gap-4 md:grid-cols-2">
        {articles.map((article) => (
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
