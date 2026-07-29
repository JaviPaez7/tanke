import { LoaderCircle, MapPin, X } from "lucide-react";
import { SegmentedControl } from "../ui/SegmentedControl";

export function GpsButton({ userLocation, isLocating, onRequest, onClear }) {
  if (userLocation) {
    return (
      <div className="inline-flex min-h-11 items-center gap-2 rounded-[14px] border border-good/30 bg-good-soft px-3 text-sm font-bold text-good dark:bg-emerald-950/40">
        <MapPin className="h-4 w-4" aria-hidden="true" />
        GPS activo
        <button
          type="button"
          onClick={onClear}
          aria-label="Quitar ubicación"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-surface)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={isLocating}
      className="inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-hover disabled:opacity-70"
    >
      {isLocating ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <MapPin className="h-4 w-4" aria-hidden="true" />
      )}
      {isLocating ? "Buscando…" : "Usar mi ubicación"}
    </button>
  );
}

export function GpsPanel({
  userLocation,
  geoError,
  searchRadius,
  gpsSort,
  onRequest,
  onRadiusChange,
  onGpsSortChange,
}) {
  if (!userLocation && !geoError) return null;

  return (
    <div className="space-y-3">
      {userLocation && (
        <div className="rounded-[16px] border border-good/30 bg-good-soft/70 p-3 dark:bg-emerald-950/20">
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]">
                Ordenar por
              </p>
              <SegmentedControl
                ariaLabel="Orden GPS"
                value={gpsSort}
                onChange={onGpsSortChange}
                options={[
                  { value: "price", label: "Más baratas" },
                  { value: "distance", label: "Más cercanas" },
                ]}
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="tanke-radius"
                  className="text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]"
                >
                  Radio
                </label>
                <span className="rounded-md bg-brand px-2 py-0.5 text-xs font-bold text-white">
                  {searchRadius} km
                </span>
              </div>
              <input
                id="tanke-radius"
                type="range"
                min={1}
                max={150}
                step={1}
                value={searchRadius}
                onChange={(e) => onRadiusChange(Number(e.target.value))}
                className="w-full accent-brand"
              />
            </div>
          </div>
        </div>
      )}

      {geoError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] border border-bad/30 bg-bad-soft px-3 py-2 text-sm text-bad"
        >
          <span>{geoError}</span>
          <button
            type="button"
            onClick={onRequest}
            className="font-bold underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      )}
    </div>
  );
}
