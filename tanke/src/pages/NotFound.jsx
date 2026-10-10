import { Link } from "react-router-dom";
import { PageShell } from "../components/AppChrome";
import { PageHero } from "../../shared/pageChrome.js";

// El 404 de server.js solo cubre las landings SEO; cualquier ruta desconocida
// bajo la SPA caia en index.html y se quedaba en blanco.
export default function NotFound() {
  return (
    <PageShell>
      <PageHero
        linkComponent={Link}
        eyebrow="Error 404"
        title="Página no encontrada"
        lead="La dirección no existe o ha cambiado. Puedes seguir comparando precios o explorar nuestras guías."
        actions={[{ href: "/", label: "Volver a Tanke" }, { href: "/guias", label: "Ver las guías", ghost: true }]}
      />
    </PageShell>
  );
}
