const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const GOV_URL = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia";

app.get("/api/gas/:id", async (req, res) => {
  const { id } = req.params;
  const targetUrl = `${GOV_URL}/${id}`;

  try {
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');

    console.log(`📡 Consultando provincia ${id}...`);

    const response = await axios.get(targetUrl, {
      timeout: 15000, 
      headers: {
        "User-Agent": "Mozilla/5.0...",
        "Accept": "application/json",
      },
    });
    res.json(response.data);

  } catch (error) {
    console.error("Error:", error.message);
    
    res.status(500).json({ error: "El servidor del Ministerio está saturado. Reintenta en unos segundos." });
  }
});
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Backend listo en http://localhost:${PORT}`);
  });
}

module.exports = app; // Necesario para Vercel Functions