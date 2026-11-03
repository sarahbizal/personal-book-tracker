import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /health", () => {
  it("returns status ok", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("route versioning", () => {
  it("stays unversioned for /health", async () => {
    const response = await request(app).get("/api/v1/health");
    expect(response.status).toBe(404);
  });

  it.each([
    ["get", "/books"],
    ["get", "/ratings"],
    ["get", "/genres"],
    ["post", "/books"],
    ["post", "/ratings"],
  ] as const)("no longer serves %s %s at the root", async (method, path) => {
    const response = await request(app)[method](path);
    expect(response.status).toBe(404);
  });

  it("returns a JSON 404 for unknown API routes", async () => {
    const response = await request(app).get("/api/v1/nope");
    expect(response.status).toBe(404);
    expect(response.type).toBe("application/json");
    expect(response.body.error).toBe("No route for GET /api/v1/nope");
  });
});
