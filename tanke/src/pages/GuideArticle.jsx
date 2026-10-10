import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { PageShell } from "../components/AppChrome";
import { AlertBox } from "../components/ui";
import { formatDate } from "../lib/format";
import { PageHero } from "../../shared/pageChrome.js";

export default function GuideArticle() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  // Una ruta nueva no muestra el artículo o el error de la anterior.
  const current = result?.slug === slug ? result : null;
  const article = current?.article;
  const readingMinutes = article
    ? Math.max(1, Math.ceil(article.body.trim().split(/\s+/).length / 200))
    : 0;

  // React Router conserva el scroll al cambiar de ruta. Desde una tarjeta
  // baja del listado eso deja el título de la guía fuera de la pantalla.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    api
      .article(slug)
      .then((data) => {
        if (!cancelled) setResult({ slug, article: data.article });
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({ slug, error: err.message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <PageShell loading={!current}>
      <p className="mb-4">
        <Link
          to="/guias"
          onClick={(event) => {
            if (
              !location.state?.fromGuides ||
              event.defaultPrevented ||
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }
            event.preventDefault();
            navigate(-1);
          }}
          className="inline-flex min-h-10 items-center text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-400"
        >
          ← Todas las guías
        </Link>
      </p>
      {current?.error && <AlertBox>{current.error}</AlertBox>}
      {article && (
        <article>
          <PageHero
            linkComponent={Link}
            eyebrow={article.category?.name || "Guías de Tanke"}
            title={article.title}
            lead={article.excerpt}
            breadcrumbs={[{ href: "/", label: "Inicio" }, { href: "/guias", label: "Guías" }, { label: article.title }]}
            metadata={<>
              {article.author?.name && <span>Por {article.author.name}</span>}
              <time dateTime={article.createdAt}>{formatDate(article.createdAt)}</time>
              <span>{readingMinutes} min de lectura</span>
            </>}
          />
          <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
            <div className="page-panel min-w-0">
              <div className="guide-body">
                {article.body.split(/\n\s*\n/).filter((para) => para.trim()).map((para, index) => (
                  <p key={index}>{para}</p>
                ))}
              </div>
              {article.tags?.length > 0 && (
                <ul aria-label="Temas de esta guía" className="mt-8 flex flex-wrap gap-2 border-t border-slate-200 pt-6 dark:border-slate-800">
                  {article.tags.map((tag) => (
                    <li key={tag.id} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                      {tag.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <aside className="page-panel">
              <p className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Llévalo a la práctica</p>
              <h2 className="mt-3 text-xl font-black tracking-tight">Encuentra tu próximo ahorro</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">Compara precios de tu provincia y calcula cuánto te cuesta llenar el depósito.</p>
              <Link to="/" className="page-button page-button--primary mt-5 w-full">Comparar precios</Link>
              <Link
                to={article.category ? `/guias?categoria=${encodeURIComponent(article.category.slug)}` : "/guias"}
                className="mt-4 inline-flex min-h-10 items-center text-sm font-bold text-indigo-600 hover:underline dark:text-indigo-400"
              >Más guías {article.category ? `de ${article.category.name.toLowerCase()}` : "prácticas"} →</Link>
            </aside>
          </div>
        </article>
      )}
    </PageShell>
  );
}
