import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

let existingBookId: number | undefined;

beforeAll(async () => {
  const createData = {
    title: "Moby Dick",
    author: "Ernest Hemmingway",
    genre: "Adventure",
    readStatus: "want to read",
    coverImageUrl:
      "https://en.wikipedia.org/wiki/File:Moby-Dick_FE_title_page.jpg",
  };

  const books = await request(app).get("/books");
  expect(Array.isArray(books.body)).toBe(true);

  const createdBook = await request(app).post("/books").send(createData);
  existingBookId = createdBook.body.id;
});

describe("GET /ratings", () => {
  it("returns an array", async () => {
    const ratings = await request(app).get("/ratings");
    expect(Array.isArray(ratings.body)).toBe(true);
  });
});

describe("POST /ratings", () => {
  let createdRatingId: number | undefined;

  beforeAll(async () => {
    const ratings = await request(app).get("/ratings");
    expect(Array.isArray(ratings.body)).toBe(true);
  });

  afterAll(async () => {
    if (createdRatingId) {
      await request(app).delete(`/ratings/${createdRatingId}`);
    }
  });

  it("returns a book with ratings", async () => {
    const data = {
      bookId: existingBookId,
      rating: 4,
      bookReviewText: "Wow what a classic",
      dateFinished: "2002-01-01",
    };
    const rating = await request(app).post("/ratings").send(data);
    expect(rating).toBeTruthy();
    expect(rating.body.rating).toBe(data.rating);
    expect(rating.body.bookReviewText).toBe(data.bookReviewText);
    expect(rating.body.dateFinished).toBe(data.dateFinished);
  });
});

describe("PATCH /ratings/:id", () => {
  let createdRatingId: number | undefined;
  let createData: any;

  beforeAll(async () => {
    const ratings = await request(app).get("/ratings");
    expect(Array.isArray(ratings.body)).toBe(true);

    createData = {
      bookId: existingBookId,
      rating: 4,
      bookReviewText: "Wow what a classic",
      dateFinished: "2002-01-01",
    };

    const createdRating = await request(app).post("/ratings").send(createData);
    createdRatingId = createdRating.body.id;
  });

  afterAll(async () => {
    if (createdRatingId) {
      await request(app).delete(`/ratings/${createdRatingId}`);
    }
  });

  it("modifies specific rating fields", async () => {
    const updateData = {
      bookReviewText: "Actually decided I don't like it",
    };

    const modifiedRating = await request(app)
      .patch(`/ratings/${createdRatingId}`)
      .send(updateData);
    expect(modifiedRating).toBeTruthy();
    expect(modifiedRating.body.bookReviewText).toBe(updateData.bookReviewText);
    expect(modifiedRating.body.dateFinished).toBe(createData.dateFinished);
  });

  it("modifies all rating fields", async () => {
    let updateData = {
      rating: 2,
      bookReviewText: "Actually decided I don't like it",
      dateFinished: "2002-04-03",
    };

    const modifiedRating = await request(app)
      .patch(`/ratings/${createdRatingId}`)
      .send(updateData);
    expect(modifiedRating).toBeTruthy();
    expect(modifiedRating.body.rating).toBe(updateData.rating);
    expect(modifiedRating.body.bookReviewText).toBe(updateData.bookReviewText);
    expect(modifiedRating.body.dateFinished).toBe(updateData.dateFinished);
  });
});

describe("DELETE /ratings/:id", () => {
  let createdRatingId: number | undefined;
  const createData = {
    bookId: existingBookId,
    rating: 2,
    bookReviewText: "Actually decided I don't like it",
    dateFinished: "2002-04-03",
  };

  beforeAll(async () => {
    const ratings = await request(app).get("/ratings");
    expect(Array.isArray(ratings.body)).toBe(true);

    const createdRatings = await request(app).post("/ratings").send(createData);
    createdRatingId = createdRatings.body.id;
  });

  it("deletes full rating for individual book", async () => {
    const deleteRating = await request(app).delete(
      `/ratings/${createdRatingId}`,
    );
    expect(deleteRating).toBeTruthy();

    const checkRatings = await request(app).get("/ratings");
    const stillExists = checkRatings.body.some(
      (rating: any) => rating.id === createdRatingId,
    );
    expect(stillExists).toBe(false);
  });
});

