import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const databaseUrl = new URL(connectionString);
const sslMode = databaseUrl.searchParams.get("sslmode");
if (sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
  databaseUrl.searchParams.set("sslmode", "verify-full");
}

const adapter = new PrismaPg({
  connectionString: databaseUrl.toString(),
});

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
