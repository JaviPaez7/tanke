import axios from "axios";

// ✅ CAMBIO CLAVE: Ya no usamos Render. 
// Como el backend está en el mismo sitio que la web (Vercel), usamos una ruta relativa.
const API_URL = "/api/gas";

export const getAllGasStations = async (provinceId = "35") => {
  try {
    const response = await axios.get(`${API_URL}/${provinceId}`);

    // ... (el resto del código déjalo igual)
    const rawData = response.data.ListaEESSPrecio || response.data;
    if (!Array.isArray(rawData)) return [];

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
    console.error("Error conectando con la API de Tanke:", error);
    return [];
  }
};