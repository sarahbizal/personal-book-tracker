**Architecture Review**

*Date:* 2026-10-16 (Week 3)
*Reviewed against:* commit `4ac464b` (README goals, server, client, docs)
*Assumptions:* single-user learning/portfolio project, deploying to AWS by week 5

## Verdict

**On track, with some changes needed.** The foundation is good for week 3: the stack choices are sensible, the test database is separate from the real one, the MVP is clear and the commits are clean. The biggest gap is that the API only handles the happy path. It doesn't check input or say clearly what went wrong. That's fine while testing with curl, but it will hurt once the add and edit forms get built. The data model also has a couple of choices that will make the genre filter and ratings harder than they need to be.

## Checklist

Work through these in order. Each one is a self-contained chunk.

- [ ] 1. API validation, status codes, and error handling (+ tests for failure cases)
- [ ] 2. Settle the schema: read status and genre constraints, one-or-many ratings decision
- [ ] 3. Switch update routes to PATCH and fix the `null` date case
- [ ] 4. Move the API URL and CORS origin into env vars; load all books on page open; add loading/error states
- [x] 5. Set up migrations
- [ ] 6. Pick the AWS target and deploy a "hello world" version early in week 4
- [ ] 7. Pin the `"latest"` dependency versions in the client

Later (no pressure):
- [ ] Split routes into `express.Router()` files
- [ ] Add `created_at` (and eventually `date_started`) columns
- [ ] Fix the hard-coded Docker healthcheck username
- [ ] Fix `docker-compose.yml` so a fresh volume gets the user and password from `server/.env`

## What's solid

- **The test database safety guard** (`server/tests/setup.ts`). It refuses to run tests against anything except a `*_test` database. Plenty of working developers have wiped a real database by skipping this.
- **Splitting `app.ts` from `index.ts`.** This lets supertest load the app without starting a server. It's the standard pattern.
- **Letting the database enforce rules.** The rating has to be between 1 and 5, and deleting a book also deletes its ratings. The second one was learned from a real bug, and that tends to stick.
- **Secrets are handled correctly.** `.env` and `.env.test` are ignored by git and were never committed. The example files sit next to them. One exception: an early commit (`d22e8f9`) hardcoded the dev database password in `docker-compose.yml`. That password was rotated on 2026-10-20 and no longer works.
- **Clear scope.** The README has an MVP section with mockups and a separate post-MVP list.
- **Frontend habits.** Shared `Book` type, a conventions skill, clickable things are `<button>`s, the search input has an `aria-label`, and Storybook is set up. All of this is what a frontend team would expect.
- **Git workflow.** Small PRs and commit messages that say what changed.

## Concerns

Severity guide:
- **Must fix:** will cause bugs, data loss, security holes, or major rework if ignored.
- **Should fix:** a meaningfully better approach that's cheap to adopt now.
- **Later:** worth knowing about, not worth doing yet.

### 1. [Must fix] No input validation, error handling, or proper status codes

*Where:* `server/src/app.ts`

*Why it matters:* an API has to tell the client what went wrong and whose fault it was. That's what HTTP status codes are for. Right now:
- `POST /ratings` with `rating: 47` or `bookId: 9999` gets rejected by the database and returns a generic 500 ("server broke") instead of a 400 ("your input is bad").
- `PUT /books/abc` turns the id into `NaN`.
- `PUT` or `DELETE` on a book that doesn't exist still returns 200.
- The future add-book form will have no way to say "title is required."

*What to do:*
1. Check the request body at the top of each route and return `400` with a message when it's bad. Zod is the usual tool for this in TypeScript; a few `if` checks also work.
2. Return `404` when the id isn't found, and `201` from POST routes.
3. Add one error-handling middleware at the bottom of `app.ts` to catch anything else. Express 5 already passes errors from async routes to it.
4. Add tests for these failure cases. They're the checks `testing_notes.md` already does by hand with curl.

```ts
if (!title || !author || !genre) {
  return res.status(400).json({ error: "title, author, and genre are required" });
}
```

### 2. [Should fix] Genre and read status are free text, but the UI treats them as fixed lists

*Where:* `server/init-db/schema.sql`, `client/src/pages/BooksMainPage.tsx`

*Why it matters:* this is about data integrity. If one book is saved as "Fantasy" and another as "fantasy ", the sidebar filter treats them as two genres. Read status has the same risk ("want to read" vs "Want To Read"). Meanwhile the client has `genres` hardcoded, so the database and the UI can drift apart.

*What to do:*
- For `read_status`, add a `CHECK (read_status IN ('want to read', 'reading', 'read'))` constraint, the same way ratings are already limited.
- For genre, either do the same, or build the sidebar list from the database (`SELECT DISTINCT genre`) and clean up the text when saving. A separate `genres` table is the "proper" answer, but it's more than this project needs right now.

### 3. [Should fix] The ratings table doesn't match the requirements

*Where:* `server/init-db/schema.sql`

*Why it matters:* this is about cardinality, meaning how many of one thing can belong to another. The README describes rating and review as details of each book. But the schema allows **many** ratings per book, and nothing stops duplicates. Once the detail page gets built, there's no clear answer for which rating to show.

