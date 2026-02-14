import { test, describe } from 'node:test';
import assert from 'node:assert';
import { satToHrp, millisatToHrp, hrpToSat, hrpToMillisat } from '../dist/index.js';

describe('satToHrp', () => {
  test('250000 sats → 2500u', () => {
    assert.strictEqual(satToHrp(250000), '2500u');
  });

  test('2000000 sats → 20m', () => {
    assert.strictEqual(satToHrp(2000000), '20m');
  });

  test('2500000 sats → 25m', () => {
    assert.strictEqual(satToHrp(2500000), '25m');
  });

  test('1000 sats → 10u', () => {
    assert.strictEqual(satToHrp(1000), '10u');
  });

  test('100000000 sats (1 BTC) → 10m (10 milli-BTC = 1000000 sats? No, 1m)', () => {
    // 100000000 sats = 1 BTC = 1000m
    assert.strictEqual(satToHrp(100000000), '1000m');
  });

  test('1 sat → 10n', () => {
    assert.strictEqual(satToHrp(1), '10n');
  });

  test('10 sats → 100n', () => {
    assert.strictEqual(satToHrp(10), '100n');
  });
});

describe('millisatToHrp', () => {
  test('250000000 msat → 2500u', () => {
    assert.strictEqual(millisatToHrp(250000000), '2500u');
  });

  test('967878534 msat → 9678785340p', () => {
    assert.strictEqual(millisatToHrp(967878534), '9678785340p');
  });

  test('accepts string input', () => {
    assert.strictEqual(millisatToHrp('250000000'), '2500u');
  });

  test('1000 msat → 10n', () => {
    assert.strictEqual(millisatToHrp(1000), '10n');
  });

  test('100 msat → 1n', () => {
    assert.strictEqual(millisatToHrp(100), '1n');
  });

  test('1 msat → 10p', () => {
    assert.strictEqual(millisatToHrp(1), '10p');
  });
});

describe('hrpToSat', () => {
  test('2500u → 250000', () => {
    assert.strictEqual(hrpToSat('2500u'), '250000');
  });

  test('20m → 2000000', () => {
    assert.strictEqual(hrpToSat('20m'), '2000000');
  });

  test('25m → 2500000', () => {
    assert.strictEqual(hrpToSat('25m'), '2500000');
  });

  test('10u → 1000', () => {
    assert.strictEqual(hrpToSat('10u'), '1000');
  });

  test('10n → 1', () => {
    assert.strictEqual(hrpToSat('10n'), '1');
  });

  test('fractional satoshis throws', () => {
    assert.throws(() => hrpToSat('9678785340p'), /not a whole number/);
  });
});

describe('hrpToMillisat', () => {
  test('2500u → 250000000', () => {
    assert.strictEqual(hrpToMillisat('2500u'), '250000000');
  });

  test('20m → 2000000000', () => {
    assert.strictEqual(hrpToMillisat('20m'), '2000000000');
  });

  test('9678785340p → 967878534', () => {
    assert.strictEqual(hrpToMillisat('9678785340p'), '967878534');
  });

  test('10n → 1000', () => {
    assert.strictEqual(hrpToMillisat('10n'), '1000');
  });

  test('1n → 100', () => {
    assert.strictEqual(hrpToMillisat('1n'), '100');
  });

  test('10p → 1', () => {
    assert.strictEqual(hrpToMillisat('10p'), '1');
  });

  test('invalid amount throws', () => {
    assert.throws(() => hrpToMillisat(''), /Invalid amount/);
    assert.throws(() => hrpToMillisat('abc'), /Invalid amount/);
    assert.throws(() => hrpToMillisat('01u'), /Invalid amount/); // leading zero
  });

  test('pico amount not multiple of 10 throws', () => {
    assert.throws(() => hrpToMillisat('11p'), /pico-bitcoin/);
  });
});
