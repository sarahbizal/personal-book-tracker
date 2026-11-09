import request from "supertest";
import { expect } from "vitest";
import { app } from "../src/app.js";

//Matches ADMIN_PASSWORD_HASH in .env.test
export const TEST_PASSWORD = "test-admin-password";

export type AdminAgent = ReturnType<typeof request.agent>;

export async function loginAsAdmin(): Promise<AdminAgent> {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/v1/auth/login")
    .send({ password: TEST_PASSWORD });
  expect(res.status).toBe(200);
  return agent;
}

//Deletes the session row so test runs don't pile up sessions
export async function logoutAdmin(agent: AdminAgent | undefined) {
  await agent?.post("/api/v1/auth/logout");
}
