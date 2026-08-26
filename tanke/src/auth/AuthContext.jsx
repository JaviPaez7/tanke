/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());

  const refreshFavorites = useCallback(async (nextUser) => {
    if (!nextUser) {
      setFavoriteIds(new Set());
      return;
    }
    try {
      const data = await api.favorites();
      setFavoriteIds(new Set(data.favorites.map((row) => row.stationId)));
    } catch {
      setFavoriteIds(new Set());
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((data) => {
        if (cancelled) return;
        setUser(data.user);
        return data.user ? refreshFavorites(data.user) : null;
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
    // Solo al montar: la sesión se refresca con login/logout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      favoriteIds,
      async login(payload) {
        const data = await api.login(payload);
        setUser(data.user);
        await refreshFavorites(data.user);
        return data.user;
      },
      async register(payload) {
        const data = await api.register(payload);
        setUser(data.user);
        await refreshFavorites(data.user);
        return data.user;
      },
      async logout() {
        await api.logout().catch(() => {});
        setUser(null);
        setFavoriteIds(new Set());
      },
      // Para cuando el backend ya ha abierto la sesion por su cuenta
      // (restablecer contraseña) y solo falta que el cliente se entere.
      async adoptUser(nextUser) {
        setUser(nextUser);
        await refreshFavorites(nextUser);
      },
      // Editar el perfil no cambia la sesion: basta con refrescar los datos
      // que se pintan en la cabecera.
      updateUser(nextUser) {
        setUser(nextUser);
      },
      // La cuenta ya no existe en el servidor; se limpia el estado local sin
      // llamar a /logout, que devolveria 401.
      clearSession() {
        setUser(null);
        setFavoriteIds(new Set());
      },
      async toggleFavorite(station) {
        if (!user) return { needsAuth: true };
        const id = String(station.id);
        if (favoriteIds.has(id)) {
          await api.removeFavorite(id);
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          return { saved: false };
        }
        await api.addFavorite({
          stationId: id,
          stationName: station.name,
          address: station.address,
          municipality: station.municipality,
          province: station.province,
          lat: station.lat,
          lng: station.lng,
        });
        setFavoriteIds((prev) => new Set(prev).add(id));
        return { saved: true };
      },
    }),
    [user, ready, favoriteIds, refreshFavorites],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
