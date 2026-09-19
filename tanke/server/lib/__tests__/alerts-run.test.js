import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchStationsCached: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("../stations.js", () => ({
  fetchStationsCached: mocks.fetchStationsCached,
}));

vi.mock("../mailer.js", () => ({
  appUrl: () => "https://tanke.example",
  priceAlertEmail: () => ({ subject: "alerta", text: "alerta", html: "alerta" }),
  sendEmail: mocks.sendEmail,
}));

import { runAlerts } from "../alerts.js";

const alert = {
  id: "alert-1",
  userId: "user-1",
  provinceId: "35",
  province: "Las Palmas",
  municipality: "Telde",
  fuel: "price95",
  threshold: 1.3,
  active: true,
  notifiedAt: null,
  notifiedPrice: null,
  user: { id: "user-1", email: "user@example.com", name: "Usuario" },
};

function prismaFor(alerts = [alert], updateCounts = [1]) {
  let call = 0;
  return {
    priceAlert: {
      findMany: vi.fn(async () => alerts),
      updateMany: vi.fn(async () => ({ count: updateCounts[call++] ?? 1 })),
    },
  };
}

describe("ejecución de alertas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.fetchStationsCached.mockResolvedValue({
      stale: false,
      stations: [{ id: "station-1", name: "Tanke", municipality: "Telde", price95: 1.2 }],
    });
    mocks.sendEmail.mockResolvedValue({ delivered: true });
  });

  it("solo pide alertas de cuentas activas con el email verificado", async () => {
    const prisma = prismaFor();
    await runAlerts(prisma);

    expect(prisma.priceAlert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true, user: { active: true, emailVerifiedAt: { not: null } } },
      }),
    );
  });

  it("no marca la alerta cuando el transporte no entrega", async () => {
    mocks.sendEmail.mockResolvedValue({ delivered: false });
    const prisma = prismaFor();
    const result = await runAlerts(prisma);

    expect(prisma.priceAlert.updateMany).not.toHaveBeenCalled();
    expect(result).toMatchObject({ notified: 0, users: 0 });
  });

  it("no notifica con datos de respaldo", async () => {
    mocks.fetchStationsCached.mockResolvedValue({ stale: true, stations: [] });
    const prisma = prismaFor();
    const result = await runAlerts(prisma);

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(result.notified).toBe(0);
  });

  it("continúa si una alerta desaparece antes de actualizarse", async () => {
    const second = { ...alert, id: "alert-2" };
    const prisma = prismaFor([alert, second], [0, 1]);
    const result = await runAlerts(prisma);

    expect(prisma.priceAlert.updateMany).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ notified: 1, users: 1 });
  });
});
