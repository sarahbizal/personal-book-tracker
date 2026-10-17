*Docker Start Up Steps*

1. Open Docker in Desktop (login if necessary)
2. In the root of the project repo, start the container with `docker compose up -d`
3. Confirm the container is running and healthy with `docker ps`
4. If you want to check that the tables exist run `docker exec -it book-tracker-db psql booktracker -d booktracker` followed by `\dt` to see the tables. To exit, `\q`

*Docker Exit Steps*

1. After completing the work desired for a session, close the container with `docker compose down`


*Node/Express Steps*

1. Run `npx tsx src/index.ts` to compile and test the server


*Database Setup Steps*

The tables come from the Prisma migrations in `server/migrations/`. The first time the Docker volume is created, `server/init-db/create-test-db.sql` makes an empty `booktracker_test` database next to the dev one, and then the migrations build the tables in both. This is a one time setup.

1. With the Postgres container running, copy the test env file and edit it with the test database URL and the real password

```
    cp server/.env.test.example server/.env.test
```
2. From `server/`, build the tables in both databases

```
    npm run db:migrate
    npm run db:migrate:test
```
3. Check both are up to date with `npm run db:status` and `npm run db:status:test`, then run `npm test`

If your Docker volume was created before the migrations existed, the tables are already there and the databases need a one time `npx prisma db sign --no-advance-ref --db <url>` instead. See `docs/schema_changes.md`.
