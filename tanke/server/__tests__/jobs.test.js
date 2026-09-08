import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchStationsCached: vi.fn(),
}));

vi.mock("../lib/stations.js", () => ({
  fetchStationsCached: mocks.fetchStationsCached,
  utcDateOnly: () => new Date("2026-09-08T00:00:00Z"),
  warmLocateIndex: vi.fn(),
}));
vi.mock("../lib/auth.js", () => ({ purgeExpiredSessions: vi.fn() }));
vi.mock("../lib/alerts.js", () => ({ runAlerts: vi.fn() }));

import { runSnapshot } from "../jobs.js";

describe("snapshot diario", () => {
  beforeEach(() => vi.clearAllMocks());

  it("no guarda ni marca éxito cuando solo hay datos de respaldo", async () => {
    mocks.fetchStationsCached.mockResolvedValue({
      stale: true,
      stations: [{ id: "old", name: "Precio de ayer" }],
    });
    const updates = [];
    const prisma = {
      ingestionRun: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: "run-1" })),
        update: vi.fn(async ({ data }) => {
          updates.push(data);
          return data;
        }),
      },
      priceSnapshot: { upsert: vi.fn() },
    };

    const result = await runSnapshot(prisma, { force: true });

    expect(prisma.priceSnapshot.upsert).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    expect(updates.at(-1).error).toMatch(/datos de respaldo/);
  });
});
