import { brandFor } from "../data/brands";
import { availableFuels, tankSummary } from "../lib/stationPricing";
import { formatEur, formatKm } from "../lib/format";
import { ArrowUpIcon, ArrowUpRightIcon, MapPinIcon } from "../icons";
import { FavoriteButton } from "./FavoriteButton";
import { PriceTag } from "./PriceTag";
import { ReportButton } from "./ReportButton";

/**
 * Tarjeta de una gasolinera en la lista de resultados.
 *
 * Extraída de App.jsx. Pinta marca, nombre, dirección, municipio, los botones
 * de aviso y favorito, la distancia si el usuario dio su posición, el gasto
 * estimado para su depósito y un recuadro con PriceTag por cada combustible
 * que la estación vende.
 */
export function StationCard({
  station,
  currentAverage,
  tankSize,
  sortType,
  getPriceForStation,
}) {
  const price = getPriceForStation(station);
  const { total, savings } = tankSummary(price, currentAverage, tankSize);
  const brand = brandFor(station.name);

  return (
    <div
      key={station.id}
      className="card-lift h-full flex flex-col bg-white dark:bg-slate-900 rounded-4xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 group relative"
    >
      <div className="mb-4 flex items-start gap-3">
        {brand && (
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white border border-slate-100 dark:border-slate-700 shadow-sm p-2 flex items-center justify-center overflow-hidden">
            <img
              src={brand.url}
              alt={brand.name}
              className="w-full h-full object-contain"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* h2 y no h3: la página solo tiene un h1 (el titular del
              hero), así que saltar a h3 rompía el orden de
              encabezados. */}
          <h2
            className="font-black text-slate-800 dark:text-white text-lg leading-tight truncate"
            title={station.name}
          >
            {station.name}
          </h2>
          <p
            className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate"
            title={station.address}
          >
            {station.address}
          </p>
          <span className="text-[9px] font-bold uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md inline-block mt-2">
            {station.municipality}
          </span>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-2 self-start">
          <div className="flex items-center gap-1.5">
            <ReportButton station={station} />
            <FavoriteButton station={station} />
          </div>
          {station.distance !== undefined && (
            <div className="flex items-center gap-1 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap tabular-nums">
              <MapPinIcon className="w-3 h-3 shrink-0" />
              {formatKm(station.distance)} km
            </div>
          )}
        </div>
      </div>

      {tankSize > 0 && (
        <div className="bg-slate-900 dark:bg-slate-950/70 dark:ring-1 dark:ring-slate-700/60 rounded-2xl p-4 mb-4 text-white animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-center gap-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                Total {tankSize}L
              </p>
              <p className="text-2xl font-black tabular-nums">
                {total > 0 ? formatEur(total) : "--"}&nbsp;€
              </p>
            </div>
            {savings > 0 && (
              <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 rounded-full pl-2 pr-3 py-1.5 shrink-0">
                <ArrowUpIcon className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-wider text-green-400/80">
                  Ahorras
                </span>
                <span className="text-base font-black text-green-400 tabular-nums leading-none">
                  +{formatEur(savings)}&nbsp;€
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Con menos casillas la tarjeta encoge, pero la fila no se descuadra:
          la lista es un grid (estira cada celda a la más alta), la tarjeta es
          flex en columna y el botón lleva mt-auto, así que siempre queda
          abajo, alineado con el de sus vecinas. */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        {availableFuels(station).map((fuel) => (
          <PriceTag
            key={fuel.field}
            label={fuel.label}
            price={station[fuel.field]}
            highlight={fuel.sort === sortType}
            currentAverage={currentAverage}
          />
        ))}
      </div>
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex items-center justify-center gap-1.5 w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 hover:bg-indigo-700 active:scale-[0.98] transition-all"
      >
        Ir a la estación
        <ArrowUpRightIcon className="w-4 h-4 shrink-0" />
      </a>
    </div>
  );
}
