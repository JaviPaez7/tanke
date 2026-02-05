import axios from "axios";

export const getAllGasStations = async (provinceId = "35") => {
  try {
    // Petición limpia: /api/gas/35
    // Esto funcionará automáticamente en Local (gracias a Vite) y en Vercel (gracias a la API)
    const response = await axios.get(`/api/gas/${provinceId}`);

    // Si la API devuelve el objeto directamente o dentro de ListaEESSPrecio, lo gestionamos
    const rawData = response.data.ListaEESSPrecio || response.data;

    if (!Array.isArray(rawData)) {
      console.warn("Formato de datos inesperado:", rawData);
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
