export function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-[14px] border border-[var(--app-border)] bg-[var(--app-elevated)] p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold transition-colors ${
              active
                ? "bg-brand text-white shadow-sm"
                : "text-[var(--app-muted)] hover:text-[var(--app-ink)]"
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
