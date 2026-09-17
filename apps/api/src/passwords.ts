import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Password hashing with nothing but `node:crypto`.
 *
 * `bcrypt` is the usual answer and is banned here: it is a native addon, and
 * rule 2 in AGENTS.md says a fresh clone compiles nothing. Node ships scrypt,
 * which is a memory-hard KDF designed for exactly this, so there is no tradeoff
 * to explain — see `.claude/skills/add-dependency/SKILL.md`.
 *
 * THIS IS A TEACHING APP. A real one would also rate-limit sign-in attempts and
 * have a story for rotating these parameters. Do not copy this wholesale.
 */

/** 128 bits of salt: enough that no two users ever share one. */
const saltBytes = 16;

/** scrypt's output length. 64 bytes is the size bcrypt-era advice settled on. */
const keyBytes = 64;

/** `salt:key`, both hex. One column, and the salt travels with the hash it made. */
const separator = ':';

/**
 * Deliberately synchronous, like everything else that touches this database:
 * `node:sqlite` is synchronous, and a sign-in that blocks the loop for ~100ms
 * is the honest cost of a memory-hard KDF. A busy server would want
 * `scrypt`'s callback form instead.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(saltBytes);
  const key = scryptSync(password, salt, keyBytes);

  return `${salt.toString('hex')}${separator}${key.toString('hex')}`;
}

export function isPasswordCorrect(password: string, stored: string): boolean {
  const [saltHex, keyHex] = stored.split(separator);

  /* Our own data, so a malformed value is a bug in this file or a corrupted
     row — never something a caller can cause. Fail loudly rather than
     returning false, which would look exactly like a wrong password. */
  if (saltHex === undefined || keyHex === undefined) {
    throw new Error(
      `Expected a stored password of the form "salt${separator}key", found ${stored}`,
    );
  }

  const expected = Buffer.from(keyHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);

  /* `timingSafeEqual` throws on a length mismatch, and comparing with `===`
     would leak how much of the hash matched through how long it took. */
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
