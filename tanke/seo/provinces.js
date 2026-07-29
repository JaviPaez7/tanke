/** Provincias INE + aliases SEO para landings y deep-links. */

export const SITE_URL = "https://tanke.javistudio.dev";

export const provinceIds = {
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

/** Display name overrides for nicer SEO titles */
export const provinceDisplay = {
  Alava: "Álava",
  Almeria: "Almería",
  Avila: "Ávila",
  Caceres: "Cáceres",
  Cadiz: "Cádiz",
  Castellon: "Castellón",
  Cordoba: "Córdoba",
  "Coruña (A)": "A Coruña",
  Guipuzcoa: "Gipuzkoa",
  Jaen: "Jaén",
  Leon: "León",
  Malaga: "Málaga",
  "Rioja (La)": "La Rioja",
};

export function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Extra slugs → province key in provinceIds */
export const provinceAliases = {
  tenerife: "Santa Cruz de Tenerife",
  "santa-cruz-tenerife": "Santa Cruz de Tenerife",
  "gran-canaria": "Las Palmas",
  "las-palmas-de-gran-canaria": "Las Palmas",
  canarias: "Las Palmas",
  baleares: "Islas Baleares",
  mallorca: "Islas Baleares",
  "a-coruna": "Coruña (A)",
  coruna: "Coruña (A)",
  "la-rioja": "Rioja (La)",
  gipuzkoa: "Guipuzcoa",
  bizkaia: "Vizcaya",
  araba: "Alava",
};

export function displayName(provinceKey) {
  return provinceDisplay[provinceKey] || provinceKey;
}

export function resolveProvinceSlug(slug) {
  if (!slug) return null;
  const normalized = slugify(slug);
  if (provinceAliases[normalized]) {
    return provinceAliases[normalized];
  }
  const match = Object.keys(provinceIds).find(
    (p) => slugify(p) === normalized || slugify(displayName(p)) === normalized,
  );
  return match || null;
}

export function provinceSlug(provinceKey) {
  return slugify(displayName(provinceKey));
}

export const fuelPages = [
  {
    slug: "gasolina-95",
    label: "Gasolina 95",
    sort: "gas95Asc",
    description:
      "Compara el precio de la gasolina 95 en tiempo real en gasolineras de toda España. Encuentra la más barata cerca de ti con Tanke.",
  },
  {
    slug: "gasolina-98",
    label: "Gasolina 98",
    sort: "gas98Asc",
    description:
      "Precios actualizados de gasolina 98 por provincia. Ordena estaciones y ahorra en cada depósito con Tanke.",
  },
  {
    slug: "diesel",
    label: "Diésel",
    sort: "dieselAsc",
    description:
      "Busca el diésel más barato en tu provincia. Datos oficiales del Ministerio, mapa y cálculo de ahorro por litros.",
  },
  {
    slug: "glp",
    label: "GLP / Autogas",
    sort: "glpAsc",
    description:
      "Localiza gasolineras con GLP (autogas) y compara precios actualizados en España con Tanke.",
  },
];

/** Provincias destacadas (internlinking / homepage) */
export const featuredProvinces = [
  "Las Palmas",
  "Santa Cruz de Tenerife",
  "Madrid",
  "Barcelona",
  "Valencia",
  "Sevilla",
  "Malaga",
  "Alicante",
  "Islas Baleares",
  "Murcia",
  "Zaragoza",
  "Vizcaya",
];
