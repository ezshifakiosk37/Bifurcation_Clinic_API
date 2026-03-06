import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/app/_utils/db/schema.ts", // path to your schema
  out: "./drizzle", // where migration files will go
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
});
