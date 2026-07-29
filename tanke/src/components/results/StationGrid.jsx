import { StationCard } from "./StationCard";

export function StationGrid({
  stations,
  sortType,
  averagePrice,
  tankSize,
  cheapestStationId,
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {stations.slice(0, 50).map((station) => (
        <StationCard
          key={station.id}
          station={station}
          sortType={sortType}
          averagePrice={averagePrice}
          tankSize={tankSize}
          isCheapest={station.id === cheapestStationId}
        />
      ))}
    </div>
  );
}
