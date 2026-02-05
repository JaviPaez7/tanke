import axios from "axios";

// 1. URL DEL PROXY (Estable y rápido)
const PROXY_URL = "https://corsproxy.io/?";

// 2. URL DEL GOBIERNO CORREGIDA (¡Aquí estaba el error!)
// Antes faltaba "/PreciosCarburantes" y sobraba ".svc"
const GOV_URL =
  "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres";

export const getAllGasStations = async (provinceId) => {
  try {
    let targetUrl = `${GOV_URL}/FiltroProvincia/35`; // Por defecto Las Palmas

    if (provinceId && provinceId !== "all") {
      targetUrl = `${GOV_URL}/FiltroProvincia/${provinceId}`;
    }

    // Concatenamos DIRECTAMENTE. corsproxy lo maneja mejor así.
    const finalUrl = `${PROXY_URL}${targetUrl}`;

    console.log("Intentando conectar a:", finalUrl);

    const response = await axios.get(finalUrl);

    // A veces la API devuelve todo en "ListaEESSPrecio"
    const rawData = response.data.ListaEESSPrecio;

    if (!rawData) {
      console.warn("Recibida respuesta vacía o formato incorrecto");
      return [];
    }

    return rawData
      .map((station) => ({
        id: station["IDEESS"],
        name: station["Rótulo"],
        address: station["Dirección"],
        municipality: station["Municipio"] || "",
        province: station["Provincia"] || "",
        schedule: station["Horario"] || "Sin horario",

        // Limpieza y conversión de precios (coma por punto)
        priceDiesel: parseFloat(
          station["Precio Gasoleo A"]?.replace(",", ".") || 0,
        ),
        priceDieselPlus: parseFloat(
          station["Precio Nuevo Gasoleo A"]?.replace(",", ".") || 0,
        ),
        price95: parseFloat(
          station["Precio Gasolina 95 E5"]?.replace(",", ".") || 0,
        ),
        price98: parseFloat(
          station["Precio Gasolina 98 E5"]?.replace(",", ".") || 0,
        ),
        priceGLP: parseFloat(
          station["Precio Gases licuados del petróleo"]?.replace(",", ".") || 0,
        ),
        priceCNG: parseFloat(
          station["Precio Gas Natural Comprimido"]?.replace(",", ".") || 0,
        ),

        lat: parseFloat(station["Latitud"]?.replace(",", ".") || 0),
        lng: parseFloat(station["Longitud (WGS84)"]?.replace(",", ".") || 0),
      }))
      .filter(
        (s) =>
          // Solo mostramos si tienen algún precio válido
          s.price95 > 0 ||
          s.priceDiesel > 0 ||
          s.priceGLP > 0 ||
          s.priceCNG > 0,
      );
  } catch (error) {
    console.error("Error cargando gasolineras:", error);
    return [];
  }
};
