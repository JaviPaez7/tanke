/**
 * Texto del aviso cuando la búsqueda se queda sin gasolineras.
 *
 * Antes decía siempre "No hay gasolineras con Gasolina 95", también cuando lo
 * que vaciaba la lista era el texto buscado: el usuario no sabía qué filtro
 * quitar. Ahora repite lo que pidió (texto y zona) y solo menciona el
 * combustible cuando es él quien deja la lista vacía.
 */

// El Ministerio escribe "Aldea de San Nicolás (La)": vale para ordenar el
// selector, pero dentro de una frase se lee al revés.
function readablePlace(name) {
  const match = name.match(/^(.+) \(([^)]+)\)$/);
  return match ? `${match[2]} ${match[1]}` : name;
}

export function zoneLabel({
  userLocation,
  searchRadius,
  selectedMunicipality,
  selectedProvince,
}) {
  // Con GPS el radio manda sobre el selector de municipio (ver App.jsx).
  if (userLocation) return `a menos de ${searchRadius} km de ti`;
  if (selectedMunicipality) return `en ${readablePlace(selectedMunicipality)}`;
  if (selectedProvince === "Toda España") return "en toda España";
  return `en ${selectedProvince}`;
}

export function emptyResultsMessage({ searchTerm, fuelLabel, fuelIsCause, zone }) {
  const term = searchTerm.trim();
  const fuel = fuelIsCause ? ` con ${fuelLabel}` : "";
  const match = term ? ` que coincidan con "${term}"` : "";
  return {
    title: `No hay gasolineras${fuel}${match} ${zone}`,
    hint: fuelIsCause
      ? "Prueba con otro combustible o cambia de zona."
      : term
        ? "Revisa lo que has escrito o busca en otra zona."
        : "Prueba en otra zona.",
  };
}
