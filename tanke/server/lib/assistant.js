import Anthropic from "@anthropic-ai/sdk";
import { provinceDisplay, provinceIds } from "../../seo/provinces.js";
import { fetchStationsCached } from "./stations.js";

/**
 * Asistente de búsqueda: traduce una frase ("diésel barato en Arona") a los
 * filtros que ya tiene el buscador. Claude solo rellena un formulario; no ve
 * precios ni estaciones, así que no puede inventarse ninguno.
 *
 * Va en el servidor por la clave de la API y para poder poner topes: la
 * llamada es de pago y el buscador es público, sin cuenta.
 */

export const ASSISTANT_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
export const MAX_QUERY_LENGTH = 200;
const MAX_SEARCH_LENGTH = 60;
const MAX_REPLY_LENGTH = 240;
const MAX_RADIUS_KM = 150;

// Los mismos ids que PRICE_FIELD_BY_SORT en src/lib/stationPricing.js. No se
// importa de ahí porque la imagen no copia `src/`; un test compara las dos.
export const ASSISTANT_SORTS = {
  gas95Asc: "Gasolina 95",
  gas98Asc: "Gasolina 98",
  dieselAsc: "Diésel",
  glpAsc: "GLP (autogas)",
  cnGAsc: "GNC (gas natural)",
};

export const ALL_SPAIN = "Toda España";

// Sin tope diario un bucle de peticiones (o un bot) podía gastar sin límite.
// Al llegar, el asistente se apaga hasta el día siguiente y quedan los filtros.
const DAILY_LIMIT = Number(process.env.ASSISTANT_DAILY_LIMIT) || 1000;

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 300;

export class AssistantUnavailableError extends Error {}
export class AssistantLimitError extends Error {}

export function isAssistantEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const provinceList = Object.keys(provinceIds)
  .map((key) => (provinceDisplay[key] ? `${key} (${provinceDisplay[key]})` : key))
  .join(", ");

const sortList = Object.entries(ASSISTANT_SORTS)
  .map(([id, label]) => `${id} = ${label}`)
  .join("; ");

const SYSTEM_PROMPT = `Eres el asistente de búsqueda de Tanke, un buscador de gasolineras baratas en España. Conviertes lo que pide la persona en los filtros del buscador. No conoces precios ni estaciones: solo rellenas los filtros.

Filtros:
- province: una de estas claves exactas, o "" si no nombra zona: ${ALL_SPAIN}, ${provinceList}. Gran Canaria, Lanzarote y Fuerteventura son "Las Palmas"; Tenerife, La Palma, La Gomera y El Hierro son "Santa Cruz de Tenerife"; Mallorca, Menorca e Ibiza son "Islas Baleares". "Toda España" solo si la pide expresamente.
- municipality: el municipio si nombra uno, con su nombre oficial ("Las Palmas de Gran Canaria", "Arona"). Si das un municipio, da también su provincia. "" si no.
- fuel: ${sortList}. "Gasolina" a secas es gas95Asc; "gasoil" o "diesel" es dieselAsc. "" si no lo dice.
- search: marca o nombre de la gasolinera (Repsol, Cepsa, Shell, BP, Disa…) o una calle, si la nombra. "" si no.
- nearMe: true si pide "cerca de mí", "aquí", "por donde estoy" o similar.
- radiusKm: radio en km si lo dice junto a nearMe (1-${MAX_RADIUS_KM}). 0 si no.
- sortBy: "distance" si quiere la más cercana, "price" si quiere la más barata, "" si no lo dice.
- reply: una frase corta en español que diga qué vas a enseñar ("Diésel más barato en Arona."). Si la petición no tiene que ver con gasolineras, deja el resto vacío y explica en reply qué puede pedir.`;

const FILTER_SCHEMA = {
  type: "object",
  properties: {
    province: { type: "string", enum: ["", ALL_SPAIN, ...Object.keys(provinceIds)] },
    municipality: { type: "string" },
    fuel: { type: "string", enum: ["", ...Object.keys(ASSISTANT_SORTS)] },
    search: { type: "string" },
    nearMe: { type: "boolean" },
    radiusKm: { type: "integer" },
    sortBy: { type: "string", enum: ["", "price", "distance"] },
    reply: { type: "string" },
  },
  required: [
    "province",
    "municipality",
    "fuel",
    "search",
    "nearMe",
    "radiusKm",
    "sortBy",
    "reply",
  ],
  additionalProperties: false,
};

let client = null;
function getClient() {
  if (!client) {
    // Un reintento basta: quien espera es una persona delante del buscador.
    client = new Anthropic({ timeout: 15_000, maxRetries: 1 });
  }
  return client;
}

