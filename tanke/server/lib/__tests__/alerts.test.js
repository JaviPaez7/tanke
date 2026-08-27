import { describe, expect, it } from "vitest";
import { cheapestFor, shouldNotify } from "../alerts.js";

const HORA = 60 * 60 * 1000;

function station(overrides = {}) {
  return {
    id: "1",
    name: "REPSOL",
    municipality: "Telde",
    price95: 1.2,
    priceDiesel: 1.1,
    priceCNG: 0,
    ...overrides,
  };
}

describe("cheapestFor", () => {
  const alerta = { fuel: "price95", municipality: "", threshold: 1.3 };

  it("elige la más barata del combustible pedido, no la más barata a secas", () => {
    const best = cheapestFor(
      [
        station({ id: "a", price95: 1.25, priceDiesel: 0.9 }),
        station({ id: "b", price95: 1.19, priceDiesel: 1.4 }),
      ],
      alerta,
    );
    expect(best.id).toBe("b");
  });

  it("respeta el municipio cuando la alerta lo acota", () => {
    const best = cheapestFor(
      [
        station({ id: "fuera", municipality: "Arucas", price95: 1.0 }),
        station({ id: "dentro", municipality: "Telde", price95: 1.2 }),
      ],
      { ...alerta, municipality: "Telde" },
    );
    expect(best.id).toBe("dentro");
  });

  it("ignora los precios a 0, que significan 'no lo vende'", () => {
    const best = cheapestFor(
      [station({ id: "sin", price95: 0 }), station({ id: "con", price95: 1.4 })],
      alerta,
    );
    expect(best.id).toBe("con");
  });

  it("devuelve null si nadie vende ese combustible", () => {
    expect(cheapestFor([station({ priceCNG: 0 })], { ...alerta, fuel: "priceCNG" })).toBeNull();
    expect(cheapestFor([], alerta)).toBeNull();
  });
});

describe("shouldNotify", () => {
  const base = { threshold: 1.2, notifiedAt: null, notifiedPrice: null };
  const ahora = Date.parse("2026-08-27T12:00:00Z");

  it("no avisa si el precio está por encima del tope", () => {
    expect(shouldNotify(base, 1.25, ahora)).toBe(false);
  });

  it("avisa la primera vez que baja del tope", () => {
    expect(shouldNotify(base, 1.19, ahora)).toBe(true);
  });

  it("avisa justo en el tope (el usuario pidió 'por debajo de X' incluido)", () => {
    expect(shouldNotify(base, 1.2, ahora)).toBe(true);
  });

  it("calla si ya avisó hace poco, aunque siga barato", () => {
    const alerta = {
      ...base,
      notifiedAt: new Date(ahora - 3 * HORA),
      notifiedPrice: 1.19,
    };
    expect(shouldNotify(alerta, 1.19, ahora)).toBe(false);
  });

  it("vuelve a avisar pasado el día", () => {
    const alerta = {
      ...base,
      notifiedAt: new Date(ahora - 21 * HORA),
      notifiedPrice: 1.19,
    };
    expect(shouldNotify(alerta, 1.19, ahora)).toBe(true);
  });

  it("rompe el silencio si el precio cae de forma notable", () => {
    const alerta = {
      ...base,
      notifiedAt: new Date(ahora - 2 * HORA),
      notifiedPrice: 1.19,
    };
    expect(shouldNotify(alerta, 1.15, ahora)).toBe(true);
    // Una bajada de céntimo no justifica otro correo.
    expect(shouldNotify(alerta, 1.18, ahora)).toBe(false);
  });
});
