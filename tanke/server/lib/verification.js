import { hashToken, newSessionToken } from "./auth.js";
import { appUrl, emailChangeNoticeEmail, sendEmail, verifyEmailEmail } from "./mailer.js";

export const VERIFY_HOURS = 24;

// Por que no se abre sesion desde el enlace: un correo reenviado o un buzon
// compartido no deberian dar acceso a la cuenta. El enlace solo confirma que
// quien lo abre lee esa direccion.

export class VerificationError extends Error {
  constructor(code) {
    super(
      code === "taken"
        ? "Ese email ya pertenece a otra cuenta. Elige otro desde tus ajustes."
        : "El enlace ya no es válido. Pide uno nuevo desde tu cuenta.",
    );
    this.name = "VerificationError";
    this.code = code;
  }
}

/**
 * Crea un enlace nuevo para el usuario e invalida los anteriores que siguieran
 * pendientes. Con `newEmail`, el enlace confirma un cambio de direccion en vez
 * de la actual. Devuelve el token en claro (en la base solo va su hash).
 */
export async function issueEmailVerification(client, { userId, newEmail = null }) {
  await client.emailVerification.deleteMany({ where: { userId, usedAt: null } });
  const token = newSessionToken();
  await client.emailVerification.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      newEmail,
      expiresAt: new Date(Date.now() + VERIFY_HOURS * 60 * 60 * 1000),
    },
  });
  return token;
}

/**
 * Gasta el enlace y marca la direccion como verificada. Si el enlace llevaba
 * un cambio de email, lo aplica en la misma transaccion (y tira los enlaces
 * de recuperacion: iban a la direccion antigua). Si la direccion nueva se
 * ocupo entre medias, lanza `taken` y no queda nada a medias.
 */
export async function consumeEmailVerification(client, { token, now = new Date() }) {
  const row = token
    ? await client.emailVerification.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { user: true },
      })
    : null;
  if (!row || row.usedAt || row.expiresAt < now || !row.user.active) {
    throw new VerificationError("invalid");
  }

  return client.$transaction(async (tx) => {
    const consumed = await tx.emailVerification.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) throw new VerificationError("invalid");

    const data = { emailVerifiedAt: now };
    if (row.newEmail) {
      const taken = await tx.user.findUnique({
        where: { email: row.newEmail },
        select: { id: true },
      });
      if (taken && taken.id !== row.userId) throw new VerificationError("taken");
      data.email = row.newEmail;
      await tx.passwordReset.deleteMany({ where: { userId: row.userId } });
    }

    const user = await tx.user.update({ where: { id: row.userId }, data });
    return { user, changedEmail: Boolean(row.newEmail) };
  });
}

/** Direccion nueva pendiente de confirmar, si la hay. */
export async function pendingEmailFor(client, userId, now = new Date()) {
  const row = await client.emailVerification.findFirst({
    where: { userId, usedAt: null, expiresAt: { gt: now }, newEmail: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { newEmail: true },
  });
  return row?.newEmail || null;
}

/**
 * Emite el enlace y manda el correo. Con `newEmail` escribe a la direccion
 * nueva para confirmarla y avisa a la antigua de que alguien ha pedido el
 * cambio: si no fue el titular, es su oportunidad de reaccionar.
 */
export async function sendVerificationEmail(client, user, { newEmail = null } = {}) {
  const token = await issueEmailVerification(client, { userId: user.id, newEmail });
  const url = `${appUrl()}/verificar?token=${token}`;

  await sendEmail({
    to: newEmail || user.email,
    ...verifyEmailEmail({ name: user.name, url, hours: VERIFY_HOURS, newEmail }),
  });

  if (newEmail) {
    await sendEmail({
      to: user.email,
      ...emailChangeNoticeEmail({
        name: user.name,
        newEmail,
        url: `${appUrl()}/cuenta?tab=ajustes`,
      }),
    });
  }
}
