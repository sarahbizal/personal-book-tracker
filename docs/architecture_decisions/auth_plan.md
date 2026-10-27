**Authentication Plan**

*Date:* 2026-10-27 (Week 5)
*Issue:* #18 Add authentication before deploying
*Planned against:* commit `22fdca7`

## Goal

I'm the only admin and everyone else is a viewer. Viewers can browse everything except the text of my reviews. They can still see the buttons that change things, but clicking one gets them a toast instead of a change. The server is what actually enforces this. The toast is just the friendly version of a `403`.

## Decisions

- **Viewers are anonymous.** Only I log in. There's no users table, no sign-up, and no password reset.
- **Review text is the only private thing.** Star ratings, date finished, read status, and every book stay public. `bookReviewText` gets stripped on the server for anyone who isn't me.
- **Login follows the BFF (backend for frontend) pattern.** I'd been reading about it and wanted to do best practice even on a small app. BFF is usually for apps that log in through an outside provider like Google or Cognito. Its main rule is that no credential JavaScript can read ever reaches the browser. My Express server already plays that role, so I don't need a separate service. The browser only gets an httpOnly session cookie and the session itself lives in Postgres.
- **Sessions last 30 days and renew as I use the site.** There's a working Log out button that deletes the session on the server.
- **Login gets a real button in the header.** The URL isn't a secret anyway, and I think styling it will be fun.
- **Altering actions:** add, edit, and delete books, change read status, and add, edit, and delete ratings.
- **Toast text:** "Thine sigil hath no power here" to match the medieval theme.
- **Toasts come from `sonner`.** It's small and already handles accessibility (`aria-live`), so I don't need to build my own.

## What admin vs. viewer looks like

| | Viewer (anyone) | Me (logged in) |
|---|---|---|
| Browse books, genres, search | Yes | Yes |
| Star rating and date finished | Yes | Yes |
| Review text | Not in the API response at all | Yes |
| Add, edit, and delete buttons | Visible. Clicking shows the toast | Work normally |
| Header | Log in button | Admin badge and Log out button |
| Calling the API with curl or Postman | Writes return `403` and reads skip review text | Works with the cookie |

## How it works

### Server

- **Password.** My password never sits in the repo or the env file. A small script (`npm run hash-password`) hashes it with Node's built-in `crypto.scrypt` and a random salt. I paste the result into `ADMIN_PASSWORD_HASH` in `server/.env`. Login checks the password with `crypto.timingSafeEqual` so response timing doesn't hint at how close a guess was. If I forget it, I run the script again and swap the env var.
- **Sessions table.** A new `sessions` table goes through a Prisma Next migration like everything else. It has `id`, `token_hash`, `expires_at`, and `created_at`. The cookie holds a random 32-byte token and the table only stores its SHA-256 hash, so a leaked database dump can't be used to log in.
- **Cookie.** Set with `HttpOnly`, `SameSite=Strict`, `Path=/`, and a 30 day `Max-Age`. In production it's also `Secure` and uses the `__Host-` name prefix, which tells the browser to only accept it over HTTPS from this exact host.
- **Routes.**
  - `POST /auth/login` checks the password, creates a session, and sets the cookie. A wrong password always gets the same error message.
  - `POST /auth/logout` deletes the session row and clears the cookie.
  - `GET /auth/me` returns `{ isAdmin: true | false }` so the client knows which buttons should work.
- **Middleware.**
  - `loadSession` runs on every request. It reads the cookie, looks up the hash, sets `req.isAdmin`, and pushes `expires_at` forward when the session is used.
  - `requireAdmin` goes on every POST, PATCH, and DELETE for books and ratings. It returns `403` if `req.isAdmin` is false.
  - An `Origin` check on write routes rejects requests from any site not in `CORS_ORIGIN`. `SameSite=Strict` already blocks most CSRF, and this is a cheap second layer.
- **Reads.** `GET /ratings` sets `bookReviewText` to `null` for viewers. Anything else that returns ratings later has to do the same, so I'll put that in one helper.
- **Rate limiting.** `POST /auth/login` gets a strict limit, around 5 tries per 15 minutes per IP. This overlaps with #22 so I might do both together.

### Client

- **Same origin in dev.** A Vite proxy sends `/api/*` to `localhost:3000`. The browser sees one origin, which keeps the cookie first-party and means I don't need CORS credentials setup. The client's `VITE_API_URL` becomes `/api` in dev.
- **Auth context.** An `AuthProvider` calls `/auth/me` on load and shares `isAdmin`, `login`, and `logout` through React context.
- **Permission check.** A small `useAdminAction` hook wraps button handlers. If I'm not admin it shows the toast instead of running the action. `fetchJson` also shows the toast on any `403`, so a missed button still ends up in the right place.
- **Login page.** A `/login` route with one password field and a submit button. After it works, it sends me back to the main page.
- **Toasts.** `<Toaster />` from `sonner` goes in `main.tsx`, styled to match the medieval theme.

### Production

Cookies are easiest when the client and API share one site. I'll decide the details with #23 (AWS target). Either CloudFront sends `/api/*` to the backend, or the client and API live on subdomains of one domain. It's a good reason to do #20 (`/api/v1` prefix) around the same time.

## Build order

- [ ] 1. Add the `sessions` table with a Prisma Next migration
- [ ] 2. Add the hash-password script and `ADMIN_PASSWORD_HASH` to `.env.example`
- [ ] 3. Add `/auth/login`, `/auth/logout`, and `/auth/me` with tests
- [ ] 4. Add `loadSession`, `requireAdmin`, and the `Origin` check, then put them on the write routes with tests for `403`
- [ ] 5. Strip `bookReviewText` for viewers with a test for both roles
- [ ] 6. Add rate limiting to login
- [ ] 7. Add the Vite proxy and switch the client to `/api`
- [ ] 8. Add `sonner`, `AuthProvider`, and `useAdminAction`
- [ ] 9. Build the login page and the header Log in and Log out buttons
- [ ] 10. Hook `useAdminAction` into the buttons as they get built

## Open questions

- Chrome and Firefox allow `Secure` cookies on `http://localhost` but Safari might not. I'm planning to only turn on `Secure` and `__Host-` in production. Is that the right split?
- Should `app.ts` get split into routers (#28) before this lands? Auth adds three routes and two middlewares to a file that's already long.
