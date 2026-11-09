import { createHash, randomBytes } from "node:crypto";
import express, {
  type CookieOptions,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import { db } from "../prisma/db.js";
import { verifyPassword } from "./password.js";

declare global {
  namespace Express {
    interface Request {
      isAdmin?: boolean;
    }
  }
}

export interface AuthConfig {
  adminPasswordHash: string;
  secureCookies: boolean;
  allowedOrigins: string[];
}

const SESSION_HOURS = 30 * 24;
//Renew once the session is more than a day old, so most requests skip the write
const RENEW_AFTER_HOURS = 24;
const TOKEN_BYTES = 32;
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const loginSchema = z.object({ password: z.string().min(1).max(256) });

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

function deleteSession(token: string) {
  return db.orm.public.Sessions.where({
    tokenHash: hashToken(token),
  }).deleteAll();
}

//Runs after the auth router, so login and logout stay reachable for viewers
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method) || req.isAdmin === true) {
    next();
    return;
  }
  res.status(401).json({ error: "Log in as admin to do that" });
}

export function createAuth({
  adminPasswordHash,
  secureCookies,
  allowedOrigins,
}: AuthConfig) {
  //A missing Origin falls through to requireAdmin, since non-browser clients often don't send one
  function checkOrigin(req: Request, res: Response, next: NextFunction) {
    const origin = req.get("Origin");
    if (
      SAFE_METHODS.has(req.method) ||
      origin === undefined ||
      allowedOrigins.includes(origin)
    ) {
      next();
      return;
    }
    res.status(403).json({ error: "Requests from this site aren't allowed" });
  }

  //__Host- makes the browser require Secure, Path=/ and no Domain, so it only works over HTTPS
  const cookieName = secureCookies ? "__Host-session" : "session";
  //clearCookie only removes a cookie whose name and attributes match, so both share these
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: secureCookies,
  };

  function setSessionCookie(res: Response, token: string) {
    res.cookie(cookieName, token, {
      ...cookieOptions,
      maxAge: SESSION_HOURS * 60 * 60 * 1000,
    });
  }

  function readToken(req: Request) {
    const token: unknown = req.cookies?.[cookieName];
    return typeof token === "string" && token ? token : null;
  }

  async function loadSession(req: Request, res: Response, next: NextFunction) {
    req.isAdmin = false;
    const token = readToken(req);
    if (!token) {
      next();
      return;
    }

    const now = Temporal.Now.instant();
    const session = await db.orm.public.Sessions.where({
      tokenHash: hashToken(token),
    })
      .where((s) => s.expiresAt.gt(now))
      .first();
    if (!session) {
      next();
      return;
    }
    req.isAdmin = true;

    const renewed = await db.orm.public.Sessions.where({ id: session.id })
      .where((s) =>
        s.expiresAt.lt(now.add({ hours: SESSION_HOURS - RENEW_AFTER_HOURS })),
      )
      .update({ expiresAt: now.add({ hours: SESSION_HOURS }) });
    if (renewed) setSessionCookie(res, token);
    next();
  }

  const authRouter = express.Router();

  //Responses depend on the cookie, so a shared cache must never reuse them
  authRouter.use((_req: Request, res: Response, next: NextFunction) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  authRouter.post("/login", async (req: Request, res: Response) => {
    //A bad body gets the same answer as a wrong password so it reveals nothing
    const body = loginSchema.safeParse(req.body);
    if (
      !body.success ||
      !(await verifyPassword(body.data.password, adminPasswordHash))
    ) {
      res.status(401).json({ error: "Wrong password" });
      return;
    }

    //Logging in again replaces the current session instead of leaving it valid
    const oldToken = readToken(req);
    if (oldToken) await deleteSession(oldToken);

    const token = randomBytes(TOKEN_BYTES).toString("base64url");
    await db.orm.public.Sessions.create({
      tokenHash: hashToken(token),
      expiresAt: Temporal.Now.instant().add({ hours: SESSION_HOURS }),
    });
    setSessionCookie(res, token);
    res.json({ isAdmin: true });
  });

  authRouter.post("/logout", async (req: Request, res: Response) => {
    const token = readToken(req);
    if (token) await deleteSession(token);
    res.clearCookie(cookieName, cookieOptions);
    res.status(204).end();
  });

  authRouter.get("/me", (req: Request, res: Response) => {
    res.json({ isAdmin: req.isAdmin === true });
  });

  return { checkOrigin, loadSession, authRouter };
}
