import axios from "axios";

const API_URL = "/api/EstacionesTerrestres/";

export const getAllGasStations = async () => {
  try {
    const response = await axios.get(API_URL);
    const rawData = response.data.ListaEESSPrecio;

    const cleanData = rawData.map((station) => ({
      id: station["IDEESS"],
      name: station["Rótulo"],
      address: station["Dirección"],
      municipality: station["Municipio"] || "",
      province: station["Provincia"] || "",

      // NUEVO: Horario
      schedule: station["Horario"] || "Sin horario",

      // PRECIOS (Si no existen, ponemos 0)
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
      ), // Gas Natural

      lat: parseFloat(station["Latitud"]?.replace(",", ".") || 0),
      lng: parseFloat(station["Longitud (WGS84)"]?.replace(",", ".") || 0),
    }));

    // Filtramos para que al menos tenga UN precio válido
    return cleanData.filter(
      (s) =>
        s.price95 > 0 || s.priceDiesel > 0 || s.priceGLP > 0 || s.priceCNG > 0,
    );
  } catch (error) {
    console.error("Error al obtener gasolineras:", error);
    return [];
  }
};
