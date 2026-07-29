/** Deep-links y enlaces SEO compartidos con el servidor (lógica espejo ligera). */

export const fuelSortBySlug = {
  "gasolina-95": "gas95Asc",
  "gasolina-98": "gas98Asc",
  diesel: "dieselAsc",
  glp: "glpAsc",
};

export const provinceAliases = {
  tenerife: "Santa Cruz de Tenerife",
  "santa-cruz-de-tenerife": "Santa Cruz de Tenerife",
  "santa-cruz-tenerife": "Santa Cruz de Tenerife",
  "gran-canaria": "Las Palmas",
  "las-palmas": "Las Palmas",
  "las-palmas-de-gran-canaria": "Las Palmas",
  canarias: "Las Palmas",
  baleares: "Islas Baleares",
  "islas-baleares": "Islas Baleares",
  mallorca: "Islas Baleares",
  "a-coruna": "Coruña (A)",
  coruna: "Coruña (A)",
  "la-rioja": "Rioja (La)",
  gipuzkoa: "Guipuzcoa",
  bizkaia: "Vizcaya",
  araba: "Alava",
};

export function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveProvinceSlug(slug, provinceIds) {
  if (!slug) return null;
  const normalized = slugify(slug);
  if (provinceAliases[normalized]) return provinceAliases[normalized];
  const match = Object.keys(provinceIds).find(
    (p) => slugify(p) === normalized,
  );
  return match || null;
}
