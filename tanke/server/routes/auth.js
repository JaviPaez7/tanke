import { prisma, requireDb } from "../db.js";
import {
  SESSION_COOKIE,
  changePasswordAndRevoke,
  consumePasswordReset,
  cookieOptions,
  createSession,
  destroySession,
  hashPassword,
  hashToken,
  isEmail,
  newSessionToken,
  passwordProblem,
  publicUser,
  rateLimit,
  requireAuth,
  updateUserAndInvalidateResets,
  verifyPassword,
  userKey,
  wrap,
} from "../lib/auth.js";
import {
  appUrl,
  passwordChangedEmail,
  resetPasswordEmail,
  sendEmail,
} from "../lib/mailer.js";
import {
  VerificationError,
  consumeEmailVerification,
  pendingEmailFor,
  sendVerificationEmail,
} from "../lib/verification.js";

const RESET_MINUTES = 30;

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
      const problem = await passwordProblem(password, { email });
      if (problem) return res.status(400).json({ error: problem });

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

      // La cuenta se usa desde ya; el enlace solo hace falta para recibir
      // correos. Si el envio falla no se bloquea el alta: hay "reenviar".
      try {
        await sendVerificationEmail(prisma, user);
      } catch (error) {
        console.error("Verification email:", error.message);
      }

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

      // Un campo vacío no es un intento de entrar: decirlo no revela nada
      // sobre qué cuentas existen, y ahorra el bcrypt de relleno.
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Introduce tu e-mail y tu contraseña." });
      }

      const user = await prisma.user.findUnique({ where: { email } });
      // Se compara siempre, exista o no la cuenta: ver verifyPassword.
      const ok = await verifyPassword(password, user?.passwordHash);
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

  app.get(
    "/api/auth/me",
    requireDb,
    wrap(async (req, res) => {
      const pendingEmail = req.user ? await pendingEmailFor(prisma, req.user.id) : null;
      res.json({ user: publicUser(req.user), pendingEmail });
    }),
  );

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
      // Y no cambia en el acto: se confirma desde la direccion nueva, con
      // aviso a la antigua. Hasta entonces la cuenta sigue con la de siempre.
      const email = String(req.body?.email || "")
        .trim()
        .toLowerCase();
      let pendingEmail = null;
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
        pendingEmail = email;
      }

      const user = await updateUserAndInvalidateResets(prisma, req.user.id, data);
      if (pendingEmail) {
        await sendVerificationEmail(prisma, user, { newEmail: pendingEmail });
      }
      res.json({
        user: publicUser(user),
        pendingEmail: pendingEmail || (await pendingEmailFor(prisma, user.id)),
      });
    }),
  );

  // Sin sesion a proposito: el enlace puede abrirse desde otro dispositivo y
  // solo confirma la direccion, no da acceso a la cuenta.
  app.post(
    "/api/auth/verify",
    requireDb,
    rateLimit({ max: 10 }),
    wrap(async (req, res) => {
      try {
        const { user, changedEmail } = await consumeEmailVerification(prisma, {
          token: String(req.body?.token || ""),
        });
        res.json({ user: publicUser(user), changedEmail });
      } catch (error) {
        if (error instanceof VerificationError) {
          return res.status(error.code === "taken" ? 409 : 400).json({ error: error.message });
        }
        throw error;
      }
    }),
  );

  // Reenvia el enlace pendiente: el de la direccion nueva si hay un cambio a
  // medias, o el de la actual si aun no esta verificada.
  app.post(
    "/api/auth/verify/resend",
    requireDb,
    requireAuth,
    rateLimit({ windowMs: 10 * 60_000, max: 3, key: userKey }),
    wrap(async (req, res) => {
      const pendingEmail = await pendingEmailFor(prisma, req.user.id);
      if (!pendingEmail && req.user.emailVerifiedAt) {
        return res.status(400).json({ error: "Tu email ya está verificado." });
      }
      await sendVerificationEmail(prisma, req.user, { newEmail: pendingEmail });
      res.json({ ok: true, sentTo: pendingEmail || req.user.email });
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
    rateLimit({ max: 20 }),
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

      const problem = await passwordProblem(password, { email: reset.user.email });
      if (problem) return res.status(400).json({ error: problem });

      const passwordHash = await hashPassword(password);
      const changedUser = await consumePasswordReset(prisma, {
        resetId: reset.id,
        userId: reset.userId,
        passwordHash,
      });

      if (!changedUser) {
        return res.status(400).json({
          error: "El enlace ya no es válido. Pide uno nuevo.",
        });
      }

      const sessionToken = await createSession(reset.userId);
      res.cookie(SESSION_COOKIE, sessionToken, cookieOptions());
      res.json({ user: publicUser(changedUser) });
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

      const problem = await passwordProblem(next, { email: req.user.email });
      if (problem) return res.status(400).json({ error: problem });
      if (!(await verifyPassword(current, req.user.passwordHash))) {
        return res.status(401).json({ error: "La contraseña actual no es correcta." });
      }
      if (current === next) {
        return res
          .status(400)
          .json({ error: "La contraseña nueva tiene que ser distinta de la actual." });
      }

      const changed = await changePasswordAndRevoke(prisma, {
        userId: req.user.id,
        passwordHash: await hashPassword(next),
        keepToken: req.cookies?.[SESSION_COOKIE],
      });

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

      res.json({ ok: true, closedSessions: changed.closedSessions });
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
