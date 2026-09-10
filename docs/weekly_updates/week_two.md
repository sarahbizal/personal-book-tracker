**Week Two**

*Decisions*
- Made the decision to include Temporal Polyfill for dates so that I can have the option to add other features in the future that utilize that data
- Used curl commands in the terminal to test my connections until I could create automated tests
- Split out app.ts from index.ts. app.ts holds all of the routes expect for just spinning up the server

*Accomplishments*
- Set up POST, PUT, and DELETE for /books, /books/:id, /ratings, and /ratings/:id
- Installed and set up initial test with Vitest
- Set up all my automated tests with Vitest

*Challenges*
- Conceptually, I have an idea of what should be happening. I can identify a pattern happening and try to replicate it. However, syntax for that particular pattern isn't learned yet. It's something that keeps coming up as I've learned js, python, html, and css. Time and practice will help that I guess!
- Typos, man, typos. 
- Ran into an error when testing delete /books/:id because of my foreign key constraint on my ratings table. Deleting a book would still leave the rating associated with it but the rating would not be pointed at any book. I added a cascading delete on the book_id
- At first I thought I'd be using Jest but it wasn't compatible yet with TypeScript 7. I did use Claude's help to decide what to use and I went with Vitest instead
- The Vitest tests were a challenge for me because of the syntax struggle. I could, again, identify the pattern but struggled with the exact sytnax. I had to research and use Claude to figure out what the exact language was.
- Ran into a really interesting bug when working on my /ratings and /ratings/:id tests. There were two parts to it, first I'd forgotten that Temporal wants a certain date format and I kept using the wrong one. Second, in my app.ts I'd set the route data wrong for /ratings/:id. I had dateFinished assigned as null if a value wasn't entered instead of just skipping it. That ended up overwriting the date entirely every time! 

*Notes*
- I started adding more documentation at this point to help me remember how to do certain things in my project
