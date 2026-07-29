import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { Navigation } from "lucide-react";
import { getStationPrice, googleMapsUrl } from "../../utils/stations";
import { createPriceMarker } from "./createPriceMarker";
import { MapController } from "./MapController";

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function StationMap({
  stations,
  isDark,
  userLocation,
  searchRadius,
  sortType,
  averagePrice,
  cheapestStationId,
}) {
  const visible = stations.slice(0, 100);

  return (
    <div className="relative">
      <div className="h-[65vh] min-h-[420px] w-full overflow-hidden rounded-[20px] border border-[var(--app-border)] shadow-[var(--shadow-card)] md:h-[min(680px,calc(100vh-180px))]">
        <MapContainer
          center={[28.1, -15.45]}
          zoom={8}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            attribution='© <a href="https://carto.com/attributions">CARTO</a>'
            url={
              isDark
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            }
          />
          <MapController stations={visible} userLocation={userLocation} />

          {userLocation && (
            <>
              <Circle
                center={[userLocation.lat, userLocation.lng]}
                radius={searchRadius * 1000}
                pathOptions={{
                  color: "#4f46e5",
                  fillColor: "#4f46e5",
                  fillOpacity: 0.08,
                  weight: 2,
                  dashArray: "8, 8",
                }}
              />
              <Marker position={[userLocation.lat, userLocation.lng]}>
                <Popup>
                  <div className="text-center text-sm font-bold text-brand">
                    Estás aquí
                    <br />
                    <span className="text-xs font-normal text-slate-500">
                      Radio: {searchRadius} km
                    </span>
                  </div>
                </Popup>
              </Marker>
            </>
          )}

          {visible.map((station) => {
            const stationPrice = getStationPrice(station, sortType);
            const isCheapest = station.id === cheapestStationId;
            return (
              <Marker
                key={station.id}
                position={[station.lat, station.lng]}
                icon={createPriceMarker(
                  stationPrice,
                  averagePrice,
                  isCheapest,
                  station.name,
                )}
                zIndexOffset={isCheapest ? 1000 : 0}
              >
                <Popup>
                  <div className="min-w-[160px] text-center">
                    {isCheapest && (
                      <div className="mb-1 text-xs font-bold text-brand">
                        Más barata
                      </div>
                    )}
                    <h3 className="font-bold text-slate-800">{station.name}</h3>
                    <p className="text-xs text-slate-500">{station.address}</p>
                    {station.distance !== undefined && (
                      <p className="mt-1 text-xs text-slate-500">
                        {station.distance.toFixed(1)} km
                      </p>
                    )}
                    <div className="mt-2 rounded-lg bg-brand px-2 py-1 text-lg font-black text-white">
                      {stationPrice > 0 ? `${stationPrice.toFixed(3)} €` : "—"}
                    </div>
                    <a
                      href={googleMapsUrl(station.lat, station.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand underline"
                    >
                      <Navigation className="inline h-3 w-3" aria-hidden="true" />
                      Cómo llegar
                    </a>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-[var(--app-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-good" /> Barata
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-warn" /> Media
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-bad" /> Alta
        </span>
        <span className="ml-auto">{visible.length} marcadores</span>
      </div>
    </div>
  );
}