// Para los tests.
export function setAssistantClient(next) {
  client = next;
}

const cache = new Map();
const usage = { day: "", count: 0 };

export function resetAssistantState() {
  cache.clear();
  usage.day = "";
  usage.count = 0;
}

function takeDailySlot(now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  if (usage.day !== day) {
    usage.day = day;
    usage.count = 0;
  }
  if (usage.count >= DAILY_LIMIT) return false;
  usage.count += 1;
  return true;
}

/** Minúsculas, sin tildes y con el artículo delante: "Oliva (La)" → "la oliva". */
export function normalizePlace(value) {
  return String(value || "")
    .trim()
    .replace(/^(.*?)\s*\((el|la|los|las|l'|a|o|os|as)\)$/i, "$2 $1")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * El municipio que da Claude ("Las Palmas de Gran Canaria") con el nombre
 * exacto del Ministerio ("Palmas de Gran Canaria (Las)"), que es el que espera
 * el selector. Si no hay uno claro, null.
 */
export function matchMunicipality(name, municipalities) {
  const wanted = normalizePlace(name);
  if (!wanted) return null;
  const unique = [...new Set(municipalities)];
  const exact = unique.find((m) => normalizePlace(m) === wanted);
  if (exact) return exact;
  const partial = unique.filter((m) => normalizePlace(m).includes(wanted));
  return partial.length === 1 ? partial[0] : null;
}

function asText(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Lo que devuelve Claude pasa por aquí antes de llegar al navegador: los
 * filtros solo pueden tomar valores que el buscador entiende. `null` significa
 * "no tocar ese filtro".
 */
export async function sanitizeFilters(raw, { currentProvince } = {}) {
  const province =
    raw?.province === ALL_SPAIN || provinceIds[raw?.province] ? raw.province : null;
  const fuel = ASSISTANT_SORTS[raw?.fuel] ? raw.fuel : null;
  const sortBy = raw?.sortBy === "price" || raw?.sortBy === "distance" ? raw.sortBy : null;
  const nearMe = raw?.nearMe === true;
  const radius = Number(raw?.radiusKm);
  const radiusKm =
    Number.isInteger(radius) && radius >= 1 && radius <= MAX_RADIUS_KM ? radius : null;
  let search = asText(raw?.search, MAX_SEARCH_LENGTH);
  let municipality = null;

  const wantedMunicipality = asText(raw?.municipality, MAX_SEARCH_LENGTH);
  const zone = province || currentProvince;
  if (wantedMunicipality && !nearMe) {
    if (provinceIds[zone]) {
      try {
        const { stations } = await fetchStationsCached(provinceIds[zone]);
        municipality = matchMunicipality(
          wantedMunicipality,
          stations.map((s) => s.municipality),
        );
      } catch {
        municipality = null;
      }
    }
    // Sin municipio reconocible se busca como texto: el buscador también mira
    // el municipio y la dirección de cada estación.
    if (!municipality && !search) search = wantedMunicipality;
  }

  return {
    filters: {
      province: nearMe ? null : province,
      municipality,
      fuel,
      search,
      nearMe,
      radiusKm: nearMe ? radiusKm : null,
      sortBy,
    },
    reply: asText(raw?.reply, MAX_REPLY_LENGTH),
  };
}

function readOutput(response) {
  if (response.stop_reason === "refusal") return null;
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function interpretQuery(query, { currentProvince } = {}) {
  if (!isAssistantEnabled()) throw new AssistantUnavailableError();

  const zone =
    currentProvince === ALL_SPAIN || provinceIds[currentProvince] ? currentProvince : "";
  const key = `${zone}|${normalizePlace(query)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

  if (!takeDailySlot()) throw new AssistantLimitError();

  const response = await getClient().messages.create({
    model: ASSISTANT_MODEL,
    max_tokens: 1024,
    // Rellenar un formulario no necesita razonar: sin thinking responde en
    // menos de un segundo.
    thinking: { type: "disabled" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: FILTER_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Zona elegida ahora en el buscador: ${zone || "ninguna"}.\nPetición: ${query}`,
      },
    ],
  });

  const raw = readOutput(response);
  const result = raw
    ? await sanitizeFilters(raw, { currentProvince: zone })
    : {
        filters: null,
        reply: "No he sabido convertir eso en una búsqueda. Prueba con algo como «diésel barato en Telde».",
      };

  cache.delete(key);
  cache.set(key, { at: Date.now(), result });
  while (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value);
  return result;
}
