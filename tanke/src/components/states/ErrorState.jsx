import { AlertTriangle, RefreshCw } from "lucide-react";

export function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="surface mx-auto max-w-xl px-6 py-10 text-center"
    >
      <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-bad" aria-hidden="true" />
      <h3 className="text-lg font-black text-[var(--app-ink)]">
        No pudimos cargar los precios
      </h3>
      <p className="mt-2 text-sm text-[var(--app-muted)]">
        {message || "Ha ocurrido un error al consultar los datos oficiales."}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-[14px] bg-brand px-4 text-sm font-bold text-white hover:bg-brand-hover"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Reintentar
      </button>
    </div>
  );
}
