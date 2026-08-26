import { prisma, requireDb } from "../db.js";
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  destroySession,
  hashPassword,
  hashToken,
  isEmail,
  newSessionToken,
  publicUser,
  rateLimit,
  requireAuth,
  revokeSessions,
  verifyPassword,
  wrap,
} from "../lib/auth.js";
import {
  appUrl,
  passwordChangedEmail,
  resetPasswordEmail,
  sendEmail,
} from "../lib/mailer.js";

const RESET_MINUTES = 30;

function passwordProblem(password) {
  if (String(password || "").length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  return null;
}

export function registerAuthRoutes(app) {
  app.post(
    "/api/auth/register",
    requireDb,
    rateLimit({ max: 6 }),
    wrap(async (req, res) => {
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      const name = String(req.body?.name || "").trim();
      const password = String(req.body?.password || "");

      if (!isEmail(email)) {
        return res.status(400).json({ error: "El email no es válido." });
      }
      if (name.length < 2 || name.length > 60) {
        return res
          .status(400)
          .json({ error: "El nombre debe tener entre 2 y 60 caracteres." });
      }
      if (password.length < 8) {
        return res
          .status(400)
          .json({ error: "La contraseña debe tener al menos 8 caracteres." });
      }

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) {
        return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
      }

      const user = await prisma.user.create({
        data: {
          email,
          name,
          passwordHash: await hashPassword(password),
        },
      });

      const token = await createSession(user.id);
      res.cookie(SESSION_COOKIE, token, cookieOptions());
      res.status(201).json({ user: publicUser(user) });
    }),
  );

  app.post(
    "/api/auth/login",
    requireDb,
    rateLimit({ max: 10 }),
    wrap(async (req, res) => {
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      const password = String(req.body?.password || "");

      const user = await prisma.user.findUnique({ where: { email } });
      const ok = user && (await verifyPassword(password, user.passwordHash));
      if (!ok) {
        return res.status(401).json({ error: "Email o contraseña incorrectos." });
      }
      if (!user.active) {
        return res.status(403).json({ error: "Esta cuenta está desactivada." });
      }

      const token = await createSession(user.id);
      res.cookie(SESSION_COOKIE, token, cookieOptions());
      res.json({ user: publicUser(user) });
    }),
  );

  app.post(
    "/api/auth/logout",
    wrap(async (req, res) => {
      await destroySession(req.cookies?.[SESSION_COOKIE]);
      res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: 0 });
      res.json({ ok: true });
    }),
  );

  app.get("/api/auth/me", requireDb, (req, res) => {
    res.json({ user: publicUser(req.user) });
  });

  app.patch(
    "/api/auth/me",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const name = String(req.body?.name || "").trim();
      if (name.length < 2 || name.length > 60) {
        return res
          .status(400)
          .json({ error: "El nombre debe tener entre 2 y 60 caracteres." });
      }

      const data = { name };

      // El email solo se toca si de verdad cambia, y siempre con la contraseña
      // delante: es la direccion a la que llega el enlace de recuperacion, asi
      // que dejarla abierta convertiria una sesion robada en un secuestro.
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      if (email && email !== req.user.email) {
        if (!isEmail(email)) {
          return res.status(400).json({ error: "El email no es válido." });
        }
        if (!(await verifyPassword(String(req.body?.password || ""), req.user.passwordHash))) {
          return res
            .status(401)
            .json({ error: "Escribe tu contraseña para cambiar el email." });
        }
        const taken = await prisma.user.findUnique({ where: { email } });
        if (taken) {
          return res.status(409).json({ error: "Ya existe una cuenta con ese email." });
        }
        data.email = email;
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data,
      });
      res.json({ user: publicUser(user) });
    }),
  );

  // Responde siempre igual exista o no la cuenta: si distinguiera, cualquiera
  // podria usar este endpoint para averiguar que emails estan registrados.
  app.post(
    "/api/auth/forgot",
    requireDb,
    rateLimit({ max: 5 }),
    wrap(async (req, res) => {
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();

      const ok = {
        ok: true,
        message:
          "Si ese email tiene cuenta en Tanke, te hemos enviado un enlace para restablecer la contraseña.",
      };
      if (!isEmail(email)) return res.json(ok);

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.active) return res.json(ok);

      // Un enlace pedido de nuevo invalida los anteriores.
      await prisma.passwordReset.deleteMany({
        where: { userId: user.id, usedAt: null },
      });

      const token = newSessionToken();
      await prisma.passwordReset.create({
        data: {
          tokenHash: hashToken(token),
          userId: user.id,
          expiresAt: new Date(Date.now() + RESET_MINUTES * 60 * 1000),
        },
      });

      const url = `${appUrl()}/restablecer?token=${token}`;
      try {
        await sendEmail({
          to: user.email,
          ...resetPasswordEmail({
            name: user.name,
            url,
            minutes: RESET_MINUTES,
          }),
        });
      } catch (error) {
        console.error("Reset email:", error.message);
      }

      res.json(ok);
    }),
  );

  // Comprueba el token sin gastarlo, para que /restablecer pueda avisar de que
  // el enlace ya no vale antes de que el usuario escriba nada.
  app.get(
    "/api/auth/reset",
    requireDb,
    wrap(async (req, res) => {
      const token = String(req.query?.token || "");
      const reset = token
        ? await prisma.passwordReset.findUnique({
            where: { tokenHash: hashToken(token) },
            include: { user: true },
          })
        : null;

      const valid =
        !!reset && !reset.usedAt && reset.expiresAt > new Date() && reset.user.active;
      res.json({ valid, name: valid ? reset.user.name : null });
    }),
  );

  app.post(
    "/api/auth/reset",
    requireDb,
    rateLimit({ max: 10 }),
    wrap(async (req, res) => {
      const token = String(req.body?.token || "");
      const password = String(req.body?.password || "");

      const problem = passwordProblem(password);
      if (problem) return res.status(400).json({ error: problem });

      const reset = token
        ? await prisma.passwordReset.findUnique({
            where: { tokenHash: hashToken(token) },
            include: { user: true },
          })
        : null;

      if (!reset || reset.usedAt || reset.expiresAt < new Date() || !reset.user.active) {
        return res.status(400).json({
          error: "El enlace ya no es válido. Pide uno nuevo.",
        });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: reset.userId },
          data: { passwordHash: await hashPassword(password) },
        }),
        prisma.passwordReset.update({
          where: { id: reset.id },
          data: { usedAt: new Date() },
        }),
        // Quien conociera la contraseña vieja queda fuera.
        prisma.session.deleteMany({ where: { userId: reset.userId } }),
      ]);

      const sessionToken = await createSession(reset.userId);
      res.cookie(SESSION_COOKIE, sessionToken, cookieOptions());
      res.json({ user: publicUser(reset.user) });
    }),
  );

  app.post(
    "/api/auth/password",
    requireDb,
    requireAuth,
    rateLimit({ max: 10 }),
    wrap(async (req, res) => {
      const current = String(req.body?.currentPassword || "");
      const next = String(req.body?.newPassword || "");

      const problem = passwordProblem(next);
      if (problem) return res.status(400).json({ error: problem });
      if (!(await verifyPassword(current, req.user.passwordHash))) {
        return res.status(401).json({ error: "La contraseña actual no es correcta." });
      }
      if (current === next) {
        return res
          .status(400)
          .json({ error: "La contraseña nueva tiene que ser distinta de la actual." });
      }

      await prisma.user.update({
        where: { id: req.user.id },
        data: { passwordHash: await hashPassword(next) },
      });
      // Se conserva la sesion actual: cambiar la contraseña no deberia echarte
      // a ti mismo de la pagina en la que estas.
      const closed = await revokeSessions(req.user.id, req.cookies?.[SESSION_COOKIE]);

      try {
        await sendEmail({
          to: req.user.email,
          ...passwordChangedEmail({
            name: req.user.name,
            url: `${appUrl()}/cuenta?tab=ajustes`,
          }),
        });
      } catch (error) {
        console.error("Password changed email:", error.message);
      }

      res.json({ ok: true, closedSessions: closed });
    }),
  );

  app.delete(
    "/api/auth/me",
    requireDb,
    requireAuth,
    wrap(async (req, res) => {
      const password = String(req.body?.password || "");
      if (!(await verifyPassword(password, req.user.passwordHash))) {
        return res
          .status(401)
          .json({ error: "Escribe tu contraseña para confirmar que eres tú." });
      }
      if (req.user.role === "admin") {
        return res.status(403).json({
          error:
            "Una cuenta de administración no se borra desde aquí. Quítale el rol primero.",
        });
      }

      // El resto de tablas cuelga de User con onDelete: Cascade.
      await prisma.user.delete({ where: { id: req.user.id } });
      res.clearCookie(SESSION_COOKIE, { ...cookieOptions(), maxAge: 0 });
      res.json({ ok: true });
    }),
  );
}
