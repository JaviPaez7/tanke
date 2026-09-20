// Topes por cuenta. Sin ellos una sola cuenta podia llenar la base y el panel
// de avisos sin limite. Viajan en /api/meta para que la UI pueda avisar antes
// de que el servidor rechace la peticion.
export const ACCOUNT_LIMITS = {
  activeAlerts: 20,
  favorites: 100,
  reportsPerDay: 20,
};
