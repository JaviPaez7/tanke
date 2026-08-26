import { Link } from "react-router-dom";
import { PageShell } from "../components/AppChrome";
import { EmptyState } from "../components/ui";

// El 404 de server.js solo cubre las landings SEO; cualquier ruta desconocida
// bajo la SPA caia en index.html y se quedaba en blanco.
export default function NotFound() {
  return (
    <PageShell title="Página no encontrada" bare>
      <EmptyState title="Aquí no hay nada">
        <p>
          El enlace que has seguido no existe o ha cambiado de sitio. El
          buscador sigue donde siempre.
        </p>
        <p className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2">
          <Link
            to="/"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Buscar gasolineras
          </Link>
          <Link
            to="/guias"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Leer las guías
          </Link>
          <Link
            to="/cuenta"
            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Mi cuenta
          </Link>
        </p>
      </EmptyState>
    </PageShell>
  );
}
