import { List, Map as MapIcon, Search } from "lucide-react";
import { SegmentedControl } from "../ui/SegmentedControl";
import { FuelTabs } from "./FuelTabs";
import { GpsButton, GpsPanel } from "./GpsControls";
import { LocationFilters } from "./LocationFilters";
import { TankSimulator } from "./TankSimulator";

export function SearchPanel({
  searchTerm,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortType,
  onFuelChange,
  selectedProvince,
  selectedMunicipality,
  municipalities,
  onProvinceChange,
  onMunicipalityChange,
  tankSize,
  onTankSizeChange,
  userLocation,
  isLocating,
  geoError,
  searchRadius,
  gpsSort,
  onRequestLocation,
  onClearLocation,
  onRadiusChange,
  onGpsSortChange,
}) {
  return (
    <section className="mx-auto max-w-[1280px] px-4">
      <div className="surface sticky top-[61px] z-30 space-y-4 p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="tanke-search" className="sr-only">
              Buscar gasolinera
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]"
              aria-hidden="true"
            />
            <input
              id="tanke-search"
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar gasolinera, municipio o dirección…"
              className="control w-full pl-10 pr-3 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GpsButton
              userLocation={userLocation}
              isLocating={isLocating}
              onRequest={onRequestLocation}
              onClear={onClearLocation}
            />
            <SegmentedControl
              ariaLabel="Vista de resultados"
              value={viewMode}
              onChange={onViewModeChange}
              options={[
                {
                  value: "list",
                  label: "Lista",
                  icon: <List className="h-4 w-4" aria-hidden="true" />,
                },
                {
                  value: "map",
                  label: "Mapa",
                  icon: <MapIcon className="h-4 w-4" aria-hidden="true" />,
                },
              ]}
            />
          </div>
        </div>

        <GpsPanel
          userLocation={userLocation}
          geoError={geoError}
          searchRadius={searchRadius}
          gpsSort={gpsSort}
          onRequest={onRequestLocation}
          onRadiusChange={onRadiusChange}
          onGpsSortChange={onGpsSortChange}
        />

        <FuelTabs value={sortType} onChange={onFuelChange} />

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <LocationFilters
            selectedProvince={selectedProvince}
            selectedMunicipality={selectedMunicipality}
            municipalities={municipalities}
            onProvinceChange={onProvinceChange}
            onMunicipalityChange={onMunicipalityChange}
            municipalityDisabled={Boolean(userLocation)}
          />
          <TankSimulator value={tankSize} onChange={onTankSizeChange} />
        </div>
      </div>
    </section>
  );
}
