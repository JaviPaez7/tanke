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

export function priceAlertEmail({ name, alerts, url }) {
  const zona = (a) => a.municipality || a.province;
  const linea = (a) =>
    `${a.fuelLabel} en ${zona(a)}: ${a.currentMin.toFixed(3).replace(".", ",")} €/L` +
    ` (tu tope: ${a.threshold.toFixed(3).replace(".", ",")} €/L) — ${a.stationName}`;

  const uno = alerts.length === 1;
  const subject = uno
    ? `${alerts[0].fuelLabel} a ${alerts[0].currentMin.toFixed(3).replace(".", ",")} € en ${zona(alerts[0])}`
    : `${alerts.length} de tus alertas de precio han saltado`;

  const filas = alerts
    .map(
      (a) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0">
          <div style="font-weight:700;color:#0f172a">${a.fuelLabel} en ${zona(a)}</div>
          <div style="font-size:13px;color:#64748b">${a.stationName}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;text-align:right;white-space:nowrap">
          <div style="font-weight:800;color:#16a34a;font-size:18px">${a.currentMin.toFixed(3).replace(".", ",")} €</div>
          <div style="font-size:12px;color:#94a3b8">tope ${a.threshold.toFixed(3).replace(".", ",")} €</div>
        </td>
      </tr>`,
    )
    .join("");

  return {
    subject,
    text: `Hola ${name}:

${uno ? "Una de tus alertas ha saltado" : "Estas alertas han saltado"}:

${alerts.map(linea).join("\n")}

Míralas en ${url}

Para dejar de recibir estos avisos, desactiva la alerta en tu cuenta.`,
    html: `<!doctype html>
<html lang="es"><body style="margin:0;padding:24px;background:#f1f5f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden">
    <tr><td style="background:#0f172a;padding:20px 28px">
      <span style="font-size:20px;font-weight:800;letter-spacing:-.5px;color:#ffffff">Tanke<span style="color:#818cf8">.</span></span>
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0f172a">Hoy puedes llenar más barato</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155">Hola ${name}, ${uno ? "una de tus alertas ha saltado" : "estas alertas han saltado"}:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${filas}</table>
      <a href="${url}" style="display:inline-block;margin-top:22px;background:#4f46e5;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:10px">Ver mis alertas</a>
      <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#64748b">Para dejar de recibir estos avisos, desactiva la alerta en tu cuenta.</p>
    </td></tr>
    <tr><td style="padding:16px 28px;background:#f8fafc;font-size:12px;color:#94a3b8">
      Tanke · precios oficiales del Ministerio para la Transicion Ecologica
    </td></tr>
  </table>
</body></html>`,
  };
}
