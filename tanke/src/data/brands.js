/**
 * Logos por marca. Lo usan la lista y el mapa, así que vive fuera de los dos:
 * el mapa va en un chunk aparte y no debe arrastrar a App.jsx ni duplicar
 * la tabla.
 */
export const brandLogos = {
  repsol: "/repsol.jpg",
  cepsa: "/moeve.png",
  moeve: "/moeve.png",
  pcan: "/pcan.jpg",
  shell: "/shell.png",
  bp: "/bp.png",
  disa: "/disa.jpg",
  tgas: "/tgas.jpg",
  galp: "/galp.png",
  h2exagon: "/h2.png",
  plenergy: "/plenergy.png",
  plenoil: "/plenergy.png",
  petroprix: "/petroprix.jpg",
  canary: "/canaryoil.webp",
  santana: "/santana.webp",
  spl: "/spl.png",
  ballenoil: "/ballenoil.svg",
  alcampo: "/alcampo.jpg",
};

/**
 * Marca que aparece en el rótulo de la estación, con su logo. Devuelve el
 * nombre además de la URL porque la lista lo usa como texto alternativo de la
 * imagen.
 */
export function brandFor(stationName) {
  const nameLower = String(stationName || "").toLowerCase();
  const key = Object.keys(brandLogos).find((brand) => nameLower.includes(brand));
  return key ? { name: key, url: brandLogos[key] } : null;
}
