/** Contraseña local con PBKDF2-SHA256 + sal (Web Crypto). Es un bloqueo local, no cifrado de datos. */

const ITERATIONS = 150_000;
const enc = new TextEncoder();

const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function cryptoAvailable() {
  return !!(globalThis.crypto && crypto.subtle);
}

async function derive(password, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derive(password, salt, ITERATIONS);
  return { salt: toB64(salt), hash: toB64(bits), iterations: ITERATIONS };
}

export async function verifyPassword(password, { salt, hash, iterations }) {
  const bits = await derive(password, fromB64(salt), iterations || ITERATIONS);
  const a = new Uint8Array(bits);
  const b = fromB64(hash);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
