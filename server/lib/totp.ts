import { createHmac } from "node:crypto";

/**
 * Decodes a base32 encoded string into a byte array (Uint8Array).
 * Implements RFC 4648 base32 decoding without external dependencies.
 */
export function base32Decode(base32: string): Uint8Array {
  const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const input = base32.toUpperCase().replace(/=+$/, "");
  const bits: number[] = [];
  for (const ch of input) {
    const val = CHARS.indexOf(ch);
    if (val < 0) continue;
    for (let i = 4; i >= 0; i--) bits.push((val >> i) & 1);
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i * 8 + j] ?? 0);
    bytes[i] = b;
  }
  return bytes;
}

/**
 * Calculates an HMAC-based One-Time Password (HOTP) per RFC 4226.
 */
export function hotp(secretBytes: Uint8Array, counter: bigint): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(counter);
  const hmac = createHmac("sha1", Buffer.from(secretBytes))
    .update(buf)
    .digest();
  const offset = hmac[19]! & 0x0f;
  const code =
    (((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff)) %
    1_000_000;
  return String(code).padStart(6, "0");
}

/**
 * Validates a Time-based One-Time Password (TOTP) per RFC 6238.
 * Accepts a drift window of +/- windowSteps (default 1 step = 30 seconds).
 */
export function validateTotp(
  secret: string,
  token: string,
  windowSteps = 1,
): boolean {
  if (!secret || !token || token.length !== 6) return false;
  const secretBytes = base32Decode(secret);
  const counter = BigInt(Math.floor(Date.now() / 1000 / 30));
  for (let delta = -windowSteps; delta <= windowSteps; delta++) {
    if (hotp(secretBytes, counter + BigInt(delta)) === token) return true;
  }
  return false;
}

/**
 * Generates a Time-based One-Time Password (TOTP) per RFC 6238 for a given timestamp.
 */
export function generateTotp(
  secret: string,
  timestampMs = Date.now(),
): string {
  const secretBytes = base32Decode(secret);
  const counter = BigInt(Math.floor(timestampMs / 1000 / 30));
  return hotp(secretBytes, counter);
}
