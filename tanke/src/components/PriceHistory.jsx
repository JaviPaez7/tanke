import { useMemo, useState } from "react";
import { FUELS, fuelLabel } from "../data/fuels";
import { formatDay, formatPrice } from "../lib/format";

export function PriceHistory({ points, caption }) {
  const [fuel, setFuel] = useState("price95");
  const rows = useMemo(() => {
    return [...points]
      .map((point) => ({
        date: point.capturedDate || point.date,
        price95: point.price95 ?? point.avg95,
        price98: point.price98 ?? point.avg98,
        priceDiesel: point.priceDiesel ?? point.avgDiesel,
        priceDieselPlus: point.priceDieselPlus ?? point.avgDieselPlus,
        priceGLP: point.priceGLP ?? point.avgGLP,
      }))
      .filter((row) => row.date);
  }, [points]);

  const values = rows.map((row) => row[fuel]).filter((n) => typeof n === "number" && n > 0);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;
  const last = values.at(-1);
  const first = values[0];
  const delta = values.length > 1 ? last - first : 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          {caption && <h3 className="font-black">{caption}</h3>}
          {values.length > 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-300 tabular-nums">
              Último {formatPrice(last)}
              {values.length > 1 && (
                <>
                  {" "}
                  · {delta === 0 ? "sin cambio" : delta < 0 ? "baja" : "sube"}{" "}
                  {formatPrice(Math.abs(delta))} frente al primer registro
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {FUELS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFuel(item.id)}
              className={`h-8 px-3 rounded-lg text-xs font-bold cursor-pointer ${
                fuel === item.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {values.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Todavía no hay precios guardados para {fuelLabel(fuel)}. La ingesta
          nocturna cubre Canarias (Las Palmas y Tenerife).
        </p>
      ) : (
        <>
          <HistoryChart rows={rows} fuel={fuel} min={min} max={max} />
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3">Día</th>
                  <th className="pb-2 tabular-nums">{fuelLabel(fuel)}</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().slice(0, 14).map((row) => (
                  <tr key={String(row.date)} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-2 pr-3">{formatDay(row.date)}</td>
                    <td className="py-2 font-bold tabular-nums">{formatPrice(row[fuel])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function HistoryChart({ rows, fuel, min, max }) {
  const usable = rows.filter((row) => row[fuel] > 0);
  if (usable.length === 0) return null;

  const w = 640;
  const h = 160;
  const pad = 12;
  const span = max - min || 0.01;
  const d = usable
    .map((row, i) => {
      const x = pad + (i / Math.max(usable.length - 1, 1)) * (w - pad * 2);
      const y = h - pad - ((row[fuel] - min) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-40 text-indigo-500"
        role="img"
        aria-label={`Evolución de ${fuelLabel(fuel)}`}
      >
        <path d={d} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      </svg>
      <p className="text-xs text-slate-500 tabular-nums">
        Rango {formatPrice(min)} – {formatPrice(max)}
      </p>
    </div>
  );
}
