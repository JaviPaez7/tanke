import { useEffect, useState } from "react";

/**
 * Tope de marcadores que el mapa puede pintar, según el dispositivo.
 *
 * El mapa es la vista más cara: cada marcador es un divIcon con su HTML (y su
 * <img> de marca) más un Popup que react-leaflet monta aunque nadie lo abra.
 * En móvil, 100 marcadores hacían que el mapa fuese a tirones al arrastrar.
 *
 * Se escucha el cambio del media query para que girar el móvil o redimensionar
 * no deje el tope de la orientación anterior.
 */
export const MAP_LIMIT_MOBILE = 40;
export const MAP_LIMIT_DESKTOP = 100;

const MOBILE_QUERY = "(max-width: 768px)";

export function useMapMarkerCap() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(MOBILE_QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return isMobile ? MAP_LIMIT_MOBILE : MAP_LIMIT_DESKTOP;
}
