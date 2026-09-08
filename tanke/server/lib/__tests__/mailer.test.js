import { describe, expect, it } from "vitest";
import { priceAlertEmail, resetPasswordEmail } from "../mailer.js";

describe("plantillas de correo", () => {
  it("escapa el nombre en el HTML de recuperación", () => {
    const malicious = '<a href="https://example.invalid">Verificar</a>';
    const message = resetPasswordEmail({
      name: malicious,
      url: "https://tanke.example/restablecer?token=abc&from=email",
      minutes: 30,
    });

    expect(message.html).not.toContain(malicious);
    expect(message.html).toContain("&lt;a href=&quot;");
    expect(message.html).toContain("token=abc&amp;from=email");
  });

  it("escapa nombre, zona y estación en una alerta", () => {
    const message = priceAlertEmail({
      name: "<b>Nombre</b>",
      url: "https://tanke.example/cuenta?tab=alertas&from=email",
      alerts: [
        {
          fuelLabel: "GLP",
          municipality: "<i>Telde</i>",
          province: "Las Palmas",
          currentMin: 0.9,
          threshold: 1,
          stationName: "<a>Estación</a>",
        },
      ],
    });

    expect(message.html).not.toContain("<b>Nombre</b>");
    expect(message.html).not.toContain("<i>Telde</i>");
    expect(message.html).not.toContain("<a>Estación</a>");
  });
});
