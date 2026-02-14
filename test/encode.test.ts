import { test, describe } from 'node:test';
import assert from 'node:assert';
import { encode, sign, decode, NETWORKS } from '../dist/index.js';

const PRIVATE_KEY = 'e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734';
const SPEC_PUBKEY = '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad';

describe('encode', () => {
  test('creates unsigned invoice', () => {
    const pr = encode({
      network: NETWORKS.bitcoin,
      satoshis: 250000,
      timestamp: 1496314658,
      tags: [
        {
          tagName: 'payment_hash',
          data: '0001020304050607080900010203040506070809000102030405060708090102',
        },
        {
          tagName: 'payment_secret',
          data: '1111111111111111111111111111111111111111111111111111111111111111',
        },
        { tagName: 'description', data: '1 cup coffee' },
      ],
    });

    assert.strictEqual(pr.complete, false);
    assert.strictEqual(pr.satoshis, 250000);
    assert.strictEqual(pr.timestamp, 1496314658);
    assert.strictEqual(
      pr.tagsObject.payment_hash,
      '0001020304050607080900010203040506070809000102030405060708090102',
    );
    assert.strictEqual(pr.tagsObject.description, '1 cup coffee');
  });

  test('missing payment_hash throws', () => {
    assert.throws(
      () =>
        encode({
          tags: [
            {
              tagName: 'payment_secret',
              data: '1111111111111111111111111111111111111111111111111111111111111111',
            },
            { tagName: 'description', data: 'test' },
          ],
        }),
      /payment_hash/,
    );
  });

  test('missing payment_secret throws', () => {
    assert.throws(
      () =>
        encode({
          tags: [
            {
              tagName: 'payment_hash',
              data: '0001020304050607080900010203040506070809000102030405060708090102',
            },
            { tagName: 'description', data: 'test' },
          ],
        }),
      /payment_secret/,
    );
  });

  test('missing description throws', () => {
    assert.throws(
      () =>
        encode({
          tags: [
            {
              tagName: 'payment_hash',
              data: '0001020304050607080900010203040506070809000102030405060708090102',
            },
            {
              tagName: 'payment_secret',
              data: '1111111111111111111111111111111111111111111111111111111111111111',
            },
          ],
        }),
      /description/,
    );
  });
});

describe('sign', () => {
  test('produces valid signed invoice', async () => {
    const pr = encode({
      network: NETWORKS.bitcoin,
      satoshis: 250000,
      timestamp: 1496314658,
      tags: [
        {
          tagName: 'payment_hash',
          data: '0001020304050607080900010203040506070809000102030405060708090102',
        },
        {
          tagName: 'payment_secret',
          data: '1111111111111111111111111111111111111111111111111111111111111111',
        },
        { tagName: 'description', data: '1 cup coffee' },
        { tagName: 'expire_time', data: 60 },
      ],
    });

    const signed = await sign(pr, PRIVATE_KEY);

    assert.strictEqual(signed.complete, true);
    assert.ok(signed.paymentRequest.startsWith('lnbc'));
    assert.strictEqual(signed.payeeNodeKey, SPEC_PUBKEY);
    assert.ok(signed.signature.length === 128); // 64 bytes hex
    assert.ok([0, 1].includes(signed.recoveryFlag));
  });

  test('testnet invoice', async () => {
    const pr = encode({
      network: NETWORKS.testnet,
      satoshis: 2000000,
      timestamp: 1496314658,
      tags: [
        {
          tagName: 'payment_hash',
          data: '0001020304050607080900010203040506070809000102030405060708090102',
        },
        {
          tagName: 'payment_secret',
          data: '1111111111111111111111111111111111111111111111111111111111111111',
        },
        { tagName: 'description', data: 'test payment' },
      ],
    });

    const signed = await sign(pr, PRIVATE_KEY);

    assert.ok(signed.paymentRequest.startsWith('lntb'));
  });
});

describe('round trip (encode→sign→decode)', () => {
  test('basic round trip', async () => {
    const original = encode({
      network: NETWORKS.bitcoin,
      satoshis: 100000,
      timestamp: 1700000000,
      tags: [
        {
          tagName: 'payment_hash',
          data: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
        {
          tagName: 'payment_secret',
          data: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        },
        { tagName: 'description', data: 'Round trip test' },
        { tagName: 'expire_time', data: 3600 },
      ],
    });

    const signed = await sign(original, PRIVATE_KEY);
    const decoded = await decode(signed.paymentRequest);

    assert.strictEqual(decoded.satoshis, 100000);
    assert.strictEqual(decoded.timestamp, 1700000000);
    assert.strictEqual(
      decoded.tagsObject.payment_hash,
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    assert.strictEqual(
      decoded.tagsObject.payment_secret,
      'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    assert.strictEqual(decoded.tagsObject.description, 'Round trip test');
    assert.strictEqual(decoded.tagsObject.expire_time, 3600);
    assert.strictEqual(decoded.payeeNodeKey, SPEC_PUBKEY);
  });

  test('no-amount round trip', async () => {
    const original = encode({
      network: NETWORKS.bitcoin,
      timestamp: 1700000000,
      tags: [
        {
          tagName: 'payment_hash',
          data: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
        },
        {
          tagName: 'payment_secret',
          data: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        },
        { tagName: 'description', data: 'Donation' },
      ],
    });

    const signed = await sign(original, PRIVATE_KEY);
    const decoded = await decode(signed.paymentRequest);

    assert.strictEqual(decoded.satoshis, null);
    assert.strictEqual(decoded.millisatoshis, null);
    assert.strictEqual(decoded.tagsObject.description, 'Donation');
  });

  test('millisatoshis round trip', async () => {
    const original = encode({
      network: NETWORKS.bitcoin,
      millisatoshis: '967878534',
      timestamp: 1700000000,
      tags: [
        {
          tagName: 'payment_hash',
          data: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        },
        {
          tagName: 'payment_secret',
          data: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        },
        { tagName: 'description', data: 'Fractional satoshis' },
      ],
    });

    const signed = await sign(original, PRIVATE_KEY);
    const decoded = await decode(signed.paymentRequest);

    assert.strictEqual(decoded.millisatoshis, '967878534');
    assert.strictEqual(decoded.satoshis, null); // not whole sats
  });
});
