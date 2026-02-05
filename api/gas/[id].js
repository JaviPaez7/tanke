export default async function handler(req, res) {
  // Vercel extrae el ID automáticamente de la URL
  const { id } = req.query;

  if (!id) return res.status(400).json({ error: "Falta el ID de provincia" });

  const targetUrl = `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/${id}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json",
      },
    });

    if (!response.ok) throw new Error(`Error API Gobierno: ${response.status}`);

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Error conectando con el Ministerio" });
  }
}
