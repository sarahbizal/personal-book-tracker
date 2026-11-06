import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword } from "../src/password.js";

describe("password hashing", () => {
  const password = "correct horse battery staple";

  it("verifies the password it was hashed from", async () => {
    const stored = await hashPassword(password);
    expect(await verifyPassword(password, stored)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const stored = await hashPassword(password);
    expect(await verifyPassword("wrong horse battery staple", stored)).toBe(false);
  });

  it("stores the algorithm and cost settings with the hash", async () => {
    const stored = await hashPassword(password);
    expect(stored).toMatch(/^scrypt:131072:8:1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
  });

  it("gives a different hash each time because of the random salt", async () => {
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(await verifyPassword(password, second)).toBe(true);
  });

  it("verifies the same visible password typed with a different Unicode form", async () => {
    const composed = "café password 1";
    const decomposed = "café password 1";
    expect(composed).not.toBe(decomposed);

    const stored = await hashPassword(composed);
    expect(await verifyPassword(decomposed, stored)).toBe(true);
  });

  describe("returns false for a malformed stored hash", () => {
    //Break one field of a real hash so each case fails only for the reason in its label
    let valid: string[] = [];
    beforeAll(async () => {
      valid = (await hashPassword(password)).split(":");
    });
    const withField = (index: number, value: string) =>
      valid.map((part, i) => (i === index ? value : part)).join(":");

    it.each<[string, () => string]>([
      ["an empty string", () => ""],
      ["the wrong algorithm", () => withField(0, "bcrypt")],
      ["missing parts", () => valid.slice(0, 5).join(":")],
      ["a non-numeric cost", () => withField(1, "abc")],
      ["N that isn't a power of 2", () => withField(1, "1000")],
      ["N too large for the memory cap", () => withField(1, String(2 ** 30))],
      ["p over the CPU cap", () => withField(3, "17")],
      ["an invalid base64url salt", () => withField(4, "not$base64")],
      ["a salt shorter than 16 bytes", () => withField(4, "c2FsdA")],
      ["an empty hash", () => withField(5, "")],
      ["a hash that decodes to zero bytes", () => withField(5, "a")],
      ["a truncated hash", () => withField(5, valid[5]!.slice(0, 10))],
    ])("%s", async (_label, buildStored) => {
      expect(await verifyPassword(password, buildStored())).toBe(false);
    });
  });
});
