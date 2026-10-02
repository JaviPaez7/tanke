import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { getAllGasStations } from "./services/gasStations";
import { api } from "./api/client";
import {
  fuelSortBySlug,
  resolveProvinceSlug,
  slugify,
} from "./data/seo";
import { provinceIds } from "../seo/provinces.js";
import {
  ArrowUpIcon,
  ArrowUpRightIcon,
  BroadcastIcon,
  CrownIcon,
  GasPumpIcon,
  ListIcon,
  MapIcon,
  MapPinIcon,
  TagIcon,
  XIcon,
} from "./icons";
import { ICON_PATHS } from "./iconPaths";
import { AppChrome } from "./components/AppChrome";
import { PriceTag } from "./components/PriceTag";
import { StationCard } from "./components/StationCard";
import { useMapMarkerCap } from "./hooks/useMapMarkerCap";
import { formatCount, formatPriceValue } from "./lib/format";
import { calculateDistance } from "./lib/geo";
import { FavoriteButton } from "./components/FavoriteButton";
import { ReportButton } from "./components/ReportButton";
import { StationListSkeleton } from "./components/StationSkeleton";
import { PRICE_FIELD_BY_SORT } from "./lib/stationPricing";
import { fuelLabel } from "./data/fuels";
import { emptyResultsMessage, zoneLabel } from "./lib/emptyResults";

// El mapa se carga solo cuando se pide esa vista: Leaflet y su CSS son el
// bloque más pesado del proyecto y la mayoría de visitas no salen de la lista.
const StationMap = lazy(() => import("./components/StationMap"));

// Las 52 provincias vivían escritas dos veces, aquí y en seo/provinces.js.
// Coincidían, pero nada lo garantizaba: ahora el buscador y las landings leen
// la misma tabla.

// El Ministerio devuelve `IDProvincia`, no el nombre que usa la app
// ("PALMAS (LAS)" frente a "Las Palmas"), así que la traducción va por ID.
const provinceNameById = Object.fromEntries(
  Object.entries(provinceIds).map(([name, id]) => [id, name]),
);

// Los formateadores en español viven en `lib/format.js`: los comparten el
// buscador, las tarjetas de precio y el resto de la app.

// Cuántas tarjetas puede pedir el usuario. 50 es el valor histórico y sigue
// siendo el arranque para quien no toca el selector.
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 50;

function readInitialProvince() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = resolveProvinceSlug(params.get("provincia"), provinceIds);
  if (fromUrl) return fromUrl;
  const saved = localStorage.getItem("tanke_province");
  if (saved === "Toda España") return "Toda España";
  return provinceIds[saved] ? saved : "Las Palmas";
}

function readInitialMunicipality() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = resolveProvinceSlug(params.get("provincia"), provinceIds);
  const savedProvince = localStorage.getItem("tanke_province");
  if (fromUrl && fromUrl !== savedProvince) return "";
  return localStorage.getItem("tanke_municipality") || "";
}

function readInitialSort() {
  const params = new URLSearchParams(window.location.search);
  const fuel = params.get("combustible");
  if (fuel && fuelSortBySlug[fuel]) return fuelSortBySlug[fuel];
  const saved = localStorage.getItem("tanke_sort");
  return PRICE_FIELD_BY_SORT[saved] ? saved : "gas95Asc";
}