describe("rating failure cases", () => {
  const missingId = 999999;

  it("returns 201 when a rating is created", async () => {
    const response = await request(app)
      .post("/ratings")
      .send({ bookId: existingBookId, rating: 5 });
    expect(response.status).toBe(201);
    await request(app).delete(`/ratings/${response.body.id}`);
  });

  it("returns 400 when the rating is out of range", async () => {
    const response = await request(app)
      .post("/ratings")
      .send({ bookId: existingBookId, rating: 47 });
    expect(response.status).toBe(400);
    expect(response.body.details.fieldErrors.rating).toBeDefined();
  });

  it("returns 400 when the book does not exist", async () => {
    const response = await request(app)
      .post("/ratings")
      .send({ bookId: missingId, rating: 5 });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain(`${missingId}`);
  });

  it("returns 400 when the date is not a real date", async () => {
    const response = await request(app)
      .post("/ratings")
      .send({ bookId: existingBookId, rating: 5, dateFinished: "2026-02-30" });
    expect(response.status).toBe(400);
    expect(response.body.details.fieldErrors.dateFinished).toBeDefined();
  });

  it("returns 400 when the id is not a number", async () => {
    const response = await request(app).delete("/ratings/abc");
    expect(response.status).toBe(400);
  });

  it("clears the date when dateFinished is sent as null", async () => {
    const created = await request(app)
      .post("/ratings")
      .send({ bookId: existingBookId, rating: 3, dateFinished: "2026-01-15" });
    const response = await request(app)
      .patch(`/ratings/${created.body.id}`)
      .send({ dateFinished: null });
    expect(response.status).toBe(200);
    expect(response.body.dateFinished).toBeNull();
    expect(response.body.rating).toBe(3);
    await request(app).delete(`/ratings/${created.body.id}`);
  });

  it("clears the rating and review when sent as null", async () => {
    const created = await request(app).post("/ratings").send({
      bookId: existingBookId,
      rating: 4,
      bookReviewText: "Loved it",
      dateFinished: "2026-01-15",
    });
    const response = await request(app)
      .patch(`/ratings/${created.body.id}`)
      .send({ rating: null, bookReviewText: null });
    expect(response.status).toBe(200);
    expect(response.body.rating).toBeNull();
    expect(response.body.bookReviewText).toBeNull();
    expect(response.body.dateFinished).toBe("2026-01-15");
    await request(app).delete(`/ratings/${created.body.id}`);
  });

  it("no longer accepts PUT for updates", async () => {
    const created = await request(app)
      .post("/ratings")
      .send({ bookId: existingBookId, rating: 3 });
    const response = await request(app)
      .put(`/ratings/${created.body.id}`)
      .send({ rating: 1 });
    expect(response.status).toBe(404);

    const ratings = await request(app).get("/ratings");
    const unchanged = ratings.body.find(
      (rating: any) => rating.id === created.body.id,
    );
    expect(unchanged.rating).toBe(3);
    await request(app).delete(`/ratings/${created.body.id}`);
  });

  it("returns 400 when the book id is too large for the database", async () => {
    const response = await request(app)
      .post("/ratings")
      .send({ bookId: 3000000000, rating: 5 });
    expect(response.status).toBe(400);
  });

  it("returns 404 when updating a rating that does not exist", async () => {
    const response = await request(app)
      .patch(`/ratings/${missingId}`)
      .send({ rating: 3 });
    expect(response.status).toBe(404);
  });

  it("returns 404 when deleting a rating that does not exist", async () => {
    const response = await request(app).delete(`/ratings/${missingId}`);
    expect(response.status).toBe(404);
  });
});
