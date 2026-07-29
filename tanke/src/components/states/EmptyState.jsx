import { FilterX, SearchX } from "lucide-react";

export function EmptyState({
  hasSearch,
  hasMunicipality,
  hasGps,
  onClearFilters,
}) {
  let title = "No hay gasolineras con estos filtros";
  let detail =
    "Prueba a cambiar de provincia, combustible o ampliar el radio de búsqueda.";

  if (hasSearch) {
    title = "Sin coincidencias de búsqueda";
    detail = "Prueba con otro nombre, municipio o dirección.";
  } else if (hasMunicipality) {
    title = "Sin estaciones en este municipio";
    detail = "Selecciona otro municipio o deja todos los municipios.";
  } else if (hasGps) {
    title = "No hay estaciones cerca";
    detail = "Amplía el radio o quita la ubicación para ver más resultados.";
  }

  return (
    <div className="surface mx-auto max-w-xl px-6 py-10 text-center">
      {hasSearch ? (
        <SearchX className="mx-auto mb-3 h-8 w-8 text-[var(--app-muted)]" aria-hidden="true" />
      ) : (
        <FilterX className="mx-auto mb-3 h-8 w-8 text-[var(--app-muted)]" aria-hidden="true" />
      )}
      <h3 className="text-lg font-black text-[var(--app-ink)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--app-muted)]">{detail}</p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-5 inline-flex min-h-11 items-center rounded-[14px] border border-[var(--app-border)] bg-[var(--app-elevated)] px-4 text-sm font-bold"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
