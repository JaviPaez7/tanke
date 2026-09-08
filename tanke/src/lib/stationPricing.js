export const PRICE_FIELD_BY_SORT = {
  gas95Asc: "price95",
  gas98Asc: "price98",
  dieselAsc: "priceDiesel",
  glpAsc: "priceGLP",
  cnGAsc: "priceCNG",
};

export const CARD_FUELS = [
  { field: "price95", label: "G95", sort: "gas95Asc" },
  { field: "priceDiesel", label: "Diésel", sort: "dieselAsc" },
  { field: "price98", label: "G98", sort: "gas98Asc" },
  { field: "priceDieselPlus", label: "Diésel+", sort: null },
  { field: "priceGLP", label: "GLP", sort: "glpAsc" },
  { field: "priceCNG", label: "GNC", sort: "cnGAsc" },
];

export function tankSummary(price, currentAverage, tankSize) {
  if (!(price > 0) || !(tankSize > 0)) return { total: 0, savings: 0 };
  return {
    total: price * tankSize,
    savings:
      currentAverage > price ? (currentAverage - price) * tankSize : 0,
  };
}
