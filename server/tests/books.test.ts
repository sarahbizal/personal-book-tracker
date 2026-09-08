import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /books", () => {
  it("returns an array", async () => {
    const books = await request(app).get("/books");
    expect(Array.isArray(books.body)).toBe(true);
  });
});

describe("POST /books", () => {
  let createdBookId: number | undefined;

  beforeAll(async () => {
    const books = await request(app).get("/books");
    expect(Array.isArray(books.body)).toBe(true);
  });

  afterAll(async () => {
    if (createdBookId) {
      await request(app).delete(`/books/${createdBookId}`);
    }
  });

  it("returns book with completed fields", async () => {
    const data = {
      title: "Moby Dick",
      author: "Ernest Hemmingway",
      genre: "Adventure",
      readStatus: "read",
      coverImageUrl:
        "https://en.wikipedia.org/wiki/File:Moby-Dick_FE_title_page.jpg",
    };
    const book = await request(app).post("/books").send(data);
    expect(book).toBeTruthy();
    expect(book.body.title).toBe(data.title);
    expect(book.body.author).toBe(data.author);
    expect(book.body.genre).toBe(data.genre);
    expect(book.body.readStatus).toBe(data.readStatus);
    expect(book.body.coverImageUrl).toBe(data.coverImageUrl);
  });
});
