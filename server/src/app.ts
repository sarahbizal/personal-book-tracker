import "temporal-polyfill/global";
import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import "dotenv/config";
import { db } from "../prisma/db.js";
import { Temporal } from "temporal-polyfill";
import cors from "cors";
import { z } from "zod";

export const app: Express = express();

app.use(
  cors({
    origin: ["http://localhost:5173"],
  }),
);
app.use(express.json());

//Test database connection
await db.connect({ url: process.env.DATABASE_URL! });

//Request validation schemas
//Postgres INTEGER columns top out at 2147483647
const dbId = z.number().int().positive().max(2_147_483_647);
const idParam = z.coerce.number().pipe(dbId);
const httpUrl = z.url({ protocol: /^https?$/ });

const requiredText = z.string().trim().min(1);

const bookCreateSchema = z.object({
  title: requiredText,
  author: requiredText,
  genre: requiredText,
  readStatus: requiredText.exactOptional(),
  coverImageUrl: httpUrl.exactOptional(),
});

const bookUpdateSchema = z
  .object({
    title: requiredText.exactOptional(),
    author: requiredText.exactOptional(),
    genre: requiredText.exactOptional(),
    readStatus: requiredText.exactOptional(),
    coverImageUrl: httpUrl.exactOptional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

const ratingCreateSchema = z.object({
  bookId: dbId,
  rating: z.number().int().min(1).max(5).exactOptional(),
  bookReviewText: z.string().exactOptional(),
  dateFinished: z.iso.date().nullable().exactOptional(),
});

const ratingUpdateSchema = ratingCreateSchema
  .omit({ bookId: true })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

function sendValidationError(res: Response, error: z.ZodError) {
  res.status(400).json({
    error: z.prettifyError(error),
    details: z.flattenError(error),
  });
}

function sendInvalidId(res: Response) {
  res.status(400).json({ error: "id must be a positive whole number" });
}

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
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

app.get("/books", async (req: Request, res: Response) => {
  const title = req.query.title;

  let books;
  if (title) {
    books = await db.orm.public.Books.where((book) =>
      book.title.ilike(`%${title}%`),
    ).all();
  } else {
    books = await db.orm.public.Books.all();
  }
  res.json(books);
});

app.post("/books", async (req: Request, res: Response) => {
  const body = bookCreateSchema.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, body.error);
    return;
  }

  const newBook = await db.orm.public.Books.create(body.data);
  res.status(201).json(newBook);
});

app.post("/ratings", async (req: Request, res: Response) => {
  const body = ratingCreateSchema.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, body.error);
    return;
  }

  const { dateFinished, ...fields } = body.data;
  const book = await db.orm.public.Books.where({ id: fields.bookId }).first();
  if (!book) {
    res.status(400).json({ error: `Book ${fields.bookId} does not exist` });
    return;
  }

  const newRating = await db.orm.public.Ratings.create({
    ...fields,
    dateFinished: dateFinished ? Temporal.PlainDate.from(dateFinished) : null,
  });
  res.status(201).json(newRating);
});

app.put("/books/:id", async (req: Request, res: Response) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) {
    sendInvalidId(res);
    return;
  }
  const body = bookUpdateSchema.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, body.error);
    return;
  }

  const editBook = await db.orm.public.Books.where({ id: id.data }).update(
    body.data,
  );
  if (!editBook) {
    res.status(404).json({ error: `Book ${id.data} not found` });
    return;
  }
  res.json(editBook);
});

app.put("/ratings/:id", async (req: Request, res: Response) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) {
    sendInvalidId(res);
    return;
  }
  const body = ratingUpdateSchema.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, body.error);
    return;
  }

  const { dateFinished, ...fields } = body.data;
  const changes = {
    ...fields,
    ...(dateFinished
      ? { dateFinished: Temporal.PlainDate.from(dateFinished) }
      : {}),
  };
  //A null dateFinished is skipped, which can leave nothing to update
  if (Object.keys(changes).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const editRating = await db.orm.public.Ratings.where({
    id: id.data,
  }).update(changes);
  if (!editRating) {
    res.status(404).json({ error: `Rating ${id.data} not found` });
    return;
  }
  res.json(editRating);
});

app.delete("/books/:id", async (req: Request, res: Response) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) {
    sendInvalidId(res);
    return;
  }

  const deletedBook = await db.orm.public.Books.where({
    id: id.data,
  }).delete();
  if (!deletedBook) {
    res.status(404).json({ error: `Book ${id.data} not found` });
    return;
  }
  res.json(deletedBook);
});

app.delete("/ratings/:id", async (req: Request, res: Response) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) {
    sendInvalidId(res);
    return;
  }

  const deletedRating = await db.orm.public.Ratings.where({
    id: id.data,
  }).delete();
  if (!deletedRating) {
    res.status(404).json({ error: `Rating ${id.data} not found` });
    return;
  }
  res.json(deletedRating);
});

//Catch-all error handler. Must stay below every route.
//Express spots an error handler by its four arguments, so _req stays
app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  //If a response already started, let Express close the connection
  if (res.headersSent) {
    next(err);
    return;
  }

  //Errors Express raises itself (like malformed JSON) carry a 4xx status
  const status =
    err instanceof Error && "status" in err && typeof err.status === "number"
      ? err.status
      : 500;

  if (status >= 400 && status < 500) {
    res.status(status).json({ error: (err as Error).message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});
