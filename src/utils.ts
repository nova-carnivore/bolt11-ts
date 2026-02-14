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
 * SHA256 hash — pure JavaScript implementation.
 * Works in Node.js, Bun, Deno, and browsers without any dependencies or polyfills.
 */
export function sha256(data: Uint8Array): Uint8Array {
  return sha256Digest(data);
}

// SHA-256 constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
const K: Uint32Array = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function sha256Digest(message: Uint8Array): Uint8Array {
  // Initial hash values: first 32 bits of the fractional parts of the square roots of the first 8 primes
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  // Pre-processing: padding
  const msgLen = message.length;
  const bitLen = msgLen * 8;
  // Message + 1 byte (0x80) + padding + 8 bytes (length)
  const totalLen = Math.ceil((msgLen + 9) / 64) * 64;
  const padded = new Uint8Array(totalLen);
  padded.set(message);
  padded[msgLen] = 0x80;
  // Append length as 64-bit big-endian (we only support up to 2^32 bits)
  const view = new DataView(padded.buffer);
  view.setUint32(totalLen - 4, bitLen, false);

  const w = new Uint32Array(64);

  // Process each 512-bit (64-byte) block
  for (let offset = 0; offset < totalLen; offset += 64) {
    // Prepare message schedule
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
      const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    // Working variables
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    // Compression
    for (let i = 0; i < 64; i++) {
      const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const temp2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  // Produce the final hash (32 bytes)
  const result = new Uint8Array(32);
  const rv = new DataView(result.buffer);
  rv.setUint32(0, h0, false); rv.setUint32(4, h1, false);
  rv.setUint32(8, h2, false); rv.setUint32(12, h3, false);
  rv.setUint32(16, h4, false); rv.setUint32(20, h5, false);
  rv.setUint32(24, h6, false); rv.setUint32(28, h7, false);
  return result;
}

function rotr(x: number, n: number): number {
  return ((x >>> n) | (x << (32 - n))) >>> 0;
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
