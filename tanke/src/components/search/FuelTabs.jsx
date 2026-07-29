import { FUELS } from "../../data/fuels";

export function FuelTabs({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Tipo de combustible"
      className="scrollbar-hide flex gap-2 overflow-x-auto pb-1"
    >
      {FUELS.map((fuel) => {
        const active = fuel.id === value;
        return (
          <button
            key={fuel.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-pressed={active}
            onClick={() => onChange(fuel.id)}
            className={`whitespace-nowrap rounded-[12px] border px-3.5 py-2 text-sm font-semibold transition-colors ${
              active
                ? "border-brand/30 bg-brand-soft text-brand dark:bg-brand/20 dark:text-indigo-300"
                : "border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-muted)] hover:text-[var(--app-ink)]"
            }`}
          >
            <span className="sr-only">{fuel.label}</span>
            <span aria-hidden="true">{fuel.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
