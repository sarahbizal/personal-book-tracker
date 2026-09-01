import express, { type Express, type Request, type Response } from "express";
import "dotenv/config";
import { db } from "../prisma/db.js";

const app: Express = express();
const port = 3000;

//Test database connection
await db.connect({ url: process.env.DATABASE_URL! });

app.get("/books", async (req: Request, res: Response) => {
  const books = await db.orm.public.Books.select("id", "title", "author").all();
  res.json(books);
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
