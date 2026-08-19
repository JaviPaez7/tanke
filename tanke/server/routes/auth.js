import { prisma, requireDb } from "../db.js";
import {
  SESSION_COOKIE,
  cookieOptions,
  createSession,
  destroySession,
  hashPassword,
  isEmail,
  publicUser,
  rateLimit,
  requireAuth,
  verifyPassword,
  wrap,
} from "../lib/auth.js";

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
      const user = await prisma.user.update({
        where: { id: req.user.id },
        data: { name },
      });
      res.json({ user: publicUser(user) });
    }),
  );
}
