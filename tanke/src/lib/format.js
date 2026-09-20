export const priceFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

export const dateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
});

export function formatPrice(value) {
  if (value == null || !(value > 0)) return "—";
  return `${priceFormat.format(value)} €`;
}

export function formatDay(value) {
  return dateFormat.format(new Date(value));
}

const dateTimeFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDate(value) {
  if (!value) return "—";
  return dateTimeFormat.format(new Date(value));
}

export function safeNext(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/cuenta";
  return value;
}

export const REPORT_STATUS = {
  pending: "Pendiente",
  reviewed: "Revisado",
  dismissed: "Descartado",
};

export const REPORT_TYPES = {
  horario: "Horario",
  cerrada: "Cerrada",
  precio: "Precio",
  otro: "Otro",
};

/** "1 aviso" / "4 avisos": el recuento y su palabra siempre concuerdan. */
export function plural(count, one, many) {
  return `${count.toLocaleString("es-ES")} ${count === 1 ? one : many}`;
}

// ---- formateadores del buscador de gasolineras -------------------------
// Van aparte de `formatPrice`/`formatDate` a propósito: el buscador no quiere
// el sufijo " €" ni la guarda de nulos, porque pinta el número y la unidad por
// separado y necesita distinguir un 0 real de "sin dato". Vivían dentro de
// App.jsx; se movieron aquí al extraer PriceTag, que los usa.

const eurFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const kmFormat = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const countFormat = new Intl.NumberFormat("es-ES");

/** Precio por litro con 3 decimales, sin sufijo: "1,244". */
export const formatPriceValue = (n) => priceFormat.format(n);

/** Importe con 2 decimales, sin sufijo: "58,20". */
export const formatEur = (n) => eurFormat.format(n);

/** Distancia con 1 decimal, sin sufijo: "3,4". */
export const formatKm = (n) => kmFormat.format(n);

/** Entero con separador de millares: "11.021". */
export const formatCount = (n) => countFormat.format(n);
