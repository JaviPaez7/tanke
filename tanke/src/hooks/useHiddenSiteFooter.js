import { useEffect } from "react";

/**
 * El footer de enlaces SEO vive en index.html, fuera de React, así que aparece
 * en todas las rutas. En el login y en el panel no aporta nada y rompe
 * pantallas pensadas para ocupar el alto completo.
 */
export function useHiddenSiteFooter(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    document.body.dataset.chrome = "app";
    return () => {
      delete document.body.dataset.chrome;
    };
  }, [enabled]);
}
