*Docker Start Up Steps*
1. Open Docker in Desktop (login if necessary)
2. In the root of the project repo, start the container with `docker compose up -d`
3. Confirm the container is running and healthy with `docker ps`
4. If you want to check that the tables exist run `docker exec -it book-tracker-dp psql booktracker -d booktracker` followed by `\dt` to see the tables. To exit, `\q`

*Docker Exit Steps*
1. After completing the work desired for a session, close the container with `docker compose down`


*Node/Express Steps*
1. Run `npx tsx src/index.ts` to compile and test the server
