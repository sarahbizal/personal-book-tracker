import { createHash } from "node:crypto";
import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { createAuth } from "../src/auth.js";
import { db } from "../prisma/db.js";
import { TEST_PASSWORD } from "./helpers.js";

const createdTokens: string[] = [];

//A fresh app per test gets a fresh limiter, so tests don't use up each other's tries
function buildApp(trustProxy?: number) {
  const { authRouter } = createAuth({
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH!,
    secureCookies: false,
    allowedOrigins: [],
  });
  const app = express();
  if (trustProxy !== undefined) app.set("trust proxy", trustProxy);
  app.use(express.json(), cookieParser());
  app.use("/auth", authRouter);
  return app;
}

function attempt(app: express.Express, password: string, forwardedFor?: string) {
  const req = request(app).post("/auth/login");
  if (forwardedFor) req.set("X-Forwarded-For", forwardedFor);
  return req.send({ password });
}

async function failTimes(app: express.Express, times: number, forwardedFor?: string) {
  for (let i = 0; i < times; i++) {
    const res = await attempt(app, "not-the-password", forwardedFor);
    expect(res.status).toBe(401);
  }
}

async function succeed(app: express.Express) {
  const res = await attempt(app, TEST_PASSWORD);
  expect(res.status).toBe(200);
  const cookie = [res.headers["set-cookie"] ?? []].flat()[0]!;
  createdTokens.push(cookie.split(";")[0]!.slice("session=".length));
}

afterEach(async () => {
  for (const token of createdTokens.splice(0)) {
    const tokenHash = createHash("sha256").update(token).digest("base64url");
    await db.orm.public.Sessions.where({ tokenHash }).deleteAll();
  }
});

describe("login rate limit", () => {
  it("blocks the 6th failed try with a 429, Retry-After, and our error shape", async () => {
    const app = buildApp();
    await failTimes(app, 5);

    const res = await attempt(app, "not-the-password");
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: "Too many login attempts. Try again later" });
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("blocks the right password too once the limit is hit", async () => {
    const app = buildApp();
    await failTimes(app, 5);

    const res = await attempt(app, TEST_PASSWORD);
    expect(res.status).toBe(429);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("doesn't count successful logins", async () => {
    const app = buildApp();
    await failTimes(app, 4);
    await succeed(app);
    await succeed(app);

    await failTimes(app, 1);
    expect((await attempt(app, "not-the-password")).status).toBe(429);
  });

  it("ignores X-Forwarded-For when no proxy is trusted", async () => {
    const app = buildApp();
    await failTimes(app, 5, "203.0.113.1");

    const res = await attempt(app, "not-the-password", "203.0.113.2");
    expect(res.status).toBe(429);
  });

  it("limits each client IP separately behind a trusted proxy", async () => {
    const app = buildApp(1);
    await failTimes(app, 5, "203.0.113.1");
    expect((await attempt(app, "not-the-password", "203.0.113.1")).status).toBe(429);

    const other = await attempt(app, "not-the-password", "203.0.113.2");
    expect(other.status).toBe(401);
  });

  it("only trusts the last hop, so a made-up earlier entry doesn't help", async () => {
    const app = buildApp(1);
    await failTimes(app, 5, "198.51.100.7, 203.0.113.1");

    //The proxy appends the real client IP last, so changing the first entry changes nothing
    const res = await attempt(app, "not-the-password", "198.51.100.8, 203.0.113.1");
    expect(res.status).toBe(429);
  });
});
