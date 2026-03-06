import React, { useEffect, useState } from "react";
import { getAllGasStations } from "./services/gasStations";
// IMPORTACIONES DEL MAPA
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

// DATOS DE PROVINCIAS (Bien escritas)
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

// COMPONENTE PARA RECENTRAR EL MAPA AUTOMÁTICAMENTE
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

function App() {
  // --- ESTADOS CON MEMORIA (PERSISTENCIA) ---
  const [selectedProvince, setSelectedProvince] = useState(() => {
    const saved = localStorage.getItem("tanke_province");
    return provinceIds[saved] ? saved : "Las Palmas";
  });

  const [selectedMunicipality, setSelectedMunicipality] = useState(
    () => localStorage.getItem("tanke_municipality") || "",
  );
  const [sortType, setSortType] = useState(
    () => localStorage.getItem("tanke_sort") || "gas95Asc",
  );
  const [tankSize, setTankSize] = useState(
    () => Number(localStorage.getItem("tanke_liters")) || 0,
  );

  // ESTADO PARA LA VISTA (LISTA O MAPA)
  const [viewMode, setViewMode] = useState("list");

  const [stations, setStations] = useState([]);
  const [allStationsInProvince, setAllStationsInProvince] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [currentAverage, setCurrentAverage] = useState(0);

  const loadProvinceData = async (id) => {
    setLoading(true);
    setErrorMsg("");
    try {
      const data = await getAllGasStations(id);
      if (!data || data.length === 0) {
        setErrorMsg("No hay datos disponibles o falló la conexión.");
        setAllStationsInProvince([]);
        setStations([]);
      } else {
        const sortedData = [...data].sort((a, b) => a.price95 - b.price95);
        setAllStationsInProvince(sortedData);
        setStations(sortedData);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error cargando datos.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const idToLoad = provinceIds[selectedProvince];
    loadProvinceData(idToLoad || "35");
  }, []);

  const handleProvinceChange = (e) => {
    const provinceName = e.target.value;
    setSelectedProvince(provinceName);
    localStorage.setItem("tanke_province", provinceName);

    setSelectedMunicipality("");
    localStorage.removeItem("tanke_municipality");
    setSearchTerm("");
    const id = provinceIds[provinceName];
    if (id) loadProvinceData(id);
  };

  const municipalityList = [
    ...new Set(allStationsInProvince.map((s) => s.municipality)),
  ].sort();

  useEffect(() => {
    if (allStationsInProvince.length === 0) return;
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
      result = result.filter((s) => s.distance < 20);
    } else {
      if (selectedMunicipality)
        result = result.filter((s) => s.municipality === selectedMunicipality);
    }

    result.sort((a, b) => {
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

    setCurrentAverage(avg);
    setStations(result);
  }, [
    selectedMunicipality,
    sortType,
    userLocation,
    allStationsInProvince,
    searchTerm,
  ]);

  const handleNearMe = () => {
    setLoading(true);
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError("Navegador incompatible");
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
        setGeoError("Error GPS");
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

  const PriceTag = ({ label, price, highlight }) => {
    const isAvailable = price && price > 0;
    let colorClass = "bg-white border-slate-100 text-slate-700";
    let textClass = "text-slate-700";
    let labelClass = "text-slate-400";

    if (isAvailable && highlight && currentAverage > 0) {
      if (price < currentAverage - 0.01) {
        colorClass = "bg-green-50 border-green-200 shadow-sm";
        textClass = "text-green-700";
        labelClass = "text-green-600";
      } else if (price > currentAverage + 0.01) {
        colorClass = "bg-red-50 border-red-200 shadow-sm";
        textClass = "text-red-700";
        labelClass = "text-red-500";
      } else {
        colorClass = "bg-orange-50 border-orange-200 shadow-sm";
        textClass = "text-orange-700";
        labelClass = "text-orange-500";
      }
    } else if (!isAvailable) {
      colorClass = "bg-slate-50 border-transparent opacity-40";
      textClass = "text-slate-300";
      labelClass = "text-slate-300";
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
              <span className={`font-black text-lg ${textClass}`}>
                {price.toFixed(3)}
              </span>
              <span
                className={`text-[10px] font-medium ${isAvailable && highlight ? textClass : "text-slate-400"}`}
              >
                €
              </span>
            </>
          ) : (
            <span className="font-bold text-lg text-slate-300">--</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20 selection:bg-indigo-500 selection:text-white">
      {/* --- HERO SECTION CON FOTO DE COCHE (RECUPERADO) --- */}
      <div className="relative py-12 px-4 overflow-hidden shadow-2xl bg-slate-900 min-h-75 flex flex-col justify-center items-center">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=2670&auto=format&fit=crop"
            alt="Hero"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-linear-to-b from-slate-900/90 via-slate-900/50 to-slate-900/90"></div>
        </div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-black mb-2 tracking-tighter text-white drop-shadow-2xl">
            Tanke<span className="text-indigo-500">.</span>
          </h1>
          <p className="text-slate-300 text-sm md:text-base font-medium max-w-lg mx-auto drop-shadow-md">
            Tu buscador de ahorro en{" "}
            <span className="text-white font-bold">Canarias 🇮🇨</span> y
            península.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
        <div className="bg-white rounded-3xl shadow-xl border border-white/50 mb-8 relative z-30 p-4 md:p-6">
          {/* BARRA DE CONTROLES */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
            <div className="flex gap-2 w-full md:w-auto">
              {!userLocation ? (
                <button
                  onClick={handleNearMe}
                  className="flex-1 md:flex-none px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  📍 Cerca de mí
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-green-50 px-4 py-3 rounded-xl border border-green-200 text-green-700 font-bold text-sm">
                  <span>📡 GPS Activo</span>
                  <button
                    onClick={() => setUserLocation(null)}
                    className="ml-2 w-5 h-5 bg-white rounded-full flex items-center justify-center text-xs shadow"
                  >
                    ✕
                  </button>
                </div>
              )}
              {/* BOTÓN TOGGLE MAPA */}
              <button
                onClick={() =>
                  setViewMode(viewMode === "list" ? "map" : "list")
                }
                className={`px-6 py-3 rounded-xl font-bold transition-all flex items-center gap-2 ${viewMode === "map" ? "bg-slate-800 text-white shadow-lg" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {viewMode === "list" ? "🗺️ Ver Mapa" : "📋 Ver Lista"}
              </button>
            </div>

            <div className="w-full md:w-64">
              <label className="text-[10px] font-black uppercase text-slate-400 block mb-2">
                Simular Depósito:{" "}
                <span
                  className={
                    tankSize > 0 ? "text-indigo-600" : "text-slate-400"
                  }
                >
                  {tankSize > 0 ? `${tankSize}L` : "Desactivado"}
                </span>
              </label>
              <input
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
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="w-full md:w-64 relative group">
              <input
                type="text"
                placeholder="🔎 Buscar gasolinera..."
                className="w-full py-3 px-4 pl-10 bg-slate-100 border-transparent rounded-xl text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                ⛽
              </span>
            </div>
          </div>

          {/* FILTROS COMBUSTIBLE */}
          <div className="flex overflow-x-auto pb-2 gap-2 mb-4 scrollbar-hide">
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
                className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all ${sortType === btn.id ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-slate-50 text-slate-500 border border-slate-100"}`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* SELECTORES DE ZONA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedProvince}
              onChange={handleProvinceChange}
            >
              {Object.keys(provinceIds)
                .sort()
                .map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
            </select>
            <select
              className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
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

        {errorMsg && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stations.slice(0, 50).map((station) => {
              const price = getPriceForStation(station);
              const total = price * tankSize;
              const savings = (currentAverage - price) * tankSize;
              return (
                <div
                  key={station.id}
                  className="h-full flex flex-col bg-white rounded-4xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group relative"
                >
                  <div className="mb-4">
                    {station.distance && (
                      <div className="absolute top-6 right-6 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
                        📍 {station.distance.toFixed(1)} km
                      </div>
                    )}
                    <h3 className="font-black text-slate-800 text-lg leading-tight truncate">
                      {station.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium truncate">
                      {station.address}
                    </p>
                    <span className="text-[9px] font-bold uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md inline-block mt-2">
                      {station.municipality}
                    </span>
                  </div>
                  {tankSize > 0 && (
                    <div className="bg-slate-900 rounded-2xl p-4 mb-4 text-white animate-in fade-in zoom-in duration-300">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                            Total {tankSize}L
                          </p>
                          <p className="text-2xl font-black">
                            {total > 0 ? total.toFixed(2) : "--"}€
                          </p>
                        </div>
                        {savings > 0 && (
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-green-400 uppercase">
                              Ahorras
                            </p>
                            <p className="text-lg font-black text-green-400">
                              +{savings.toFixed(2)}€
                            </p>
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
                    />
                    <PriceTag
                      label="Diésel"
                      price={station.priceDiesel}
                      highlight={sortType === "dieselAsc"}
                    />
                    <PriceTag
                      label="G98"
                      price={station.price98}
                      highlight={sortType === "gas98Asc"}
                    />
                    <PriceTag label="Diésel+" price={station.priceDieselPlus} />
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto block w-full py-3.5 bg-slate-100 text-slate-900 text-center rounded-xl font-bold text-sm hover:bg-slate-900 hover:text-white transition-all"
                  >
                    Ir a la estación ➜
                  </a>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-150 w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 z-0">
            <MapContainer
              center={[40.416, -3.703]}
              zoom={6}
              scrollWheelZoom={true}
              className="h-full w-full"
            >
              <TileLayer
                attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <RecenterMap stations={stations} />
              {stations.slice(0, 100).map((station) => (
                <Marker key={station.id} position={[station.lat, station.lng]}>
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-bold text-slate-800">
                        {station.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {station.address}
                      </p>
                      <div className="mt-2 bg-indigo-600 text-white font-black py-1 px-2 rounded-lg text-lg">
                        {getPriceForStation(station).toFixed(3)} €
                      </div>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block mt-2 text-indigo-600 font-bold text-xs underline"
                      >
                        Cómo llegar
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
