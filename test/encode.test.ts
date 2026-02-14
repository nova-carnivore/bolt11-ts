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

  test('unsigned invoice has wordsTemp', () => {
    const pr = encode({
      network: NETWORKS.bitcoin,
      satoshis: 1000,
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
        { tagName: 'description', data: 'test' },
      ],
    });

    assert.ok(pr.wordsTemp.length > 0, 'wordsTemp should be non-empty');
    assert.ok(pr.wordsTemp.startsWith('lnbc'), 'wordsTemp should start with lnbc');
  });

  test('accepts string network name (bitcoin)', () => {
    const pr = encode({
      network: 'bitcoin',
      satoshis: 1000,
      tags: [
        {
          tagName: 'payment_hash',
          data: '0001020304050607080900010203040506070809000102030405060708090102',
        },
        {
          tagName: 'payment_secret',
          data: '1111111111111111111111111111111111111111111111111111111111111111',
        },
        { tagName: 'description', data: 'test' },
      ],
    });

    assert.strictEqual(pr.prefix, 'lnbc10u');
    assert.strictEqual(pr.network?.bech32, 'bc');
  });

  test('accepts string network bech32 prefix (bc)', () => {
    const pr = encode({
      network: 'bc',
      satoshis: 1000,
      tags: [
        {
          tagName: 'payment_hash',
          data: '0001020304050607080900010203040506070809000102030405060708090102',
        },
        {
          tagName: 'payment_secret',
          data: '1111111111111111111111111111111111111111111111111111111111111111',
        },
        { tagName: 'description', data: 'test' },
      ],
    });

    assert.strictEqual(pr.prefix, 'lnbc10u');
    assert.strictEqual(pr.network?.bech32, 'bc');
  });

  test('accepts string network bech32 prefix (tb)', () => {
    const pr = encode({
      network: 'tb',
      satoshis: 1000,
      tags: [
        {
          tagName: 'payment_hash',
          data: '0001020304050607080900010203040506070809000102030405060708090102',
        },
        {
          tagName: 'payment_secret',
          data: '1111111111111111111111111111111111111111111111111111111111111111',
        },
        { tagName: 'description', data: 'test' },
      ],
    });

    assert.strictEqual(pr.prefix, 'lntb10u');
    assert.strictEqual(pr.network?.bech32, 'tb');
  });

  test('accepts string network bech32 prefix (bcrt)', () => {
    const pr = encode({
      network: 'bcrt',
      satoshis: 1000,
      tags: [
        {
          tagName: 'payment_hash',
          data: '0001020304050607080900010203040506070809000102030405060708090102',
        },
        {
          tagName: 'payment_secret',
          data: '1111111111111111111111111111111111111111111111111111111111111111',
        },
        { tagName: 'description', data: 'test' },
      ],
    });

    assert.strictEqual(pr.prefix, 'lnbcrt10u');
    assert.strictEqual(pr.network?.bech32, 'bcrt');
  });

  test('accepts string network bech32 prefix (tbs for signet)', () => {
    const pr = encode({
      network: 'tbs',
      satoshis: 1000,
      tags: [
        {
          tagName: 'payment_hash',
          data: '0001020304050607080900010203040506070809000102030405060708090102',
        },
        {
          tagName: 'payment_secret',
          data: '1111111111111111111111111111111111111111111111111111111111111111',
        },
        { tagName: 'description', data: 'test' },
      ],
    });

    assert.strictEqual(pr.prefix, 'lntbs10u');
    assert.strictEqual(pr.network?.bech32, 'tbs');
  });

  test('unknown network string throws', () => {
    assert.throws(
      () =>
        encode({
          network: 'unknown_net',
          satoshis: 1000,
          tags: [
            {
              tagName: 'payment_hash',
              data: '0001020304050607080900010203040506070809000102030405060708090102',
            },
            {
              tagName: 'payment_secret',
              data: '1111111111111111111111111111111111111111111111111111111111111111',
            },
            { tagName: 'description', data: 'test' },
          ],
        }),
      /Unknown network/,
    );
  });

  test('HRP generation for various amounts', () => {
    const makeEncode = (opts: { satoshis?: number; millisatoshis?: string | number }) =>
      encode({
        network: NETWORKS.bitcoin,
        ...opts,
        tags: [
          {
            tagName: 'payment_hash',
            data: '0001020304050607080900010203040506070809000102030405060708090102',
          },
          {
            tagName: 'payment_secret',
            data: '1111111111111111111111111111111111111111111111111111111111111111',
          },
          { tagName: 'description', data: 'test' },
        ],
      });

    // 1000 sats = 10u
    assert.strictEqual(makeEncode({ satoshis: 1000 }).prefix, 'lnbc10u');

    // 250000 sats = 2500u
    assert.strictEqual(makeEncode({ satoshis: 250000 }).prefix, 'lnbc2500u');

    // 2000000 sats = 20m
    assert.strictEqual(makeEncode({ satoshis: 2000000 }).prefix, 'lnbc20m');

    // 2500000 sats = 25m
    assert.strictEqual(makeEncode({ satoshis: 2500000 }).prefix, 'lnbc25m');

    // No amount
    assert.strictEqual(makeEncode({}).prefix, 'lnbc');

    // millisatoshis
    assert.strictEqual(makeEncode({ millisatoshis: '967878534' }).prefix, 'lnbc9678785340p');
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

  test('signet invoice', async () => {
    const pr = encode({
      network: NETWORKS.signet,
      satoshis: 1000,
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
        { tagName: 'description', data: 'signet test' },
      ],
    });

    const signed = await sign(pr, PRIVATE_KEY);

    assert.ok(signed.paymentRequest.startsWith('lntbs'));
  });

  test('regtest invoice', async () => {
    const pr = encode({
      network: NETWORKS.regtest,
      satoshis: 1000,
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
        { tagName: 'description', data: 'regtest test' },
      ],
    });

    const signed = await sign(pr, PRIVATE_KEY);

    assert.ok(signed.paymentRequest.startsWith('lnbcrt'));
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

  test('round trip with route hints', async () => {
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
        { tagName: 'description', data: 'Route hint test' },
        {
          tagName: 'route_hint',
          data: [
            {
              pubkey: '029e03a901b85534ff1e92c43c74431f7ce72046060fcf7a95c37e148f78c77255',
              short_channel_id: '0102030405060708',
              fee_base_msat: 1,
              fee_proportional_millionths: 20,
              cltv_expiry_delta: 3,
            },
          ],
        },
      ],
    });

    const signed = await sign(original, PRIVATE_KEY);
    const decoded = await decode(signed.paymentRequest);

    assert.ok(decoded.tagsObject.route_hint);
    assert.strictEqual(decoded.tagsObject.route_hint.length, 1);
    assert.strictEqual(
      decoded.tagsObject.route_hint[0].pubkey,
      '029e03a901b85534ff1e92c43c74431f7ce72046060fcf7a95c37e148f78c77255',
    );
    assert.strictEqual(decoded.tagsObject.route_hint[0].short_channel_id, '0102030405060708');
    assert.strictEqual(decoded.tagsObject.route_hint[0].fee_base_msat, 1);
    assert.strictEqual(decoded.tagsObject.route_hint[0].fee_proportional_millionths, 20);
    assert.strictEqual(decoded.tagsObject.route_hint[0].cltv_expiry_delta, 3);
  });

  test('round trip with fallback address', async () => {
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
        { tagName: 'description', data: 'Fallback test' },
        {
          tagName: 'fallback_address',
          data: {
            code: 17,
            address: '',
            addressHash: '3172b5654f6683c8fb146959d347ce303cae4ca7',
          },
        },
      ],
    });

    const signed = await sign(original, PRIVATE_KEY);
    const decoded = await decode(signed.paymentRequest);

    assert.ok(decoded.tagsObject.fallback_address);
    assert.strictEqual(decoded.tagsObject.fallback_address.code, 17);
    assert.strictEqual(
      decoded.tagsObject.fallback_address.addressHash,
      '3172b5654f6683c8fb146959d347ce303cae4ca7',
    );
  });

  test('round trip with purpose_commit_hash', async () => {
    const original = encode({
      network: NETWORKS.bitcoin,
      satoshis: 2000000,
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
        {
          tagName: 'purpose_commit_hash',
          data: '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1',
        },
      ],
    });

    const signed = await sign(original, PRIVATE_KEY);
    const decoded = await decode(signed.paymentRequest);

    assert.strictEqual(
      decoded.tagsObject.purpose_commit_hash,
      '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1',
    );
    assert.strictEqual(decoded.tagsObject.description, undefined);
  });

  test('round trip with min_final_cltv_expiry', async () => {
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
        { tagName: 'description', data: 'CLTV test' },
        { tagName: 'min_final_cltv_expiry', data: 144 },
      ],
    });

    const signed = await sign(original, PRIVATE_KEY);
    const decoded = await decode(signed.paymentRequest);

    assert.strictEqual(decoded.tagsObject.min_final_cltv_expiry, 144);
  });

  test('round trip with UTF-8 description', async () => {
    const original = encode({
      network: NETWORKS.bitcoin,
      satoshis: 250000,
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
        { tagName: 'description', data: 'ナンセンス 1杯 ☕' },
      ],
    });

    const signed = await sign(original, PRIVATE_KEY);
    const decoded = await decode(signed.paymentRequest);

    assert.strictEqual(decoded.tagsObject.description, 'ナンセンス 1杯 ☕');
    assert.strictEqual(decoded.satoshis, 250000);
  });

  test('round trip on all networks', async () => {
    for (const [name, net] of Object.entries(NETWORKS)) {
      const original = encode({
        network: net,
        satoshis: 1000,
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
          { tagName: 'description', data: `Test on ${name}` },
        ],
      });

      const signed = await sign(original, PRIVATE_KEY);
      assert.ok(
        signed.paymentRequest.startsWith('ln' + net.bech32),
        `Invoice for ${name} should start with ln${net.bech32}`,
      );

      const decoded = await decode(signed.paymentRequest);
      assert.strictEqual(decoded.network?.bech32, net.bech32);
      assert.strictEqual(decoded.satoshis, 1000);
      assert.strictEqual(decoded.tagsObject.description, `Test on ${name}`);
    }
  });
});
