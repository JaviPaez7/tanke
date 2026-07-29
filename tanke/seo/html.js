import {
  SITE_URL,
  displayName,
  provinceSlug,
  featuredProvinces,
  fuelPages,
  provinceIds,
} from "./provinces.js";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(n) {
  if (!n || n <= 0) return "—";
  return `${n.toFixed(3)} €`;
}

const baseStyles = `
  :root { color-scheme: dark; --bg:#0f172a; --card:#1e293b; --text:#e2e8f0; --muted:#94a3b8; --accent:#6366f1; --accent2:#818cf8; --ok:#34d399; --border:#334155; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; background:var(--bg); color:var(--text); line-height:1.55; }
  a { color:var(--accent2); text-decoration:none; }
  a:hover { text-decoration:underline; }
  .wrap { max-width:920px; margin:0 auto; padding:24px 20px 64px; }
  header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:28px; }
  .brand { font-weight:900; font-size:1.5rem; letter-spacing:-0.04em; color:#fff; }
  .brand span { color:var(--accent); }
  .btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; background:var(--accent); color:#fff !important; font-weight:700; padding:12px 18px; border-radius:12px; text-decoration:none !important; border:0; }
  .btn:hover { filter:brightness(1.08); text-decoration:none !important; }
  .btn-ghost { background:transparent; border:1px solid var(--border); color:var(--text) !important; }
  h1 { font-size:clamp(1.6rem, 4vw, 2.4rem); line-height:1.15; letter-spacing:-0.03em; margin:0 0 12px; color:#fff; }
  .lead { color:var(--muted); font-size:1.05rem; margin:0 0 24px; max-width:62ch; }
  .stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin:20px 0 28px; }
  .stat { background:var(--card); border:1px solid var(--border); border-radius:14px; padding:14px 16px; }
  .stat b { display:block; font-size:1.35rem; color:#fff; }
  .stat span { color:var(--muted); font-size:0.8rem; text-transform:uppercase; letter-spacing:0.04em; font-weight:700; }
  table { width:100%; border-collapse:collapse; background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
  th, td { padding:12px 14px; text-align:left; border-bottom:1px solid var(--border); font-size:0.95rem; }
  th { color:var(--muted); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.05em; }
  tr:last-child td { border-bottom:0; }
  .price { font-weight:800; color:var(--ok); white-space:nowrap; }
  .muted { color:var(--muted); }
  .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:20px; margin:24px 0; }
  .card h2 { margin:0 0 10px; font-size:1.15rem; color:#fff; }
  .grid-links { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:8px; margin-top:12px; }
  .grid-links a { display:block; padding:10px 12px; background:#0f172a; border:1px solid var(--border); border-radius:10px; color:var(--text); font-size:0.9rem; font-weight:600; }
  .grid-links a:hover { border-color:var(--accent); color:#fff; text-decoration:none; }
  footer { margin-top:48px; padding-top:24px; border-top:1px solid var(--border); color:var(--muted); font-size:0.85rem; }
  .cta-row { display:flex; flex-wrap:wrap; gap:12px; margin:20px 0 8px; }
  .faq details { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:14px 16px; margin:8px 0; }
  .faq summary { cursor:pointer; font-weight:700; color:#fff; }
  .faq p { margin:10px 0 0; color:var(--muted); }
  .note { font-size:0.85rem; color:var(--muted); margin-top:10px; }
`;

