import React, { useEffect, useMemo, useRef, useState } from "react";
import { getAllGasStations } from "./services/gasStations";
import {
  fuelSortBySlug,
  resolveProvinceSlug,
  slugify,
} from "./data/seo";
import {
  ArrowUpIcon,
  ArrowUpRightIcon,
  BroadcastIcon,
  CrownIcon,
  GasPumpIcon,
  ListIcon,
  MapIcon,
  MapPinIcon,
  MoonIcon,
  SunIcon,
  TagIcon,
  XIcon,
} from "./icons";
import { ICON_PATHS } from "./iconPaths";

// IMPORTACIONES DEL MAPA
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// ARREGLO PARA LOS ICONOS DEL MAPA
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// DATOS DE PROVINCIAS
const provinceIds = {
  Alava: "01",
  Albacete: "02",
  Alicante: "03",
  Almeria: "04",
  Avila: "05",
  Badajoz: "06",
  "Islas Baleares": "07",
  Barcelona: "08",
  Burgos: "09",
  Caceres: "10",
  Cadiz: "11",
  Castellon: "12",
  "Ciudad Real": "13",
  Cordoba: "14",
  "Coruña (A)": "15",
  Cuenca: "16",
  Girona: "17",
  Granada: "18",
  Guadalajara: "19",
  Guipuzcoa: "20",
  Huelva: "21",
  Huesca: "22",
  Jaen: "23",
  Leon: "24",
  Lleida: "25",
  "Rioja (La)": "26",
  Lugo: "27",
  Madrid: "28",
  Malaga: "29",
  Murcia: "30",
  Navarra: "31",
  Ourense: "32",
  Asturias: "33",
  Palencia: "34",
  "Las Palmas": "35",
  Pontevedra: "36",
  Salamanca: "37",
  "Santa Cruz de Tenerife": "38",
  Cantabria: "39",
  Segovia: "40",
  Sevilla: "41",
  Soria: "42",
  Tarragona: "43",
  Teruel: "44",
  Toledo: "45",
  Valencia: "46",
  Valladolid: "47",
  Vizcaya: "48",
  Zamora: "49",
  Zaragoza: "50",
  Ceuta: "51",
  Melilla: "52",
};

// FORMATO ESPAÑOL DE NÚMEROS
// toFixed() siempre devuelve punto decimal ("1.244"), que en español se lee como
// millares. Los precios de carburante se escriben con coma: 1,244 €/L.
const priceFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const eurFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const kmFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
// Miles con punto: "11.021 gasolineras", no "11021".
const numberFormat = new Intl.NumberFormat("es-ES");

// Cuántas tarjetas puede pedir el usuario. 50 es el valor histórico y sigue
// siendo el arranque para quien no toca el selector.
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 50;

// El mapa es la vista más cara: cada marcador es un divIcon con su HTML (y su
// <img> de marca) más un Popup que react-leaflet monta aunque nadie lo abra.
// En móvil, 100 marcadores hacían que el mapa fuese a tirones al arrastrar.
const MAP_LIMIT_MOBILE = 40;
const MAP_LIMIT_DESKTOP = 100;
const MOBILE_QUERY = "(max-width: 768px)";

const formatPrice = (n) => priceFormat.format(n);
const formatEur = (n) => eurFormat.format(n);
const formatKm = (n) => kmFormat.format(n);

