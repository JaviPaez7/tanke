async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || "No se pudo completar la petición.");
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  me: () => request("/api/auth/me"),
  forgot: (body) => request("/api/auth/forgot", { method: "POST", body }),
  checkReset: (token) =>
    request(`/api/auth/reset?token=${encodeURIComponent(token)}`),
  reset: (body) => request("/api/auth/reset", { method: "POST", body }),
  changePassword: (body) =>
    request("/api/auth/password", { method: "POST", body }),
  deleteAccount: (body) =>
    request("/api/auth/me", { method: "DELETE", body }),
  exportUrl: () => "/api/me/export",
  login: (body) => request("/api/auth/login", { method: "POST", body }),
  register: (body) => request("/api/auth/register", { method: "POST", body }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  updateMe: (body) => request("/api/auth/me", { method: "PATCH", body }),
  meta: () => request("/api/meta"),
  locate: (lat, lng) => request(`/api/gas/locate?lat=${lat}&lng=${lng}`),
  favorites: () => request("/api/me/favorites"),
  addFavorite: (body) => request("/api/me/favorites", { method: "POST", body }),
  removeFavorite: (stationId) =>
    request(`/api/me/favorites/${encodeURIComponent(stationId)}`, {
      method: "DELETE",
    }),
  alerts: () => request("/api/me/alerts"),
  alertStatus: () => request("/api/me/alerts/status"),
  addAlert: (body) => request("/api/me/alerts", { method: "POST", body }),
  patchAlert: (id, body) =>
    request(`/api/me/alerts/${id}`, { method: "PATCH", body }),
  removeAlert: (id) => request(`/api/me/alerts/${id}`, { method: "DELETE" }),
  reports: () => request("/api/me/reports"),
  addReport: (body) => request("/api/me/reports", { method: "POST", body }),
  stationHistory: (id) =>
    request(`/api/stations/${encodeURIComponent(id)}/history`),
  provinceHistory: (provinceId) =>
    request(`/api/stats/history?provinceId=${encodeURIComponent(provinceId)}`),
  articles: () => request("/api/articles"),
  article: (slug) => request(`/api/articles/${encodeURIComponent(slug)}`),
  adminUsers: () => request("/api/admin/users"),
  patchUser: (id, body) =>
    request(`/api/admin/users/${id}`, { method: "PATCH", body }),
  adminArticles: () => request("/api/admin/articles"),
  createArticle: (body) =>
    request("/api/admin/articles", { method: "POST", body }),
  patchArticle: (id, body) =>
    request(`/api/admin/articles/${id}`, { method: "PATCH", body }),
  deleteArticle: (id) =>
    request(`/api/admin/articles/${id}`, { method: "DELETE" }),
  adminTaxonomy: () => request("/api/admin/categories"),
  createCategory: (body) =>
    request("/api/admin/categories", { method: "POST", body }),
  adminReports: (status) =>
    request(status ? `/api/admin/reports?status=${status}` : "/api/admin/reports"),
  patchReport: (id, body) =>
    request(`/api/admin/reports/${id}`, { method: "PATCH", body }),
  ingestion: () => request("/api/admin/ingestion"),
  runIngestion: () => request("/api/admin/ingestion/run", { method: "POST" }),
};
