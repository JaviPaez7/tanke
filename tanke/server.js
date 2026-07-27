// Servidor de produccion: sirve el dist/ estatico y replica api/gas.js
// (funcion serverless de Vercel) para el self-host en VPS.
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3002;

app.get('/api/gas', async (req, res) => {
  const id = req.query.id || '35';
  const GOV_URL_PROVINCE =
    'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia';
  const GOV_URL_ALL =
    'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
  const targetUrl = id === 'all' ? GOV_URL_ALL : `${GOV_URL_PROVINCE}/${id}`;

  try {
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) throw new Error(`Gov API responded with ${response.status}`);

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Saturacion en el Ministerio o timeout' });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => console.log(`tanke server listening on ${PORT}`));
