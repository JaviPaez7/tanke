import { useEffect, useLayoutEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { PageShell } from "../components/AppChrome";
import { AlertBox } from "../components/ui";

export default function GuideArticle() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [error, setError] = useState("");

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
        if (!cancelled) setArticle(data.article);
      })
      .catch((err) => {
        if (!cancelled) {
          setArticle(null);
          setError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <PageShell>
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
          className="text-sm font-bold text-indigo-600"
        >
          ← Todas las guías
        </Link>
      </p>
      {error && <AlertBox>{error}</AlertBox>}
      {article && (
        <article className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-10">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            {article.title}
          </h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            {article.excerpt}
          </p>
          <div className="max-w-[70ch] space-y-4 text-slate-800 dark:text-slate-100 leading-relaxed">
            {article.body.split(/\n\n+/).map((para, index) => (
              <p key={index}>{para}</p>
            ))}
          </div>
          {article.tags?.length > 0 && (
            <ul className="flex flex-wrap gap-2 mt-10">
              {article.tags.map((tag) => (
                <li
                  key={tag.id}
                  className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md"
                >
                  {tag.name}
                </li>
              ))}
            </ul>
          )}
        </article>
      )}
    </PageShell>
  );
}
