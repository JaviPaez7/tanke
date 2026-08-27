import { useEffect } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { CrownIcon, MapPinIcon } from "../icons";
import { ICON_PATHS } from "../iconPaths";
import { priceFormat } from "../lib/format";
import { brandFor } from "../data/brands";

// Todo Leaflet vive en este fichero para que Vite lo pueda separar en su propio
// chunk: antes se importaba desde App.jsx y los 43 KB (gzip) del motor de mapas
// viajaban en el bundle inicial de TODAS las rutas, incluidas /login y /guias,
// donde no hay mapa que enseñar.
L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const formatPrice = (n) => priceFormat.format(n);

const createPriceIcon = (price, avg, isCheapest, stationName) => {
  let colorClass = "bg-slate-600";
  if (price > 0 && avg > 0) {
    if (price < avg - 0.01) colorClass = "bg-green-600";
    else if (price > avg + 0.01) colorClass = "bg-red-600";
    else colorClass = "bg-orange-500";
  }

  if (isCheapest)
    colorClass = "bg-yellow-500 border-yellow-300 marker-cheapest";

  const logoUrl = brandFor(stationName)?.url ?? null;

  return L.divIcon({
    className: "custom-price-marker",
    html: `
      <div class="flex flex-col items-center relative transition-transform hover:scale-110">
        ${
          isCheapest
            ? `<span class="mb-[-5px] drop-shadow-md z-30 text-yellow-400">
                 <svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="${ICON_PATHS.crown}"/></svg>
               </span>`
            : ""
        }
        ${
          logoUrl
            ? `
          <div class="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white shadow-md border border-slate-200 z-20 flex items-center justify-center p-0.5 overflow-hidden">
            <img src="${logoUrl}" alt="" class="w-full h-full object-contain" />
          </div>
        `
            : ""
        }
        <div class="${colorClass} text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg shadow-lg border-2 border-white flex items-center justify-center whitespace-nowrap">
          ${price > 0 ? formatPrice(price) : "--"}&nbsp;€
        </div>
        <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-${isCheapest ? "yellow-500" : colorClass.split("-")[1] + "-600"}"></div>
      </div>
    `,
    iconSize: [45, 35],
    iconAnchor: [22, 35],
  });
};

function RecenterMap({ stations }) {
  const map = useMap();
  useEffect(() => {
    if (stations.length > 0) {
      const first = stations[0];
      map.setView([first.lat, first.lng], 10);
    }
  }, [stations, map]);
  return null;
}

export default function StationMap({
  stations,
  markerLimit,
  isDark,
  userLocation,
  searchRadius,
  currentAverage,
  getPriceForStation,
}) {
  const visibleStations = stations.slice(0, markerLimit);
  const currentPrices = visibleStations
    .map((s) => getPriceForStation(s))
    .filter((p) => p > 0);
  const minPrice = currentPrices.length > 0 ? Math.min(...currentPrices) : 0;

  return (
    <div className="h-150 w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 z-0 relative">
      <MapContainer
        center={[40.416, -3.703]}
        zoom={6}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        {/* Si es dark mode, cargamos las tiles oscuras de CartoDB */}
        <TileLayer
          attribution='© <a href="https://carto.com/attributions">CARTO</a>'
          url={
            isDark
              ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          }
        />

        <RecenterMap stations={stations} />

        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={searchRadius * 1000}
              pathOptions={{
                color: "#4f46e5",
                fillColor: "#4f46e5",
                fillOpacity: 0.1,
                weight: 2,
                dashArray: "8, 8",
              }}
            />
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>
                <div className="text-center font-bold text-indigo-600">
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4 shrink-0" />
                    Estás aquí
                  </span>
                  <br />
                  <span className="text-xs text-slate-500 font-normal">
                    Radio: {searchRadius} km
                  </span>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {visibleStations.map((station) => {
          const stationPrice = getPriceForStation(station);
          const isCheapest = stationPrice > 0 && stationPrice === minPrice;

          return (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={createPriceIcon(
                stationPrice,
                currentAverage,
                isCheapest,
                station.name,
              )}
              zIndexOffset={isCheapest ? 1000 : 0}
            >
              <Popup>
                <div className="text-center min-w-[120px]">
                  {isCheapest && (
                    <div className="flex items-center justify-center gap-1 text-xs font-bold text-yellow-600 mb-1">
                      <CrownIcon className="w-3.5 h-3.5 shrink-0" />
                      ¡LA MÁS BARATA!
                    </div>
                  )}
                  <h3 className="font-bold text-slate-800">{station.name}</h3>
                  <p className="text-xs text-slate-500">{station.address}</p>
                  <div className="mt-2 bg-indigo-600 text-white font-black py-1 px-2 rounded-lg text-lg">
                    {formatPrice(stationPrice)} €
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 text-indigo-600 font-bold text-xs underline"
                  >
                    Cómo llegar
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
