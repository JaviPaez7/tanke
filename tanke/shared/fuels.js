/**
 * Los combustibles, en un solo sitio.
 *
 * Vivían duplicados en server/lib/stations.js y src/data/fuels.js. Al añadir
 * el GNC solo se actualizó la copia del servidor: /api/meta lo devolvía, pero
 * el formulario de alertas seguía pintando la lista vieja y el usuario no
 * podía elegirlo. Por eso están aquí y no en `src/` — la imagen de producción
 * no copia `src/`, así que el servidor no podría leerlo.
 */
export const FUELS = [
  { id: "price95", label: "Gasolina 95" },
  { id: "price98", label: "Gasolina 98" },
  { id: "priceDiesel", label: "Diésel" },
  { id: "priceDieselPlus", label: "Diésel+" },
  { id: "priceGLP", label: "GLP" },
  { id: "priceCNG", label: "GNC" },
];

export function fuelLabel(id) {
  return FUELS.find((fuel) => fuel.id === id)?.label || id;
}
