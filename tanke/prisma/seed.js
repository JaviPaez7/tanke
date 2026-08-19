import "dotenv/config";
import { bootstrap } from "../server/bootstrap.js";
import { prisma } from "../server/db.js";

if (!prisma) {
  console.error("DATABASE_URL no definida");
  process.exit(1);
}

await bootstrap(prisma);
await prisma.$disconnect();