function App() {
  const [selectedProvince, setSelectedProvince] = useState(readInitialProvince);

  const [selectedMunicipality, setSelectedMunicipality] = useState(readInitialMunicipality);
  const [sortType, setSortType] = useState(readInitialSort);
  // 50 L por defecto (depósito típico). Antes arrancaba en 0 = desactivado, así
  // que la insignia "Ahorras" —el argumento diferencial de la app— no se veía
  // hasta mover un slider que nadie sabía que había que mover. Se respeta el
  // valor guardado, incluido el 0 de quien lo desactivó a propósito.
  const [tankSize, setTankSize] = useState(() => {
    const saved = localStorage.getItem("tanke_liters");
    return saved === null ? 50 : Number(saved) || 0;
  });

  const [viewMode, setViewMode] = useState("list");
  // Cuántas tarjetas se muestran. Antes la lista cortaba en 50 en silencio: en
  // "Toda España" son más de 11.000 estaciones y nada indicaba que hubiera más.
  // Ahora lo elige el usuario; el tope es 200 porque cada tarjeta es un nodo
  // pesado y pintar miles de golpe bloquea el navegador en móvil.
  const [pageSize, setPageSize] = useState(() => {
    const saved = Number(localStorage.getItem("tanke_page_size"));
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : DEFAULT_PAGE_SIZE;
  });
  // El mapa respeta la misma elección que la lista, pero con techo propio: el
  // coste de una tarjeta fuera de pantalla es cero y el de un marcador no.
  const mapMarkerLimit = Math.min(pageSize, useMapMarkerCap());
  // `stations` y `currentAverage` ya no son estado: se derivan más abajo.
  const [allStationsInProvince, setAllStationsInProvince] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [staleNotice, setStaleNotice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [locationNotice, setLocationNotice] = useState("");
  const [gpsSort, setGpsSort] = useState("price");
  const [searchRadius, setSearchRadius] = useState(
    () => Number(localStorage.getItem("tanke_radius")) || 20,
  );
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("tanke_dark");
    return saved === "true";
  });

  useEffect(() => {
    const root = window.document.documentElement;

    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light"); // Aseguramos que se quita el light
    } else {
      root.classList.remove("dark"); // Obligamos a quitar el dark
      root.classList.add("light");
    }

    localStorage.setItem("tanke_dark", isDark);
  }, [isDark]);

  // Contador de peticiones: si el usuario cambia de provincia rápido, la
  // respuesta que llega tarde debe descartarse en vez de pisar a la nueva.
  const lastRequestRef = useRef(0);

  // Se guarda la última provincia pedida para que el botón de reintentar sepa
  // qué volver a cargar sin depender del estado del selector.
  const lastProvinceIdRef = useRef(null);

  const loadProvinceData = async (id) => {
    const requestId = ++lastRequestRef.current;
    lastProvinceIdRef.current = id;
    setLoading(true);
    setErrorMsg("");
    setStaleNotice("");
    // Nunca mezclar la etiqueta de una provincia con resultados de la anterior.
    setAllStationsInProvince([]);
    try {
      const { stations: data, stale } = await getAllGasStations(id);
      if (requestId !== lastRequestRef.current) return; // obsoleta

      if (data.length === 0) {
        // Ya no se confunde con un fallo de red: si la petición fue bien y
        // viene vacía, es que esa provincia no tiene estaciones que mostrar.
        setErrorMsg("");
        setAllStationsInProvince([]);
      } else {
        const sortedData = [...data].sort((a, b) => a.price95 - b.price95);
        setAllStationsInProvince(sortedData);
        if (stale) {
          setStaleNotice(
            "El Ministerio no responde ahora mismo. Te enseñamos los últimos precios que pudimos leer.",
          );
        }
      }
    } catch (err) {
      console.error(err);
      if (requestId !== lastRequestRef.current) return;
      setErrorMsg(err.message || "No hemos podido cargar las gasolineras.");
    }
    if (requestId === lastRequestRef.current) setLoading(false);
  };

  // Carga inicial. Deps vacías a propósito: la provincia de arranque sale de la
  // URL o de localStorage, y los cambios posteriores los dispara
  // handleProvinceChange. La descarga va dentro de una función async para no
  // llamar a setState de forma sincrona en el cuerpo del efecto.
  useEffect(() => {
    (async () => {
      const idToLoad =
        selectedProvince === "Toda España"
          ? "all"
          : provinceIds[selectedProvince];
      await loadProvinceData(idToLoad || "35");
    })();
    // Deep-link inicial: persistir provincia de la URL
    if (selectedProvince && selectedProvince !== "Toda España") {
      localStorage.setItem("tanke_province", selectedProvince);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const place =
      selectedProvince === "Toda España" ? "España" : selectedProvince;
    const title = `Tanke — Gasolineras baratas en ${place}`;
    document.title = title;

    const desc = `Compara precios de gasolina y diésel en ${place} en tiempo real. Encuentra la gasolinera más barata cerca de ti con Tanke.`;
    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) descEl.setAttribute("content", desc);
  }, [selectedProvince]);

  const applyProvince = (provinceName) => {
    setSelectedProvince(provinceName);
    localStorage.setItem("tanke_province", provinceName);
    setSelectedMunicipality("");
    localStorage.removeItem("tanke_municipality");
    setSearchTerm("");
    const id =
      provinceName === "Toda España" ? "all" : provinceIds[provinceName];

    const url = new URL(window.location.href);
    if (provinceName === "Toda España") {
      url.searchParams.delete("provincia");
    } else {
      url.searchParams.set("provincia", slugify(provinceName));
    }
    window.history.replaceState({}, "", url);

    return id ? loadProvinceData(id) : Promise.resolve();
  };

  const handleProvinceChange = (e) => {
    setLocationNotice("");
    applyProvince(e.target.value);
  };

  const municipalityList = [
    ...new Set(allStationsInProvince.map((s) => s.municipality)),
  ].sort();

  // La lista visible y la media son DATOS DERIVADOS de la provincia cargada más
  // los filtros: no hay nada que sincronizar con el exterior. Con useEffect +
  // setState React renderizaba dos veces por cada cambio de filtro (y se veía un
  // instante la lista con el orden anterior). Con useMemo se calcula en el mismo
  // render.
  const { stations, currentAverage, matchesBeforeFuel } = useMemo(() => {
    if (allStationsInProvince.length === 0) {
      return { stations: [], currentAverage: 0, matchesBeforeFuel: 0 };
    }
    let result = [...allStationsInProvince];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.municipality.toLowerCase().includes(term) ||
          s.address.toLowerCase().includes(term),
      );
    }

    if (userLocation) {
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

      if (nearStations.length > 0 || searchTerm) {
        result = nearStations;
      } else {
        result.sort((a, b) => a.distance - b.distance);
        result = result.slice(0, 20);
      }
    } else if (selectedMunicipality) {
      result = result.filter((s) => s.municipality === selectedMunicipality);
    }

    // Cuántas pasaban los filtros de texto y zona antes del de combustible:
    // si eran varias y ahora no queda ninguna, el aviso de lista vacía sabe
    // que el culpable es el combustible.
    const matchesBeforeFuel = result.length;
    const currentField = PRICE_FIELD_BY_SORT[sortType];
    result = result.filter((station) => station[currentField] > 0);

    result.sort((a, b) => {
      if (userLocation && gpsSort === "distance") {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      }
      const getPrice = (station, type) => {
        if (type === "gas95Asc") return station.price95;
        if (type === "gas98Asc") return station.price98;
        if (type === "dieselAsc") return station.priceDiesel;
        if (type === "glpAsc") return station.priceGLP;
        if (type === "cnGAsc") return station.priceCNG;
        return 0;
      };
      const priceA = getPrice(a, sortType);
      const priceB = getPrice(b, sortType);
      if (priceA <= 0) return 1;
      if (priceB <= 0) return -1;
      return priceA - priceB;
    });

    const validPrices = result
      .map((s) => s[currentField])
      .filter((p) => p && p > 0);
    const avg =
      validPrices.length > 0
        ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
        : 0;

    return { stations: result, currentAverage: avg, matchesBeforeFuel };
  }, [
    selectedMunicipality,
    sortType,
    userLocation,
    allStationsInProvince,
    searchTerm,
    gpsSort,
    searchRadius,
  ]);

  // El límite es una preferencia del usuario, no estado de la búsqueda: al
  // cambiar de provincia o de filtro se mantiene y no hay nada que resetear.
  const handlePageSizeChange = (e) => {
    const value = Number(e.target.value);
    setPageSize(value);
    localStorage.setItem("tanke_page_size", String(value));
  };

  const handleNearMe = () => {
    setLoading(true);
    setGeoError(null);
    setLocationNotice("");
    if (!navigator.geolocation) {
      setGeoError(
        "Tu navegador no soporta geolocalización. Elige tu provincia abajo.",
      );
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        setSelectedMunicipality("");
        localStorage.removeItem("tanke_municipality");
        setSearchTerm("");

        // Sin esto, quien tenía "Las Palmas" guardado y activaba el GPS en
        // Madrid seguía viendo estaciones canarias: el radio filtraba una
        // provincia que no era la suya. La estación más cercana nos dice en
        // qué provincia está de verdad.
        try {
          const found = await api.locate(coords.lat, coords.lng);
          const provinceName = found.provinceId
            ? provinceNameById[found.provinceId]
            : null;

          if (!provinceName) {
            setLocationNotice(
              "No hemos reconocido tu provincia. Elígela abajo si los precios no cuadran.",
            );
          } else if (provinceName !== selectedProvince) {
            setLocationNotice(
              `Estás en ${provinceName}. Hemos cambiado la zona por ti.`,
            );
            await applyProvince(provinceName);
          }
        } catch (error) {
          console.error(error);
          setLocationNotice(
            "No hemos podido comprobar tu provincia. Revisa el selector si los precios no cuadran.",
          );
        }

        setLoading(false);
      },
      (error) => {
        console.error(error);
        // Mensajes por causa: "Error GPS" no le dice al usuario qué hacer.
        const porCodigo = {
          1: "No nos has dado permiso de ubicación. Puedes activarlo en los ajustes del navegador o elegir tu provincia abajo.",
          2: "No hemos podido determinar tu posición. Comprueba que el GPS esté activado o elige tu provincia abajo.",
          3: "La ubicación ha tardado demasiado. Inténtalo de nuevo o elige tu provincia abajo.",
        };
        setGeoError(
          porCodigo[error.code] ||
            "No hemos podido obtener tu ubicación. Elige tu provincia abajo.",
        );
        setLoading(false);
      },
    );
  };

  const getPriceForStation = (station) => {
    return station[PRICE_FIELD_BY_SORT[sortType]] || 0;
  };

  const emptyMessage = emptyResultsMessage({
    searchTerm,
    fuelLabel: fuelLabel(PRICE_FIELD_BY_SORT[sortType]),
    fuelIsCause: matchesBeforeFuel > 0,
    zone: zoneLabel({
      userLocation,
      searchRadius,
      selectedMunicipality,
      selectedProvince,
    }),
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-20 transition-colors duration-500">
      {/* HERO SECTION — contiene el h1 y la navegación de la página, así que
          es el encabezado real: <header> y no un <div> suelto. */}
      <header className="relative pt-20 pb-12 px-4 overflow-hidden shadow-2xl bg-slate-900 min-h-75 flex flex-col justify-center items-center">
        <div className="absolute inset-0 z-0">
          {/* Antes era un JPEG de 939 KB servido desde Unsplash: un tercero en
              la ruta crítica del LCP, a 2670 px de ancho incluso en móvil y sin
              dimensiones declaradas, lo que aportaba CLS. Ahora autoalojada, en
              AVIF con respaldo WebP y una variante por ancho. */}
          <picture className="contents">
            <source
              type="image/avif"
              sizes="100vw"
              srcSet="/hero-640.avif 640w, /hero-960.avif 960w, /hero-1440.avif 1440w, /hero-1920.avif 1920w"
            />
            <source
              type="image/webp"
              sizes="100vw"
              srcSet="/hero-640.webp 640w, /hero-960.webp 960w, /hero-1440.webp 1440w, /hero-1920.webp 1920w"
            />
            <img
              src="/hero-1440.webp"
              width="1440"
              height="960"
              fetchPriority="high"
              decoding="async"
              alt="Coche en carretera — busca gasolineras baratas con Tanke"
              className="w-full h-full object-cover opacity-80"
            />
          </picture>
          {/* el velo central sube al 68% para que el wordmark no compita con los
              pilotos traseros del coche, que caen justo a su altura */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900/68 to-slate-900/90"></div>
        </div>
        <AppChrome variant="hero" isDark={isDark} setIsDark={setIsDark} />
        <div className="max-w-7xl mx-auto text-center relative z-10 w-full">
          <h1 className="text-5xl md:text-7xl font-black mb-2 tracking-tighter text-white drop-shadow-2xl">
            Tanke<span className="text-indigo-500">.</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base font-medium max-w-lg mx-auto drop-shadow-md">
            Gasolineras más baratas en{" "}
            <span className="text-white font-bold">Canarias</span> y toda
            España. Precios en tiempo real de gasolina 95, 98 y diésel.
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-white/50 dark:border-slate-800 mb-8 p-4 md:p-6 transition-colors duration-300">
          {/* BARRA DE CONTROLES PRINCIPAL */}
          {/* Los tres controles solo caben en una fila desde lg: en tablet se
              apilan, que es como se ven bien a 768. */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
            {/* min-w-max + flex-wrap: en pantallas donde los dos rótulos no
                caben, el segundo botón baja de línea en vez de recortarse. */}
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              {!userLocation ? (
                <button
                  onClick={handleNearMe}
                  className="flex-1 min-w-max lg:flex-none px-4 lg:px-6 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 transition-all flex items-center justify-center gap-2 h-12"
                >
                  <MapPinIcon className="w-4 h-4 shrink-0" />
                  Cerca de mí
                </button>
              ) : (
                <div className="flex flex-1 min-w-max lg:flex-none items-center justify-center gap-2 whitespace-nowrap bg-green-50 dark:bg-green-900/20 px-4 rounded-xl border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-bold text-sm h-12">
                  <span className="flex items-center gap-1.5">
                    <BroadcastIcon className="w-4 h-4 shrink-0" />
                    GPS activo
                  </span>
                  <button
                    onClick={() => {
                      setUserLocation(null);
                      setLocationNotice("");
                    }}
                    aria-label="Desactivar GPS"
                    title="Desactivar GPS"
                    className="ml-2 w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <XIcon className="w-3 h-3 shrink-0" />
                  </button>
                </div>
              )}
              {/* Selector Lista | Mapa. Antes era un único botón gris "Ver
                  mapa" que se confundía con el fondo: en la evaluación un
                  profesor no encontró el mapa. Con las dos opciones a la
                  vista queda claro que existe y cuál está activa. */}
              <div
                role="group"
                aria-label="Vista de resultados"
                className="flex flex-1 min-w-max lg:flex-none h-12 p-1 gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                {[
                  { id: "list", label: "Lista", Icon: ListIcon },
                  { id: "map", label: "Mapa", Icon: MapIcon },
                ].map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={viewMode === id}
                    onClick={() => setViewMode(id)}
                    className={`flex-1 px-4 lg:px-5 whitespace-nowrap rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                      viewMode === id
                        ? "bg-white dark:bg-indigo-600 text-indigo-700 dark:text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full lg:w-64 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2.5">
              <div className="flex items-baseline justify-between mb-2 gap-2">
                <label
                  htmlFor="tank-size"
                  className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-400"
                >
                  Simular depósito
                </label>
                <span
                  className={`text-xs font-black tabular-nums ${
                    tankSize > 0
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {tankSize > 0 ? `${tankSize} L` : "Desactivado"}
                </span>
              </div>
              <input
                id="tank-size"
                type="range"
                min="0"
                max="100"
                step="5"
                value={tankSize}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTankSize(v);
                  localStorage.setItem("tanke_liters", v);
                }}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between mt-1.5 text-[9px] font-bold text-slate-600 dark:text-slate-400 tabular-nums">
                <span>0 L</span>
                <span>100 L</span>
              </div>
            </div>

            <div className="w-full lg:w-64 relative group">
              <input
                type="text"
                placeholder="Buscar gasolinera..."
                aria-label="Buscar gasolinera por nombre, municipio o dirección"
                className="w-full px-4 pl-10 bg-slate-100 dark:bg-slate-800 border-transparent rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500 transition h-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <GasPumpIcon className="w-4 h-4 shrink-0" />
              </span>
            </div>
          </div>

          {/* PANEL GPS */}
          {userLocation && (
            <div className="flex flex-col md:flex-row gap-6 mb-6 p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-2xl animate-in fade-in slide-in-from-top-4">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase text-indigo-400 dark:text-indigo-300 block mb-2">
                  Ordenar resultados por:
                </label>
                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-indigo-50 dark:border-slate-700 w-full max-w-sm">
                  <button
                    onClick={() => setGpsSort("price")}
                    className={`flex-1 px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      gpsSort === "price"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <TagIcon className="w-4 h-4 shrink-0" />
                    Más baratas
                  </button>
                  <button
                    onClick={() => setGpsSort("distance")}
                    className={`flex-1 px-4 py-2 text-xs md:text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      gpsSort === "distance"
                        ? "bg-red-500 text-white shadow-md"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                    }`}
                  >
                    <MapPinIcon className="w-4 h-4 shrink-0" />
                    Más cercanas
                  </button>
                </div>
              </div>

              <div className="flex-1 md:max-w-xs">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black uppercase text-indigo-400 dark:text-indigo-300">
                    Radio de búsqueda
                  </label>
                  <span className="text-xs font-bold text-white bg-indigo-500 px-2 py-0.5 rounded-md shadow-sm">
                    {searchRadius} km
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="150"
                  step="1"
                  value={searchRadius}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setSearchRadius(v);
                    localStorage.setItem("tanke_radius", v);
                  }}
                  className="w-full h-2 bg-white dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 border border-indigo-100 dark:border-slate-600"
                />
              </div>
            </div>
          )}

          {/* AVISO DE GPS: antes geoError se guardaba pero no se mostraba, así
              que al denegar el permiso no pasaba nada visible. */}
          {geoError && !userLocation && (
            <div
              role="status"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-200"
            >
              <MapPinIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{geoError}</span>
              <button
                onClick={() => setGeoError(null)}
                aria-label="Cerrar aviso"
                className="shrink-0 p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-800/40 transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Cambiar la provincia por debajo sin decir nada haría dudar de los
              precios: el aviso explica por qué la lista ya no es la de antes. */}
          {locationNotice && userLocation && (
            <div
              role="status"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-200"
            >
              <BroadcastIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{locationNotice}</span>
              <button
                onClick={() => setLocationNotice("")}
                aria-label="Cerrar aviso"
                className="shrink-0 p-0.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-800/40 transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* FILTROS COMBUSTIBLE */}
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-2">
              Combustible
            </span>
            {/* flex-wrap, no scroll horizontal: con cinco opciones caben en dos
                líneas y no hay contenido oculto sin indicarlo. */}
            <div className="flex flex-wrap gap-2">
              {[
              { id: "gas95Asc", label: "Gasolina 95" },
              { id: "gas98Asc", label: "98" },
              { id: "dieselAsc", label: "Diésel" },
              { id: "glpAsc", label: "GLP" },
              { id: "cnGAsc", label: "GNC" },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => {
                  setSortType(btn.id);
                  localStorage.setItem("tanke_sort", btn.id);
                }}
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  sortType === btn.id
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                    : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* SELECTORES DE ZONA */}
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[10px] font-black uppercase text-slate-600 dark:text-slate-400 mb-2">
              Zona
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                aria-label="Provincia"
                className="p-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
                value={selectedProvince}
                onChange={handleProvinceChange}
              >
                <option value="Toda España">🌍 Toda España</option>
                {Object.keys(provinceIds)
                  .sort()
                  .map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
              </select>
              <select
                aria-label="Municipio"
                className="p-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                value={selectedMunicipality}
                disabled={!selectedProvince}
                onChange={(e) => {
                  setSelectedMunicipality(e.target.value);
                  localStorage.setItem("tanke_municipality", e.target.value);
                }}
              >
                <option value="">Todos los municipios</option>
                {municipalityList.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div
            className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            role="alert"
          >
            <span className="min-w-0 flex-1 font-bold">{errorMsg}</span>
            <button
              type="button"
              onClick={() =>
                loadProvinceData(lastProvinceIdRef.current ?? provinceIds[selectedProvince])
              }
              className="h-9 shrink-0 rounded-lg bg-red-600 px-3 text-sm font-bold text-white transition-colors hover:bg-red-700 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Los precios son buenos, solo que no son de hace un minuto. Decirlo
            es mejor que enseñarlos como si acabaran de leerse. */}
        {staleNotice && stations.length > 0 && (
          <div
            className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
            role="status"
          >
            {staleNotice}
          </div>
        )}

        {!loading && !errorMsg && stations.length === 0 && (
          <div
            className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center dark:border-slate-800 dark:bg-slate-900"
            role="status"
          >
            <p className="font-black text-slate-800 dark:text-white">
              {emptyMessage.title}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {emptyMessage.hint}
            </p>
          </div>
        )}

        {/* CONTENIDO (MAPA O LISTA) */}
        {loading ? (
          <StationListSkeleton
            count={Math.min(pageSize, 6)}
            withTank={tankSize > 0}
          />
        ) : viewMode === "list" ? (
          <>
          {stations.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                Mostrando {Math.min(pageSize, stations.length)} de{" "}
                {formatCount(stations.length)}{" "}
                {stations.length === 1 ? "gasolinera" : "gasolineras"}
              </p>
              <div className="flex items-center gap-3">
                {currentAverage > 0 && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                    Media: {formatPriceValue(currentAverage)}&nbsp;€
                  </p>
                )}
                <label className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="hidden sm:inline">Mostrar</span>
                  <select
                    aria-label="Gasolineras por página"
                    className="py-1.5 pl-2.5 pr-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 tabular-nums cursor-pointer"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.slice(0, pageSize).map((station) => (
              <StationCard
                key={station.id}
                station={station}
                currentAverage={currentAverage}
                tankSize={tankSize}
                sortType={sortType}
                getPriceForStation={getPriceForStation}
              />
            ))}
          </div>
          </>
        ) : (
          <>
          {/* El corte no puede ser silencioso: si hay 11.000 estaciones y se
              pintan 40, hay que decir cuáles son (las más baratas del orden
              activo) para que nadie crea que el mapa está incompleto. */}
          {stations.length > mapMarkerLimit && (
            <p className="mb-3 px-1 text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
              Mostrando en el mapa las {mapMarkerLimit} más baratas de{" "}
              {formatCount(stations.length)}. Ajusta el filtro de zona
              para afinar.
            </p>
          )}
          <Suspense
            fallback={
              <div
                role="status"
                aria-label="Cargando el mapa"
                className="h-150 w-full rounded-3xl border border-slate-200 bg-slate-100 motion-safe:animate-pulse dark:border-slate-800 dark:bg-slate-900"
              />
            }
          >
            <StationMap
              stations={stations}
              markerLimit={mapMarkerLimit}
              isDark={isDark}
              userLocation={userLocation}
              searchRadius={searchRadius}
              currentAverage={currentAverage}
              getPriceForStation={getPriceForStation}
            />
          </Suspense>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
