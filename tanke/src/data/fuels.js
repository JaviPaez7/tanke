export const FUELS = [
  { id: "price95", label: "Gasolina 95" },
  { id: "price98", label: "Gasolina 98" },
  { id: "priceDiesel", label: "Diésel" },
  { id: "priceDieselPlus", label: "Diésel+" },
  { id: "priceGLP", label: "GLP" },
];

export function fuelLabel(id) {
  return FUELS.find((fuel) => fuel.id === id)?.label || id;
}
