import { afterEach, describe, expect, it, vi } from "vitest";

// La caché vive en el módulo, así que cada bloque lo reimporta fresco para no
// heredar lo que dejó el anterior.
async function loadStations() {
  vi.resetModules();
  return import("../stations.js");
}

function govStation(overrides = {}) {
  return {
    IDEESS: "1234",
    "Rótulo": "REPSOL",
    "Dirección": "CALLE MAYOR 1",
    Municipio: "Telde",
    Provincia: "PALMAS (LAS)",
    IDProvincia: "35",
    Horario: "L-D: 24H",
    "Precio Gasolina 95 E5": "1,239",
    "Precio Gasolina 98 E5": "1,359",
    "Precio Gasoleo A": "1,149",
    "Precio Nuevo Gasoleo A": "1,209",
    "Precio Gases licuados del petróleo": "0,899",
    "Precio Gas Natural Comprimido": "1,050",
    Latitud: "28,0",
    "Longitud (WGS84)": "-15,4",
    ...overrides,
  };
}

describe("normalizeStations", () => {
  it("lee los precios con coma decimal", async () => {
    const { normalizeStations } = await loadStations();
    const [s] = normalizeStations({ ListaEESSPrecio: [govStation()] });

    expect(s.price95).toBe(1.239);
    expect(s.priceDiesel).toBe(1.149);
    expect(s.priceGLP).toBe(0.899);
    // El GNC se ordenaba en el buscador pero no salía del normalizador, así
    // que no había forma de crear una alerta ni de guardar su histórico.
    expect(s.priceCNG).toBe(1.05);
    expect(s.lat).toBe(28);
    expect(s.lng).toBe(-15.4);
  });

  it("trata el precio ausente como 0 en vez de NaN", async () => {
    const { normalizeStations } = await loadStations();
    const [s] = normalizeStations({
      ListaEESSPrecio: [govStation({ "Precio Gasolina 98 E5": "" })],
    });
    expect(s.price98).toBe(0);
    expect(Number.isNaN(s.price98)).toBe(false);
  });

  it("conserva estaciones que solo venden GLP o GNC", async () => {
    const { normalizeStations } = await loadStations();
    const list = normalizeStations({
      ListaEESSPrecio: [
        govStation({
          "Precio Gasolina 95 E5": "",
          "Precio Gasolina 98 E5": "",
          "Precio Gasoleo A": "",
          "Precio Nuevo Gasoleo A": "",
          "Precio Gases licuados del petróleo": "",
          "Precio Gas Natural Comprimido": "1,050",
        }),
        govStation({
          IDEESS: "5678",
          "Precio Gasolina 95 E5": "",
          "Precio Gasolina 98 E5": "",
          "Precio Gasoleo A": "",
          "Precio Nuevo Gasoleo A": "",
          "Precio Gases licuados del petróleo": "0,899",
          "Precio Gas Natural Comprimido": "",
        }),
      ],
    });
    expect(list.map((station) => station.id)).toEqual(["1234", "5678"]);
  });

  it("rechaza una respuesta con forma inesperada", async () => {
    const { normalizeStations } = await loadStations();
    expect(() => normalizeStations({})).toThrow(/Respuesta inválida/);
    expect(() => normalizeStations({ ListaEESSPrecio: null })).toThrow(
      /Respuesta inválida/,
    );
  });
});

