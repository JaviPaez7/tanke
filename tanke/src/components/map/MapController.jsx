import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export function MapController({ stations, userLocation }) {
  const map = useMap();

  useEffect(() => {
    const points = [];
    stations.slice(0, 100).forEach((s) => {
      if (s.lat && s.lng) points.push([s.lat, s.lng]);
    });
    if (userLocation) points.push([userLocation.lat, userLocation.lng]);

    if (points.length === 0) {
      map.setView([28.1, -15.45], 8);
      return;
    }
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 13 });
  }, [stations, userLocation, map]);

  return null;
}
