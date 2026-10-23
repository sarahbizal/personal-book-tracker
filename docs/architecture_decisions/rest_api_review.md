**REST API Review**

*Date:* 2026-10-23 (Week 4)
*Reviewed against:* commit `5743616` (`server/src/app.ts`, `server/src/index.ts`, `server/prisma/`, `docker-compose.yml`, `client/src/api.ts`)
*Scope:* idempotence, versioning, pagination, API keys and headers, rate limiting, and query strings
*Assumptions:* single-user learning/portfolio project, deploying to AWS soon

## Verdict

**In good shape for local use, with a few gaps to close before deploying.** The API already gets a lot of REST basics right. Updates use PATCH, status codes are accurate, and every body and path param goes through zod. The biggest gap is that there's no authentication, so anyone who can reach the server can change data once it's deployed. Beyond that, the API has no versioning or pagination yet, POST can create duplicates, and the only query string (`?title=`) skips the validation everything else gets.

## Checklist

Work through these in order. Each one is a self-contained chunk.

- [ ] 1. Add authentication before deploying
- [ ] 2. Validate `?title=` with zod and add a `?genre=` filter
- [ ] 3. Add an `/api/v1` prefix before any response shapes change
- [ ] 4. Guard POST routes against duplicates
- [ ] 5. Add rate limiting before deploying

Later (no pressure):
- [ ] Add pagination with an explicit sort
- [ ] Keep the YouTube API key on the server and send it in a header
- [ ] Add more filters, sorting, and single-item routes
- [ ] Decide whether the dev server should listen only on localhost

## What's solid

- **GET, PATCH, and DELETE are idempotent.** PATCH sets fields to values instead of doing math on them like `count + 1`, so sending it twice ends in the same state. DELETE returns 404 the second time, but the data is the same, and that's what counts.
- **Secrets stay on the server.** `.env` and `.env.test` are gitignored and only the example files are committed. `DATABASE_URL` is only read on the server, and Postgres is bound to `127.0.0.1` in `docker-compose.yml`.
- **The client only has public config.** `VITE_API_URL` is the only `VITE_` variable, and it's fine for that to be visible in the bundle.
- **The error handler doesn't leak internals** (`app.ts:277`). It logs the real error and sends back a generic 500 message.
- **`ILIKE` input is escaped** (`escapeLike`, `app.ts:83`), so `%` and `_` in a search match literally.

## Concerns

Severity guide:
- **Must fix:** will cause bugs, data loss, security holes, or major rework if ignored.
- **Should fix:** a meaningfully better approach that's cheap to adopt now.
- **Later:** worth knowing about, not worth doing yet.

### 1. [Must fix] No authentication on any route

*Where:* `server/src/app.ts`

*Why it matters:* once the API is live, anyone who finds the URL can create, edit, or delete books and ratings. CORS (`app.ts:23`) doesn't protect against this. The browser enforces CORS, not the server, and it only controls which websites can read responses. curl, Postman, and scripts never check CORS headers, so they skip it completely. Express still receives and runs every request.

*What to do:*
- Pick something simple that fits a single-user app. A shared secret sent as `Authorization: Bearer <token>` and checked in one middleware would do, or the deployment could stay private.
- Send credentials in a header and never in a query string. URLs end up in server logs, proxy logs, and browser history.
- Keep HTTPS on in production so headers are encrypted in transit.
- Don't put the secret in a `VITE_` variable. Anything with that prefix is baked into the JavaScript bundle and readable in DevTools.

### 2. [Should fix] `?title=` isn't validated, and there's no genre filter

*Where:* `server/src/app.ts:120` (`GET /books`), `client/src/pages/BooksMainPage.tsx:12`

*Why it matters:* every body and path param goes through zod, but `req.query.title` is used raw with `String(title)`. A request like `?title=a&title=b` arrives as an array and turns into a search for `"a,b"`. Separately, the sidebar can select a genre but can't filter by it, because `/books` only supports `?title=`. The comment at `BooksMainPage.tsx:12` already calls this out.

*What to do:*
1. Add a zod schema for the query string and parse `req.query` with it, the same way bodies get parsed. Invalid params then get the existing 400 response for free.
2. Add `?genre=` to that schema and filter on it. `matchExistingGenre` already normalizes spelling, so an exact match or a case-insensitive `ilike` works.

```ts
const bookListQuery = z.object({
  title: z.string().trim().max(200).exactOptional(),
  genre: z.string().trim().min(1).exactOptional(),
});
```

### 3. [Should fix] No API versioning

*Where:* `server/src/app.ts` (all routes), `client/src/api.ts`

*Why it matters:* routes live at the root (`/books` instead of `/api/v1/books`). Adding pagination will probably change `GET /books` from returning a bare array to something like `{ data, total }`. `BooksMainPage.tsx:25` expects `Book[]`, so that change would break the client. With versioning, the new shape can ship under a new version without breaking the old one.

