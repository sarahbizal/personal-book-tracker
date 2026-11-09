import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

export const MIN_PASSWORD_LENGTH = 12;

const DEFAULT_COST = { N: 2 ** 17, r: 8, p: 1 };
const SALT_BYTES = 16;
const KEY_BYTES = 32;
//scrypt needs about 128 * N * r bytes, past Node's 32 MB default. 512 MB leaves room to raise N once
const MAX_MEM = 512 * 1024 * 1024;
//maxmem doesn't limit p, which multiplies CPU time instead of memory
const MAX_P = 16;

const BASE64URL = /^[A-Za-z0-9_-]+$/;
const POSITIVE_INT = /^[1-9]\d*$/;

function deriveKey(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  //"é" can be one code point or two depending on the device, so the same password could hash differently
  const normalized = password.normalize("NFC");
  return new Promise((resolve, reject) => {
    scrypt(normalized, salt, KEY_BYTES, { ...options, maxmem: MAX_MEM }, (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
}

function parseHash(stored: string) {
  const parts = stored.split(":");
  if (parts.length !== 6) return null;
  const [algorithm, n, r, p, salt, hash] = parts as [string, string, string, string, string, string];
  if (algorithm !== "scrypt") return null;
  if (![n, r, p].every((value) => POSITIVE_INT.test(value))) return null;
  if (Number(p) > MAX_P) return null;
  if (!BASE64URL.test(salt) || !BASE64URL.test(hash)) return null;

  //A 1-character hash decodes to 0 bytes, and two empty buffers compare as equal
  const saltBytes = Buffer.from(salt, "base64url");
  const hashBytes = Buffer.from(hash, "base64url");
  if (saltBytes.length < SALT_BYTES || hashBytes.length !== KEY_BYTES) return null;

  return {
    cost: { N: Number(n), r: Number(r), p: Number(p) },
    salt: saltBytes,
    hash: hashBytes,
  };
}

export function isValidPasswordHash(stored: string): boolean {
  return parseHash(stored) !== null;
}

//Uses ":" instead of "$" because env loaders expand "$"
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, DEFAULT_COST);
  const { N, r, p } = DEFAULT_COST;
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join(":");
}

//Returns false for a wrong password or a malformed stored hash, so callers have one failure path
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseHash(stored);
  if (!parsed) return false;

  let key: Buffer;
  try {
    key = await deriveKey(password, parsed.salt, parsed.cost);
  } catch {
    //scrypt throws on invalid cost settings
    return false;
  }
  return timingSafeEqual(key, parsed.hash);
}
