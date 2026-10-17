import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /books", () => {
  let existingBookId: number | undefined;
  const createData = {
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    genre: "Classic",
  };

  beforeAll(async () => {
    const createdBook = await request(app).post("/books").send(createData);
    existingBookId = createdBook.body.id;
  });

  afterAll(async () => {
    if (existingBookId) {
      await request(app).delete(`/books/${existingBookId}`);
    }
  });

  it("returns an array", async () => {
    const books = await request(app).get("/books");
    expect(Array.isArray(books.body)).toBe(true);
  });

  it("returns matching books when searching by title", async () => {
    const response = await request(app)
      .get("/books")
      .query({ title: "Gatsby" });
    const found = response.body.some((book: any) => book.id === existingBookId);
    expect(found).toBe(true);
  });

  it("is case-insensitive", async () => {
    const response = await request(app)
      .get("/books")
      .query({ title: "gatsby" });
    const found = response.body.some((book: any) => book.id === existingBookId);
    expect(found).toBe(true);
  });

  it("returns an empty array when nothing matches", async () => {
    const response = await request(app)
      .get("/books")
      .query({ title: "zzzznonsensexyz" });
    expect(response.body).toEqual([]);
  });

  it("returns all books when no search term is provided", async () => {
    const response = await request(app).get("/books");
    const found = response.body.some((book: any) => book.id === existingBookId);
    expect(found).toBe(true);
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

describe("PATCH /books/:id", () => {
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
      .patch(`/books/${existingBookId}`)
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
      .patch(`/books/${existingBookId}`)
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

describe("book failure cases", () => {
  let existingBookId: number | undefined;
  const missingBookId = 999999;

  beforeAll(async () => {
    const createdBook = await request(app).post("/books").send({
      title: "Frankenstein",
      author: "Mary Shelley",
      genre: "Gothic Horror",
    });
    existingBookId = createdBook.body.id;
  });

  afterAll(async () => {
    if (existingBookId) {
      await request(app).delete(`/books/${existingBookId}`);
    }
  });

  it("returns 201 when a book is created", async () => {
    const response = await request(app).post("/books").send({
      title: "Emma",
      author: "Jane Austen",
      genre: "Classic",
    });
    expect(response.status).toBe(201);
    await request(app).delete(`/books/${response.body.id}`);
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await request(app)
      .post("/books")
      .send({ title: "No Author" });
    expect(response.status).toBe(400);
    expect(response.body.details.fieldErrors.author).toBeDefined();
    expect(response.body.details.fieldErrors.genre).toBeDefined();
  });

  it("returns 400 when a required field is blank", async () => {
    const response = await request(app)
      .post("/books")
      .send({ title: "   ", author: "Someone", genre: "Fiction" });
    expect(response.status).toBe(400);
    expect(response.body.details.fieldErrors.title).toBeDefined();
  });

  it("returns 400 when the body is not valid JSON", async () => {
    const response = await request(app)
      .post("/books")
      .set("Content-Type", "application/json")
      .send('{"title": "broken"');
    expect(response.status).toBe(400);
    expect(response.body.error).toBeDefined();
  });

  it("returns 400 when the id is not a number", async () => {
    const response = await request(app)
      .patch("/books/abc")
      .send({ readStatus: "read" });
    expect(response.status).toBe(400);
  });

  it("returns 400 when an update has no fields", async () => {
    const response = await request(app)
      .patch(`/books/${existingBookId}`)
      .send({});
    expect(response.status).toBe(400);
  });

  it("explains an empty update in formErrors", async () => {
    const response = await request(app)
      .patch(`/books/${existingBookId}`)
      .send({});
    expect(response.body.details.formErrors).toContain(
      "At least one field is required",
    );
  });

  it("returns 400 when the id is too large for the database", async () => {
    const response = await request(app).delete("/books/3000000000");
    expect(response.status).toBe(400);
  });

  it("clears the cover image url when sent as null", async () => {
    await request(app)
      .patch(`/books/${existingBookId}`)
      .send({ coverImageUrl: "https://example.com/cover.jpg" });
    const response = await request(app)
      .patch(`/books/${existingBookId}`)
      .send({ coverImageUrl: null });
    expect(response.status).toBe(200);
    expect(response.body.coverImageUrl).toBeNull();
    expect(response.body.title).toBe("Frankenstein");
  });

  it("returns 400 when a required field is sent as null", async () => {
    const response = await request(app)
      .patch(`/books/${existingBookId}`)
      .send({ title: null });
    expect(response.status).toBe(400);
  });

  it("returns 400 when the cover image url is not http or https", async () => {
    const response = await request(app)
      .patch(`/books/${existingBookId}`)
      .send({ coverImageUrl: "javascript:alert(1)" });
    expect(response.status).toBe(400);
    expect(response.body.details.fieldErrors.coverImageUrl).toBeDefined();
  });

  it("returns 404 when updating a book that does not exist", async () => {
    const response = await request(app)
      .patch(`/books/${missingBookId}`)
      .send({ readStatus: "read" });
    expect(response.status).toBe(404);
  });

  it("returns 404 when deleting a book that does not exist", async () => {
    const response = await request(app).delete(`/books/${missingBookId}`);
    expect(response.status).toBe(404);
  });
});

describe("read status and genre", () => {
  const createdBookIds: number[] = [];

  async function createBook(data: object) {
    const response = await request(app)
      .post("/books")
      .send({ title: "Dune", author: "Frank Herbert", ...data });
    if (response.body.id) {
      createdBookIds.push(response.body.id);
    }
    return response;
  }

  afterAll(async () => {
    for (const id of createdBookIds) {
      await request(app).delete(`/books/${id}`);
    }
  });

  it("accepts each allowed read status", async () => {
    for (const readStatus of ["want to read", "reading", "read"]) {
      const response = await createBook({ genre: "Sci-Fi", readStatus });
      expect(response.status).toBe(201);
      expect(response.body.readStatus).toBe(readStatus);
    }
  });

  it("returns 400 for a read status outside the allowed list", async () => {
    const response = await createBook({
      genre: "Sci-Fi",
      readStatus: "Want To Read",
    });
    expect(response.status).toBe(400);
    expect(response.body.details.fieldErrors.readStatus).toBeDefined();
  });

  it("reuses an existing genre's spelling when the case differs", async () => {
    await createBook({ genre: "Zzmatch Genre" });
    const response = await createBook({ genre: "  zzmatch genre " });
    expect(response.body.genre).toBe("Zzmatch Genre");
  });

  it("reuses an existing genre's spelling when editing", async () => {
    await createBook({ genre: "Zzedit Genre" });
    const created = await createBook({ genre: "Placeholder" });
    const response = await request(app)
      .patch(`/books/${created.body.id}`)
      .send({ genre: "ZZEDIT GENRE" });
    expect(response.body.genre).toBe("Zzedit Genre");
  });

  it("lets a book fix the capitalization of its own genre", async () => {
    const created = await createBook({ genre: "zzfix genre" });
    const response = await request(app)
      .patch(`/books/${created.body.id}`)
      .send({ genre: "Zzfix Genre" });
    expect(response.body.genre).toBe("Zzfix Genre");
  });

  it("treats % and _ in a genre as plain text", async () => {
    await createBook({ genre: "Zzwild Card" });
    const percent = await createBook({ genre: "Zzwild%" });
    expect(percent.body.genre).toBe("Zzwild%");
    const underscore = await createBook({ genre: "Zzwild_Card" });
    expect(underscore.body.genre).toBe("Zzwild_Card");
  });

  it("lists each genre once in alphabetical order", async () => {
    await createBook({ genre: "Zzmatch Genre" });
    await createBook({ genre: "Zzlist Genre" });
    await createBook({ genre: "zzlist genre" });
    const response = await request(app).get("/genres");
    expect(response.status).toBe(200);
    const matches = response.body.filter((genre: string) =>
      genre.toLowerCase().startsWith("zzlist"),
    );
    expect(matches).toEqual(["Zzlist Genre"]);
    expect(response.body.indexOf("Zzlist Genre")).toBeLessThan(
      response.body.indexOf("Zzmatch Genre"),
    );
  });
});
