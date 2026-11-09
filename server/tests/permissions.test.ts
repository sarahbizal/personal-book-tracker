import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app, corsOrigins } from "../src/app.js";
import {
  loginAsAdmin,
  logoutAdmin,
  TEST_PASSWORD,
  type AdminAgent,
} from "./helpers.js";

const ALLOWED_ORIGIN = corsOrigins[0]!;
const EVIL_ORIGIN = "https://evil.example";

let admin: AdminAgent;
let bookId: number;
let ratingId: number;
const REVIEW = "Private thoughts about this book";

beforeAll(async () => {
  admin = await loginAsAdmin();
  const book = await admin
    .post("/api/v1/books")
    .send({ title: "Permissions Test", author: "Tester", genre: "Zzpermissions" });
  expect(book.status).toBe(201);
  bookId = book.body.id;
  const rating = await admin
    .post("/api/v1/ratings")
    .send({ bookId, rating: 4, bookReviewText: REVIEW });
  expect(rating.status).toBe(201);
  ratingId = rating.body.id;
});

afterAll(async () => {
  await admin.delete(`/api/v1/ratings/${ratingId}`);
  await admin.delete(`/api/v1/books/${bookId}`);
  await logoutAdmin(admin);
});

async function getBook() {
  const books = await request(app).get("/api/v1/books");
  return books.body.find((book: any) => book.id === bookId);
}

async function getRating(client: AdminAgent | ReturnType<typeof request>) {
  const ratings = await client.get("/api/v1/ratings");
  return ratings.body.find((rating: any) => rating.id === ratingId);
}

describe("viewers can't change anything", () => {
  it("POST /books returns 401 and creates nothing", async () => {
    const res = await request(app)
      .post("/api/v1/books")
      .send({ title: "Viewer Book", author: "Viewer", genre: "Zzpermissions" });
    expect(res.status).toBe(401);

    const books = await request(app)
      .get("/api/v1/books")
      .query({ title: "Viewer Book" });
    expect(books.body).toEqual([]);
  });

  it("PATCH /books/:id returns 401 and leaves the book alone", async () => {
    const res = await request(app)
      .patch(`/api/v1/books/${bookId}`)
      .send({ title: "Hacked" });
    expect(res.status).toBe(401);
    expect((await getBook()).title).toBe("Permissions Test");
  });

  it("DELETE /books/:id returns 401 and the book still exists", async () => {
    const res = await request(app).delete(`/api/v1/books/${bookId}`);
    expect(res.status).toBe(401);
    expect(await getBook()).toBeDefined();
  });

  it("POST /ratings returns 401 and creates nothing", async () => {
    const res = await request(app)
      .post("/api/v1/ratings")
      .send({ bookId, rating: 1 });
    expect(res.status).toBe(401);

    //Scoped to this file's book because other test files add ratings in parallel
    const ratings = await admin.get("/api/v1/ratings");
    const forBook = ratings.body.filter((r: any) => r.bookId === bookId);
    expect(forBook.map((r: any) => r.id)).toEqual([ratingId]);
  });

  it("PATCH /ratings/:id returns 401 and leaves the rating alone", async () => {
    const res = await request(app)
      .patch(`/api/v1/ratings/${ratingId}`)
      .send({ rating: 1 });
    expect(res.status).toBe(401);
    expect((await getRating(admin)).rating).toBe(4);
  });

  it("DELETE /ratings/:id returns 401 and the rating still exists", async () => {
    const res = await request(app).delete(`/api/v1/ratings/${ratingId}`);
    expect(res.status).toBe(401);
    expect(await getRating(admin)).toBeDefined();
  });

  it("viewers can still log in", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Wrong password" });
  });
});

describe("Origin check", () => {
  it("rejects a write from another site with 403, even for the admin", async () => {
    const res = await admin
      .patch(`/api/v1/books/${bookId}`)
      .set("Origin", EVIL_ORIGIN)
      .send({ title: "Hacked" });
    expect(res.status).toBe(403);
    expect((await getBook()).title).toBe("Permissions Test");
  });

  it("rejects Origin: null", async () => {
    const res = await admin
      .patch(`/api/v1/books/${bookId}`)
      .set("Origin", "null")
      .send({ title: "Hacked" });
    expect(res.status).toBe(403);
    expect((await getBook()).title).toBe("Permissions Test");
  });

  it("rejects a login from another site", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", EVIL_ORIGIN)
      .send({ password: TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("allows a write from an allowed origin", async () => {
    const res = await admin
      .patch(`/api/v1/books/${bookId}`)
      .set("Origin", ALLOWED_ORIGIN)
      .send({ author: "Tester" });
    expect(res.status).toBe(200);
  });

  it("lets a missing Origin fall through to requireAdmin", async () => {
    const res = await request(app).delete(`/api/v1/books/${bookId}`);
    expect(res.status).toBe(401);
  });

  it("doesn't check reads", async () => {
    const res = await request(app)
      .get("/api/v1/books")
      .set("Origin", EVIL_ORIGIN);
    expect(res.status).toBe(200);
  });
});

describe("review text", () => {
  it("is hidden from viewers", async () => {
    const rating = await getRating(request(app));
    expect(rating.rating).toBe(4);
    expect(rating.bookReviewText).toBeNull();
  });

  it("is never stored by a shared cache", async () => {
    const res = await request(app).get("/api/v1/ratings");
    expect(res.headers["cache-control"]).toBe("private, no-store");
  });

  it("is visible to the admin", async () => {
    const rating = await getRating(admin);
    expect(rating.bookReviewText).toBe(REVIEW);
  });
});
