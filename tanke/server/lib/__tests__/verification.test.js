import { describe, expect, it, vi } from "vitest";
import { hashToken } from "../auth.js";
import {
  VerificationError,
  consumeEmailVerification,
  issueEmailVerification,
  pendingEmailFor,
} from "../verification.js";

// Cliente de mentira con una sola fila de verificacion y un usuario. Sirve
// tanto de `prisma` como de `tx`: la transaccion ejecuta el callback tal cual.
function clientWith({ row = null, users = [] } = {}) {
  const state = { row, users: [...users], resetsDeleted: 0, created: null };
  const client = {
    state,
    $transaction: (fn) => fn(client),
    emailVerification: {
      deleteMany: vi.fn(async () => ({ count: state.row ? 1 : 0 })),
      create: vi.fn(async ({ data }) => {
        state.created = data;
        return { id: "v-1", ...data };
      }),
      findUnique: vi.fn(async ({ where }) =>
        state.row && state.row.tokenHash === where.tokenHash
          ? { ...state.row, user: state.users.find((u) => u.id === state.row.userId) }
          : null,
      ),
      findFirst: vi.fn(async () => (state.row && !state.row.usedAt ? state.row : null)),
      updateMany: vi.fn(async ({ where, data }) => {
        if (!state.row || state.row.id !== where.id || state.row.usedAt) return { count: 0 };
        state.row = { ...state.row, ...data };
        return { count: 1 };
      }),
    },
    user: {
      findUnique: vi.fn(async ({ where }) => state.users.find((u) => u.email === where.email) || null),
      update: vi.fn(async ({ where, data }) => {
        const user = state.users.find((u) => u.id === where.id);
        Object.assign(user, data);
        return user;
      }),
    },
    passwordReset: {
      deleteMany: vi.fn(async () => {
        state.resetsDeleted += 1;
        return { count: 1 };
      }),
    },
  };
  return client;
}

const owner = { id: "u-1", email: "ana@example.com", name: "Ana", active: true, emailVerifiedAt: null };

function rowFor(token, overrides = {}) {
  return {
    id: "v-1",
    tokenHash: hashToken(token),
    userId: "u-1",
    newEmail: null,
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    ...overrides,
  };
}

describe("issueEmailVerification", () => {
  it("guarda solo el hash del token y tira los enlaces pendientes anteriores", async () => {
    const client = clientWith();
    const token = await issueEmailVerification(client, { userId: "u-1" });

    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(client.emailVerification.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u-1", usedAt: null },
    });
    expect(client.state.created.tokenHash).toBe(hashToken(token));
    expect(client.state.created.tokenHash).not.toBe(token);
    expect(client.state.created.newEmail).toBeNull();
  });
});

describe("consumeEmailVerification", () => {
  it("marca la direccion como verificada y gasta el enlace", async () => {
    const client = clientWith({ row: rowFor("tok"), users: [{ ...owner }] });
    const { user, changedEmail } = await consumeEmailVerification(client, { token: "tok" });

    expect(user.emailVerifiedAt).toBeInstanceOf(Date);
    expect(changedEmail).toBe(false);
    expect(client.state.row.usedAt).toBeInstanceOf(Date);
    await expect(consumeEmailVerification(client, { token: "tok" })).rejects.toBeInstanceOf(
      VerificationError,
    );
  });

  it("aplica el cambio de email y borra los enlaces de recuperacion", async () => {
    const client = clientWith({
      row: rowFor("tok", { newEmail: "nueva@example.com" }),
      users: [{ ...owner }],
    });
    const { user, changedEmail } = await consumeEmailVerification(client, { token: "tok" });

    expect(user.email).toBe("nueva@example.com");
    expect(changedEmail).toBe(true);
    expect(client.state.resetsDeleted).toBe(1);
  });

  it("no aplica el cambio si otra cuenta ocupo la direccion entre medias", async () => {
    const client = clientWith({
      row: rowFor("tok", { newEmail: "nueva@example.com" }),
      users: [{ ...owner }, { id: "u-2", email: "nueva@example.com", active: true }],
    });
    await expect(consumeEmailVerification(client, { token: "tok" })).rejects.toMatchObject({
      code: "taken",
    });
    expect(client.user.update).not.toHaveBeenCalled();
  });

  it("rechaza enlaces caducados, gastados, de cuentas desactivadas o inventados", async () => {
    const casos = [
      clientWith({ row: rowFor("tok", { expiresAt: new Date(Date.now() - 1) }), users: [{ ...owner }] }),
      clientWith({ row: rowFor("tok", { usedAt: new Date() }), users: [{ ...owner }] }),
      clientWith({ row: rowFor("tok"), users: [{ ...owner, active: false }] }),
      clientWith({ row: rowFor("otro"), users: [{ ...owner }] }),
    ];
    for (const client of casos) {
      await expect(consumeEmailVerification(client, { token: "tok" })).rejects.toMatchObject({
        code: "invalid",
      });
      expect(client.user.update).not.toHaveBeenCalled();
    }
    await expect(consumeEmailVerification(casos[0], { token: "" })).rejects.toMatchObject({
      code: "invalid",
    });
  });
});

describe("pendingEmailFor", () => {
  it("devuelve la direccion nueva pendiente o null", async () => {
    const con = clientWith({ row: rowFor("tok", { newEmail: "nueva@example.com" }) });
    expect(await pendingEmailFor(con, "u-1")).toBe("nueva@example.com");

    const sin = clientWith();
    expect(await pendingEmailFor(sin, "u-1")).toBeNull();
  });
});
