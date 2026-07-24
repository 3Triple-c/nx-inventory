import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";
import path from "node:path";

config({
  path: path.resolve(process.cwd(), "../../.env"),
});

export default defineConfig({
  schema: "prisma/schema",

  migrations: {
    path: "prisma/migrations",
  },

  datasource: {
    url: env("DATABASE_URL"),
  },
});