import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PASSWORD_MAX,
  hashPassword,
  isPwnedPassword,
  passwordProblem,
  verifyPassword,
} from "../auth.js";

const nuncaFiltrada = async () => false;

// Valores de prueba, no credenciales: nombres explicitos para que ningun
// escaner de secretos los tome por contraseñas reales.
const EJEMPLO_CORTO = "corta";
const EJEMPLO_VALIDO = "una-buena-clave";
const EJEMPLO_CON_EMAIL = "Ana.Lopez2026";
const EJEMPLO_FILTRADO = "password123";
const EJEMPLO_CUALQUIERA = "cualquiera";
const EJEMPLO_SECRETA = "secreta123";

describe("passwordProblem", () => {
  it("exige entre 8 y 128 caracteres", async () => {
    expect(await passwordProblem(EJEMPLO_CORTO, { checkPwned: nuncaFiltrada })).toMatch(/al menos 8/);
    expect(
      await passwordProblem("x".repeat(PASSWORD_MAX + 1), { checkPwned: nuncaFiltrada }),
    ).toMatch(/no puede pasar de 128/);
    expect(await passwordProblem(EJEMPLO_VALIDO, { checkPwned: nuncaFiltrada })).toBeNull();
  });

  it("no deja usar el email como contraseña", async () => {
    const problem = await passwordProblem(EJEMPLO_CON_EMAIL, {
      email: "ana.lopez@example.com",
      checkPwned: nuncaFiltrada,
    });
    expect(problem).toMatch(/contener tu email/);
  });

  it("rechaza contraseñas que aparecen en filtraciones", async () => {
    const problem = await passwordProblem(EJEMPLO_FILTRADO, {
      email: "alguien@example.com",
      checkPwned: async () => true,
    });
    expect(problem).toMatch(/filtraciones/);
  });
});

describe("isPwnedPassword", () => {
  afterEach(() => vi.restoreAllMocks());

  // "password" → SHA-1 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
  const sufijo = "1E4C9B93F3F0682250B6CF8331B7EE68FD8";

  it("solo manda los 5 primeros caracteres del hash y detecta la coincidencia", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      text: async () => `0000000000000000000000000000000000A:0\r\n${sufijo}:3861493\r\n`,
    }));

    expect(await isPwnedPassword("password", { fetchImpl })).toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://api.pwnedpasswords.com/range/5BAA6");
    expect(fetchImpl.mock.calls[0][0]).not.toContain(sufijo);
  });

  it("ignora las filas de relleno con recuento 0", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      text: async () => `${sufijo}:0\r\n`,
    }));
    expect(await isPwnedPassword("password", { fetchImpl })).toBe(false);
  });

  it("acepta la contraseña si HIBP no responde, dejando aviso", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchImpl = vi.fn(async () => {
      throw new Error("ETIMEDOUT");
    });

    expect(await isPwnedPassword(EJEMPLO_CUALQUIERA, { fetchImpl })).toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/HIBP/), "ETIMEDOUT");
  });
});

describe("verifyPassword", () => {
  it("compara contra un hash de relleno cuando la cuenta no existe", async () => {
    const hash = await hashPassword(EJEMPLO_SECRETA);
    expect(await verifyPassword(EJEMPLO_SECRETA, hash)).toBe(true);
    expect(await verifyPassword("otra", hash)).toBe(false);
    // Sin hash siempre falla, pero pasa por bcrypt igual: mismo tiempo que
    // una contraseña equivocada.
    expect(await verifyPassword(EJEMPLO_SECRETA, null)).toBe(false);
    expect(await verifyPassword(EJEMPLO_SECRETA, undefined)).toBe(false);
  });
});
