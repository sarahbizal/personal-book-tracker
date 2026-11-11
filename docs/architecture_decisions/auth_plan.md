**Authentication Plan**

*Date:* 2026-10-27 (Week 5)
*Issue:* #18 Add authentication before deploying
*Planned against:* commit `22fdca7`

## Goal

I'm the only admin and everyone else is a viewer. Viewers can browse everything except the text of my reviews. They can still see the buttons that change things, but clicking one gets them a toast instead of a change. The server is what actually enforces this. The toast is just the friendly version of a `401`.

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
| Calling the API with curl or Postman | Writes return `401` and reads skip review text | Works with the cookie |

## How it works

### Server

- **Password.** My password never sits in the repo or the env file. A small script (`npm run hash-password`) hashes it with Node's built-in `crypto.scrypt` and a random salt. I paste the result into `ADMIN_PASSWORD_HASH` in `server/.env`. Login checks the password with `crypto.timingSafeEqual` so response timing doesn't hint at how close a guess was. If I forget it, I run the script again and swap the env var.
- **Sessions table.** A new `sessions` table goes through a Prisma Next migration like everything else. It has `id`, `token_hash`, `expires_at`, and `created_at`. The cookie holds a random 32-byte token and the table only stores its SHA-256 hash, so a leaked database dump can't be used to log in.
- **Cookie.** Set with `HttpOnly`, `SameSite=Strict`, `Path=/`, and a 30 day `Max-Age`. In production it's also `Secure` and uses the `__Host-` name prefix, which tells the browser to only accept it over HTTPS from this exact host.
- **Routes.** These go in their own `auth.ts` router at `/api/v1/auth`, so the proxy and `fetchJson` treat them like every other route.
  - `POST /auth/login` checks the password, creates a session, and sets the cookie. A wrong password always gets the same error message.
  - `POST /auth/logout` deletes the session row and clears the cookie.
  - `GET /auth/me` returns `{ isAdmin: true | false }` so the client knows which buttons should work.
- **Middleware.**
  - `loadSession` runs on every request. It reads the cookie, looks up the hash, sets `req.isAdmin`, and pushes `expires_at` forward when the session is used.
  - `requireAdmin` covers every request that isn't a GET, HEAD, or OPTIONS once the auth routes have had their turn. It returns `401` if `req.isAdmin` is false. I first planned on `403`, but a viewer isn't logged in at all, so `401` fits better. It sits on the whole API router after the auth routes instead of on each route, so a write route I add later is protected without me remembering to do it. That also means a viewer who sends a POST to a path that doesn't exist gets `401` instead of `404`. I'm fine with that since it doesn't hint at which routes exist.
  - An `Origin` check on write routes rejects requests from any site not in `CORS_ORIGIN` with a `403`. It covers login and logout too. If a request has no `Origin` header at all, it moves on to `requireAdmin`, since curl and other non-browser clients usually don't send one. `SameSite=Strict` already blocks most CSRF, and this is a cheap second layer.
- **Reads.** `GET /ratings` sets `bookReviewText` to `null` for viewers and sends `Cache-Control: private, no-store` so a shared cache can't hand my version to someone else. Anything else that returns ratings later has to do the same. That includes `/books` if I ever add an `include` for its `ratings` relation.
- **Rate limiting.** `POST /auth/login` allows 5 failed tries per 15 minutes per IP with `express-rate-limit`. Successful logins don't count. After 5 failures, every try gets a `429` with a `Retry-After` header until the 15 minutes are up, even the right password. The limit runs before the password check, so a blocked request never reaches scrypt. #22 added an API-wide limit of 300 requests per 15 minutes per IP on all of `/api/v1`, login included. `/health` isn't limited so the host's health checks can't get blocked. I skipped a separate write limit since every write already needs my session. If friends get accounts, a write limit per user (not per IP) makes sense then.
  - The counts live in memory. That's fine with one server, but if I ever run more than one instance each would keep its own counts, so I'd need a shared store like Redis.
  - `TRUST_PROXY` is the number of proxies in front of the server. Without it, `req.ip` behind a load balancer would be the proxy's address and everyone would share one limit. I went with a count instead of `true` because `true` trusts whatever `X-Forwarded-For` the browser sends, and then anyone could make up a new IP for every try. I'll set the real value with #23.
  - Only 2 password checks run at once. Each scrypt check holds about 128 MB, and the per-IP limit doesn't stop a flood from lots of different IPs. I didn't add a global login limit since someone could use it to lock me out.
- **Session cleanup.** A successful login deletes expired sessions. `npm run logout-all` deletes every session and prints how many it removed, which I'll use if I ever change my password.

### Client

- **Same origin in dev.** A Vite proxy sends `/api/*` to `localhost:3000`. The browser sees one origin, which keeps the cookie first-party and means I don't need CORS credentials setup. `fetchJson` already adds `/api/v1` (#20), so `VITE_API_URL` becomes an empty string in dev. The `if (!API_URL)` check in `api.ts` rejects an empty string right now, so I'll change it to only reject a missing value.
- **Auth context.** An `AuthProvider` calls `/auth/me` on load and shares `isAdmin`, `login`, and `logout` through React context.
- **Permission check.** A small `useAdminAction` hook wraps button handlers. If I'm not admin it shows the toast instead of running the action. `fetchJson` also shows the toast on any `401`, so a missed button still ends up in the right place.
- **Login page.** A `/login` route with one password field and a submit button. After it works, it sends me back to the main page.
- **Toasts.** `<Toaster />` from `sonner` goes in `main.tsx`, styled to match the medieval theme.

### Production

Cookies are easiest when the client and API share one site. I'll decide the details with #23 (AWS target). Either CloudFront sends `/api/*` to the backend, or the client and API live on subdomains of one domain. It's a good reason to do #20 (`/api/v1` prefix) around the same time.

When I deploy, I have to set `TRUST_PROXY` and check that `req.ip` shows my real IP and not the proxy's. If I skip it, every request looks like it came from the proxy, and anyone could lock me out of login with 5 wrong guesses. It also puts every visitor on one shared API limit, so a few hundred requests from anyone would lock everybody out of the API.

## Build order

- [x] 1. Add the `sessions` table with a Prisma Next migration
- [x] 2. Add the hash-password script and `ADMIN_PASSWORD_HASH` to `.env.example`
- [x] 3. Add `/auth/login`, `/auth/logout`, and `/auth/me` with tests
- [x] 4. Add `loadSession`, `requireAdmin`, and the `Origin` check, then put them on the write routes with tests for `401`
- [x] 5. Strip `bookReviewText` for viewers with a test for both roles
- [x] 6. Add rate limiting to login
- [ ] 7. Add the Vite proxy and set `VITE_API_URL` to an empty string in dev
- [ ] 8. Add `sonner`, `AuthProvider`, and `useAdminAction`
- [ ] 9. Build the login page and the header Log in and Log out buttons
- [ ] 10. Hook `useAdminAction` into the buttons as they get built

## Open questions

- ~~Chrome and Firefox allow `Secure` cookies on `http://localhost` but Safari might not. I'm planning to only turn on `Secure` and `__Host-` in production. Is that the right split?~~ **Resolved:** `Secure` and `__Host-` are on everywhere unless `INSECURE_COOKIES=true`, which I only set locally and in `.env.test`. I didn't key it off `NODE_ENV` because Vitest sets that to `test`, and supertest won't resend `Secure` cookies over plain http.
- Should `app.ts` get split into routers (#28) before this lands? Auth adds three routes and two middlewares to a file that's already long.
