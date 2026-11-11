import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

//Vitest loads app fresh for each test file, so this file starts with a full budget
describe("global rate limit", () => {
  it("blocks the 301st API request with a 429, Retry-After, and our error shape, but not /health", async () => {
    for (let i = 0; i < 300; i++) {
      const res = await request(app).get("/api/v1/auth/me");
      expect(res.status).toBe(200);
    }

    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "Too many requests. Try again later" });
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);

    expect((await request(app).get("/health")).status).toBe(200);
  });
});
