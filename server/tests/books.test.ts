import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /books", () => {
  it("returns an array", async () => {
    const books = await request(app).get("/books");
    expect(Array.isArray(books.body)).toBe(true);
  });
});
