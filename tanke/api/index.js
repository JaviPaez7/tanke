const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());

const GOV_URL = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia";

// --- FUNCIÓN DE LOGICA (Para no repetir código) ---
const getGasData = async (req, res) => {
  const { id } = req.params;
  const targetUrl = `${GOV_URL}/${id}`;
  
  try {
    // Configuración de caché (10 min en servidor, 5 min de gracia)
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    
    console.log(`📡 Consultando provincia: ${id}`);
    
    const response = await axios.get(targetUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Saturación en el Ministerio" });
  }
};

// ✅ CONFIGURAMOS LAS DOS RUTAS POSIBLES PARA EVITAR EL 404
app.get("/api/gas/:id", getGasData); // Por si Vercel manda la ruta completa
app.get("/gas/:id", getGasData);     // Por si Vercel limpia el prefijo /api

// Ruta de diagnóstico (Si entras a /api/health y ves "OK", es que el back funciona)
app.get("/api/health", (req, res) => res.send("Backend de Tanke: OK"));

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Backend listo en http://localhost:${PORT}`);
  });
}

module.exports = app; // Necesario para Vercel Functions