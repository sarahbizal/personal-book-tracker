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

describe("PUT /ratings/:id", () => {
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
      .put(`/ratings/${createdRatingId}`)
      .send(updateData);
    expect(modifiedRating).toBeTruthy();
    expect(modifiedRating.body.bookReviewText).toBe(updateData.bookReviewText);
    expect(modifiedRating.body.dateFinished).toBe(createData.dateFinished);
  });

  it("modifies all rating fields", async () => {
    let updateData = {
      bookId: existingBookId,
      rating: 2,
      bookReviewText: "Actually decided I don't like it",
      dateFinished: "2002-04-03",
    };

    const modifiedRating = await request(app)
      .put(`/ratings/${createdRatingId}`)
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
