import { getFuelById } from "../../data/fuels";

export function ResultsHeader({
  count,
  place,
  sortType,
  averagePrice,
  outsideRadius,
  gpsSort,
  userLocation,
}) {
  const fuel = getFuelById(sortType);
  const orderLabel =
    userLocation && gpsSort === "distance" ? "distancia" : "precio";

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2
          className="text-lg font-black tracking-tight text-[var(--app-ink)]"
          aria-live="polite"
        >
          {count} gasolinera{count === 1 ? "" : "s"} en {place}
        </h2>
        <p className="text-sm text-[var(--app-muted)]">
          {fuel.label}
          {averagePrice > 0
            ? ` · media ${averagePrice.toFixed(3)} €/L`
            : ""}
          {` · orden por ${orderLabel}`}
        </p>
      </div>
      {outsideRadius && (
        <span className="inline-flex rounded-full border border-warn/30 bg-warn-soft px-3 py-1 text-xs font-bold text-warn">
          Fuera del radio: mostrando las más cercanas
        </span>
      )}
    </div>
  );
}
