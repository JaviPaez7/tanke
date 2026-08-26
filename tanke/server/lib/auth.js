import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";

export const SESSION_COOKIE = "tanke_session";
const SESSION_DAYS = 30;

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionToken() {
  return randomBytes(32).toString("hex");
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function createSession(userId) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  });
  return token;
}

// Cambiar la contrasena tiene que echar a quien estuviera dentro con la
// anterior. `keepToken` deja viva la sesion desde la que se hace el cambio para
// no auto-expulsar a quien lo pide.
export async function revokeSessions(userId, keepToken) {
  const where = { userId };
  if (keepToken) where.NOT = { tokenHash: hashToken(keepToken) };
  const { count } = await prisma.session.deleteMany({ where });
  return count;
}

// Las sesiones caducadas solo se borraban al tropezar con ellas en un login.
// La tabla crecia sin techo; esto la mantiene al dia desde el job de fondo.
export async function purgeExpiredSessions() {
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}

export async function destroySession(token) {
  if (!token || !prisma) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}

export async function userFromRequest(req) {
  if (!prisma) return null;
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  if (!session.user.active) return null;
  return session.user;
}

export function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Inicia sesión para continuar." });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Inicia sesión para continuar." });
  }
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "No tienes permiso de administración." });
  }
  next();
}

export async function attachUser(req, _res, next) {
  try {
    req.user = await userFromRequest(req);
    next();
  } catch (error) {
    next(error);
  }
}

// Cada limitador lleva su propio recuento. Antes todos compartian un unico
// Map de modulo, asi que los intentos de login gastaban el cupo de registro y
// el de recuperar contraseña: bastaba con equivocarse de contraseña unas veces
// para no poder ni pedir el enlace de recuperacion.
//
// El Map tampoco soltaba nunca las IPs que ya habian cumplido su ventana, y eso
// crecia sin techo; el barrido las suelta como mucho una vez por minuto, que es
// barato y acota la memoria al trafico real.
export function rateLimit({ windowMs = 60_000, max = 8 } = {}) {
  const hits = new Map();
  let lastSweep = 0;

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();

    if (now - lastSweep >= 60_000) {
      lastSweep = now;
      for (const [key, times] of hits) {
        if (times.every((t) => now - t >= windowMs)) hits.delete(key);
      }
    }

    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      return res
        .status(429)
        .json({ error: "Demasiados intentos. Espera un minuto." });
    }
    recent.push(now);
    hits.set(ip, recent);
    next();
  };
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
