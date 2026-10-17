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

//Comma-separated list of sites allowed to call the API. Defaults to the Vite dev server
//Browsers send origins without a trailing slash, so strip any to make them match
export const corsOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
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
const readStatus = z.enum(["want to read", "reading", "read"]);

const bookCreateSchema = z.object({
  title: requiredText,
  author: requiredText,
  genre: requiredText,
  readStatus: readStatus.exactOptional(),
  coverImageUrl: httpUrl.nullable().exactOptional(),
});

const bookUpdateSchema = z
  .object({
    title: requiredText.exactOptional(),
    author: requiredText.exactOptional(),
    genre: requiredText.exactOptional(),
    readStatus: readStatus.exactOptional(),
    coverImageUrl: httpUrl.nullable().exactOptional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "At least one field is required",
  });

const ratingCreateSchema = z.object({
  bookId: dbId,
  rating: z.number().int().min(1).max(5).nullable().exactOptional(),
  bookReviewText: z.string().nullable().exactOptional(),
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

//ILIKE treats % and _ as wildcards, so escape them to match them literally
function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}

//Reuse an existing genre's spelling so "fantasy" and "Fantasy" stay one genre.
//The first spelling saved wins. When editing, skip the book itself so its
//own genre's capitalization can still be fixed.
async function matchExistingGenre(genre: string, excludeBookId?: number) {
  let query = db.orm.public.Books.where((book) =>
    book.genre.ilike(escapeLike(genre)),
  );
  if (excludeBookId !== undefined) {
    query = query.where((book) => book.id.neq(excludeBookId));
  }
  const existing = await query.first();
  return existing?.genre ?? genre;
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
      book.title.ilike(`%${escapeLike(String(title))}%`),
    ).all();
  } else {
    books = await db.orm.public.Books.all();
  }
  res.json(books);
});

app.get("/genres", async (req: Request, res: Response) => {
  const rows = await db.orm.public.Books.select("genre")
    .distinct("genre")
    .orderBy((book) => book.genre.asc())
    .all();
  res.json(rows.map((row) => row.genre));
});

app.post("/books", async (req: Request, res: Response) => {
  const body = bookCreateSchema.safeParse(req.body);
  if (!body.success) {
    sendValidationError(res, body.error);
    return;
  }

  const newBook = await db.orm.public.Books.create({
    ...body.data,
    genre: await matchExistingGenre(body.data.genre),
  });
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

app.patch("/books/:id", async (req: Request, res: Response) => {
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

  const changes = body.data.genre
    ? {
        ...body.data,
        genre: await matchExistingGenre(body.data.genre, id.data),
      }
    : body.data;
  const editBook = await db.orm.public.Books.where({ id: id.data }).update(
    changes,
  );
  if (!editBook) {
    res.status(404).json({ error: `Book ${id.data} not found` });
    return;
  }
  res.json(editBook);
});

app.patch("/ratings/:id", async (req: Request, res: Response) => {
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

  //Not sent leaves a field alone, null clears it
  const { dateFinished, ...fields } = body.data;
  const changes = {
    ...fields,
    ...(dateFinished === undefined
      ? {}
      : {
          dateFinished:
            dateFinished === null
              ? null
              : Temporal.PlainDate.from(dateFinished),
        }),
  };

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
