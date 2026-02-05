import axios from "axios";

// AHORA APUNTAMOS A TU SERVIDOR BACKEND (Puerto 3000)
// Cuando lo subas a internet, cambiaremos esta URL por la de producción.
const API_URL = "http://localhost:3000/api/gas";

export const getAllGasStations = async (provinceId = "35") => {
  try {
    // Llamada directa a tu backend
    const response = await axios.get(`${API_URL}/${provinceId}`);

    // Si la API devuelve el objeto directamente o dentro de ListaEESSPrecio
    const rawData = response.data.ListaEESSPrecio || response.data;

    if (!Array.isArray(rawData)) {
      // A veces el gobierno devuelve un objeto vacío si falla
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
      .filter((s) => s.price95 > 0 || s.priceDiesel > 0);
  } catch (error) {
    console.error("Error cargando gasolineras:", error);
    return [];
  }
};
