import { scryptAsync } from '@noble/hashes/scrypt.js';
import { sha256 } from '@noble/hashes/sha2.js';

/**
 * A way for the phone to check a password with no connection. Only a salted, deliberately slow hash is kept
 * (in the phone's secure storage), never the password itself. It is replaced every time the patient signs
 * in online, so it follows the password on the server.
 */
export type Verifier = { v: 1; N: number; r: number; p: number; salt: string; hash: string };

const PARAMS = { N: 2 ** 13, r: 8, p: 1, dkLen: 32 };

const enc = (s: string) => new TextEncoder().encode(s.normalize('NFKC'));
export const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
export const fromHex = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

export const sha256Hex = (s: string) => toHex(sha256(new TextEncoder().encode(s)));

export async function makeVerifier(password: string, saltHex: string): Promise<Verifier> {
  const hash = await scryptAsync(enc(password), fromHex(saltHex), PARAMS);
  return { v: 1, ...{ N: PARAMS.N, r: PARAMS.r, p: PARAMS.p }, salt: saltHex, hash: toHex(hash) };
}

export async function checkVerifier(password: string, v: Verifier): Promise<boolean> {
  if (v.v !== 1) return false;
  const got = await scryptAsync(enc(password), fromHex(v.salt), { N: v.N, r: v.r, p: v.p, dkLen: 32 });
  const want = fromHex(v.hash);
  let diff = got.length ^ want.length;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ (want[i] ?? 0);
  return diff === 0;
}
