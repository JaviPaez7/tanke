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
  spl: "/spl.png",
  ballenoil: "/ballenoil.svg",
  alcampo: "/alcampo.jpg",
};

export function resolveBrand(stationName = "") {
  const nameLower = stationName.toLowerCase();
  const brandKey = Object.keys(brandLogos).find((key) =>
    nameLower.includes(key),
  );
  if (!brandKey) return { key: null, logoUrl: null, label: null };
  return {
    key: brandKey,
    logoUrl: brandLogos[brandKey],
    label: brandKey.charAt(0).toUpperCase() + brandKey.slice(1),
  };
}
