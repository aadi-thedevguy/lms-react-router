import { defineConfig } from 'drizzle-kit';

console.log(process.env.DATABASE_URL)
export default defineConfig({
  out: "./app/drizzle/migrations",
  schema: "./app/drizzle/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    },
})


