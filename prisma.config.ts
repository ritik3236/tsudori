import path from "node:path"

import { config as loadEnv } from "dotenv"
import { defineConfig, env } from "prisma/config"

// Prisma 7 no longer auto-loads .env when evaluating this config file.
loadEnv()

// Prisma 7 keeps connection + migration config out of schema.prisma and here
// instead. Migrations run against the DIRECT (non-pooled) connection; the
// runtime client uses the pooled DATABASE_URL via a driver adapter (src/lib/prisma.ts).
export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations use the direct (non-pooled) connection. Prisma auto-creates a
    // temporary shadow database for dev migrations (neondb_owner has CREATEDB).
    url: env("DIRECT_URL"),
  },
})
