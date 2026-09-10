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

  it("returns a new book with completed fields", async () => {
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

describe("PUT /books/:id", () => {
  let existingBookId: number | undefined;
  const createData = {
    title: "Moby Dick",
    author: "Ernest Hemmingway",
    genre: "Adventure",
    readStatus: "want to read",
    coverImageUrl:
      "https://en.wikipedia.org/wiki/File:Moby-Dick_FE_title_page.jpg",
  };

  beforeAll(async () => {
    const books = await request(app).get("/books");
    expect(Array.isArray(books.body)).toBe(true);

    const createdBook = await request(app).post("/books").send(createData);
    existingBookId = createdBook.body.id;
  });

  afterAll(async () => {
    if (existingBookId) {
      await request(app).delete(`/books/${existingBookId}`);
    }
  });

  it("modifies specific book fields", async () => {
    const updateData = {
      readStatus: "read",
    };

    const modifiedBook = await request(app)
      .put(`/books/${existingBookId}`)
      .send(updateData);
    expect(modifiedBook).toBeTruthy();
    expect(modifiedBook.body.readStatus).toBe(updateData.readStatus);
    expect(modifiedBook.body.title).toBe(createData.title);
  });

  it("modifies all book fields", async () => {
    const updateData = {
      title: "Dracula",
      author: "Bram Stoker",
      genre: "Gothic Horror",
      readStatus: "read",
      coverImageUrl:
        "https://en.wikipedia.org/wiki/File:Dracula-First-Edition-1897.jpg",
    };

    const modifiedBook = await request(app)
      .put(`/books/${existingBookId}`)
      .send(updateData);
    expect(modifiedBook).toBeTruthy();
    expect(modifiedBook.body.title).toBe(updateData.title);
    expect(modifiedBook.body.author).toBe(updateData.author);
    expect(modifiedBook.body.genre).toBe(updateData.genre);
    expect(modifiedBook.body.readStatus).toBe(updateData.readStatus);
    expect(modifiedBook.body.coverImageUrl).toBe(updateData.coverImageUrl);
  });
});

describe("DELETE /books/:id", () => {
  let existingBookId: number | undefined;
  const createData = {
    title: "Moby Dick",
    author: "Ernest Hemmingway",
    genre: "Adventure",
    readStatus: "want to read",
    coverImageUrl:
      "https://en.wikipedia.org/wiki/File:Moby-Dick_FE_title_page.jpg",
  };

  beforeAll(async () => {
    const books = await request(app).get("/books");
    expect(Array.isArray(books.body)).toBe(true);

    const createdBook = await request(app).post("/books").send(createData);
    existingBookId = createdBook.body.id;
  });

  it("deletes individual books", async () => {
    const deleteBook = await request(app).delete(`/books/${existingBookId}`);
    expect(deleteBook).toBeTruthy();

    const checkBooks = await request(app).get("/books");
    const stillExists = checkBooks.body.some(
      (book: any) => book.id === existingBookId,
    );
    expect(stillExists).toBe(false);
  });
});
