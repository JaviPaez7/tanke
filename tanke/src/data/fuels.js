export const FUELS = [
  {
    id: "gas95Asc",
    slug: "gasolina-95",
    label: "Gasolina 95",
    shortLabel: "G95",
    priceField: "price95",
  },
  {
    id: "gas98Asc",
    slug: "gasolina-98",
    label: "Gasolina 98",
    shortLabel: "G98",
    priceField: "price98",
  },
  {
    id: "dieselAsc",
    slug: "diesel",
    label: "Diésel",
    shortLabel: "Diésel",
    priceField: "priceDiesel",
  },
  {
    id: "glpAsc",
    slug: "glp",
    label: "GLP",
    shortLabel: "GLP",
    priceField: "priceGLP",
  },
  {
    id: "cnGAsc",
    slug: "gnc",
    label: "GNC",
    shortLabel: "GNC",
    priceField: "priceCNG",
  },
];

export const SECONDARY_PRICE_FIELDS = [
  { label: "G95", field: "price95", sortId: "gas95Asc" },
  { label: "Diésel", field: "priceDiesel", sortId: "dieselAsc" },
  { label: "G98", field: "price98", sortId: "gas98Asc" },
  { label: "Diésel+", field: "priceDieselPlus", sortId: null },
  { label: "GLP", field: "priceGLP", sortId: "glpAsc" },
  { label: "GNC", field: "priceCNG", sortId: "cnGAsc" },
];

export function getFuelById(id) {
  return FUELS.find((f) => f.id === id) || FUELS[0];
}

export function getFuelBySlug(slug) {
  return FUELS.find((f) => f.slug === slug) || null;
}
