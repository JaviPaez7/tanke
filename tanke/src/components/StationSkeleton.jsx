// Copia la anatomía de la tarjeta real (logo, nombre, bloque de depósito, los
// cuatro precios y el botón) con las mismas medidas, para que al llegar los
// datos nada cambie de tamaño ni de sitio. Un spinner centrado no decía cuánto
// venía ni dejaba el hueco reservado.
function Block({ className }) {
  return (
    <span
      className={`block rounded-lg bg-slate-200/90 dark:bg-slate-800 ${className}`}
    />
  );
}

function StationCardSkeleton({ withTank }) {
  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-4xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
      <div className="mb-4 flex items-start gap-3">
        <Block className="h-12 w-12 shrink-0 rounded-2xl" />
        <div className="flex-1 min-w-0 space-y-2">
          <Block className="h-5 w-4/5" />
          <Block className="h-3 w-full" />
          <Block className="h-4 w-24 rounded-md" />
        </div>
        <Block className="h-8 w-16 shrink-0 rounded-full" />
      </div>

      {withTank && (
        <div className="mb-4 rounded-2xl bg-slate-100 p-4 dark:bg-slate-950/70">
          <Block className="h-2.5 w-20" />
          <Block className="mt-2 h-7 w-28" />
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-2">
        <Block className="h-14 rounded-xl" />
        <Block className="h-14 rounded-xl" />
        <Block className="h-14 rounded-xl" />
        <Block className="h-14 rounded-xl" />
      </div>

      <Block className="mt-auto h-12 w-full rounded-xl" />
    </div>
  );
}

export function StationListSkeleton({ count = 6, withTank = true }) {
  return (
    <div role="status" className="motion-safe:animate-pulse">
      <span className="sr-only">Buscando los mejores precios…</span>
      <div className="mb-4 flex items-center justify-between px-1">
        <Block className="h-3 w-44" />
        <Block className="h-3 w-24" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <StationCardSkeleton key={i} withTank={withTank} />
        ))}
      </div>
    </div>
  );
}
