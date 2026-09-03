import "temporal-polyfill/global";
import express, { type Express, type Request, type Response } from "express";
import "dotenv/config";
import { db } from "../prisma/db.js";
import { Temporal } from "temporal-polyfill";

const app: Express = express();
const port = 3000;

app.use(express.json());

//Test database connection
await db.connect({ url: process.env.DATABASE_URL! });

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.get("/books", async (req: Request, res: Response) => {
  const books = await db.orm.public.Books.select("id", "title", "author").all();
  res.json(books);
});

app.get("/ratings", async (req: Request, res: Response) => {
  const ratings = await db.orm.public.Ratings.select(
    "id",
    "bookId",
    "rating",
    "bookReviewText",
    "dateFinished",
  ).all();
  res.json(ratings);
});

app.post("/books", async (req: Request, res: Response) => {
  const { title, author, genre } = req.body;
  const newBook = await db.orm.public.Books.create({
    title,
    author,
    genre,
  });
  res.json(newBook);
});

app.post("/ratings", async (req: Request, res: Response) => {
  const { bookId, rating, bookReviewText, dateFinished } = req.body;
  const newRating = await db.orm.public.Ratings.create({
    bookId,
    rating,
    bookReviewText,
    dateFinished: dateFinished ? Temporal.PlainDate.from(dateFinished) : null,
  });
  res.json(newRating);
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
