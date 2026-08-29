import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

// Reuse a single PrismaClient instance across the app (and across hot
// reloads in dev) instead of opening a new connection pool per import.
declare global {
  // eslint-disable-next-line no-var
  var __fitversePrisma: PrismaClient | undefined;
}

// Prisma 7's rust-free client requires an explicit driver adapter rather
// than reading the connection string internally.
const adapter = new PrismaPg({ connectionString: env.databaseUrl });

export const prisma = global.__fitversePrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.__fitversePrisma = prisma;
}
