import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import {
  AlertBox,
  Field,
  PasswordInput,
  PrimaryButton,
} from "../components/ui";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const { adoptUser } = useAuth();

  // El token se valida al entrar para no dejar que alguien escriba una
  // contraseña nueva y solo entonces descubra que el enlace habia caducado.
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    api
      .checkReset(token)
      .then((data) => {
        if (cancelled) return;
        setValid(data.valid);
        setName(data.name || "");
      })
      .catch(() => !cancelled && setValid(false))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (password !== repeat) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      const data = await api.reset({ token, password });
      // El backend ya deja la sesion abierta: entrar de nuevo a mano seria
      // pedirle la contraseña recien creada dos veces seguidas.
      adoptUser(data.user);
      navigate("/cuenta");
    } catch (err) {
      setError(err.message);
      setValid(false);
    } finally {
      setBusy(false);
    }
  }

  const expiredFooter = (
    <p>
      <Link
        to="/recuperar"
        className="font-bold text-indigo-600 dark:text-indigo-400 underline decoration-2 underline-offset-4 decoration-indigo-300 dark:decoration-indigo-700 hover:decoration-indigo-500"
      >
        Pedir un enlace nuevo
      </Link>
    </p>
  );

  if (checking) {
    return (
      <AuthLayout title="Un momento" intro="Comprobando el enlace…">
        <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </AuthLayout>
    );
  }

  if (!valid) {
    return (
      <AuthLayout
        title="Este enlace ya no vale"
        intro="Los enlaces de recuperación caducan a la media hora y solo sirven una vez. Pide otro y te llegará al instante."
        footer={expiredFooter}
      >
        <AlertBox>
          {error || "El enlace ha caducado, ya se usó o no es correcto."}
        </AlertBox>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={name ? `Hola de nuevo, ${name}` : "Elige tu contraseña"}
      intro="Escribe la contraseña nueva. Al guardarla cerraremos el resto de sesiones abiertas."
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && <AlertBox>{error}</AlertBox>}
        <Field label="Contraseña nueva" hint="Mínimo 8 caracteres.">
          <PasswordInput
            autoComplete="new-password"
            placeholder="••••••••"
            required
            autoFocus
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="Repítela">
          <PasswordInput
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
            value={repeat}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </Field>
        <PrimaryButton type="submit" disabled={busy} className="w-full">
          {busy ? "Guardando…" : "Guardar y entrar"}
        </PrimaryButton>
      </form>
    </AuthLayout>
  );
}
