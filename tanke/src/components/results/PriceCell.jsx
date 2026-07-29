import { priceTier } from "../../utils/stations";

const tierStyles = {
  cheap:
    "bg-good-soft border-good/25 text-good dark:bg-emerald-950/40 dark:text-emerald-300",
  expensive:
    "bg-bad-soft border-bad/25 text-bad dark:bg-red-950/40 dark:text-red-300",
  average:
    "bg-warn-soft border-warn/25 text-warn dark:bg-amber-950/40 dark:text-amber-300",
  none: "bg-[var(--app-elevated)] border-[var(--app-border)] text-[var(--app-muted)]",
};

export function PriceCell({
  label,
  price,
  highlight = false,
  average = 0,
  compact = false,
}) {
  const available = price && price > 0;
  const tier = highlight && available ? priceTier(price, average) : "none";

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-[12px] border px-2 ${
        compact ? "py-1.5" : "py-2.5"
      } ${tierStyles[tier]}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide opacity-80">
        {label}
      </span>
      {available ? (
        <span className={`font-black ${compact ? "text-sm" : "text-lg"}`}>
          {price.toFixed(3)}
          <span className="ml-0.5 text-[10px] font-semibold">€</span>
        </span>
      ) : (
        <span className={`font-semibold ${compact ? "text-xs" : "text-sm"}`}>
          Sin dato
        </span>
      )}
    </div>
  );
}
