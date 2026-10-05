*Docker Start Up Steps*

1. Open Docker in Desktop (login if necessary)
2. In the root of the project repo, start the container with `docker compose up -d`
3. Confirm the container is running and healthy with `docker ps`
4. If you want to check that the tables exist run `docker exec -it book-tracker-db psql booktracker -d booktracker` followed by `\dt` to see the tables. To exit, `\q`

*Docker Exit Steps*

1. After completing the work desired for a session, close the container with `docker compose down`


*Node/Express Steps*

1. Run `npx tsx src/index.ts` to compile and test the server


*Test Database Steps*

The tests I've made run against their own database that you will need to copy as a one time set up.
1. With Postgres container running from the repo root

```
    docker compose exec postgres psql -U booktracker -d booktracker -c "CREATE DATABASE booktracker_test;"
    docker compose exec -T postgres psql -U booktracker -d booktracker_test < server/init-db/schema.sql
    cp server/.env.test.example server/.env.test
```
2. Edit server/env.test with the test database URL and include the real password
