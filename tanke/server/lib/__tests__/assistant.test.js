import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Estaciones de mentira: el asistente solo las lee para reconocer municipios.
const stations = vi.hoisted(() => ({
  fetchStationsCached: vi.fn(async (id) => ({
    stations:
      id === "35"
        ? [
            { municipality: "Palmas de Gran Canaria (Las)" },
            { municipality: "Telde" },
            { municipality: "San Bartolomé" },
            { municipality: "San Bartolomé de Tirajana" },
            { municipality: "Oliva (La)" },
          ]
        : [{ municipality: "Arona" }],
    fetchedAt: Date.now(),
    stale: false,
  })),
}));
vi.mock("../stations.js", () => stations);
// La ruta importa el limitador de auth.js, que a su vez carga Prisma.
vi.mock("../../db.js", () => ({ prisma: null, requireDb: (_req, _res, next) => next() }));

import { PRICE_FIELD_BY_SORT } from "../../../src/lib/stationPricing.js";
import {
  ASSISTANT_SORTS,
  AssistantUnavailableError,
  interpretQuery,
  matchMunicipality,
  normalizePlace,
  resetAssistantState,
  sanitizeFilters,
  setAssistantClient,
} from "../assistant.js";
import { registerAssistantRoutes } from "../../routes/assistant.js";

function fakeClient(output, { stop_reason = "end_turn" } = {}) {
  const create = vi.fn(async () => ({
    stop_reason,
    content: [{ type: "text", text: JSON.stringify(output) }],
  }));
  setAssistantClient({ messages: { create } });
  return create;
}

const empty = {
  province: "",
  municipality: "",
  fuel: "",
  search: "",
  nearMe: false,
  radiusKm: 0,
  sortBy: "",
  reply: "",
};

beforeEach(() => {
  resetAssistantState();
  stations.fetchStationsCached.mockClear();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

describe("asistente de búsqueda", () => {
  it("usa los mismos combustibles que el buscador", () => {
    expect(Object.keys(ASSISTANT_SORTS).sort()).toEqual(Object.keys(PRICE_FIELD_BY_SORT).sort());
  });

  it("reconoce el municipio con el nombre del Ministerio", () => {
    const list = ["Palmas de Gran Canaria (Las)", "Telde", "San Bartolomé", "San Bartolomé de Tirajana"];
    expect(normalizePlace("Oliva (La)")).toBe("la oliva");
    expect(matchMunicipality("Las Palmas de Gran Canaria", list)).toBe("Palmas de Gran Canaria (Las)");
    expect(matchMunicipality("telde", list)).toBe("Telde");
    // Exacto gana a parcial; parcial ambiguo no elige.
    expect(matchMunicipality("San Bartolomé", list)).toBe("San Bartolomé");
    expect(matchMunicipality("San", list)).toBeNull();
    expect(matchMunicipality("", list)).toBeNull();
  });

  it("descarta valores que el buscador no entiende", async () => {
    const { filters } = await sanitizeFilters({
      ...empty,
      province: "Atlantis",
      fuel: "keroseno",
      sortBy: "rating",
      radiusKm: 900,
      search: "x".repeat(500),
    });
    expect(filters).toEqual({
      province: null,
      municipality: null,
      fuel: null,
      search: "x".repeat(60),
      nearMe: false,
      radiusKm: null,
      sortBy: null,
    });
  });

  it("si no reconoce el municipio lo busca como texto", async () => {
    const { filters } = await sanitizeFilters(
      { ...empty, municipality: "Maspalomas" },
      { currentProvince: "Las Palmas" },
    );
    expect(filters.municipality).toBeNull();
    expect(filters.search).toBe("Maspalomas");
  });

  it("con 'cerca de mí' ignora la zona y guarda el radio", async () => {
    const { filters } = await sanitizeFilters({
      ...empty,
      province: "Madrid",
      municipality: "Telde",
      nearMe: true,
      radiusKm: 10,
      sortBy: "distance",
    });
    expect(filters).toMatchObject({ province: null, municipality: null, nearMe: true, radiusKm: 10, sortBy: "distance" });
    expect(stations.fetchStationsCached).not.toHaveBeenCalled();
  });

  it("pide a Claude un formulario cerrado y cachea la respuesta", async () => {
    const create = fakeClient({
      ...empty,
      province: "Santa Cruz de Tenerife",
      municipality: "Arona",
      fuel: "dieselAsc",
      reply: "Diésel más barato en Arona.",
    });

    const first = await interpretQuery("diésel barato en Arona", { currentProvince: "Las Palmas" });
    expect(first).toEqual({
      filters: {
        province: "Santa Cruz de Tenerife",
        municipality: "Arona",
        fuel: "dieselAsc",
        search: "",
        nearMe: false,
        radiusKm: null,
        sortBy: null,
      },
      reply: "Diésel más barato en Arona.",
    });
    expect(stations.fetchStationsCached).toHaveBeenCalledWith("38");

    const body = create.mock.calls[0][0];
    expect(body.model).toBe("claude-haiku-5-5");
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.output_config.format.type).toBe("json_schema");
    expect(body.output_config.format.schema.properties.province.enum).toContain("Las Palmas");
    expect(body.messages[0].content).toContain("Las Palmas");

    await interpretQuery("Diésel  barato en ARONA", { currentProvince: "Las Palmas" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("si Claude rechaza la petición no aplica filtros", async () => {
    fakeClient({}, { stop_reason: "refusal" });
    const result = await interpretQuery("algo raro");
    expect(result.filters).toBeNull();
    expect(result.reply).toMatch(/Prueba con/);
  });

  it("sin clave no llama a nadie", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const create = fakeClient(empty);
    await expect(interpretQuery("diésel")).rejects.toBeInstanceOf(AssistantUnavailableError);
    expect(create).not.toHaveBeenCalled();
  });
});

describe("POST /api/assistant/search", () => {
  let server;
  let base;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    registerAssistantRoutes(app);
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
  });

  afterAll(() => new Promise((resolve) => server.close(resolve)));

  const post = async (body) => {
    const res = await fetch(`${base}/api/assistant/search`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, data: await res.json() };
  };

  it("valida la pregunta antes de gastar una llamada", async () => {
    const create = fakeClient(empty);
    expect((await post({ query: "  " })).status).toBe(400);
    expect((await post({ query: "a".repeat(201) })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it("devuelve 503 sin clave", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await post({ query: "diésel en Telde" });
    expect(res.status).toBe(503);
  });

  it("devuelve los filtros", async () => {
    fakeClient({ ...empty, province: "Las Palmas", municipality: "Telde", fuel: "dieselAsc" });
    const res = await post({ query: "gasoil en telde", province: "Madrid" });
    expect(res.status).toBe(200);
    expect(res.data.filters).toMatchObject({ province: "Las Palmas", municipality: "Telde", fuel: "dieselAsc" });
  });
});
