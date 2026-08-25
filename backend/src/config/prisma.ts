import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

declare global {
  var __fitversePrisma: PrismaClient | undefined;
}

const adapter = new PrismaPg({ connectionString: env.databaseUrl });

export const prisma = global.__fitversePrisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.__fitversePrisma = prisma;
}