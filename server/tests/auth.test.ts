import { createHash } from "node:crypto";
import { describe, it, expect, afterEach } from "vitest";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { Temporal } from "temporal-polyfill";
import { app } from "../src/app.js";
import { createAuth } from "../src/auth.js";
import { db } from "../prisma/db.js";
import { TEST_PASSWORD } from "./helpers.js";

const createdTokens: string[] = [];

function sha256(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function setCookies(res: request.Response): string[] {
  const header = res.headers["set-cookie"];
  return Array.isArray(header) ? header : header ? [header] : [];
}

//The last one wins, since a renewal can come before a new or cleared cookie
function sessionToken(res: request.Response) {
  const cookie = setCookies(res).findLast((c) => c.startsWith("session="));
  return cookie?.split(";")[0]?.slice("session=".length);
}

async function login(existingToken?: string) {
  const req = request(app).post("/api/v1/auth/login");
  if (existingToken) req.set("Cookie", `session=${existingToken}`);
  const res = await req.send({ password: TEST_PASSWORD });
  const token = sessionToken(res);
  if (!token) throw new Error("Login did not set a session cookie");
  createdTokens.push(token);
  return { res, token };
}

function findSession(token: string) {
  return db.orm.public.Sessions.where({ tokenHash: sha256(token) }).first();
}

function setExpiry(token: string, expiresAt: Temporal.Instant) {
  return db.orm.public.Sessions.where({ tokenHash: sha256(token) }).update({
    expiresAt,
  });
}

afterEach(async () => {
  for (const token of createdTokens.splice(0)) {
    await db.orm.public.Sessions.where({ tokenHash: sha256(token) }).deleteAll();
  }
});

describe("POST /auth/login", () => {
  it("logs in with the right password", async () => {
    const { res, token } = await login();
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isAdmin: true });

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `session=${token}`);
    expect(me.body).toEqual({ isAdmin: true });
  });

  it("works with supertest.agent", async () => {
    const agent = request.agent(app);
    const res = await agent
      .post("/api/v1/auth/login")
      .send({ password: TEST_PASSWORD });
    const token = sessionToken(res);
    if (!token) throw new Error("Login did not set a session cookie");
    createdTokens.push(token);

    const me = await agent.get("/api/v1/auth/me");
    expect(me.body).toEqual({ isAdmin: true });
  });

  it("sets an httpOnly, SameSite=Strict cookie for 30 days", async () => {
    const { res } = await login();
    const cookie = setCookies(res)[0];
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Strict/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).toMatch(/Max-Age=2592000/);
  });

  it("stores only the hash of the token", async () => {
    const { token } = await login();
    const session = await findSession(token);
    expect(session).not.toBeNull();
    expect(session!.tokenHash).toBe(sha256(token));

    const rawStored = await db.orm.public.Sessions.where({
      tokenHash: token,
    }).first();
    expect(rawStored).toBeNull();
  });

  it("replaces the current session when logging in again", async () => {
    const { token: first } = await login();
    const { token: second } = await login(first);

    expect(second).not.toBe(first);
    expect(await findSession(first)).toBeNull();
    expect(await findSession(second)).not.toBeNull();
  });

  it.each([
    ["a wrong password", { password: "not-the-password" }],
    ["a missing password", {}],
    ["a non-string password", { password: 12345 }],
    ["an over-long password", { password: "a".repeat(257) }],
  ])("rejects %s with the same 401 and no cookie", async (_label, body) => {
    const res = await request(app).post("/api/v1/auth/login").send(body);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Wrong password" });
    expect(setCookies(res)).toEqual([]);
  });

  it("marks auth responses no-store", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.headers["cache-control"]).toBe("no-store");
  });
});

describe("GET /auth/me", () => {
  it("is false with no cookie", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.body).toEqual({ isAdmin: false });
  });

  it("is false with an unknown token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", "session=not-a-real-token");
    expect(res.body).toEqual({ isAdmin: false });
  });

  //cookie-parser JSON-decodes values that start with "j:"
  it.each([
    ["an object", "j:%7B%22a%22%3A1%7D"],
    ["a number", "j:123"],
  ])("is false when the cookie decodes to %s", async (_label, value) => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `session=${value}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isAdmin: false });
  });

  it("is false once the session has expired", async () => {
    const { token } = await login();
    await setExpiry(token, Temporal.Now.instant().subtract({ hours: 1 }));

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `session=${token}`);
    expect(res.body).toEqual({ isAdmin: false });
  });
});

describe("session renewal", () => {
  it("does not renew a session less than a day old", async () => {
    const { token } = await login();
    const before = await findSession(token);

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `session=${token}`);
    expect(setCookies(res)).toEqual([]);
    const after = await findSession(token);
    expect(after!.expiresAt.equals(before!.expiresAt)).toBe(true);
  });

  it("renews the row and the cookie once a session is over a day old", async () => {
    const { token } = await login();
    const now = Temporal.Now.instant();
    await setExpiry(token, now.add({ hours: 28 * 24 }));

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `session=${token}`);
    expect(setCookies(res)[0]).toMatch(/Max-Age=2592000/);

    const after = await findSession(token);
    const renewedPast = now.add({ hours: 29 * 24 });
    expect(Temporal.Instant.compare(after!.expiresAt, renewedPast)).toBe(1);
  });
});

describe("POST /auth/logout", () => {
  it("deletes the session and clears the cookie", async () => {
    const { token } = await login();

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", `session=${token}`);
    expect(res.status).toBe(204);
    expect(await findSession(token)).toBeNull();
    expect(setCookies(res).at(-1)).toMatch(/^session=;.*Expires=Thu, 01 Jan 1970/);

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", `session=${token}`);
    expect(me.body).toEqual({ isAdmin: false });
  });

  it("still clears the cookie when the session renews on the way in", async () => {
    const { token } = await login();
    await setExpiry(token, Temporal.Now.instant().add({ hours: 28 * 24 }));

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", `session=${token}`);
    expect(res.status).toBe(204);
    expect(await findSession(token)).toBeNull();
    expect(setCookies(res).at(-1)).toMatch(/^session=;.*Expires=Thu, 01 Jan 1970/);
  });

  it("succeeds when already logged out", async () => {
    const res = await request(app).post("/api/v1/auth/logout");
    expect(res.status).toBe(204);
  });
});

describe("secure cookies", () => {
  //Built separately because the main app runs with INSECURE_COOKIES=true in tests
  const { loadSession, authRouter } = createAuth({
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH!,
    secureCookies: true,
    allowedOrigins: [],
  });
  const secureApp = express();
  secureApp.use(express.json(), cookieParser(), loadSession);
  secureApp.use("/auth", authRouter);

  it("uses the __Host- name and Secure on login and logout", async () => {
    const login = await request(secureApp)
      .post("/auth/login")
      .send({ password: TEST_PASSWORD });
    const cookie = setCookies(login)[0]!;
    expect(cookie).toMatch(/^__Host-session=/);
    expect(cookie).toMatch(/; Secure/);
    const token = cookie.split(";")[0]!.slice("__Host-session=".length);
    createdTokens.push(token);

    const logout = await request(secureApp)
      .post("/auth/logout")
      .set("Cookie", `__Host-session=${token}`);
    expect(await findSession(token)).toBeNull();
    const cleared = setCookies(logout).at(-1)!;
    expect(cleared).toMatch(/^__Host-session=;/);
    expect(cleared).toMatch(/; Secure/);
    expect(cleared).toMatch(/Path=\//);
  });
});
