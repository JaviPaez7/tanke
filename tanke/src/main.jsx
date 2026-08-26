import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import Account from "./pages/Account.jsx";
import Admin from "./pages/Admin.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import GuideArticle from "./pages/GuideArticle.jsx";
import Guides from "./pages/Guides.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";
import Register from "./pages/Register.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
