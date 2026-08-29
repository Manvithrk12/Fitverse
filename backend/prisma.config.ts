// Prisma 7 moved runtime/connection configuration out of schema.prisma and
// into this file. The CLI no longer auto-loads .env, so dotenv/config must
// be imported explicitly here.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
