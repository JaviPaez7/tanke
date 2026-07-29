export function TankSimulator({ value, onChange }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <label
          htmlFor="tanke-tank"
          className="text-xs font-bold uppercase tracking-wide text-[var(--app-muted)]"
        >
          Simular depósito
        </label>
        <div className="flex items-center gap-2">
          <input
            id="tanke-tank-number"
            type="number"
            min={0}
            max={100}
            step={5}
            value={value}
            onChange={(e) => onChange(Number(e.target.value) || 0)}
            className="control h-8 w-16 px-2 text-center text-sm"
            aria-label="Litros del depósito"
          />
          <span className="text-xs font-semibold text-[var(--app-muted)]">L</span>
          {value > 0 && (
            <button
              type="button"
              onClick={() => onChange(0)}
              className="text-xs font-bold text-brand hover:underline"
            >
              Desactivar
            </button>
          )}
        </div>
      </div>
      <input
        id="tanke-tank"
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
    </div>
  );
}
