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
