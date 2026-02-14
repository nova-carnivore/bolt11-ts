import { test, describe } from 'node:test';
import assert from 'node:assert';
import { decode } from '../dist/index.js';

/* ── BOLT 11 spec test vectors ─────────────────────────────────────────────── */

// All spec examples use this private key:
// e126f68f7eafcc8b74f54d269fe206be715000f94dac067d1c04a8ca3b2db734
// Corresponding pubkey: 03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad

const SPEC_PUBKEY = '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad';
const SPEC_PAYMENT_HASH = '0001020304050607080900010203040506070809000102030405060708090102';
const SPEC_PAYMENT_SECRET = '1111111111111111111111111111111111111111111111111111111111111111';

describe('BOLT 11 spec test vectors', () => {
  test('donation invoice (no amount)', async () => {
    const invoice =
      'lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq9qrsgq357wnc5r2ueh7ck6q93dj32dlqnls087fxdwk8qakdyafkq3yap9us6v52vjjsrvywa6rt52cm9r9zqt8r2t7mlcwspyetp5h2tztugp9lfyql';

    const d = await decode(invoice);

    assert.strictEqual(d.complete, true);
    assert.strictEqual(d.prefix, 'lnbc');
    assert.strictEqual(d.network?.bech32, 'bc');
    assert.strictEqual(d.satoshis, null);
    assert.strictEqual(d.millisatoshis, null);
    assert.strictEqual(d.timestamp, 1496314658);
    assert.strictEqual(d.tagsObject.payment_hash, SPEC_PAYMENT_HASH);
    assert.strictEqual(d.tagsObject.payment_secret, SPEC_PAYMENT_SECRET);
    assert.strictEqual(d.tagsObject.description, 'Please consider supporting this project');
    assert.strictEqual(d.payeeNodeKey, SPEC_PUBKEY);
    assert.strictEqual(
      d.signature,
      '8d3ce9e28357337f62da0162d9454df827f83cfe499aeb1c1db349d4d81127425e434ca29929406c23bba1ae8ac6ca32880b38d4bf6ff874024cac34ba9625f1',
    );
    assert.strictEqual(d.recoveryFlag, 1);
  });

  test('$3 for coffee (2500u, 60s expiry)', async () => {
    const invoice =
      'lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgpfna3rh';

    const d = await decode(invoice);

    assert.strictEqual(d.satoshis, 250000);
    assert.strictEqual(d.millisatoshis, '250000000');
    assert.strictEqual(d.tagsObject.description, '1 cup coffee');
    assert.strictEqual(d.tagsObject.expire_time, 60);
    assert.strictEqual(d.payeeNodeKey, SPEC_PUBKEY);
  });

  test('unicode description (ナンセンス 1杯)', async () => {
    const invoice =
      'lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpquwpc4curk03c9wlrswe78q4eyqc7d8d0xqzpu9qrsgqhtjpauu9ur7fw2thcl4y9vfvh4m9wlfyz2gem29g5ghe2aak2pm3ps8fdhtceqsaagty2vph7utlgj48u0ged6a337aewvraedendscp573dxr';

    const d = await decode(invoice);

    assert.strictEqual(d.tagsObject.description, 'ナンセンス 1杯');
    assert.strictEqual(d.satoshis, 250000);
  });

  test('hashed description (20m invoice)', async () => {
    const invoice =
      'lnbc20m1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqs9qrsgq7ea976txfraylvgzuxs8kgcw23ezlrszfnh8r6qtfpr6cxga50aj6txm9rxrydzd06dfeawfk6swupvz4erwnyutnjq7x39ymw6j38gp7ynn44';

    const d = await decode(invoice);

    assert.strictEqual(d.satoshis, 2000000); // 20 milli-BTC = 2,000,000 sat
    assert.strictEqual(
      d.tagsObject.purpose_commit_hash,
      '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1',
    );
    assert.strictEqual(d.tagsObject.description, undefined);
  });

  test('testnet with fallback (P2PKH)', async () => {
    const invoice =
      'lntb20m1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygshp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqfpp3x9et2e20v6pu37c5d9vax37wxq72un989qrsgqdj545axuxtnfemtpwkc45hx9d2ft7x04mt8q7y6t0k2dge9e7h8kpy9p34ytyslj3yu569aalz2xdk8xkd7ltxqld94u8h2esmsmacgpghe9k8';

    const d = await decode(invoice);

    assert.strictEqual(d.network?.bech32, 'tb');
    assert.strictEqual(d.satoshis, 2000000);
    assert.ok(d.tagsObject.fallback_address);
    assert.strictEqual(d.tagsObject.fallback_address.code, 17); // P2PKH
  });

  test('mainnet with routing info', async () => {
    const invoice =
      'lnbc20m1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqhp58yjmdan79s6qqdhdzgynm4zwqd5d7xmw5fk98klysy043l2ahrqsfpp3qjmp7lwpagxun9pygexvgpjdc4jdj85fr9yq20q82gphp2nflc7jtzrcazrra7wwgzxqc8u7754cdlpfrmccae92qgzqvzq2ps8pqqqqqqpqqqqq9qqqvpeuqafqxu92d8lr6fvg0r5gv0heeeqgcrqlnm6jhphu9y00rrhy4grqszsvpcgpy9qqqqqqgqqqqq7qqzq9qrsgqdfjcdk6w3ak5pca9hwfwfh63zrrz06wwfya0ydlzpgzxkn5xagsqz7x9j4jwe7yj7vaf2k9lqsdk45kts2fd0fkr28am0u4w95tt2nsq76cqw0';

    const d = await decode(invoice);

    assert.ok(d.tagsObject.route_hint);
    assert.strictEqual(d.tagsObject.route_hint.length, 2);
    assert.strictEqual(
      d.tagsObject.route_hint[0].pubkey,
      '029e03a901b85534ff1e92c43c74431f7ce72046060fcf7a95c37e148f78c77255',
    );
    assert.strictEqual(d.tagsObject.route_hint[0].fee_base_msat, 1);
    assert.strictEqual(d.tagsObject.route_hint[0].fee_proportional_millionths, 20);
    assert.strictEqual(d.tagsObject.route_hint[0].cltv_expiry_delta, 3);
    assert.strictEqual(
      d.tagsObject.route_hint[1].pubkey,
      '039e03a901b85534ff1e92c43c74431f7ce72046060fcf7a95c37e148f78c77255',
    );
  });

  test('features 8, 14, 99', async () => {
    const invoice =
      'lnbc25m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5vdhkven9v5sxyetpdeessp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs9q5sqqqqqqqqqqqqqqqqsgq2a25dxl5hrntdtn6zvydt7d66hyzsyhqs4wdynavys42xgl6sgx9c4g7me86a27t07mdtfry458rtjr0v92cnmswpsjscgt2vcse3sgpz3uapa';

    const d = await decode(invoice);

    assert.strictEqual(d.satoshis, 2500000);
    assert.strictEqual(d.tagsObject.description, 'coffee beans');
    assert.ok(d.tagsObject.feature_bits);
    assert.ok(d.tagsObject.feature_bits.var_onion_optin?.supported);
    assert.ok(d.tagsObject.feature_bits.payment_secret?.supported);
    assert.ok(d.tagsObject.feature_bits.extra_bits);
    assert.ok(d.tagsObject.feature_bits.extra_bits.bits.includes(99));
  });

  test('uppercase invoice', async () => {
    const invoice =
      'LNBC25M1PVJLUEZPP5QQQSYQCYQ5RQWZQFQQQSYQCYQ5RQWZQFQQQSYQCYQ5RQWZQFQYPQDQ5VDHKVEN9V5SXYETPDEESSP5ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYG3ZYGS9Q5SQQQQQQQQQQQQQQQQSGQ2A25DXL5HRNTDTN6ZVYDT7D66HYZSYHQS4WDYNAVYS42XGL6SGX9C4G7ME86A27T07MDTFRY458RTJR0V92CNMSWPSJSCGT2VCSE3SGPZ3UAPA';

    const d = await decode(invoice);

    assert.strictEqual(d.satoshis, 2500000);
    assert.strictEqual(d.tagsObject.description, 'coffee beans');
    assert.strictEqual(d.payeeNodeKey, SPEC_PUBKEY);
  });

  test('invoice with unknown tags (ignored)', async () => {
    const invoice =
      'lnbc25m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5vdhkven9v5sxyetpdeessp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs9q5sqqqqqqqqqqqqqqqqsgq2qrqqqfppnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqppnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpp4qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhpnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqhp4qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqspnqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqsp4qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnp5qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqnpkqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqz599y53s3ujmcfjp5xrdap68qxymkqphwsexhmhr8wdz5usdzkzrse33chw6dlp3jhuhge9ley7j2ayx36kawe7kmgg8sv5ugdyusdcqzn8z9x';

    const d = await decode(invoice);

    // Primary data should still be correct despite extra/duplicate tags
    assert.strictEqual(d.tagsObject.description, 'coffee beans');
    assert.strictEqual(d.tagsObject.payment_hash, SPEC_PAYMENT_HASH);
    assert.strictEqual(d.tagsObject.payment_secret, SPEC_PAYMENT_SECRET);
  });

  test('metadata invoice (0x01fafaf0)', async () => {
    const invoice =
      'lnbc10m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdp9wpshjmt9de6zqmt9w3skgct5vysxjmnnd9jx2mq8q8a04uqsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs9q2gqqqqqqsgq7hf8he7ecf7n4ffphs6awl9t6676rrclv9ckg3d3ncn7fct63p6s365duk5wrk202cfy3aj5xnnp5gs3vrdvruverwwq7yzhkf5a3xqpd05wjc';

    const d = await decode(invoice);

    assert.strictEqual(d.satoshis, 1000000); // 10 milli-BTC
    assert.strictEqual(d.tagsObject.description, 'payment metadata inside');
    assert.ok(d.tagsObject.metadata);
    assert.strictEqual(d.tagsObject.metadata, '01fafaf0');
  });

  test('high-S signature (public-key recovery)', async () => {
    const invoice =
      'lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq9qrsgq357wnc5r2ueh7ck6q93dj32dlqnls087fxdwk8qakdyafkq3yap2r09nt4ndd0unm3z9u5t48y6ucv4r5sg7lk98c77ctvjczkspk5qprc90gx';

    const d = await decode(invoice);

    // High-S signature should still recover the correct pubkey
    assert.strictEqual(d.payeeNodeKey, SPEC_PUBKEY);
  });

  test('pico-BTC amount (9678785340p)', async () => {
    const invoice =
      'lnbc9678785340p1pwmna7lpp5gc3xfm08u9qy06djf8dfflhugl6p7lgza6dsjxq454gxhj9t7a0sd8dgfkx7cmtwd68yetpd5s9xar0wfjn5gpc8qhrsdfq24f5ggrxdaezqsnvda3kkum5wfjkzmfqf3jkgem9wgsyuctwdus9xgrcyqcjcgpzgfskx6eqf9hzqnteypzxz7fzypfhg6trddjhygrcyqezcgpzfysywmm5ypxxjemgw3hxjmn8yptk7untd9hxwg3q2d6xjcmtv4ezq7pqxgsxzmnyyqcjqmt0wfjjq6t5v4khxsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygsxqyjw5qcqp2rzjq0gxwkzc8w6323m55m4jyxcjwmy7stt9hwkwe2qxmy8zpsgg7jcuwz87fcqqeuqqqyqqqqlgqqqqn3qq9q9qrsgqrvgkpnmps664wgkp43l22qsgdw4ve24aca4nymnxddlnp8vh9v2sdxlu5ywdxefsfvm0fq3sesf08uf6q9a2ke0hc9j6z6wlxg5z5kqpu2v9wz';

    const d = await decode(invoice);

    // 9678785340 pico-BTC = 967878534 msat (since 1 pico = 0.1 msat)
    assert.strictEqual(d.millisatoshis, '967878534');
    assert.strictEqual(d.satoshis, null); // Not a whole number of sats
    assert.strictEqual(
      d.tagsObject.payment_hash,
      '462264ede7e14047e9b249da94fefc47f41f7d02ee9b091815a5506bc8abf75f',
    );
    assert.strictEqual(d.tagsObject.min_final_cltv_expiry, 10);
    assert.ok(d.tagsObject.route_hint);
    assert.strictEqual(d.tagsObject.route_hint.length, 1);
  });
});

describe('error handling', () => {
  test('invalid checksum', async () => {
    const bad =
      'lnbc25m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5vdhkven9v5sxyetpdeessp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs9q5sqqqqqqqqqqqqqqqqsgq2a25dxl5hrntdtn6zvydt7d66hyzsyhqs4wdynavys42xgl6sgx9c4g7me86a27t07mdtfry458rtjr0v92cnmswpsjscgt2vcse3sgpXXXXXX';

    await assert.rejects(() => decode(bad), /Invalid/);
  });

  test('no separator', async () => {
    await assert.rejects(() => decode('lnbcinvalid'), /No separator/);
  });

  test('too short', async () => {
    await assert.rejects(() => decode('lnbc1qqqqqq'), /too short|checksum|Checksum/i);
  });
});
