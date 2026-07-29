import { getFuelById } from "../data/fuels";

export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getStationPrice(station, sortType) {
  const fuel = getFuelById(sortType);
  return station?.[fuel.priceField] || 0;
}

export function averagePrice(stations, sortType) {
  const prices = stations
    .map((s) => getStationPrice(s, sortType))
    .filter((p) => p > 0);
  if (prices.length === 0) return 0;
  return prices.reduce((a, b) => a + b, 0) / prices.length;
}

export function filterAndSortStations({
  stations,
  searchTerm,
  selectedMunicipality,
  userLocation,
  searchRadius,
  sortType,
  gpsSort,
}) {
  let result = [...stations];
  let outsideRadius = false;

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.municipality.toLowerCase().includes(term) ||
        s.address.toLowerCase().includes(term),
    );
  } else if (userLocation) {
    result = result.map((s) => ({
      ...s,
      distance: calculateDistance(
        userLocation.lat,
        userLocation.lng,
        s.lat,
        s.lng,
      ),
    }));

    const nearStations = result.filter((s) => s.distance < searchRadius);
    if (nearStations.length > 0) {
      result = nearStations;
    } else {
      result.sort((a, b) => a.distance - b.distance);
      result = result.slice(0, 20);
      outsideRadius = true;
    }
  } else if (selectedMunicipality) {
    result = result.filter((s) => s.municipality === selectedMunicipality);
  }

  result.sort((a, b) => {
    if (userLocation && gpsSort === "distance") {
      if (a.distance === undefined) return 1;
      if (b.distance === undefined) return -1;
      return a.distance - b.distance;
    }
    const priceA = getStationPrice(a, sortType);
    const priceB = getStationPrice(b, sortType);
    if (priceA <= 0) return 1;
    if (priceB <= 0) return -1;
    return priceA - priceB;
  });

  const avg = averagePrice(result, sortType);
  const cheapestStationId =
    result.find((s) => getStationPrice(s, sortType) > 0)?.id || null;

  return {
    filteredStations: result,
    averagePrice: avg,
    outsideRadius,
    cheapestStationId,
  };
}

export function tankCost(price, liters) {
  if (!price || price <= 0 || !liters) return 0;
  return price * liters;
}

export function tankSavings(price, average, liters) {
  if (!price || price <= 0 || !average || !liters) return 0;
  return (average - price) * liters;
}

export function priceDelta(price, average) {
  if (!price || price <= 0 || !average) return 0;
  return price - average;
}

export function priceTier(price, average) {
  if (!price || price <= 0 || !average) return "none";
  if (price < average - 0.01) return "cheap";
  if (price > average + 0.01) return "expensive";
  return "average";
}

export function googleMapsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
