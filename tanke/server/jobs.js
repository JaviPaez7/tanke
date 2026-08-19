import { fetchNormalized, utcDateOnly } from "./lib/stations.js";

function snapshotProvinceIds() {
  const raw = process.env.SNAPSHOT_PROVINCES || "35,38";
  return raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function runSnapshot(prisma, { force = false } = {}) {
  const provinceIds = snapshotProvinceIds();
  const capturedDate = utcDateOnly();

  if (!force) {
    const today = await prisma.ingestionRun.findFirst({
      where: {
        ok: true,
        startedAt: { gte: capturedDate },
      },
    });
    if (today) return today;
  }

  const run = await prisma.ingestionRun.create({
    data: { provinceIds: provinceIds.join(","), ok: false },
  });

  try {
    let stations = 0;
    for (const provinceId of provinceIds) {
      const list = await fetchNormalized(provinceId);
      for (const station of list) {
        await prisma.priceSnapshot.upsert({
          where: {
            stationId_capturedDate: {
              stationId: station.id,
              capturedDate,
            },
          },
          create: {
            stationId: station.id,
            stationName: station.name,
            provinceId,
            province: station.province,
            municipality: station.municipality,
            price95: station.price95 || null,
            price98: station.price98 || null,
            priceDiesel: station.priceDiesel || null,
            priceDieselPlus: station.priceDieselPlus || null,
            priceGLP: station.priceGLP || null,
            capturedDate,
          },
          update: {
            stationName: station.name,
            municipality: station.municipality,
            price95: station.price95 || null,
            price98: station.price98 || null,
            priceDiesel: station.priceDiesel || null,
            priceDieselPlus: station.priceDieselPlus || null,
            priceGLP: station.priceGLP || null,
          },
        });
        stations += 1;
      }
    }

    return prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        ok: true,
        stations,
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Snapshot error:", error.message);
    return prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        ok: false,
        error: error.message.slice(0, 300),
        finishedAt: new Date(),
      },
    });
  }
}

export function startBackgroundJobs(prisma) {
  const tick = () => {
    runSnapshot(prisma).catch((error) => {
      console.error("Snapshot job:", error.message);
    });
  };

  setTimeout(tick, 12_000);
  setInterval(tick, 60 * 60 * 1000);
}
