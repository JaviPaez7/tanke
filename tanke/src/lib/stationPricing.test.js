import { describe, expect, it } from "vitest";
import {
  PRICE_FIELD_BY_SORT,
  availableFuels,
  tankSummary,
} from "./stationPricing.js";

describe("cálculos de la tarjeta", () => {
  it("solo enseña los combustibles con precio, en el orden de siempre", () => {
    const station = {
      price95: 1.459,
      price98: 0,
      priceDiesel: 1.389,
      priceDieselPlus: null,
      priceGLP: 0.899,
      priceCNG: undefined,
    };
    expect(availableFuels(station).map((fuel) => fuel.label)).toEqual([
      "G95",
      "Diésel",
      "GLP",
    ]);
  });

  it("no inventa total ni ahorro si la estación no vende el combustible", () => {
    expect(tankSummary(0, 0.905, 50)).toEqual({ total: 0, savings: 0 });
  });

  it("calcula total y ahorro únicamente con un precio disponible", () => {
    const result = tankSummary(0.879, 0.905, 50);
    expect(result.total).toBeCloseTo(43.95);
    expect(result.savings).toBeCloseTo(1.3);
  });

  it("mapea GLP y GNC a los campos de precio correctos", () => {
    expect(PRICE_FIELD_BY_SORT.glpAsc).toBe("priceGLP");
    expect(PRICE_FIELD_BY_SORT.cnGAsc).toBe("priceCNG");
  });
});
