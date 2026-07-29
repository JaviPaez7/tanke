import { lazy, Suspense } from "react";
import { List, Map as MapIcon } from "lucide-react";
import { AppHeader } from "./components/layout/AppHeader";
import { IntroBlock } from "./components/layout/IntroBlock";
import { SearchPanel } from "./components/search/SearchPanel";
import { ResultsHeader } from "./components/results/ResultsHeader";
import { StationGrid } from "./components/results/StationGrid";
import { LoadingSkeleton } from "./components/states/LoadingSkeleton";
import { ErrorState } from "./components/states/ErrorState";
import { EmptyState } from "./components/states/EmptyState";
import { SegmentedControl } from "./components/ui/SegmentedControl";
import { useStationSearch } from "./hooks/useStationSearch";
import { useTheme } from "./hooks/useTheme";

const StationMap = lazy(() => import("./components/map/StationMap"));

function App() {
  const { isDark, toggleTheme } = useTheme();
  const search = useStationSearch();

  const place =
    search.selectedMunicipality ||
    (search.selectedProvince === "Toda España"
      ? "España"
      : search.selectedProvince);

  const showSkeleton = search.loading && search.allStations.length === 0;
  const showError = Boolean(search.errorMsg) && search.allStations.length === 0;
  const showEmpty =
    !search.loading &&
    !showError &&
    search.filteredStations.length === 0;

  return (
    <div className="app-shell pb-24 md:pb-10">
      <AppHeader isDark={isDark} onToggleTheme={toggleTheme} />
      <IntroBlock />

      <SearchPanel
        searchTerm={search.searchTerm}
        onSearchChange={search.setSearchTerm}
        viewMode={search.viewMode}
        onViewModeChange={search.setViewMode}
        sortType={search.sortType}
        onFuelChange={search.setFuel}
        selectedProvince={search.selectedProvince}
        selectedMunicipality={search.selectedMunicipality}
        municipalities={search.municipalities}
        onProvinceChange={search.selectProvince}
        onMunicipalityChange={search.selectMunicipality}
        tankSize={search.tankSize}
        onTankSizeChange={search.setTankSize}
        userLocation={search.userLocation}
        isLocating={search.isLocating}
        geoError={search.geoError}
        searchRadius={search.searchRadius}
        gpsSort={search.gpsSort}
        onRequestLocation={search.requestLocation}
        onClearLocation={search.clearLocation}
        onRadiusChange={search.setSearchRadius}
        onGpsSortChange={search.setGpsSort}
      />

      <main className="mx-auto mt-6 max-w-[1280px] px-4">
        {!showSkeleton && !showError && (
          <ResultsHeader
            count={search.filteredStations.length}
            place={place}
            sortType={search.sortType}
            averagePrice={search.averagePrice}
            outsideRadius={search.outsideRadius}
            gpsSort={search.gpsSort}
            userLocation={search.userLocation}
          />
        )}

        {showSkeleton && <LoadingSkeleton />}

        {showError && (
          <ErrorState message={search.errorMsg} onRetry={search.retry} />
        )}

        {showEmpty && (
          <EmptyState
            hasSearch={Boolean(search.searchTerm)}
            hasMunicipality={Boolean(search.selectedMunicipality)}
            hasGps={Boolean(search.userLocation)}
            onClearFilters={search.clearFilters}
          />
        )}

        {!showSkeleton && !showError && !showEmpty && (
          <>
            {search.loading && (
              <p className="mb-3 text-sm text-[var(--app-muted)]" aria-live="polite">
                Actualizando precios…
              </p>
            )}
            {search.viewMode === "list" ? (
              <StationGrid
                stations={search.filteredStations}
                sortType={search.sortType}
                averagePrice={search.averagePrice}
                tankSize={search.tankSize}
                cheapestStationId={search.cheapestStationId}
              />
            ) : (
              <Suspense fallback={<LoadingSkeleton />}>
                <StationMap
                  stations={search.filteredStations}
                  isDark={isDark}
                  userLocation={search.userLocation}
                  searchRadius={search.searchRadius}
                  sortType={search.sortType}
                  averagePrice={search.averagePrice}
                  cheapestStationId={search.cheapestStationId}
                />
              </Suspense>
            )}
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--app-border)] bg-[var(--app-surface)]/95 px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden">
        <div className="mx-auto w-full max-w-md [&_>div]:flex [&_>div]:w-full [&_button]:flex-1">
          <SegmentedControl
            ariaLabel="Vista de resultados"
            value={search.viewMode}
            onChange={search.setViewMode}
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
    </div>
  );
}

export default App;
