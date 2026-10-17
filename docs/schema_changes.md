*How to Make Schema Changes*

I switched from making changes by hand with psql to using Prisma Next migrations. The big change is that `server/prisma/contract.prisma` is now the source of truth. I edit the contract first and let Prisma write the SQL, instead of changing the database and copying that back into the contract with `contract infer`. The first migration in `server/migrations/` is the baseline, which creates the `books` and `ratings` tables the way they were in the old `schema.sql`.

All commands run from `server/`.

1. Edit `prisma/contract.prisma` with the change you want. For example, adding a `created_at` column to `books` means adding a `createdAt` field to the `Books` model with `@map("created_at")`.
2. Run `npx prisma contract emit` to regenerate `contract.json` and `contract.d.ts`.
3. Run `npx prisma migration plan --name <short-description>` (example: `--name add-books-created-at`). This writes a new migration folder in `server/migrations/app/`. It's offline, so it doesn't look at the database. It starts from the contract the `db` ref points at (`server/migrations/app/refs/db.json`) and writes the SQL to get from there to the new contract.
4. Open the new migration and read the SQL before going further. Watch for things like a new `NOT NULL` column with no default, which will fail on a table that already has rows. If the plan would lose data, Prisma asks you to pass `--rename` or `--delete` so it knows what you meant.
5. Run `npx prisma db migrate --show` to preview what's going to run on the dev database.
6. Run `npm run db:migrate` to apply it to the dev database. This also moves the `db` ref forward to the new contract, so the next `migration plan` starts from this migration. If you run plain `npx prisma db migrate` on dev instead, the ref stays behind and the next plan branches off the old contract. Prisma warns that it "forks the migration graph" when that happens.
7. Run `npm run db:migrate:test` to apply it to the test database, then run `npm test`. This one leaves the ref alone on purpose, since the ref follows dev.
8. Commit `contract.prisma`, `contract.json`, `contract.d.ts`, and everything that changed under `server/migrations/` together. That's the new migration folder, a new contract snapshot in `migrations/snapshots/` (the migration imports it), and the updated `refs/db.json`.

Don't use `npx prisma db update` for real changes. It pushes the contract straight onto the database without writing a migration, so the change can't be repeated anywhere else. It's fine for a throwaway database but that's about it.

The npm scripts pick the database from the env file. `db:migrate` and `db:status` use `server/.env` (dev), and the `:test` versions use `server/.env.test`, even if `DATABASE_URL` is already set in your shell. For any other database, like AWS, pass its URL with `npx prisma db migrate --db <url>`.


*Databases That Already Have Tables*

`db migrate` decides what to run based on the marker each database carries. A brand new empty database has no marker, so it gets every migration starting from the baseline. That's what an AWS database should be.

A database whose tables were built some other way, like from the old `schema.sql`, needs a one-time adoption step first. Otherwise `db migrate` tries to run the baseline's `CREATE TABLE`s on tables that already exist. Sign it with `npx prisma db sign --no-advance-ref --db <url>`, which checks the schema matches before it writes anything. After that, `db migrate` only applies migrations newer than the baseline. I did this for my dev and test databases when the baseline landed.


*How to Rebuild the Test Database*

To rebuild the test database from scratch, drop it, create it again, and let the migrations build the tables:

```bash
docker compose exec postgres psql -U booktracker -d booktracker -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS booktracker_test WITH (FORCE);" -c "CREATE DATABASE booktracker_test;"
npm run db:migrate:test
```

`server/init-db/create-test-db.sql` creates an empty `booktracker_test` the first time the Docker volume is made. It doesn't define any tables. Those only live in the migrations now.
