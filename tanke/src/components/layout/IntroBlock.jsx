import { BadgeCheck } from "lucide-react";

export function IntroBlock() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 pb-4 pt-6 md:pt-8">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-brand">
        Comparador de carburantes
      </p>
      <h1 className="max-w-2xl text-3xl font-black tracking-tight text-[var(--app-ink)] md:text-4xl">
        Encuentra combustible barato cerca de ti
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--app-muted)] md:text-base">
        Compara precios oficiales por provincia, municipio o distancia. Gasolina
        95, 98, diésel, GLP y GNC.
      </p>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--app-muted)]">
        <BadgeCheck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
        Datos del Ministerio
      </div>
    </section>
  );
}
