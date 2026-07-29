import { BadgeCheck, Fuel, MapPin, Navigation } from "lucide-react";
import { resolveBrand } from "../../data/brands";
import { getFuelById, SECONDARY_PRICE_FIELDS } from "../../data/fuels";
import {
  getStationPrice,
  googleMapsUrl,
  priceDelta,
  priceTier,
  tankCost,
  tankSavings,
} from "../../utils/stations";
import { PriceCell } from "./PriceCell";

export function StationCard({
  station,
  sortType,
  averagePrice,
  tankSize,
  isCheapest,
}) {
  const fuel = getFuelById(sortType);
  const price = getStationPrice(station, sortType);
  const brand = resolveBrand(station.name);
  const delta = priceDelta(price, averagePrice);
  const tier = priceTier(price, averagePrice);
  const total = tankCost(price, tankSize);
  const savings = tankSavings(price, averagePrice, tankSize);

  const secondary = SECONDARY_PRICE_FIELDS.filter(
    (f) => f.field !== fuel.priceField,
  ).slice(0, 3);

  const deltaLabel =
    tier === "cheap"
      ? `${Math.abs(delta).toFixed(3)} €/L menos que la media`
      : tier === "expensive"
        ? `${Math.abs(delta).toFixed(3)} €/L más que la media`
        : tier === "average"
          ? "Cerca de la media"
          : null;

  return (
    <article className="surface flex h-full flex-col p-5 transition-transform duration-150 hover:-translate-y-0.5 hover:border-brand/30">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border border-[var(--app-border)] bg-[var(--app-elevated)]">
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt={`Logo ${brand.label}`}
              width={40}
              height={40}
              loading="lazy"
              className="h-full w-full object-contain p-1.5"
            />
          ) : (
            <Fuel className="h-4 w-4 text-[var(--app-muted)]" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-black leading-snug text-[var(--app-ink)]">
            {station.name}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--app-muted)]">
            {station.address}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[var(--app-muted)]">
            <span className="inline-flex items-center gap-1 rounded-md bg-brand-soft px-2 py-0.5 text-brand dark:bg-brand/20 dark:text-indigo-300">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {station.municipality || "Sin municipio"}
            </span>
            {station.distance !== undefined && (
              <span>{station.distance.toFixed(1)} km</span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]">
            {fuel.label}
          </span>
          {isCheapest && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
              <BadgeCheck className="h-3 w-3" aria-hidden="true" />
              Más barata
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black tracking-tight text-[var(--app-ink)]">
            {price > 0 ? price.toFixed(3) : "—"}
          </span>
          <span className="text-sm font-semibold text-[var(--app-muted)]">
            €/L
          </span>
        </div>
        {deltaLabel && (
          <p
            className={`mt-1 text-xs font-semibold ${
              tier === "cheap"
                ? "text-good"
                : tier === "expensive"
                  ? "text-bad"
                  : "text-warn"
            }`}
          >
            {deltaLabel}
          </p>
        )}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {secondary.map((item) => (
          <PriceCell
            key={item.field}
            label={item.label}
            price={station[item.field]}
            compact
          />
        ))}
      </div>

      {tankSize > 0 && price > 0 && (
        <p className="mb-3 rounded-[12px] border border-[var(--app-border)] bg-[var(--app-elevated)] px-3 py-2 text-xs font-semibold text-[var(--app-muted)]">
          Depósito {tankSize} L:{" "}
          <span className="text-[var(--app-ink)]">{total.toFixed(2)} €</span>
          {savings > 0 && (
            <>
              {" "}
              · ahorras{" "}
              <span className="text-good">{savings.toFixed(2)} €</span>
            </>
          )}
        </p>
      )}

      {station.schedule && station.schedule !== "Sin horario" && (
        <p className="mb-3 text-[11px] text-[var(--app-muted)]">
          Horario: {station.schedule}
        </p>
      )}

      <a
        href={googleMapsUrl(station.lat, station.lng)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-hover"
      >
        <Navigation className="h-4 w-4" aria-hidden="true" />
        Cómo llegar
      </a>
    </article>
  );
}
