export function IconButton({
  label,
  onClick,
  children,
  className = "",
  active = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-[14px] border transition-colors ${
        active
          ? "border-brand bg-brand text-white"
          : "border-[var(--app-border)] bg-[var(--app-elevated)] text-[var(--app-ink)] hover:border-brand/40"
      } ${className}`}
    >
      {children}
    </button>
  );
}
