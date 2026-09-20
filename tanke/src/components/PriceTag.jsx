import { memo } from "react";
import { formatPriceValue } from "../lib/format";

/**
 * Recuadro con el precio de un combustible en una gasolinera.
 *
 * Extraído de App.jsx. El color depende de cómo se compara el precio con la
 * media de la zona: verde si está por debajo, rojo si por encima y naranja si
 * anda en la media. Cuando `highlight` es falso (el usuario no pidió comparar)
 * se queda en gris neutro; cuando el combustible no se vende, se marca como no
 * disponible.
 */
export const PriceTag = memo(({ label, price, highlight, currentAverage }) => {
  const isAvailable = price && price > 0;
  let colorClass =
    "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200";
  let textClass = "text-slate-700 dark:text-slate-200";
  let labelClass = "text-slate-600 dark:text-slate-400";

  if (isAvailable && highlight && currentAverage > 0) {
    if (price < currentAverage - 0.01) {
      colorClass =
        "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 shadow-sm";
      textClass = "text-green-700 dark:text-green-400";
      labelClass = "text-green-700 dark:text-green-400";
    } else if (price > currentAverage + 0.01) {
      colorClass =
        "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 shadow-sm";
      textClass = "text-red-700 dark:text-red-400";
      labelClass = "text-red-700 dark:text-red-400";
    } else {
      colorClass =
        "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 shadow-sm";
      textClass = "text-orange-700 dark:text-orange-400";
      labelClass = "text-orange-700 dark:text-orange-400";
    }
  } else if (!isAvailable) {
    // Sin `opacity-40`: a 40 % el texto quedaba a 1,14:1, prácticamente
    // invisible. Se mantiene la jerarquía con un gris más claro que el del
    // precio normal (slate-600), pero legible.
    colorClass = "bg-slate-50 dark:bg-slate-800/50 border-transparent";
    textClass = "text-slate-500 dark:text-slate-400";
    labelClass = "text-slate-500 dark:text-slate-400";
  }

  return (
    <div
      className={`flex flex-col justify-center items-center p-2.5 rounded-xl border transition-all duration-300 ${colorClass}`}
    >
      <span
        className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 ${labelClass}`}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-0.5">
        {isAvailable ? (
          <>
            <span className={`font-black text-lg tabular-nums ${textClass}`}>
              {formatPriceValue(price)}
            </span>
            <span
              className={`text-[10px] font-medium ${
                isAvailable && highlight
                  ? textClass
                  : "text-slate-600 dark:text-slate-400"
              }`}
            >
              €
            </span>
          </>
        ) : (
          <span className="font-bold text-lg text-slate-500 dark:text-slate-400">
            --
          </span>
        )}
      </div>
    </div>
  );
});

PriceTag.displayName = "PriceTag";
