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

// Formato español: coma decimal. toFixed() devuelve punto, que en español se
// lee como separador de millares ("1.413 €" = mil cuatrocientos trece euros).
const priceFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

function formatPrice(n) {
  if (!n || n <= 0) return "—";
  return `${priceFormat.format(n)} €`;
}

// ── Diseño ───────────────────────────────────────────────────────────────
// Las landings tenían su propia hoja inline (oscura siempre, otra paleta,
// tablas) y parecían otra web. Ahora cargan el mismo CSS de Tailwind que la
// app y usan sus mismas clases: cabecera, tarjetas y botones salen iguales, y
// un cambio de diseño en la app llega aquí solo. Tailwind ve estas clases
// porque index.css declara `@source "../seo"`.

// Ruta del CSS construido (/assets/index-<hash>.css). La pone el servidor al
// arrancar, leyéndola del dist/index.html; sin build (desarrollo con Vite) se
// queda en null y la página sale sin estilos, pero con todo su contenido.
let appStylesheet = null;

export function setAppStylesheet(href) {
  appStylesheet = href || null;
}

/** Saca la hoja principal del index.html que genera Vite. */
export function stylesheetFromShell(html) {
  return (
    /<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"/i.exec(html)?.[1] ?? null
  );
}

// El mismo criterio que index.html: tema guardado en localStorage, claro por
// defecto, aplicado antes de pintar para que no haya destello. El servidor
// suma el hash de este script a la CSP (ver server.js).
export const THEME_SCRIPT = `<script>(function(){try{var d=localStorage.getItem("tanke_dark")==="true";document.documentElement.classList.add(d?"dark":"light")}catch(e){document.documentElement.classList.add("light")}})();</script>`;

// Piezas con las clases de la app, para no repetirlas en cada página.
const ui = {
  section:
    "bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-6 mt-6",
  h2: "text-lg font-black text-slate-800 dark:text-white mb-3",
  muted: "text-sm text-slate-600 dark:text-slate-400",
  link: "font-bold text-indigo-600 dark:text-indigo-400 underline decoration-2 underline-offset-4 decoration-indigo-300 dark:decoration-indigo-700 hover:decoration-indigo-500",
  btn: "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/50 transition-colors",
  btnGhost:
    "inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
  chips: "flex flex-wrap gap-2",
  chip: "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-300 dark:hover:border-indigo-800 transition-colors",
  details:
    "group rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 mt-2",
  summary: "cursor-pointer font-bold text-slate-800 dark:text-white",
  note: "mt-3 text-xs text-slate-500 dark:text-slate-400",
};

function chipLinks(items) {
  return `<div class="${ui.chips}">${items
    .map(({ href, label }) => `<a class="${ui.chip}" href="${href}">${escapeHtml(label)}</a>`)
    .join("")}</div>`;
}

function faqItem(question, answerHtml, open = false) {
  return `<details class="${ui.details}"${open ? " open" : ""}>
        <summary class="${ui.summary}">${question}</summary>
        <p class="mt-2 ${ui.muted}">${answerHtml}</p>
      </details>`;
}

// Tarjeta de estación con la anatomía de StationCard: nombre, dirección,
// municipio en una etiqueta, el precio en verde y "Cómo llegar".
function stationCard(station, priceKey, fuelLabel, rank) {
  const directions =
    station.lat && station.lng
      ? `<a class="mt-4 flex items-center justify-center w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors" href="https://www.google.com/maps/dir/?api=1&amp;destination=${station.lat},${station.lng}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>`
      : "";
  return `<li class="card-lift relative h-full flex flex-col bg-white dark:bg-slate-900 rounded-4xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
        <div class="flex items-start gap-3">
          <span class="shrink-0 w-8 h-8 rounded-full bg-slate-900 dark:bg-slate-800 text-white text-xs font-black flex items-center justify-center tabular-nums">${rank}</span>
          <div class="flex-1 min-w-0">
            <h3 class="font-black text-slate-800 dark:text-white leading-tight truncate" title="${escapeHtml(station.name)}">${escapeHtml(station.name)}</h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 font-medium truncate" title="${escapeHtml(station.address)}">${escapeHtml(station.address)}</p>
            <span class="text-[9px] font-bold uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md inline-block mt-2">${escapeHtml(station.municipality)}</span>
          </div>
        </div>
        <div class="mt-4 mb-auto flex items-baseline justify-between rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 px-3 py-2">
          <span class="text-[9px] font-bold uppercase tracking-wider text-green-700 dark:text-green-400">${escapeHtml(fuelLabel)}</span>
          <span class="font-black text-lg tabular-nums text-green-700 dark:text-green-400">${formatPrice(station[priceKey])}</span>
        </div>
        ${directions}
      </li>`;
}

