import { describe, expect, it } from "vitest";
import { FUELS, fuelLabel } from "../fuels.js";
import { FUELS as SERVER_FUELS } from "../../server/lib/stations.js";
import { FUELS as CLIENT_FUELS } from "../../src/data/fuels.js";

describe("combustibles", () => {
  // La lista estuvo duplicada y al añadir el GNC solo se actualizó la copia
  // del servidor: /api/meta lo ofrecía y el formulario de alertas no.
  it("servidor y cliente leen exactamente la misma lista", () => {
    expect(SERVER_FUELS).toBe(FUELS);
    expect(CLIENT_FUELS).toBe(FUELS);
  });

  it("incluye el GNC, que el buscador ya ordenaba", () => {
    expect(FUELS.map((f) => f.id)).toContain("priceCNG");
    expect(fuelLabel("priceCNG")).toBe("GNC");
  });

  it("devuelve el id si el combustible no existe, en vez de undefined", () => {
    expect(fuelLabel("priceInventado")).toBe("priceInventado");
  });
});
