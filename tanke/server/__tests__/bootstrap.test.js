import { afterEach, describe, expect, it, vi } from "vitest";
import { ensureAdmin } from "../bootstrap.js";

function prismaWith({ admin = null, user = null } = {}) {
  return {
    user: {
      findFirst: vi.fn(async () => admin),
      findUnique: vi.fn(async () => user),
      create: vi.fn(async ({ data }) => ({ id: "admin-1", ...data })),
    },
  };
}

describe("alta inicial del administrador", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("no crea credenciales predeterminadas si faltan variables", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const prisma = prismaWith();

    await expect(ensureAdmin(prisma)).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("conserva el administrador existente sin sobrescribirlo", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    vi.stubEnv("ADMIN_PASSWORD", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const admin = { id: "admin-1", email: "owner@example.com", role: "admin" };
    const prisma = prismaWith({ admin });

    await expect(ensureAdmin(prisma)).resolves.toBe(admin);
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("avisa si las credenciales iniciales siguen en el entorno con admin ya creado", async () => {
    vi.stubEnv("ADMIN_EMAIL", "owner@example.com");
    vi.stubEnv("ADMIN_PASSWORD", "a-strong-password");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const admin = { id: "admin-1", email: "owner@example.com", role: "admin" };
    const prisma = prismaWith({ admin });

    await expect(ensureAdmin(prisma)).resolves.toBe(admin);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/borra ADMIN_EMAIL y ADMIN_PASSWORD/));
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("no promociona silenciosamente una cuenta existente", async () => {
    vi.stubEnv("ADMIN_EMAIL", "owner@example.com");
    vi.stubEnv("ADMIN_PASSWORD", "a-strong-password");
    const prisma = prismaWith({
      user: { id: "user-1", email: "owner@example.com", role: "user" },
    });

    await expect(ensureAdmin(prisma)).rejects.toThrow(/promoción debe ser explícita/);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
