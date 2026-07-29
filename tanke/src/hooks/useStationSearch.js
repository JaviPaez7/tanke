import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getAllGasStations } from "../services/gasStations";
import { provinceIds } from "../data/provinces";
import { getFuelBySlug } from "../data/fuels";
import {
  fuelSortBySlug,
  resolveProvinceSlug,
  slugify,
} from "../data/seo";
import { filterAndSortStations } from "../utils/stations";

function readInitialProvince() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = resolveProvinceSlug(params.get("provincia"), provinceIds);
  if (fromUrl) return fromUrl;
  const saved = localStorage.getItem("tanke_province");
  if (saved === "Toda España") return "Toda España";
  return provinceIds[saved] ? saved : "Las Palmas";
}

function readInitialSort() {
  const params = new URLSearchParams(window.location.search);
  const fuel = params.get("combustible");
  if (fuel && fuelSortBySlug[fuel]) return fuelSortBySlug[fuel];
  const bySlug = getFuelBySlug(fuel);
  if (bySlug) return bySlug.id;
  return localStorage.getItem("tanke_sort") || "gas95Asc";
}

function updateUrlParam(key, value) {
  const url = new URL(window.location.href);
  if (!value) url.searchParams.delete(key);
  else url.searchParams.set(key, value);
  window.history.replaceState({}, "", url);
}

export function useStationSearch() {
  const [selectedProvince, setSelectedProvince] = useState(readInitialProvince);
  const [selectedMunicipality, setSelectedMunicipality] = useState(
    () => localStorage.getItem("tanke_municipality") || "",
  );
  const [sortType, setSortTypeState] = useState(readInitialSort);
  const [tankSize, setTankSizeState] = useState(
    () => Number(localStorage.getItem("tanke_liters")) || 0,
  );
  const [viewMode, setViewMode] = useState("list");
  const [allStations, setAllStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [gpsSort, setGpsSort] = useState("price");
  const [searchRadius, setSearchRadiusState] = useState(
    () => Number(localStorage.getItem("tanke_radius")) || 20,
  );
  const requestIdRef = useRef(0);

  const loadProvinceData = useCallback(async (id) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getAllGasStations(id);
      if (requestId !== requestIdRef.current) return;
      if (!data || data.length === 0) {
        setErrorMsg("No hay datos disponibles o falló la conexión.");
        setAllStations([]);
      } else {
        setAllStations([...data].sort((a, b) => a.price95 - b.price95));
      }
    } catch (err) {
      console.error(err);
      if (requestId !== requestIdRef.current) return;
      setErrorMsg("Error cargando datos.");
      setAllStations([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const idToLoad =
      selectedProvince === "Toda España"
        ? "all"
        : provinceIds[selectedProvince];
    loadProvinceData(idToLoad || "35");
    if (selectedProvince && selectedProvince !== "Toda España") {
      localStorage.setItem("tanke_province", selectedProvince);
    }
    // Solo carga inicial; cambios posteriores via selectProvince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const place =
      selectedProvince === "Toda España" ? "España" : selectedProvince;
    document.title = `Tanke — Gasolineras baratas en ${place}`;
    const desc = `Compara precios de gasolina y diésel en ${place} en tiempo real. Encuentra la gasolinera más barata cerca de ti con Tanke.`;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute("content", desc);
  }, [selectedProvince]);

  const municipalities = useMemo(
    () =>
      [...new Set(allStations.map((s) => s.municipality).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, "es"),
      ),
    [allStations],
  );

  const {
    filteredStations,
    averagePrice,
    outsideRadius,
    cheapestStationId,
  } = useMemo(
    () =>
      filterAndSortStations({
        stations: allStations,
        searchTerm,
        selectedMunicipality,
        userLocation,
        searchRadius,
        sortType,
        gpsSort,
      }),
    [
      allStations,
      searchTerm,
      selectedMunicipality,
      userLocation,
      searchRadius,
      sortType,
      gpsSort,
    ],
  );

  const selectProvince = useCallback(
    (provinceName) => {
      setSelectedProvince(provinceName);
      localStorage.setItem("tanke_province", provinceName);
      setSelectedMunicipality("");
      localStorage.removeItem("tanke_municipality");
      setSearchTerm("");
      const id =
        provinceName === "Toda España" ? "all" : provinceIds[provinceName];
      if (id) loadProvinceData(id);
      updateUrlParam(
        "provincia",
        provinceName === "Toda España" ? "" : slugify(provinceName),
      );
    },
    [loadProvinceData],
  );

  const selectMunicipality = useCallback((value) => {
    setSelectedMunicipality(value);
    if (value) localStorage.setItem("tanke_municipality", value);
    else localStorage.removeItem("tanke_municipality");
  }, []);

  const setFuel = useCallback((id) => {
    setSortTypeState(id);
    localStorage.setItem("tanke_sort", id);
    updateUrlParam("combustible", fuelSlugFromId(id));
  }, []);

  const setTankSize = useCallback((value) => {
    const v = Number(value) || 0;
    setTankSizeState(v);
    localStorage.setItem("tanke_liters", String(v));
  }, []);

  const setSearchRadius = useCallback((value) => {
    const v = Number(value) || 20;
    setSearchRadiusState(v);
    localStorage.setItem("tanke_radius", String(v));
  }, []);

  const requestLocation = useCallback(() => {
    setIsLocating(true);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      setIsLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setSelectedMunicipality("");
        localStorage.removeItem("tanke_municipality");
        setSearchTerm("");
        setIsLocating(false);
      },
      (error) => {
        console.error(error);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Permiso de ubicación denegado.");
        } else if (error.code === error.TIMEOUT) {
          setGeoError("Tiempo de espera agotado al obtener la ubicación.");
        } else {
          setGeoError("No se pudo obtener tu ubicación.");
        }
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setGeoError(null);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedMunicipality("");
    localStorage.removeItem("tanke_municipality");
    setUserLocation(null);
    setGeoError(null);
  }, []);

  const retry = useCallback(() => {
    const id =
      selectedProvince === "Toda España"
        ? "all"
        : provinceIds[selectedProvince];
    loadProvinceData(id || "35");
  }, [loadProvinceData, selectedProvince]);

  return {
    selectedProvince,
    selectedMunicipality,
    sortType,
    tankSize,
    viewMode,
    allStations,
    filteredStations,
    loading,
    errorMsg,
    searchTerm,
    userLocation,
    geoError,
    isLocating,
    averagePrice,
    gpsSort,
    searchRadius,
    municipalities,
    outsideRadius,
    cheapestStationId,
    selectProvince,
    selectMunicipality,
    setFuel,
    setTankSize,
    setViewMode,
    setSearchTerm,
    setGpsSort,
    setSearchRadius,
    requestLocation,
    clearLocation,
    clearFilters,
    retry,
    setGeoError,
  };
}

function fuelSlugFromId(id) {
  const map = {
    gas95Asc: "gasolina-95",
    gas98Asc: "gasolina-98",
    dieselAsc: "diesel",
    glpAsc: "glp",
    cnGAsc: "gnc",
  };
  return map[id] || "";
}
