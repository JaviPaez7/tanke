import { describe, expect, it, vi } from "vitest";
import {
  changePasswordAndRevoke,
  consumePasswordReset,
  hashToken,
  updateUserAndInvalidateResets,
} from "../auth.js";

function transactionClient(overrides = {}) {
  const tx = {
    user: {
      update: vi.fn(async ({ data }) => ({ id: "user-1", active: true, ...data })),
    },
    passwordReset: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    session: {
      deleteMany: vi.fn(async () => ({ count: 2 })),
    },
    ...overrides,
  };
  return {
    tx,
    client: { $transaction: (fn) => fn(tx) },
  };
}

describe("seguridad de cuenta", () => {
  it("invalida recuperaciones pendientes al cambiar el email", async () => {
    const { client, tx } = transactionClient();
    await updateUserAndInvalidateResets(client, "user-1", {
      name: "Javi",
      email: "nuevo@example.com",
    });

    expect(tx.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("consume el token con condición de un solo uso antes de cambiar la contraseña", async () => {
    const now = new Date("2026-09-08T12:00:00Z");
    const { client, tx } = transactionClient();
    await consumePasswordReset(client, {
      resetId: "reset-1",
      userId: "user-1",
      passwordHash: "new-hash",
      now,
    });

    expect(tx.passwordReset.updateMany).toHaveBeenCalledWith({
      where: { id: "reset-1", usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    expect(tx.user.update).toHaveBeenCalledTimes(1);
  });

  it("no cambia contraseña ni sesiones si otro proceso consumió el token", async () => {
    const { client, tx } = transactionClient({
      passwordReset: {
        deleteMany: vi.fn(),
        updateMany: vi.fn(async () => ({ count: 0 })),
      },
    });

    const result = await consumePasswordReset(client, {
      resetId: "reset-1",
      userId: "user-1",
      passwordHash: "new-hash",
    });
    expect(result).toBeNull();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.session.deleteMany).not.toHaveBeenCalled();
  });

  it("al cambiar contraseña invalida resets y conserva solo la sesión actual", async () => {
    const { client, tx } = transactionClient();
    const result = await changePasswordAndRevoke(client, {
      userId: "user-1",
      passwordHash: "new-hash",
      keepToken: "current-token",
    });

    expect(tx.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        NOT: { tokenHash: hashToken("current-token") },
      },
    });
    expect(result.closedSessions).toBe(2);
  });
});
