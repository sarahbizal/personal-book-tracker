*Overall*
- Connect Youtube API to showcase the Booktubers I like to keep tabs with for book reviews and suggestions

*Utilize Date Data*
- Reading pace or streaks (finishing a book every x days)
- Yearly or monthly reading status (group books by year or month)
- Currently reading status (I'd need to add a dateStarted field so I could calculate how long as book has sat in currently reading)

*User Accounts*
- Let friends create their own accounts so I can share the tracker with them. Right now I'm the only admin and everyone else is a viewer (issue #18)
- `server/src/password.ts` doesn't care where a hash is stored, so a `users` table with a `password_hash` column can reuse `hashPassword` and `verifyPassword` as is
- Sign up should use `MIN_PASSWORD_LENGTH` from `password.ts` so the rule only lives in one place. I might also check new passwords against a breached-password list since NIST recommends that over "must include a symbol" rules
- Rehash on login: each hash stores its own scrypt settings, so old hashes keep working when I raise them. They stay at the old cost though. Add a `needsRehash(stored)` check after a successful login and save a fresh hash when the settings are out of date. Around the same time, add minimum cost limits in `parseHash` (like `N >= 2**14`) so a weak hash can't sneak in
- Unknown usernames: "no such user" would come back instantly while "wrong password" takes about 100ms of scrypt. Someone could time the responses to figure out which usernames are real, so run `verifyPassword` against a dummy hash when the user isn't found