function stationList(stations, priceKey, fuelLabel, emptyText) {
  if (stations.length === 0) return `<p class="${ui.muted}">${emptyText}</p>`;
  return `<ol class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      ${stations.map((s, i) => stationCard(s, priceKey, fuelLabel, i + 1)).join("")}
    </ol>`;
}

function stat(label, value) {
  return `<div class="bg-slate-900 dark:bg-slate-950/70 dark:ring-1 dark:ring-slate-700/60 rounded-2xl p-4 text-white">
        <p class="text-[10px] font-bold text-slate-400 uppercase mb-1">${label}</p>
        <p class="text-2xl font-black tabular-nums">${value}</p>
      </div>`;
}

function pageHead({ title, lead, ctas = [] }) {
  return `<h1 class="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">${title}</h1>
    <p class="mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-400">${lead}</p>
    ${
      ctas.length
        ? `<div class="mt-6 flex flex-wrap gap-3">${ctas
            .map(({ href, label, ghost }) => `<a class="${ghost ? ui.btnGhost : ui.btn}" href="${href}">${escapeHtml(label)}</a>`)
            .join("")}</div>`
        : ""
    }`;
}

function layout({
  title,
  description,
  canonical,
  jsonLd,
  body,
  ogTitle,
  ogDescription,
  robots = "index,follow,max-image-preview:large",
}) {
  const ld = Array.isArray(jsonLd) ? jsonLd : jsonLd ? [jsonLd] : [];
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="robots" content="${robots}" />
  ${THEME_SCRIPT}
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_ES" />
  <meta property="og:site_name" content="Tanke" />
  <meta property="og:title" content="${escapeHtml(ogTitle || title)}" />
  <meta property="og:description" content="${escapeHtml(ogDescription || description)}" />
  <meta property="og:url" content="${escapeHtml(canonical)}" />
  <meta property="og:image" content="${SITE_URL}/og.jpg" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Tanke — comparador de gasolineras baratas" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle || title)}" />
  <meta name="twitter:description" content="${escapeHtml(ogDescription || description)}" />
  <meta name="twitter:image" content="${SITE_URL}/og.jpg" />
  <meta name="theme-color" content="#0f172a" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  ${appStylesheet ? `<link rel="stylesheet" href="${escapeHtml(appStylesheet)}" />` : ""}
  ${ld.map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`).join("\n  ")}
</head>
<body class="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100">
  <!-- Cabecera de las páginas interiores de la app (AppChrome, variante
       "page"). Sin "Entrar"/"Cuenta": esta página no sabe quién la mira y
       un enlace de sesión equivocado confunde más que no ponerlo. -->
  <header class="bg-slate-900 text-white">
    <div class="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <a href="/" class="text-xl font-black tracking-tighter shrink-0">Tanke<span class="text-indigo-500">.</span></a>
      <nav aria-label="Principal" class="flex items-center gap-1">
        <a href="/guias" class="inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-bold text-white/85 hover:bg-white/10 hover:text-white transition-colors">Guías</a>
        <a href="/" class="inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">Abrir buscador</a>
      </nav>
    </div>
  </header>
  <main class="flex-1 w-full max-w-5xl mx-auto px-4 py-8">
    ${body}
  </main>
  <footer class="border-t border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 text-sm text-slate-600 dark:text-slate-400">
    <div class="max-w-5xl mx-auto px-4 py-8">
      <p class="text-xl font-black tracking-tighter text-slate-900 dark:text-white">Tanke<span class="text-indigo-500">.</span></p>
      <p class="mt-2 max-w-2xl">Tanke compara precios oficiales de carburantes del Ministerio para la Transición Ecológica y el Reto Demográfico. Datos orientativos; verifica en estación.</p>
      <p class="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-bold">
        <a class="hover:text-indigo-600 dark:hover:text-indigo-400" href="/">Buscador</a>
        <a class="hover:text-indigo-600 dark:hover:text-indigo-400" href="/guias">Guías</a>
        <a class="hover:text-indigo-600 dark:hover:text-indigo-400" href="/guia/ahorrar-gasolina">Guía de ahorro</a>
        <a class="hover:text-indigo-600 dark:hover:text-indigo-400" href="https://javistudio.dev">JaviStudio</a>
      </p>
    </div>
  </footer>
</body>
</html>`;
}

function provinceLinksHtml(exclude) {
  const keys = Object.keys(provinceIds).sort((a, b) =>
    displayName(a).localeCompare(displayName(b), "es"),
  );
  return chipLinks(
    keys
      .filter((k) => k !== exclude)
      .map((k) => ({ href: `/gasolineras/${provinceSlug(k)}`, label: displayName(k) })),
  );
}

function featuredLinksHtml() {
  return chipLinks(
    featuredProvinces.map((k) => ({
      href: `/gasolineras/${provinceSlug(k)}`,
      label: displayName(k),
    })),
  );
}

function fuelLinksHtml() {
  return chipLinks(fuelPages.map((f) => ({ href: `/precios/${f.slug}`, label: f.label })));
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

  const isCanarias =
    provinceKey === "Las Palmas" || provinceKey === "Santa Cruz de Tenerife";

  const body = `
    ${pageHead({
      title: `Gasolineras más baratas en ${escapeHtml(name)}`,
      lead: `Precios actualizados de combustible en ${escapeHtml(name)}${isCanarias ? " (Canarias)" : ""}.
      Ordena por gasolina 95, 98, diésel o GLP, filtra por municipio y calcula el ahorro según los litros de tu depósito.`,
      ctas: [
        { href: appHref, label: "Ver mapa y lista en vivo" },
        { href: "/guia/ahorrar-gasolina", label: "Cómo ahorrar en gasolina", ghost: true },
      ],
    })}
    <div class="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
      ${stat("Media G95", formatPrice(avg95))}
      ${stat("Media diésel", formatPrice(avgDiesel))}
      ${stat("Estaciones", stations.length)}
    </div>

    <section class="mt-10">
      <h2 class="${ui.h2}">Top gasolina 95 más barata en ${escapeHtml(name)}</h2>
      ${stationList(top95, "price95", "Gasolina 95", "No hay precios de gasolina 95 disponibles ahora mismo.")}
      <p class="${ui.note}">Fuente: datos abiertos del Ministerio. Actualización aproximada cada pocos minutos.</p>
    </section>

    <section class="mt-10">
      <h2 class="${ui.h2}">Top diésel más barato en ${escapeHtml(name)}</h2>
      ${stationList(topDiesel, "priceDiesel", "Diésel", "No hay precios de diésel disponibles ahora mismo.")}
    </section>

    <section class="${ui.section}">
      <h2 class="${ui.h2}">Preguntas frecuentes — ${escapeHtml(name)}</h2>
      ${faqItem(
        `¿Cómo encontrar la gasolinera más barata en ${escapeHtml(name)}?`,
        `En Tanke elige la provincia ${escapeHtml(name)}, ordena por el combustible que uses y activa “Cerca de mí” si quieres priorizar distancia. También puedes simular el coste de llenar tu depósito.`,
        true,
      )}
      ${faqItem(
        "¿Los precios están actualizados?",
        "Sí: usamos la API pública de carburantes del Gobierno de España. Las estaciones reportan precios con frecuencia; en la app y en esta página verás la foto más reciente disponible.",
      )}
      ${faqItem(
        "¿Puedo ver solo mi municipio?",
        `Sí. Abre la <a class="${ui.link}" href="${appHref}">app de Tanke para ${escapeHtml(name)}</a> y filtra por municipio en el selector.`,
      )}
    </section>

    <section class="${ui.section}">
      <h2 class="${ui.h2}">Precios por tipo de combustible</h2>
      ${fuelLinksHtml()}
    </section>

    <section class="${ui.section}">
      <h2 class="${ui.h2}">Otras provincias</h2>
      ${provinceLinksHtml(provinceKey)}
    </section>
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
            text: "Tanke usa los datos abiertos de carburantes del Ministerio para la Transición Ecológica y el Reto Demográfico del Gobierno de España.",
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

  const steps = [
    "Abre Tanke",
    "Elige tu provincia",
    `Ordena por ${escapeHtml(fuel.label)}`,
    "Activa GPS o filtra municipio",
    "Simula litros del depósito para ver el ahorro",
  ];

  const body = `
    ${pageHead({
      title: `Precio de ${escapeHtml(fuel.label)} en España`,
      lead: escapeHtml(fuel.description),
      ctas: [{ href: appHref, label: `Comparar ${fuel.label} en el mapa` }],
    })}
    <section class="${ui.section}">
      <h2 class="${ui.h2}">Cómo usarlo</h2>
      <ol class="grid gap-2 sm:grid-cols-5">
        ${steps
          .map(
            (step, i) => `<li class="flex sm:flex-col items-center sm:items-start gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-3 text-sm font-semibold">
          <span class="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">${i + 1}</span>${step}
        </li>`,
          )
          .join("")}
      </ol>
    </section>
    <section class="${ui.section}">
      <h2 class="${ui.h2}">Gasolineras baratas por provincia</h2>
      ${featuredLinksHtml()}
      <div class="mt-4">${provinceLinksHtml()}</div>
    </section>
    <section class="${ui.section}">
      <h2 class="${ui.h2}">Otros combustibles</h2>
      ${fuelLinksHtml()}
    </section>
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

  const tips = [
    [
      "Compara antes de llenar",
      "Entre estaciones del mismo municipio puede haber varios céntimos de diferencia. En un depósito de 50 L, 0,05 €/L son 2,50 € de ahorro. Usa Tanke para ordenar por gasolina 95, 98, diésel o GLP.",
    ],
    [
      "No mires solo el precio: mira la distancia",
      "Si la estación más barata está muy lejos, el trayecto puede comerse el ahorro. Activa “Cerca de mí”, ajusta el radio en km y ordena por precio o distancia.",
    ],
    [
      "Simula tu depósito",
      "En la app puedes indicar los litros y ver el coste total y el ahorro frente a la media de tu zona. Así decides con números, no a ojo.",
    ],
    [
      "Canarias: revisa tu isla",
      `Los precios en <a class="${ui.link}" href="/gasolineras/las-palmas">Las Palmas (Gran Canaria y resto de la provincia)</a> y <a class="${ui.link}" href="/gasolineras/santa-cruz-de-tenerife">Santa Cruz de Tenerife</a> cambian a menudo. Merece la pena mirar el mapa el mismo día que vas a cargar.`,
    ],
  ];

  const body = `
    ${pageHead({
      title: "Cómo ahorrar en gasolina (Canarias y península)",
      lead: "Guía rápida para gastar menos en cada depósito usando precios reales de gasolineras y hábitos sencillos al volante.",
      ctas: [
        { href: "/?provincia=las-palmas", label: "Ver precios en Las Palmas" },
        { href: "/?provincia=tenerife", label: "Ver precios en Tenerife", ghost: true },
      ],
    })}

    <ol class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
      ${tips
        .map(
          ([title, text], i) => `<li class="card-lift relative bg-white dark:bg-slate-900 rounded-4xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <span class="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-black flex items-center justify-center">${i + 1}</span>
        <h2 class="mt-3 text-lg font-black text-slate-800 dark:text-white">${title}</h2>
        <p class="mt-1 ${ui.muted}">${text}</p>
      </li>`,
        )
        .join("")}
    </ol>
    <section class="${ui.section}">
      <h2 class="${ui.h2}">FAQ</h2>
      ${faqItem("¿Tanke es gratis?", "Sí. Es una herramienta gratuita para comparar precios de carburantes en España.", true)}
      ${faqItem("¿De dónde salen los datos?", "De la API pública de estaciones de servicio del Ministerio para la Transición Ecológica y el Reto Demográfico.")}
    </section>
    <section class="${ui.section}">
      <h2 class="${ui.h2}">Empieza por tu provincia</h2>
      ${featuredLinksHtml()}
    </section>
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
            text: "De la API pública de estaciones de servicio del Ministerio para la Transición Ecológica y el Reto Demográfico.",
          },
        },
      ],
    },
  ];

  return layout({ title, description, canonical, jsonLd, body });
}

export function renderNotFoundPage() {
  const body = `
    <div class="py-12 text-center">
      <p class="text-6xl font-black tracking-tighter text-indigo-600 dark:text-indigo-400">404</p>
      <h1 class="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">Página no encontrada</h1>
      <p class="mt-3 ${ui.muted}">La dirección no existe o ha cambiado.</p>
      <div class="mt-6 flex flex-wrap justify-center gap-3">
        <a class="${ui.btn}" href="/">Volver a Tanke</a>
        <a class="${ui.btnGhost}" href="/gasolineras/las-palmas">Gasolineras en Las Palmas</a>
      </div>
    </div>
  `;
  return layout({
    title: "No encontrado — Tanke",
    description: "Esta página de Tanke no existe.",
    canonical: `${SITE_URL}/`,
    body,
    robots: "noindex",
  });
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
