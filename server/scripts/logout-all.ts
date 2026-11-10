import { db } from "../prisma/db.js";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Run this from server/ so it picks up .env");
  process.exit(1);
}

await db.connect({ url: process.env.DATABASE_URL });
try {
  //The ORM refuses to delete without a filter, so this one matches every row on purpose
  const removed = await db.orm.public.Sessions.where((s) =>
    s.tokenHash.isNotNull(),
  ).deleteAndCount();
  console.log(`Logged out ${removed} session${removed === 1 ? "" : "s"}`);
} finally {
  await db.close();
}
