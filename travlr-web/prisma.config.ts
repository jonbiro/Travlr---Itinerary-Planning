import { config as loadEnvironment } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js uses .env.local for local secrets, while the Prisma CLI only loads
// .env by default. Load both without replacing variables already set by CI.
loadEnvironment({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
