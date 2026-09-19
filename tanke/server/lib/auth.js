import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { rateLimit as expressRateLimit, ipKeyGenerator } from "express-rate-limit";
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
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Hash de relleno para cuando la cuenta no existe: el login tardaba unos
// milisegundos menos si el email no estaba registrado, y con eso se podia
// averiguar que emails tienen cuenta midiendo tiempos.
const DUMMY_HASH = bcrypt.hashSync("tanke-cuenta-inexistente", 10);

export async function verifyPassword(password, passwordHash) {
  const ok = await bcrypt.compare(String(password || ""), passwordHash || DUMMY_HASH);
  return Boolean(passwordHash) && ok;
}

export const PASSWORD_MIN = 8;
// bcrypt solo mira los primeros 72 bytes; el tope evita que alguien pegue un
// texto enorme y crea que todo cuenta.
export const PASSWORD_MAX = 128;

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";

/**
 * Consulta Have I Been Pwned por rango k-anonimo: solo viajan los 5 primeros
 * caracteres del SHA-1, nunca la contraseña. Si el servicio no responde se
 * acepta la contraseña (fail-open) y se deja aviso: bloquear registros porque
 * un tercero este caido seria peor que saltarse la comprobacion una vez.
 */
export async function isPwnedPassword(password, { fetchImpl = fetch } = {}) {
  const sha1 = createHash("sha1").update(String(password)).digest("hex").toUpperCase();
  const prefix = sha1.slice(0, 5);
  const suffix = sha1.slice(5);
  try {
    const res = await fetchImpl(HIBP_RANGE_URL + prefix, {
      headers: { "Add-Padding": "true", "User-Agent": "Tanke (tanke.javistudio.dev)" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`HIBP respondio ${res.status}`);
    const text = await res.text();
    // Con Add-Padding llegan filas falsas con recuento 0: no cuentan.
    return text.split("\n").some((line) => {
      const [hash, count] = line.trim().split(":");
      return hash === suffix && Number(count) > 0;
    });
  } catch (error) {
    console.warn("HIBP no disponible; contraseña aceptada sin comprobar:", error.message);
    return false;
  }
}

/**
 * Unica politica de contraseñas para registro, restablecer y cambiar. Devuelve
 * el mensaje para la persona o null si vale.
 */
export async function passwordProblem(password, { email, checkPwned = isPwnedPassword } = {}) {
  const value = String(password || "");
  if (value.length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
  }
  if (value.length > PASSWORD_MAX) {
    return `La contraseña no puede pasar de ${PASSWORD_MAX} caracteres.`;
  }
  const local = String(email || "").split("@")[0].trim().toLowerCase();
  if (local.length >= 4 && value.toLowerCase().includes(local)) {
    return "La contraseña no puede contener tu email.";
  }
  if (await checkPwned(value)) {
    return "Esa contraseña aparece en filtraciones de datos conocidas. Elige otra.";
  }
  return null;
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

export async function updateUserAndInvalidateResets(client, userId, data) {
  return client.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: userId }, data });
    if (data.email) {
      await tx.passwordReset.deleteMany({ where: { userId } });
    }
    return user;
  });
}

export async function consumePasswordReset(
  client,
  { resetId, userId, passwordHash, now = new Date() },
) {
  return client.$transaction(async (tx) => {
    const consumed = await tx.passwordReset.updateMany({
      where: { id: resetId, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) return null;

    const user = await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await tx.session.deleteMany({ where: { userId } });
    // Un cambio de email pendiente pudo pedirlo quien tuviera la sesion
    // robada: recuperar la cuenta lo anula.
    await tx.emailVerification.deleteMany({ where: { userId, usedAt: null } });
    return user;
  });
}

export async function changePasswordAndRevoke(
  client,
  { userId, passwordHash, keepToken },
) {
  const sessionWhere = { userId };
  if (keepToken) sessionWhere.NOT = { tokenHash: hashToken(keepToken) };

  return client.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    await tx.passwordReset.deleteMany({ where: { userId } });
    await tx.emailVerification.deleteMany({ where: { userId, usedAt: null } });
    const closed = await tx.session.deleteMany({ where: sessionWhere });
    return { user, closedSessions: closed.count };
  });
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

// Limitador sobre express-rate-limit: cabeceras RateLimit-*, barrido de la
// memoria y clave configurable. Cada llamada crea su propio recuento, asi que
// equivocarse de contraseña no gasta el cupo de registro ni el de recuperar.
//
// `key` permite limitar por usuario en vez de por IP (escrituras de /api/me);
// si no hay usuario cae a la IP. Store en memoria: hay un solo proceso; si
// algun dia hay varios, express-rate-limit acepta un store de Redis.
export function rateLimit({
  windowMs = 60_000,
  max = 8,
  key,
  message = "Demasiados intentos. Espera un minuto.",
} = {}) {
  return expressRateLimit({
    windowMs,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    keyGenerator: (req) => {
      const custom = key?.(req);
      return custom ? String(custom) : ipKeyGenerator(req.ip || "unknown");
    },
    handler: (_req, res) => {
      res.status(429).json({ error: message });
    },
  });
}

// Clave por usuario para las rutas que ya pasan por requireAuth.
export function userKey(req) {
  return req.user?.id ? `user:${req.user.id}` : null;
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
