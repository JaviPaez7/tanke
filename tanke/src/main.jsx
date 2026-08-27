import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { registerSW } from "virtual:pwa-register";

// Solo el buscador entra en el bundle inicial: es la razón por la que la gente
// llega a Tanke. La cuenta, las guías y sobre todo /admin son pantallas que la
// mayoría de visitas no abren nunca, así que viajan en sus propios chunks.
const Account = lazy(() => import("./pages/Account.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.jsx"));
const GuideArticle = lazy(() => import("./pages/GuideArticle.jsx"));
const Guides = lazy(() => import("./pages/Guides.jsx"));
const Login = lazy(() => import("./pages/Login.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.jsx"));

registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* El chunk de una ruta tarda milisegundos; un spinner que parpadea
            molesta más que un hueco quieto del color de la página. */}
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Cargando"
              className="min-h-screen bg-slate-50 dark:bg-slate-950"
            />
          }
        >
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/recuperar" element={<ForgotPassword />} />
            <Route path="/restablecer" element={<ResetPassword />} />
            <Route path="/cuenta" element={<Account />} />
            <Route path="/guias" element={<Guides />} />
            <Route path="/guias/:slug" element={<GuideArticle />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
