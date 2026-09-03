(Automated tests TBD, placeholder for now. Run `npx tsx src/index.ts` in code editor terminal and open another terminal to run other commands)

**Books**
*Create*

```
  curl -X POST http://localhost:3000/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Book","author":"Test Author","genre":"Fiction"}'
```

*Read*

`curl http://localhost:3000/books`

*Update*
```
  curl -X PUT http://localhost:3000/books/1 \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Title","author":"Updated Author","genre":"Sci-Fi"}'
```

*Delete*

`curl -X DELETE http://localhost:3000/books/1`

**Ratings**
*Create*
```
  curl -X POST http://localhost:3000/ratings \
  -H "Content-Type: application/json" \
  -d '{"bookId":1,"rating":5,"bookReviewText":"Great read","dateFinished":"2026-01-15"}'
```

*Check for Invalid Book Id*
```
  curl -X POST http://localhost:3000/ratings \
  -H "Content-Type: application/json" \
  -d '{"bookId":9999,"rating":5,"bookReviewText":"Should fail","dateFinished":"2026-01-15"}'
```

*Check for Invalid Rating Value*
```
  curl -X POST http://localhost:3000/ratings \
  -H "Content-Type: application/json" \
  -d '{"bookId":1,"rating":47,"bookReviewText":"Should fail","dateFinished":"2026-01-15"}'
```

*Read*
`curl http://localhost:3000/ratings`

*Update*
```
  curl -X PUT http://localhost:3000/ratings/1 \
  -H "Content-Type: application/json" \
  -d '{"rating":4,"bookReviewText":"Updated review text","dateFinished":"2026-02-01"}'
```

*Delete*

`curl -X DELETE http://localhost:3000/ratings/1`
