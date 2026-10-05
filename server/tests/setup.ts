import { loadEnvFile } from "node:process";

loadEnvFile(".env.test");

if (!process.env.DATABASE_URL?.includes("_test")) {
  throw new Error(
    "Refusing to run tests: DATABASE_URL must point to a *_test database.",
  );
}