*What to do:*
- Mount the routes on an `express.Router()` at `/api/v1` and update `VITE_API_URL` or `fetchJson` to match. This pairs well with splitting the routes into their own files (architecture review #9).
- Leave `/health` unversioned.
- A URL prefix is plenty here. Header-based versioning (`Accept: application/vnd.booktracker.v1+json`) keeps URLs cleaner, but it's harder to try out with curl or a browser.

### 4. [Should fix] POST routes aren't idempotent and can create duplicates

*Where:* `server/src/app.ts:142` (`POST /books`), `server/src/app.ts:156` (`POST /ratings`), `server/prisma/contract.prisma`

*Why it matters:* every POST inserts a new row. A double-clicked submit button or a retry after a network timeout creates a duplicate book or rating. `Ratings` has no unique constraint on `bookId`, so one book can have any number of ratings. That ties back to the open "one rating or many" question from architecture review #3.

*What to do:* pick one or more of these.
- **Database constraint:** if the answer is one rating per book, add a unique constraint on `bookId`. A second POST then fails cleanly, and the route can return `409 Conflict`. This is the simplest option and fits this app best.
- **`Idempotency-Key` header:** the client sends a UUID with each POST. The server saves the key with the response and replays that response if the same key comes in again. Stripe uses this pattern, but it's probably more than this project needs right now.
- **Client side:** disable the submit button while a request is in flight. This helps, but it doesn't replace a server-side guard.

### 5. [Should fix] No rate limiting (needed before deploying)

*Where:* `server/src/app.ts`, `server/package.json`

*Why it matters:* this isn't needed while the API only runs locally. Once it's public, it caps abuse of the write routes, and that matters even more while there's no auth. `GET /books?title=` also runs an `ILIKE '%...%'` query that scans the whole table, so a script hammering it puts load on the database. If YouTube gets proxied through the server, a limit also protects that API quota.

*What to do:*
- Add `express-rate-limit` with a generous global limit (for example 100 requests per 15 minutes per IP) and a stricter one on POST, PATCH, and DELETE.
- Respond with `429 Too Many Requests` and a `Retry-After` header. The library does both by default.
- If the deploy sits behind a load balancer, set Express's `trust proxy` so the limiter sees real client IPs and not the balancer's IP.

### 6. [Later] No pagination, and `GET /books` has no sort order

*Where:* `server/src/app.ts:110` (`GET /ratings`), `server/src/app.ts:129` (`GET /books`)

*Why it matters:* both routes return every row. That's fine for a personal library until it reaches a few hundred books. The books query also has no `orderBy`, so Postgres doesn't guarantee the order, and pagination needs a stable sort to work.

*What to do:* do #3 first so the response shape can change safely. Then pick an approach:

| | Offset/limit (`?limit=20&offset=40`) | Cursor/keyset (`?limit=20&after=57`) |
|---|---|---|
| How it works | Skip N rows, take M | `WHERE id > 57 ORDER BY id LIMIT 20` |
| Pros | Simple, and can jump to page 7 | Fast at any depth, and pages don't shift when rows change |
| Cons | Slower deep in the list. Adding or deleting rows can repeat or skip one | No "jump to page N". Non-unique sort columns need a tiebreaker |
| Fits | Numbered page buttons | "Load more" or infinite scroll |

Offset/limit is enough for this project. Whichever approach gets picked:
- Always sort explicitly, by `id`, or by `title` with `id` as a tiebreaker.
- Validate `limit` with zod, with a default (like 20) and a cap (like 100).
- Return metadata with the results, like `{ data: [...], total, limit, offset }` or `{ data: [...], nextCursor }`.

### 7. [Later] Plan for the YouTube API key

*Where:* `docs/future_features.md`

*Why it matters:* the BookTube feature will bring in the first third-party API key. If the React client calls YouTube directly, the key ends up in the bundle and anyone can read it.

*What to do:*
- Call YouTube from the Express server and keep the key in `server/.env`, with a placeholder in `.env.example`.
- Send the key in the `x-goog-api-key` header instead of `?key=` in the URL.
- Restrict the key to the YouTube Data API in the Google Cloud console.

### 8. [Later] More filters, sorting, and single-item routes

*Where:* `server/src/app.ts`

These fit the data that's already there:
- `GET /books?readStatus=reading`. Validate it with the existing `readStatus` enum (`app.ts:40`).
- `GET /books?author=...`
- `GET /ratings?bookId=12`, or a nested `GET /books/:id/ratings`. Right now the client would have to fetch every rating and filter it in the browser. Either style works, but pick one and use it everywhere.
- Sorting like `?sort=title` or `?sort=-dateFinished`, where a leading `-` means descending. Use a zod enum of allowed fields so nobody can sort by an arbitrary column.
- `GET /books/:id` and `GET /ratings/:id` don't exist yet. Most REST APIs have them, and the book detail page will want one. They're also a natural place for an optional `?include=ratings`.

All of these can go into the same query schema from #2.

### 9. [Later, small] The dev server listens on every network interface

*Where:* `server/src/index.ts:9`

`app.listen(port)` listens on all interfaces, so other devices on the same Wi-Fi can reach the dev server. With no auth (#1), that means they could also change data. Passing `"127.0.0.1"` as the host would match how Postgres is bound in `docker-compose.yml`. The deployed server will need to listen on all interfaces, so make it an env var if this gets changed.

## Questions to think about

- **One rating per book, or one per read?** This is still open from the architecture review, and it decides the simplest fix for #4.
- **What does auth need to look like for the MVP?** A shared secret, a login, or a deployment only you can reach? The answer decides how much work #1 is.
- **Numbered pages or "load more"?** The UI decides whether offset or cursor pagination fits better.
- **Will the BookTube page call YouTube live or cache the results?** Caching on the server would make #7 and the quota much easier to manage.