function layout({
  title,
  description,
  canonical,
  jsonLd,
  body,
  ogTitle,
  ogDescription,
}) {
  const ld = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="Tanke" />
  <meta property="og:title" content="${escapeHtml(ogTitle || title)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription || description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${SITE_URL}/og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle || title)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription || description)}" />
  <meta name="twitter:image" content="${SITE_URL}/og.png" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <style>${baseStyles}</style>
  ${ld.map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`).join("\n  ")}
</head>
<body>
  <div class="wrap">
    <header>
      <a class="brand" href="/">Tanke<span>.</span></a>
      <a class="btn btn-ghost" href="/">Abrir app</a>
    </header>
    ${body}
    <footer>
      <p>Tanke compara precios oficiales de carburantes del Ministerio de Industria. Datos orientativos; verifica en estación.</p>
      <p style="margin-top:8px">
        <a href="/">App</a> ·
        <a href="/guia/ahorrar-gasolina">Guía de ahorro</a> ·
        <a href="/sitemap.xml">Sitemap</a> ·
        <a href="https://javistudio.dev">JaviStudio</a>
      </p>
    </footer>
  </div>
</body>
</html>`;
}

function provinceLinksHtml(exclude) {
  const keys = Object.keys(provinceIds).sort((a, b) =>
    displayName(a).localeCompare(displayName(b), "es"),
  );
  return keys
    .filter((k) => k !== exclude)
    .map(
      (k) =>
        `<a href="/gasolineras/${provinceSlug(k)}">${escapeHtml(displayName(k))}</a>`,
    )
    .join("");
}

function featuredLinksHtml() {
  return featuredProvinces
    .map(
      (k) =>
        `<a href="/gasolineras/${provinceSlug(k)}">${escapeHtml(displayName(k))}</a>`,
    )
    .join("");
}

function fuelLinksHtml() {
  return fuelPages
    .map((f) => `<a href="/precios/${f.slug}">${escapeHtml(f.label)}</a>`)
    .join("");
}

export function renderProvinceLanding({
  provinceKey,
  stations,
  avg95,
  avgDiesel,
  top95,
  topDiesel,
}) {
  const name = displayName(provinceKey);
  const slug = provinceSlug(provinceKey);
  const canonical = `${SITE_URL}/gasolineras/${slug}`;
  const appHref = `/?provincia=${encodeURIComponent(slug)}`;
  const title = `Gasolineras baratas en ${name} | Precios hoy — Tanke`;
  const description = `Compara gasolineras baratas en ${name}: gasolina 95 y diésel en tiempo real. Media G95 ${formatPrice(avg95)}, diésel ${formatPrice(avgDiesel)}. Ahorra con Tanke.`;

  const rows95 = top95
    .map(
      (s) => `<tr>
      <td><strong>${escapeHtml(s.name)}</strong><div class="muted">${escapeHtml(s.municipality)} · ${escapeHtml(s.address)}</div></td>
      <td class="price">${formatPrice(s.price95)}</td>
    </tr>`,
    )
    .join("");

  const rowsDiesel = topDiesel
    .map(
      (s) => `<tr>
      <td><strong>${escapeHtml(s.name)}</strong><div class="muted">${escapeHtml(s.municipality)} · ${escapeHtml(s.address)}</div></td>
      <td class="price">${formatPrice(s.priceDiesel)}</td>
    </tr>`,
    )
    .join("");

  const isCanarias =
    provinceKey === "Las Palmas" || provinceKey === "Santa Cruz de Tenerife";

  const body = `
    <h1>Gasolineras más baratas en ${escapeHtml(name)}</h1>
    <p class="lead">
      Precios actualizados de combustible en ${escapeHtml(name)}${isCanarias ? " (Canarias)" : ""}.
      Ordena por gasolina 95, 98, diésel o GLP, filtra por municipio y calcula el ahorro según los litros de tu depósito.
    </p>
    <div class="cta-row">
      <a class="btn" href="${appHref}">Ver mapa y lista en vivo</a>
      <a class="btn btn-ghost" href="/guia/ahorrar-gasolina">Cómo ahorrar en gasolina</a>
    </div>
    <div class="stats">
      <div class="stat"><span>Media G95</span><b>${formatPrice(avg95)}</b></div>
      <div class="stat"><span>Media diésel</span><b>${formatPrice(avgDiesel)}</b></div>
      <div class="stat"><span>Estaciones</span><b>${stations.length}</b></div>
    </div>

    <div class="card">
      <h2>Top gasolina 95 más barata en ${escapeHtml(name)}</h2>
      ${
        rows95
          ? `<table><thead><tr><th>Estación</th><th>Precio</th></tr></thead><tbody>${rows95}</tbody></table>`
          : `<p class="muted">No hay precios de gasolina 95 disponibles ahora mismo.</p>`
      }
      <p class="note">Fuente: datos abiertos del Ministerio. Actualización aproximada cada pocos minutos.</p>
    </div>

    <div class="card">
      <h2>Top diésel más barato en ${escapeHtml(name)}</h2>
      ${
        rowsDiesel
          ? `<table><thead><tr><th>Estación</th><th>Precio</th></tr></thead><tbody>${rowsDiesel}</tbody></table>`
          : `<p class="muted">No hay precios de diésel disponibles ahora mismo.</p>`
      }
    </div>

    <div class="card faq">
      <h2>Preguntas frecuentes — ${escapeHtml(name)}</h2>
      <details open>
        <summary>¿Cómo encontrar la gasolinera más barata en ${escapeHtml(name)}?</summary>
        <p>En Tanke elige la provincia ${escapeHtml(name)}, ordena por el combustible que uses y activa “Cerca de mí” si quieres priorizar distancia. También puedes simular el coste de llenar tu depósito.</p>
      </details>
      <details>
        <summary>¿Los precios están actualizados?</summary>
        <p>Sí: usamos la API pública de carburantes del Gobierno de España. Las estaciones reportan precios con frecuencia; en la app y en esta página verás la foto más reciente disponible.</p>
      </details>
      <details>
        <summary>¿Puedo ver solo mi municipio?</summary>
        <p>Sí. Abre la <a href="${appHref}">app de Tanke para ${escapeHtml(name)}</a> y filtra por municipio en el selector.</p>
      </details>
    </div>

    <div class="card">
      <h2>Precios por tipo de combustible</h2>
      <div class="grid-links">${fuelLinksHtml()}</div>
    </div>

    <div class="card">
      <h2>Otras provincias</h2>
      <div class="grid-links">${provinceLinksHtml(provinceKey)}</div>
    </div>
  `;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      description,
      url: canonical,
      isPartOf: { "@type": "WebSite", name: "Tanke", url: SITE_URL },
      about: {
        "@type": "Place",
        name,
        address: { "@type": "PostalAddress", addressRegion: name, addressCountry: "ES" },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `¿Cómo encontrar la gasolinera más barata en ${name}?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `En Tanke elige la provincia ${name}, ordena por combustible y usa GPS o filtro por municipio para ver las estaciones más baratas cerca de ti.`,
          },
        },
        {
          "@type": "Question",
          name: "¿Los precios están actualizados?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Tanke usa los datos abiertos de carburantes del Ministerio de Industria del Gobierno de España.",
          },
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Tanke", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: `Gasolineras en ${name}`,
          item: canonical,
        },
      ],
    },
  ];

  return layout({ title, description, canonical, jsonLd, body });
}

export function renderFuelLanding(fuel) {
  const canonical = `${SITE_URL}/precios/${fuel.slug}`;
  const title = `Precio ${fuel.label} hoy en España | Comparador — Tanke`;
  const description = fuel.description;
  const appHref = `/?combustible=${encodeURIComponent(fuel.slug)}`;

  const body = `
    <h1>Precio de ${escapeHtml(fuel.label)} en España</h1>
    <p class="lead">${escapeHtml(fuel.description)}</p>
    <div class="cta-row">
      <a class="btn" href="${appHref}">Comparar ${escapeHtml(fuel.label)} en el mapa</a>
    </div>
    <div class="card">
      <h2>Cómo usarlo</h2>
      <p class="muted">1) Abre Tanke · 2) Elige tu provincia · 3) Ordena por ${escapeHtml(fuel.label)} · 4) Activa GPS o filtra municipio · 5) Simula litros del depósito para ver el ahorro.</p>
    </div>
    <div class="card">
      <h2>Gasolineras baratas por provincia</h2>
      <div class="grid-links">${featuredLinksHtml()}</div>
      <div class="grid-links" style="margin-top:12px">${provinceLinksHtml()}</div>
    </div>
    <div class="card">
      <h2>Otros combustibles</h2>
      <div class="grid-links">${fuelLinksHtml()}</div>
    </div>
  `;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: canonical,
    isPartOf: { "@type": "WebSite", name: "Tanke", url: SITE_URL },
  };

  return layout({ title, description, canonical, jsonLd, body });
}

export function renderGuidePage() {
  const canonical = `${SITE_URL}/guia/ahorrar-gasolina`;
  const title = "Cómo ahorrar gasolina en Canarias y España | Guía Tanke";
  const description =
    "Consejos prácticos para pagar menos por la gasolina y el diésel: comparar estaciones, elegir horario, calcular el depósito y usar precios oficiales.";

  const body = `
    <h1>Cómo ahorrar en gasolina (Canarias y península)</h1>
    <p class="lead">Guía rápida para gastar menos en cada depósito usando precios reales de gasolineras y hábitos sencillos al volante.</p>
    <div class="cta-row">
      <a class="btn" href="/?provincia=las-palmas">Ver precios en Las Palmas</a>
      <a class="btn btn-ghost" href="/?provincia=tenerife">Ver precios en Tenerife</a>
    </div>

    <div class="card">
      <h2>1. Compara antes de llenar</h2>
      <p class="muted">Entre estaciones del mismo municipio puede haber varios céntimos de diferencia. En un depósito de 50 L, 0,05 €/L son 2,50 € de ahorro. Usa Tanke para ordenar por gasolina 95, 98, diésel o GLP.</p>
    </div>
    <div class="card">
      <h2>2. No mires solo el precio: mira la distancia</h2>
      <p class="muted">Si la estación más barata está muy lejos, el trayecto puede comerse el ahorro. Activa “Cerca de mí”, ajusta el radio en km y ordena por precio o distancia.</p>
    </div>
    <div class="card">
      <h2>3. Simula tu depósito</h2>
      <p class="muted">En la app puedes indicar los litros y ver el coste total y el ahorro frente a la media de tu zona. Así decides con números, no a ojo.</p>
    </div>
    <div class="card">
      <h2>4. Canarias: revisa tu isla</h2>
      <p class="muted">Los precios en <a href="/gasolineras/las-palmas">Las Palmas (Gran Canaria y resto de la provincia)</a> y <a href="/gasolineras/santa-cruz-de-tenerife">Santa Cruz de Tenerife</a> cambian a menudo. Merece la pena mirar el mapa el mismo día que vas a cargar.</p>
    </div>
    <div class="card faq">
      <h2>FAQ</h2>
      <details open>
        <summary>¿Tanke es gratis?</summary>
        <p>Sí. Es una herramienta gratuita para comparar precios de carburantes en España.</p>
      </details>
      <details>
        <summary>¿De dónde salen los datos?</summary>
        <p>De la API pública de estaciones de servicio del Ministerio de Industria.</p>
      </details>
    </div>
    <div class="card">
      <h2>Empieza por tu provincia</h2>
      <div class="grid-links">${featuredLinksHtml()}</div>
    </div>
  `;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      url: canonical,
      author: { "@type": "Organization", name: "Tanke" },
      publisher: { "@type": "Organization", name: "Tanke", url: SITE_URL },
      inLanguage: "es",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "¿Tanke es gratis?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sí. Tanke es una herramienta gratuita para comparar precios de carburantes en España.",
          },
        },
        {
          "@type": "Question",
          name: "¿De dónde salen los datos?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "De la API pública de estaciones de servicio del Ministerio de Industria.",
          },
        },
      ],
    },
  ];

  return layout({ title, description, canonical, jsonLd, body });
}

export function renderSitemapXml(paths) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = paths
    .map(
      ({ path, priority = "0.7", changefreq = "daily" }) => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function allSitemapPaths() {
  const paths = [
    { path: "/", priority: "1.0", changefreq: "hourly" },
    { path: "/guia/ahorrar-gasolina", priority: "0.8", changefreq: "weekly" },
  ];

  for (const fuel of fuelPages) {
    paths.push({
      path: `/precios/${fuel.slug}`,
      priority: "0.8",
      changefreq: "daily",
    });
  }

  for (const key of Object.keys(provinceIds)) {
    paths.push({
      path: `/gasolineras/${provinceSlug(key)}`,
      priority: featuredProvinces.includes(key) ? "0.9" : "0.7",
      changefreq: "hourly",
    });
  }

  // Alias URLs útiles (canonical apunta a la provincia, pero las indexamos con redirect 302? Better: serve same content OR redirect)
  // We'll 301 alias → canonical in server; only include canonicals in sitemap.

  return paths;
}

export { escapeHtml, SITE_URL };
