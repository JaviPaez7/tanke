export function LoadingSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-label="Cargando gasolineras"
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="surface space-y-3 p-5">
          <div className="flex gap-3">
            <div className="skeleton h-10 w-10" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
          <div className="skeleton h-10 w-1/3" />
          <div className="grid grid-cols-3 gap-2">
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
            <div className="skeleton h-12" />
          </div>
          <div className="skeleton h-11 w-full" />
        </div>
      ))}
    </div>
  );
}