*What to do:* decide whether a book has one rating or many.
- **One:** add `UNIQUE (book_id)` to `ratings`.
- **Many** (to track rereads): keep the schema as it is, and plan for the detail page to show a list of ratings.

Either choice is fine. Right now the schema just hasn't settled it.

### 4. [Should fix] PUT is used for partial updates, and a date can't be cleared

*Where:* `server/src/app.ts` (`PUT /books/:id`, `PUT /ratings/:id`)

*Why it matters:* by convention, `PUT` replaces the whole record and `PATCH` changes only the fields sent. These routes behave like PATCH. There's also a side effect of the week two fix: since a missing `dateFinished` is now skipped, sending `null` is skipped too. That means a finish date can't be removed once it's set.

*What to do:*
1. Rename the update routes to `PATCH`.
2. Treat "not sent" and "sent as null" differently: `dateFinished === undefined` means leave it alone, and `null` means clear it.

### 5. [Should fix] Settings that only work on one machine

*Where:* `client/src/pages/BooksMainPage.tsx`, `server/src/app.ts`

*Why it matters:* this is about environment configuration. `http://localhost:3000` and the CORS origin `localhost:5173` are hard-coded, so both will break on deploy to AWS.

*What to do:*
- Client: use `import.meta.env.VITE_API_URL`.
- Server: read the allowed CORS origin from `process.env`.
- Add both to the `.env.example` files.

While in `BooksMainPage`, also:
- Check `response.ok` before using the response.
- Add loading and error states.
- Load all books when the page first opens. Right now the grid stays empty until a search runs.

### 6. [Should fix] Schema changes are applied by hand to two databases

*Where:* `docs/schema_changes.md`

*Why it matters:* `schema.sql`, the dev database, and the test database are kept in sync by hand, so they will drift apart eventually. A fresh AWS database will have the same problem. Migrations exist to fix this: versioned SQL files that run in order, the same way on every database.

*What to do:* move this ahead of deployment. Check `server/prisma-next.md` and the Prisma Next docs to see whether its migration tooling is usable yet. If it isn't, a plain SQL migration tool like dbmate or node-pg-migrate works with any ORM. This is a good one for job readiness, since every team uses migrations.

### 7. [Should fix, quick] Unpinned and mismatched dependency versions

*Where:* `client/package.json`, `server/package.json`

- The client lists `vitest`, `playwright`, and `@chromatic-com/storybook` as `"latest"`. A fresh install months from now could pull in breaking changes. Pin them to real versions.
- The server uses TypeScript 7 and the client uses TypeScript 6. That works, but expect confusing differences between the two.

### 8. [Later] Prisma is a release candidate

*Where:* `server/package.json` (`^8.0.0-rc`)

Building a learning project on prerelease software means thinner docs and odd bugs. Some of the week one "contract" setup friction came from the tool, not from you. If it was chosen on purpose to learn what's next, that's a fair call.

### 9. [Later] All routes live in one file

*Where:* `server/src/app.ts`

Nine routes in one file is fine. Once genres, BookTube, or auth get added, split them into `routes/books.ts` and `routes/ratings.ts` with `express.Router()`. That's how most Express codebases are laid out.

### 10. [Later] No `created_at` timestamps

*Where:* `server/init-db/schema.sql`

These are cheap to add and they power "recently added" sorting. The reading-pace ideas in `future_features.md` will also want a `date_started` column.

### 11. [Later, small] The Docker healthcheck has a hard-coded username

*Where:* `docker-compose.yml`

The healthcheck hard-codes `-U booktracker -d booktracker`, but `POSTGRES_USER` defaults to `postgres`. Use the same variables in both places.

### 12. [Later, small] A fresh Docker volume gets the wrong Postgres user and an empty password

*Where:* `docker-compose.yml`

*Why it matters:* the `environment:` block fills in `POSTGRES_USER` and `POSTGRES_PASSWORD` from the shell or a repo-root `.env`, not from `env_file: ./server/.env`, and there's no root `.env`. Those values win over `env_file`, so `docker compose config` shows `POSTGRES_USER: postgres` and an empty `POSTGRES_PASSWORD`. Postgres only reads these on the first start of an empty volume. The existing `book-tracker-data` volume isn't affected, but a fresh one (a new machine, or `docker compose down -v`) won't start. Since the migrations work, `docs/spin_up_steps.md` relies on a fresh volume coming up correctly, so this matters for anyone setting the project up from scratch.

*What to do:* remove the `environment:` block so `env_file` supplies the values (or start compose with `--env-file server/.env`). Fix it together with #11, then test it with a throwaway compose project on a different port and leave the real volume alone. Until then, don't run `docker compose down -v`.

## Questions to think about

- **One rating per book, or one per read?** This shapes the detail page more than anything else.
- **Is BookTube really post-MVP?** There's already a route and page for it, two weeks before the deadline. Scaffolding it is cheap, but it's worth noticing where the pull is coming from.
- **What does "deployed on AWS" mean for week 5?** EC2 with Docker Compose, Elastic Beanstalk, or RDS plus a static frontend on S3? Each one is a different amount of work. Pick the simplest option that still teaches something, and pick it soon.
- **Is there any authentication?** For a single-user app that's live on the internet, anyone with the URL can delete books. Even a simple shared secret or a private deployment would help. Is this needed for the MVP, or will the URL stay private?
