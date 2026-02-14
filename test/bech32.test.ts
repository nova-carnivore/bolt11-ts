import { test } from 'node:test';
import assert from 'node:assert';
import { bech32Encode, bech32Decode, eightToFive, fiveToEightTrim } from '../dist/bech32.js';

test('bech32Encode and bech32Decode - round trip', () => {
  const hrp = 'bc';
  const data = [
    0, 14, 20, 15, 7, 13, 26, 0, 25, 18, 6, 11, 13, 8, 21, 4, 20, 3, 17, 2, 29, 3, 12, 29, 3, 4, 15,
    24, 20, 6, 14, 30, 22,
  ];
  const encoded = bech32Encode(hrp, data);
  const decoded = bech32Decode(encoded);
  assert.strictEqual(decoded.hrp, hrp);
  assert.deepStrictEqual(decoded.data, data);
});

test('bech32Decode - valid address', () => {
  const decoded = bech32Decode('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
  assert.strictEqual(decoded.hrp, 'bc');
  assert.ok(decoded.data.length > 0);
});

test('bech32Decode - uppercase', () => {
  const decoded = bech32Decode('BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4');
  assert.strictEqual(decoded.hrp, 'bc');
});

test('bech32Decode - invalid checksum', () => {
  assert.throws(
    () => bech32Decode('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t5'),
    /Invalid checksum/,
  );
});

test('bech32Decode - no separator', () => {
  assert.throws(() => bech32Decode('bcqw508d'), /No separator/);
});

test('bech32Decode - empty HRP', () => {
  assert.throws(() => bech32Decode('1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'), /Empty HRP/);
});

test('eightToFive + fiveToEightTrim round trip', () => {
  const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const words = eightToFive(bytes);
  const back = fiveToEightTrim(words);
  assert.deepStrictEqual(back, bytes);
});

test('eightToFive round trip for 32 bytes (SHA256)', () => {
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = i;
  const words = eightToFive(bytes);
  assert.strictEqual(words.length, 52); // 32*8/5 = 51.2 → 52 words
  const back = fiveToEightTrim(words);
  assert.deepStrictEqual(back, bytes);
});

test('eightToFive round trip for 33 bytes (pubkey)', () => {
  const bytes = new Uint8Array(33);
  bytes[0] = 0x03;
  for (let i = 1; i < 33; i++) bytes[i] = i;
  const words = eightToFive(bytes);
  assert.strictEqual(words.length, 53); // 33*8/5 = 52.8 → 53 words
  const back = fiveToEightTrim(words);
  assert.deepStrictEqual(back, bytes);
});