describe("fetchStationsCached", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubFetch(impl) {
    const spy = vi.fn(impl);
    vi.stubGlobal("fetch", spy);
    return spy;
  }

  it("no vuelve al Ministerio dentro de la ventana de caché", async () => {
    const { fetchStationsCached } = await loadStations();
    const spy = stubFetch(async () => ({
      ok: true,
      json: async () => ({ ListaEESSPrecio: [govStation()] }),
    }));

    const first = await fetchStationsCached("35");
    const second = await fetchStationsCached("35");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(second.stations).toEqual(first.stations);
    expect(second.stale).toBe(false);
  });

  it("comparte una sola descarga entre peticiones simultáneas", async () => {
    const { fetchStationsCached } = await loadStations();
    const spy = stubFetch(async () => ({
      ok: true,
      json: async () => ({ ListaEESSPrecio: [govStation()] }),
    }));

    await Promise.all([
      fetchStationsCached("35"),
      fetchStationsCached("35"),
      fetchStationsCached("35"),
    ]);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("sirve la copia anterior marcada stale si el Ministerio cae", async () => {
    vi.useFakeTimers();
    try {
      const { fetchStationsCached } = await loadStations();
      let falla = false;
      stubFetch(async () => {
        if (falla) throw new Error("ECONNRESET");
        return { ok: true, json: async () => ({ ListaEESSPrecio: [govStation()] }) };
      });

      const fresco = await fetchStationsCached("35");
      expect(fresco.stale).toBe(false);

      // Pasada la ventana de caché, con el origen ya caído.
      falla = true;
      vi.advanceTimersByTime(11 * 60 * 1000);

      const respaldo = await fetchStationsCached("35");
      expect(respaldo.stale).toBe(true);
      expect(respaldo.stations).toEqual(fresco.stations);
    } finally {
      vi.useRealTimers();
    }
  });

  it("propaga el error si la copia guardada es demasiado vieja", async () => {
    vi.useFakeTimers();
    try {
      const { fetchStationsCached } = await loadStations();
      let falla = false;
      stubFetch(async () => {
        if (falla) throw new Error("ECONNRESET");
        return { ok: true, json: async () => ({ ListaEESSPrecio: [govStation()] }) };
      });

      await fetchStationsCached("35");
      falla = true;
      // Más allá de STALE_MAX_MS (6 h) el dato ya no sirve para repostar.
      vi.advanceTimersByTime(7 * 60 * 60 * 1000);

      await expect(fetchStationsCached("35")).rejects.toThrow("ECONNRESET");
    } finally {
      vi.useRealTimers();
    }
  });

  it("rechaza ids fuera de la lista blanca sin tocar el Ministerio", async () => {
    const { fetchStationsCached, InvalidProvinceError } = await loadStations();
    const spy = stubFetch(async () => ({
      ok: true,
      json: async () => ({ ListaEESSPrecio: [govStation()] }),
    }));

    // El Ministerio ignora lo que va detras del id: cada variante era una
    // entrada de cache nueva con la provincia entera dentro.
    for (const id of ["35?x=1", "35/", "../x", "99", "", "35 "]) {
      await expect(fetchStationsCached(id)).rejects.toBeInstanceOf(InvalidProvinceError);
    }
    expect(spy).not.toHaveBeenCalled();

    await expect(fetchStationsCached("35")).resolves.toMatchObject({ stale: false });
    await expect(fetchStationsCached("all")).resolves.toMatchObject({ stale: false });
  });

  it("nunca guarda mas entradas que el tope aunque cambie la lista blanca", async () => {
    const { fetchStationsCached, VALID_STATION_IDS, cacheSize } = await loadStations();
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ ListaEESSPrecio: [govStation()] }),
    }));

    // Simula una lista blanca mucho mayor para forzar el desalojo.
    for (let i = 0; i < 100; i += 1) VALID_STATION_IDS.add(`x${i}`);
    for (let i = 0; i < 100; i += 1) await fetchStationsCached(`x${i}`);

    expect(cacheSize()).toBeLessThanOrEqual(64);
  });

  it("no cachea una respuesta de error del Ministerio", async () => {
    const { fetchStationsCached } = await loadStations();
    stubFetch(async () => ({ ok: false, status: 403, json: async () => ({}) }));
    await expect(fetchStationsCached("35")).rejects.toThrow(/403/);
  });

  it("preserva la copia buena ante una respuesta 200 con esquema inválido", async () => {
    vi.useFakeTimers();
    try {
      const { fetchStationsCached } = await loadStations();
      let invalid = false;
      stubFetch(async () => ({
        ok: true,
        json: async () =>
          invalid ? { ListaEESSPrecio: null } : { ListaEESSPrecio: [govStation()] },
      }));

      const fresh = await fetchStationsCached("35");
      invalid = true;
      vi.advanceTimersByTime(11 * 60 * 1000);

      const fallback = await fetchStationsCached("35");
      expect(fallback.stale).toBe(true);
      expect(fallback.stations).toEqual(fresh.stations);
    } finally {
      vi.useRealTimers();
    }
  });
});
