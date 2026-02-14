import { sha256 as _sha256 } from '@noble/hashes/sha256';

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA256 hash — uses @noble/hashes, a Cure53-audited, zero-dependency implementation.
 * Works in Node.js, Bun, Deno, and browsers without any polyfills.
 */
export function sha256(data: Uint8Array): Uint8Array {
  return _sha256(data);
}

// Universal TextEncoder/TextDecoder (available in all modern runtimes)
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8');

/**
 * Convert UTF-8 string to bytes
 */
export function stringToBytes(str: string): Uint8Array {
  return encoder.encode(str);
}

/**
 * Convert bytes to UTF-8 string
 */
export function bytesToString(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

/**
 * Convert big-endian bytes to number
 */
export function bytesToInt(bytes: Uint8Array): number {
  let result = 0;
  for (const byte of bytes) {
    result = result * 256 + byte;
  }
  return result;
}

/**
 * Convert number to big-endian bytes
 */
export function intToBytes(num: number, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num >>= 8;
  }
  return bytes;
}

/**
 * Convert 5-bit words to big-endian integer
 */
export function wordsToInt(words: number[]): number {
  let result = 0;
  for (const word of words) {
    result = result * 32 + word;
  }
  return result;
}

/**
 * Convert big-endian integer to 5-bit words
 */
export function intToWords(num: number, length: number): number[] {
  const words: number[] = [];
  for (let i = 0; i < length; i++) {
    words.unshift(num & 31);
    num >>= 5;
  }
  return words;
}

/**
 * Concatenate multiple Uint8Arrays
 */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Check if a number is a valid timestamp
 */
export function isValidTimestamp(timestamp: number): boolean {
  return timestamp > 0 && timestamp < 2 ** 35;
}

/**
 * Get current timestamp in seconds
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now() / 1000);
}
