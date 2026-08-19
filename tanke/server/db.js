import { PrismaClient } from "@prisma/client";

export const prisma = process.env.DATABASE_URL
  ? new PrismaClient()
  : null;

export function requireDb(_req, res, next) {
  if (!prisma) {
    return res.status(503).json({
      error: "La cuenta aún no está disponible. Falta la base de datos.",
    });
  }
  next();
}