function calculateDistance(lat1, lon1, lat2, lon2) {
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

const brandLogos = {
  repsol: "/repsol.jpg",
  cepsa: "/moeve.png",
  moeve: "/moeve.png",
  pcan: "/pcan.jpg",
  shell: "/shell.png",
  bp: "/bp.png",
  disa: "/disa.jpg",
  tgas: "/tgas.jpg",
  galp: "/galp.png",
  h2exagon: "/h2.png",
  plenergy: "/plenergy.png",
  plenoil: "/plenergy.png",
  petroprix: "/petroprix.jpg",
  canary: "/canaryoil.webp",
  santana: "/santana.webp",
  spl: "/spl.png",
  ballenoil: "/ballenoil.svg",
  alcampo: "/alcampo.jpg",
};

const createPriceIcon = (price, avg, isCheapest, stationName) => {
  let colorClass = "bg-slate-600";
  if (price > 0 && avg > 0) {
    if (price < avg - 0.01) colorClass = "bg-green-600";
    else if (price > avg + 0.01) colorClass = "bg-red-600";
    else colorClass = "bg-orange-500";
  }

  if (isCheapest)
    colorClass = "bg-yellow-500 border-yellow-300 marker-cheapest";

  const nameLower = stationName.toLowerCase();
  const brandKey = Object.keys(brandLogos).find((key) =>
    nameLower.includes(key),
  );
  const logoUrl = brandKey ? brandLogos[brandKey] : null;

  return L.divIcon({
    className: "custom-price-marker",
    html: `
      <div class="flex flex-col items-center relative transition-transform hover:scale-110">
        ${
          isCheapest
            ? `<span class="mb-[-5px] drop-shadow-md z-30 text-yellow-400">
                 <svg viewBox="0 0 256 256" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="${ICON_PATHS.crown}"/></svg>
               </span>`
            : ""
        }
        
        ${
          logoUrl
            ? `
          <div class="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-white shadow-md border border-slate-200 z-20 flex items-center justify-center p-0.5 overflow-hidden">
            <img src="${logoUrl}" class="w-full h-full object-contain" />
          </div>
        `
            : ""
        }

        <div class="${colorClass} text-white text-[10px] font-black px-1.5 py-0.5 rounded-lg shadow-lg border-2 border-white flex items-center justify-center whitespace-nowrap">
          ${price > 0 ? formatPrice(price) : "--"}&nbsp;€
        </div>
        <div class="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-${isCheapest ? "yellow-500" : colorClass.split("-")[1] + "-600"}"></div>
      </div>
    `,
    iconSize: [45, 35],
    iconAnchor: [22, 35],
  });
};

function RecenterMap({ stations }) {
  const map = useMap();
  useEffect(() => {
    if (stations.length > 0) {
      const first = stations[0];
      map.setView([first.lat, first.lng], 10);
    }
  }, [stations, map]);
  return null;
}

// Tope de marcadores según el dispositivo. Se escucha el cambio del media
// query para que girar el móvil o redimensionar no deje el tope de la otra
// orientación.
function useMapMarkerCap() {
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia(MOBILE_QUERY).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isMobile ? MAP_LIMIT_MOBILE : MAP_LIMIT_DESKTOP;
}

const PriceTag = React.memo(({ label, price, highlight, currentAverage }) => {
  const isAvailable = price && price > 0;
  // Añadidas clases Dark Mode
  let colorClass =
    "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200";
  let textClass = "text-slate-700 dark:text-slate-200";
  let labelClass = "text-slate-400 dark:text-slate-500";

  if (isAvailable && highlight && currentAverage > 0) {
    if (price < currentAverage - 0.01) {
      colorClass =
        "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 shadow-sm";
      textClass = "text-green-700 dark:text-green-400";
      labelClass = "text-green-600 dark:text-green-500";
    } else if (price > currentAverage + 0.01) {
      colorClass =
        "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 shadow-sm";
      textClass = "text-red-700 dark:text-red-400";
      labelClass = "text-red-500 dark:text-red-500";
    } else {
      colorClass =
        "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 shadow-sm";
      textClass = "text-orange-700 dark:text-orange-400";
      labelClass = "text-orange-500 dark:text-orange-500";
    }
  } else if (!isAvailable) {
    colorClass =
      "bg-slate-50 dark:bg-slate-800/50 border-transparent opacity-40";
    textClass = "text-slate-300 dark:text-slate-600";
    labelClass = "text-slate-300 dark:text-slate-600";
  }

  return (
    <div
      className={`flex flex-col justify-center items-center p-2.5 rounded-xl border transition-all duration-300 ${colorClass}`}
    >
      <span
        className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${labelClass}`}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-0.5">
        {isAvailable ? (
          <>
            <span className={`font-black text-lg tabular-nums ${textClass}`}>
              {formatPrice(price)}
            </span>
            <span
              className={`text-[10px] font-medium ${isAvailable && highlight ? textClass : "text-slate-400 dark:text-slate-500"}`}
            >
              €
            </span>
          </>
        ) : (
          <span className="font-bold text-lg text-slate-300 dark:text-slate-600">
            --
          </span>
        )}
      </div>
    </div>
  );
});

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
  return localStorage.getItem("tanke_sort") || "gas95Asc";
}

function App() {
  const [selectedProvince, setSelectedProvince] = useState(readInitialProvince);

  const [selectedMunicipality, setSelectedMunicipality] = useState(
    () => localStorage.getItem("tanke_municipality") || "",
  );
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
  const [searchTerm, setSearchTerm] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
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

  const loadProvinceData = async (id) => {
    const requestId = ++lastRequestRef.current;
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getAllGasStations(id);
      if (requestId !== lastRequestRef.current) return; // obsoleta
      if (!data || data.length === 0) {
        setErrorMsg("No hay datos disponibles o falló la conexión.");
        setAllStationsInProvince([]);
      } else {
        const sortedData = [...data].sort((a, b) => a.price95 - b.price95);
        setAllStationsInProvince(sortedData);
      }
    } catch (err) {
      console.error(err);
      if (requestId !== lastRequestRef.current) return;
      setErrorMsg("Error cargando datos.");
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

  const handleProvinceChange = (e) => {
    const provinceName = e.target.value;
    setSelectedProvince(provinceName);
    localStorage.setItem("tanke_province", provinceName);
    setSelectedMunicipality("");
    localStorage.removeItem("tanke_municipality");
    setSearchTerm("");
    const id =
      provinceName === "Toda España" ? "all" : provinceIds[provinceName];
    if (id) loadProvinceData(id);

    const url = new URL(window.location.href);
    if (provinceName === "Toda España") {
      url.searchParams.delete("provincia");
    } else {
      url.searchParams.set("provincia", slugify(provinceName));
    }
    window.history.replaceState({}, "", url);
  };

  const municipalityList = [
    ...new Set(allStationsInProvince.map((s) => s.municipality)),
  ].sort();

  // La lista visible y la media son DATOS DERIVADOS de la provincia cargada más
  // los filtros: no hay nada que sincronizar con el exterior. Con useEffect +
  // setState React renderizaba dos veces por cada cambio de filtro (y se veía un
  // instante la lista con el orden anterior). Con useMemo se calcula en el mismo
  // render.
  const { stations, currentAverage } = useMemo(() => {
    if (allStationsInProvince.length === 0) {
      return { stations: [], currentAverage: 0 };
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
      }
    } else {
      if (selectedMunicipality) {
        result = result.filter((s) => s.municipality === selectedMunicipality);
      }
    }

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

    const fieldMap = {
      gas95Asc: "price95",
      gas98Asc: "price98",
      dieselAsc: "priceDiesel",
      glpAsc: "priceGLP",
      cnGAsc: "priceCNG",
    };
    const currentField = fieldMap[sortType];
    const validPrices = result
      .map((s) => s[currentField])
      .filter((p) => p && p > 0);
    const avg =
      validPrices.length > 0
        ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length
        : 0;

    return { stations: result, currentAverage: avg };
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
    if (!navigator.geolocation) {
      setGeoError(
        "Tu navegador no soporta geolocalización. Elige tu provincia abajo.",
      );
      setLoading(false);
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
    if (sortType === "gas95Asc") return station.price95;
    if (sortType === "gas98Asc") return station.price98;
    if (sortType === "dieselAsc") return station.priceDiesel;
    if (sortType === "glpAsc") return station.priceGLP;
    if (sortType === "cnGAsc") return station.priceCNG;
    return 0;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 pb-20 transition-colors duration-500">
      {/* HERO SECTION */}
      <div className="relative py-12 px-4 overflow-hidden shadow-2xl bg-slate-900 min-h-75 flex flex-col justify-center items-center">
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
        <div className="max-w-7xl mx-auto text-center relative z-10 w-full">
          <button
            onClick={() => setIsDark(!isDark)}
            role="switch"
            aria-checked={isDark}
            aria-label={
              isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"
            }
            title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            className="absolute -top-6 right-0 w-16 h-9 p-1 flex items-center bg-slate-900/50 hover:bg-slate-900/70 backdrop-blur-md rounded-full transition-colors border border-white/20 shadow-xl z-50 cursor-pointer"
          >
            {/* pastilla que se desliza bajo el icono activo */}
            <span
              className={`absolute top-1 left-1 w-7 h-7 rounded-full bg-indigo-600 shadow-md transition-transform duration-200 ease-out motion-reduce:transition-none ${
                isDark ? "translate-x-7" : "translate-x-0"
              }`}
            />
            <span
              className={`relative z-10 flex-1 flex items-center justify-center transition-colors ${
                isDark ? "text-white/40" : "text-white"
              }`}
            >
              <SunIcon className="w-4 h-4" />
            </span>
            <span
              className={`relative z-10 flex-1 flex items-center justify-center transition-colors ${
                isDark ? "text-white" : "text-white/40"
              }`}
            >
              <MoonIcon className="w-4 h-4" />
            </span>
          </button>
          <h1 className="text-5xl md:text-7xl font-black mb-2 tracking-tighter text-white drop-shadow-2xl">
            Tanke<span className="text-indigo-500">.</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base font-medium max-w-lg mx-auto drop-shadow-md">
            Gasolineras más baratas en{" "}
            <span className="text-white font-bold">Canarias</span> y toda
            España. Precios en tiempo real de gasolina 95, 98 y diésel.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-white/50 dark:border-slate-800 mb-8 p-4 md:p-6 transition-colors duration-300">
          {/* BARRA DE CONTROLES PRINCIPAL */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex gap-2 w-full md:w-auto">
              {!userLocation ? (
                <button
                  onClick={handleNearMe}
                  className="flex-1 md:flex-none px-6 whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 transition-all flex items-center justify-center gap-2 h-12"
                >
                  <MapPinIcon className="w-4 h-4 shrink-0" />
                  Cerca de mí
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-4 rounded-xl border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 font-bold text-sm h-12">
                  <span className="flex items-center gap-1.5">
                    <BroadcastIcon className="w-4 h-4 shrink-0" />
                    GPS activo
                  </span>
                  <button
                    onClick={() => setUserLocation(null)}
                    aria-label="Desactivar GPS"
                    title="Desactivar GPS"
                    className="ml-2 w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <XIcon className="w-3 h-3 shrink-0" />
                  </button>
                </div>
              )}
              <button
                onClick={() =>
                  setViewMode(viewMode === "list" ? "map" : "list")
                }
                className={`px-6 whitespace-nowrap rounded-xl font-bold transition-all flex items-center justify-center gap-2 h-12 ${
                  viewMode === "map"
                    ? "bg-slate-800 dark:bg-indigo-600 text-white shadow-lg"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {viewMode === "list" ? (
                  <>
                    <MapIcon className="w-4 h-4 shrink-0" />
                    Ver mapa
                  </>
                ) : (
                  <>
                    <ListIcon className="w-4 h-4 shrink-0" />
                    Ver lista
                  </>
                )}
              </button>
            </div>

            <div className="w-full md:w-64 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl px-3 py-2.5">
              <div className="flex items-baseline justify-between mb-2 gap-2">
                <label
                  htmlFor="tank-size"
                  className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500"
                >
                  Simular depósito
                </label>
                <span
                  className={`text-xs font-black tabular-nums ${
                    tankSize > 0
                      ? "text-indigo-600 dark:text-indigo-400"
                      : "text-slate-400 dark:text-slate-500"
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
              <div className="flex justify-between mt-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 tabular-nums">
                <span>0 L</span>
                <span>100 L</span>
              </div>
            </div>

            <div className="w-full md:w-64 relative group">
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

          {/* FILTROS COMBUSTIBLE */}
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800">
            <span className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2">
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
            <span className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2">
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

        {/* Solo avisamos si de verdad no hay nada que mostrar: si un fetch falló
            pero otro trajo datos, el aviso contradecía a la lista de abajo. */}
        {errorMsg && stations.length === 0 && (
          <div
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
          >
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{errorMsg}</span>
          </div>
        )}

        {/* CONTENIDO (MAPA O LISTA) */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-400 font-medium">
              Buscando mejores precios...
            </p>
          </div>
        ) : viewMode === "list" ? (
          <>
          {stations.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 px-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                Mostrando {Math.min(pageSize, stations.length)} de{" "}
                {numberFormat.format(stations.length)}{" "}
                {stations.length === 1 ? "gasolinera" : "gasolineras"}
              </p>
              <div className="flex items-center gap-3">
                {currentAverage > 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
                    Media: {formatPrice(currentAverage)}&nbsp;€
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
            {stations.slice(0, pageSize).map((station) => {
              const price = getPriceForStation(station);
              const total = price * tankSize;
              const savings = (currentAverage - price) * tankSize;

              const nameLower = station.name.toLowerCase();
              const brandKey = Object.keys(brandLogos).find((key) =>
                nameLower.includes(key),
              );
              const logoUrl = brandKey ? brandLogos[brandKey] : null;

              return (
                <div
                  key={station.id}
                  className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-4xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl dark:hover:shadow-indigo-900/20 transition-all duration-300 group relative"
                >
                  <div className="mb-4 flex items-start gap-3">
                    {logoUrl && (
                      <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-50 dark:bg-white border border-slate-100 dark:border-slate-700 shadow-sm p-2 flex items-center justify-center overflow-hidden">
                        <img
                          src={logoUrl}
                          alt={brandKey}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-black text-slate-800 dark:text-white text-lg leading-tight truncate"
                        title={station.name}
                      >
                        {station.name}
                      </h3>
                      <p
                        className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate"
                        title={station.address}
                      >
                        {station.address}
                      </p>
                      <span className="text-[9px] font-bold uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md inline-block mt-2">
                        {station.municipality}
                      </span>
                    </div>

                    {station.distance !== undefined && (
                      <div className="flex-shrink-0 flex items-center gap-1 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg whitespace-nowrap self-start tabular-nums">
                        <MapPinIcon className="w-3 h-3 shrink-0" />
                        {formatKm(station.distance)} km
                      </div>
                    )}
                  </div>

                  {tankSize > 0 && (
                    <div className="bg-slate-900 dark:bg-slate-950/70 dark:ring-1 dark:ring-slate-700/60 rounded-2xl p-4 mb-4 text-white animate-in fade-in zoom-in duration-300">
                      <div className="flex justify-between items-center gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Total {tankSize}L
                          </p>
                          <p className="text-2xl font-black tabular-nums">
                            {total > 0 ? formatEur(total) : "--"}&nbsp;€
                          </p>
                        </div>
                        {savings > 0 && (
                          <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 rounded-full pl-2 pr-3 py-1.5 shrink-0">
                            <ArrowUpIcon className="w-3.5 h-3.5 text-green-400 shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-wider text-green-400/80">
                              Ahorras
                            </span>
                            <span className="text-base font-black text-green-400 tabular-nums leading-none">
                              +{formatEur(savings)}&nbsp;€
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-6">
                    <PriceTag
                      label="G95"
                      price={station.price95}
                      highlight={sortType === "gas95Asc"}
                      currentAverage={currentAverage}
                    />
                    <PriceTag
                      label="Diésel"
                      price={station.priceDiesel}
                      highlight={sortType === "dieselAsc"}
                      currentAverage={currentAverage}
                    />
                    <PriceTag
                      label="G98"
                      price={station.price98}
                      highlight={sortType === "gas98Asc"}
                      currentAverage={currentAverage}
                    />
                    <PriceTag 
                      label="Diésel+" 
                      price={station.priceDieselPlus} 
                      currentAverage={currentAverage}
                    />
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto flex items-center justify-center gap-1.5 w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 hover:bg-indigo-700 active:scale-[0.98] transition-all"
                  >
                    Ir a la estación
                    <ArrowUpRightIcon className="w-4 h-4 shrink-0" />
                  </a>
                </div>
              );
            })}
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
              {numberFormat.format(stations.length)}. Ajusta el filtro de zona
              para afinar.
            </p>
          )}
          <div className="h-150 w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 z-0 relative">
            <MapContainer
              center={[40.416, -3.703]}
              zoom={6}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              {/* MAGIA DEL MAPA: Si es dark mode, cargamos las tiles oscuras de CartoDB */}
              <TileLayer
                attribution='© <a href="https://carto.com/attributions">CARTO</a>'
                url={
                  isDark
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" // 🌑 Modo Noche
                    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // ☀️ Modo Día
                }
              />

              <RecenterMap stations={stations} />

              {userLocation && (
                <>
                  <Circle
                    center={[userLocation.lat, userLocation.lng]}
                    radius={searchRadius * 1000}
                    pathOptions={{
                      color: "#4f46e5",
                      fillColor: "#4f46e5",
                      fillOpacity: 0.1,
                      weight: 2,
                      dashArray: "8, 8",
                    }}
                  />
                  <Marker position={[userLocation.lat, userLocation.lng]}>
                    <Popup>
                      <div className="text-center font-bold text-indigo-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPinIcon className="w-4 h-4 shrink-0" />
                          Estás aquí
                        </span>
                        <br />
                        <span className="text-xs text-slate-500 font-normal">
                          Radio: {searchRadius} km
                        </span>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}

              {(() => {
                const visibleStations = stations.slice(0, mapMarkerLimit);
                const currentPrices = visibleStations
                  .map((s) => getPriceForStation(s))
                  .filter((p) => p > 0);

                const minPrice =
                  currentPrices.length > 0 ? Math.min(...currentPrices) : 0;

                return visibleStations.map((station) => {
                  const stationPrice = getPriceForStation(station);
                  const isCheapest =
                    stationPrice > 0 && stationPrice === minPrice;

                  return (
                    <Marker
                      key={station.id}
                      position={[station.lat, station.lng]}
                      icon={createPriceIcon(
                        stationPrice,
                        currentAverage,
                        isCheapest,
                        station.name,
                      )}
                      zIndexOffset={isCheapest ? 1000 : 0}
                    >
                      <Popup>
                        <div className="text-center min-w-[120px]">
                          {isCheapest && (
                            <div className="flex items-center justify-center gap-1 text-xs font-bold text-yellow-600 mb-1">
                              <CrownIcon className="w-3.5 h-3.5 shrink-0" />
                              ¡LA MÁS BARATA!
                            </div>
                          )}
                          <h3 className="font-bold text-slate-800">
                            {station.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {station.address}
                          </p>
                          <div className="mt-2 bg-indigo-600 text-white font-black py-1 px-2 rounded-lg text-lg">
                            {formatPrice(stationPrice)} €
                          </div>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-2 text-indigo-600 font-bold text-xs underline"
                          >
                            Cómo llegar
                          </a>
                        </div>
                      </Popup>
                    </Marker>
                  );
                });
              })()}
            </MapContainer>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
