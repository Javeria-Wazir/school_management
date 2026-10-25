/**
 * Password hashing with Node's built-in scrypt (no native add-ons, so it runs unchanged on Vercel).
 * Parameters follow the OWASP Password Storage Cheat Sheet (N=2^15, r=8, p=3).
 * Stored format: `scrypt$<N>$<r>$<p>$<salt base64>$<key base64>` so parameters can be raised later
 * without invalidating existing hashes.
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 2 ** 15;
const R = 8;
const P = 3;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password.normalize("NFKC"), salt, keyLength, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

const maxmem = (n: number, r: number) => 128 * n * r * 2;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P, maxmem: maxmem(N, R) });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [n, r, p] = parts.slice(1, 4).map(Number);
  if (![n, r, p].every(Number.isSafeInteger) || n < 2 ** 14 || n > 2 ** 20) return false;
  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  const actual = await scrypt(password, salt, expected.length, { N: n, r, p, maxmem: maxmem(n, r) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A hash of a random password, used to spend the same time when the e-mail is unknown. */
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** 12-character temporary password (letters and digits, no look-alikes) for new or reset accounts. */
export function generateTemporaryPassword(length = 12): string {
  for (;;) {
    const bytes = randomBytes(length * 2);
    let out = "";
    for (const b of bytes) {
      if (b >= ALPHABET.length * Math.floor(256 / ALPHABET.length)) continue; // avoid modulo bias
      out += ALPHABET[b % ALPHABET.length];
      if (out.length === length) break;
    }
    if (out.length === length && /[A-Za-z]/.test(out) && /[0-9]/.test(out)) return out;
  }
}
