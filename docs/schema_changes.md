*How to Make Schema Changes*

I'm switching from making changes by hand with psql to using Prisma Next migrations. The big change is that `server/prisma/contract.prisma` is now the source of truth. I edit the contract first and let Prisma write the SQL, instead of changing the database and copying that back into the contract with `contract infer`.

Heads up: these steps only work once the baseline migration is in place. That's the next step after the Prisma upgrade. Until then, keep using the old process at the bottom of this file.

All commands run from `server/`.

1. Edit `prisma/contract.prisma` with the change you want. For example, adding a `created_at` column to `books` means adding a `createdAt` field to the `Books` model with `@map("created_at")`.
2. Run `npx prisma contract emit` to regenerate `contract.json` and `contract.d.ts`.
3. Run `npx prisma migration plan --name <short-description>` (example: `--name add-books-created-at`). This writes a new migration folder in `server/migrations/`. It's offline, so it compares the contract against the latest migration on disk and not against the database.
4. Open the new migration and read the SQL before going further. Watch for things like a new `NOT NULL` column with no default, which will fail on a table that already has rows. If the plan would lose data, Prisma asks you to pass `--rename` or `--delete` so it knows what you meant.
5. Run `npx prisma db migrate --show` to preview what's going to run on the dev database.
6. Run `npx prisma db migrate` to apply it to the dev database.
7. Apply it to the test database too (see below), then run `npm test`.
8. Commit `contract.prisma`, `contract.json`, `contract.d.ts`, and the new migration folder together.

Don't use `npx prisma db update` for real changes. It pushes the contract straight onto the database without writing a migration, so the change can't be repeated anywhere else. It's fine for a throwaway database but that's about it.

`db migrate` uses `DATABASE_URL` from `server/.env` by default, which is the dev database. For any other database (test, AWS), pass its URL with `--db`.


*Databases That Already Have Tables*

`db migrate` decides what to run based on the marker each database carries. A brand new empty database has no marker, so it gets every migration from the baseline on. That's what an AWS database should be.

A database whose tables were built some other way, like with `server/init-db/schema.sql`, needs a one-time adoption step first. Otherwise `db migrate` tries to run the baseline's `CREATE TABLE`s on tables that already exist. Once the baseline exists, check the database matches it and sign it with `npx prisma db sign --db <url>`. After that, `db migrate` only applies migrations newer than the baseline. The dev and test databases both need this when the baseline lands.


*How to Make Schema Changes to Test Database*

The development and test databases are still separate, but they both get changes the same way now. This pulls the test URL out of `server/.env.test` so the password doesn't end up typed into the terminal:

```bash
npx prisma db migrate --db "$(grep '^DATABASE_URL' .env.test | cut -d= -f2- | tr -d '"')"
```

To rebuild the test database from scratch, drop it, create it again, and let the migrations build the tables. Don't run this until `server/migrations/` has a baseline, or you'll end up with an empty test database.

```bash
docker compose exec postgres psql -U booktracker -d booktracker -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS booktracker_test WITH (FORCE);" -c "CREATE DATABASE booktracker_test;"
npx prisma db migrate --db "$(grep '^DATABASE_URL' .env.test | cut -d= -f2- | tr -d '"')"
```

Until the baseline lands, rebuild it the old way from `schema.sql` (run from the repo root):

```bash
docker compose exec postgres psql -U booktracker -d booktracker -c "DROP DATABASE booktracker_test;" -c "CREATE DATABASE booktracker_test;"
docker compose exec -T postgres psql -U booktracker -d booktracker_test < server/init-db/schema.sql
```

I still need to decide what happens to `server/init-db/schema.sql`. Once the migrations can build every table, keeping it as a second copy of the schema means the two will drift apart eventually.
