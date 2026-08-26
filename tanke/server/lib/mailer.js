import nodemailer from "nodemailer";

// Resend por SMTP, el mismo transporte que ya usan Citaly y DanceFloor en el
// VPS (smtp.resend.com:587, dominio mail.javistudio.dev verificado).
//
// Sin SMTP_URL no se rompe nada: en desarrollo el enlace se imprime por
// consola, que es justo lo que hace falta para probar el flujo sin montar un
// Mailhog. En produccion la ausencia se avisa una sola vez al arrancar.
let transport = null;
let warned = false;

function getTransport() {
  const url = process.env.SMTP_URL;
  if (!url) return null;
  if (!transport) transport = nodemailer.createTransport(url);
  return transport;
}

export function appUrl() {
  return (process.env.APP_URL || "https://tanke.javistudio.dev").replace(/\/+$/, "");
}

export async function sendEmail({ to, subject, text, html }) {
  const mailer = getTransport();
  if (!mailer) {
    if (!warned) {
      warned = true;
      console.warn(
        "Tanke: SMTP_URL ausente — los emails se escriben en consola, no se envian.",
      );
    }
    console.log(`\n--- email para ${to} ---\n${subject}\n\n${text}\n---\n`);
    return { delivered: false };
  }

  const from = process.env.EMAIL_FROM || "Tanke <no-reply@mail.javistudio.dev>";
  await mailer.sendMail({ from, to, subject, text, html });
  return { delivered: true };
}

// Una sola plantilla para todo el correo transaccional: cabecera con la marca,
// un parrafo, un boton y el enlace en texto por si el cliente no pinta HTML.
function layout({ title, intro, ctaLabel, ctaUrl, outro }) {
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td style="background:#0f172a;padding:20px 28px">
      <span style="font-size:20px;font-weight:800;letter-spacing:-.5px;color:#ffffff">Tanke<span style="color:#818cf8">.</span></span>
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0f172a">${title}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#334155">${intro}</p>
      <a href="${ctaUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:10px">${ctaLabel}</a>
      <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748b">${outro}</p>
      <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;word-break:break-all">${ctaUrl}</p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#f8fafc;font-size:12px;color:#94a3b8">
      Tanke · precios oficiales del Ministerio para la Transicion Ecologica
    </td></tr>
  </table>
</body></html>`;
}

export function resetPasswordEmail({ name, url, minutes }) {
  return {
    subject: "Restablece tu contraseña de Tanke",
    text: `Hola ${name}:

Has pedido restablecer tu contraseña de Tanke. Abre este enlace y elige una nueva:

${url}

El enlace caduca en ${minutes} minutos y solo sirve una vez.

Si no has sido tú, ignora este correo: tu contraseña sigue siendo la de siempre.`,
    html: layout({
      title: `Hola ${name}`,
      intro:
        "Has pedido restablecer tu contraseña de Tanke. Pulsa el botón y elige una nueva.",
      ctaLabel: "Elegir contraseña nueva",
      ctaUrl: url,
      outro: `El enlace caduca en ${minutes} minutos y solo sirve una vez. Si no has sido tú, ignora este correo: tu contraseña sigue siendo la de siempre.`,
    }),
  };
}

export function passwordChangedEmail({ name, url }) {
  return {
    subject: "Tu contraseña de Tanke ha cambiado",
    text: `Hola ${name}:

Te confirmamos que la contraseña de tu cuenta de Tanke se ha cambiado y hemos cerrado el resto de sesiones.

Si no has sido tú, entra ahora y vuelve a cambiarla: ${url}`,
    html: layout({
      title: `Hola ${name}`,
      intro:
        "Te confirmamos que la contraseña de tu cuenta de Tanke se ha cambiado. Por seguridad hemos cerrado el resto de sesiones abiertas.",
      ctaLabel: "Ir a mi cuenta",
      ctaUrl: url,
      outro: "Si no has sido tú, entra ahora y vuelve a cambiarla cuanto antes.",
    }),
  };
}
