import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { AlertBox } from "../components/ui";

// Confirma la direccion desde el enlace del correo. No abre sesion: el enlace
// solo demuestra que quien lo abre lee ese buzon, y puede abrirse desde otro
// dispositivo. Si ya hay sesion de esa cuenta, se refresca en el acto.
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const { user, ready, updateUser } = useAuth();

  const [state, setState] = useState({ busy: true, error: "", result: null });

  useEffect(() => {
    if (!token) {
      setState({ busy: false, error: "Falta el código del enlace.", result: null });
      return;
    }
    let cancelled = false;
    api
      .verifyEmail({ token })
      .then((data) => {
        if (!cancelled) setState({ busy: false, error: "", result: data });
      })
      .catch((err) => {
        if (!cancelled) setState({ busy: false, error: err.message, result: null });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // El contexto solo se toca cuando la sesion abierta es la de la cuenta
  // verificada; con otra cuenta dentro se deja tal cual.
  useEffect(() => {
    if (!ready || !state.result || !user) return;
    if (user.id === state.result.user.id) updateUser(state.result.user, null);
    // Solo al llegar el resultado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.result]);

  const link = (to, label) => (
    <Link
      to={to}
      className="font-bold text-indigo-600 dark:text-indigo-400 underline decoration-2 underline-offset-4 decoration-indigo-300 dark:decoration-indigo-700 hover:decoration-indigo-500"
    >
      {label}
    </Link>
  );

  if (state.busy) {
    return (
      <AuthLayout title="Un momento" intro="Confirmando tu email…">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </AuthLayout>
    );
  }

  if (!state.result) {
    return (
      <AuthLayout
        title="Este enlace ya no vale"
        intro="Los enlaces de confirmación caducan a las 24 horas y solo sirven una vez. Puedes pedir otro desde tu cuenta."
        footer={<p>{link(user ? "/cuenta?tab=ajustes" : "/login?next=/cuenta", user ? "Ir a mis ajustes" : "Entrar en mi cuenta")}</p>}
      >
        <AlertBox>{state.error}</AlertBox>
      </AuthLayout>
    );
  }

  const { user: verified, changedEmail } = state.result;
  return (
    <AuthLayout
      title={changedEmail ? "Email actualizado" : "Email confirmado"}
      intro={
        changedEmail
          ? `Tu cuenta ya usa ${verified.email}. Los enlaces de recuperación y las alertas llegarán a esta dirección.`
          : `${verified.email} queda verificado. Ya puedes recibir alertas de precio por correo.`
      }
      footer={
        <p>
          {user && user.id === verified.id
            ? link("/cuenta?tab=alertas", "Ir a mis alertas")
            : link("/login?next=/cuenta", "Entrar en mi cuenta")}
        </p>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        Puedes cerrar esta pestaña.
      </p>
    </AuthLayout>
  );
}
