import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import {
  AlertBox,
  Field,
  PasswordInput,
  PrimaryButton,
  TextInput,
} from "../components/ui";
import { safeNext } from "../lib/format";

const MIN_PASSWORD = 8;

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={next} replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register({ name, email, password });
      navigate(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const loginHref = `/login${
    next !== "/cuenta" ? `?next=${encodeURIComponent(next)}` : ""
  }`;
  // Avisar antes de enviar evita el viaje al servidor para saber lo que ya
  // sabemos aquí. Solo aparece cuando hay algo escrito.
  const shortPassword = password.length > 0 && password.length < MIN_PASSWORD;

  return (
    <AuthLayout
      title="Crea tu cuenta"
      intro="Es gratis y solo pedimos un email. Sirve para que tus gasolineras y tus avisos sigan ahí mañana."
      footer={
        <p>
          ¿Ya tienes cuenta?{" "}
          <Link
            to={loginHref}
            className="font-bold text-indigo-600 dark:text-indigo-400 underline decoration-2 underline-offset-4 decoration-indigo-300 dark:decoration-indigo-700 hover:decoration-indigo-500"
          >
            Entra aquí
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        {error && <AlertBox>{error}</AlertBox>}
        <Field label="Nombre">
          <TextInput
            type="text"
            autoComplete="name"
            placeholder="Cómo quieres que te llamemos"
            required
            minLength={2}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Email">
          <TextInput
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="tu@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          label="Contraseña"
          hint={
            shortPassword
              ? `Te faltan ${MIN_PASSWORD - password.length} caracteres para llegar a ${MIN_PASSWORD}.`
              : `Mínimo ${MIN_PASSWORD} caracteres.`
          }
        >
          <PasswordInput
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={MIN_PASSWORD}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={shortPassword || undefined}
          />
        </Field>
        <PrimaryButton
          type="submit"
          disabled={busy || shortPassword}
          className="w-full"
        >
          {busy ? "Creando cuenta…" : "Crear cuenta"}
        </PrimaryButton>
        <p className="text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          Guardamos tu email y tus gasolineras favoritas. Nada más, y nada sale
          de aquí.
        </p>
      </form>
    </AuthLayout>
  );
}
