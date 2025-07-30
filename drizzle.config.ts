'use server'

import { defineConfig } from "drizzle-kit";
import 'dotenv/config'

export default defineConfig({
  schema: "./drizzle/schema.tsx",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!
  }
});