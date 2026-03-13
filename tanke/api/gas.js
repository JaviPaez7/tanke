// api/gas.js - Vercel Serverless Function
// Esta funcion recibe /api/gas?id=35 y devuelve los datos del Ministerio

export default async function handler(req, res) {
  const { id = "35" } = req.query;

  const GOV_URL =
    "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia";

  const targetUrl = `${GOV_URL}/${id}`;

  try {
    // Cache de 10 minutos en Vercel CDN, 5 minutos de gracia
    res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=300");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Gov API responded with ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Saturacion en el Ministerio o timeout" });
  }
}
