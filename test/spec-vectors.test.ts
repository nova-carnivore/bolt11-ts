/**
 * BOLT 11 Specification Test Vectors
 * Source: https://github.com/lightning/bolts/blob/master/11-payment-encoding.md
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { decode } from '../src/decode.js';

test('BOLT 11 Spec - Please make a donation', async () => {
  const invoice =
    'lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdpl2pkx2ctnv5sxxmmwwd5kgetjypeh2ursdae8g6twvus8g6rfwvs8qun0dfjkxaq9qrsgq357wnc5r2ueh7ck6q93dj32dlqnls087fxdwk8qakdyafkq3yap9us6v52vjjsrvywa6rt52cm9r9zqt8r2t7mlcwspyetp5h2tztugp9lfyql';

  const decoded = await decode(invoice);

  assert.strictEqual(decoded.network?.bech32, 'bc');
  assert.strictEqual(decoded.satoshis, null);
  assert.strictEqual(decoded.timestamp, 1496314658);
  assert.strictEqual(
    decoded.tagsObject.payment_hash,
    '0001020304050607080900010203040506070809000102030405060708090102',
  );
  assert.strictEqual(
    decoded.tagsObject.payment_secret,
    '1111111111111111111111111111111111111111111111111111111111111111',
  );
  assert.strictEqual(decoded.tagsObject.description, 'Please consider supporting this project');
  assert.strictEqual(
    decoded.payeeNodeKey,
    '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad',
  );
  assert.strictEqual(
    decoded.signature,
    '8d3ce9e28357337f62da0162d9454df827f83cfe499aeb1c1db349d4d81127425e434ca29929406c23bba1ae8ac6ca32880b38d4bf6ff874024cac34ba9625f1',
  );
  assert.strictEqual(decoded.recoveryFlag, 1);
});

test('BOLT 11 Spec - $3 for coffee', async () => {
  const invoice =
    'lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgpfna3rh';

  const decoded = await decode(invoice);

  assert.strictEqual(decoded.network?.bech32, 'bc');
  assert.strictEqual(decoded.millisatoshis, '250000000');
  assert.strictEqual(decoded.satoshis, 250000);
  assert.strictEqual(decoded.tagsObject.description, '1 cup coffee');
  assert.strictEqual(decoded.tagsObject.expire_time, 60);
  assert.strictEqual(
    decoded.signature,
    'e59e3ffbd3945e4334879158d31e89b076dff54f3fa7979ae79df2db9dcaf5896cbfe1a478b8d2307e92c88139464cb7e6ef26e414c4abe33337961ddc5e8ab1',
  );
});

test('BOLT 11 Spec - $30 for coffee beans', async () => {
  const invoice =
    'lnbc25m1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5vdhkven9v5sxyetpdeessp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygs9q5sqqqqqqqqqqqqqqqqsgq2a25dxl5hrntdtn6zvydt7d66hyzsyhqs4wdynavys42xgl6sgx9c4g7me86a27t07mdtfry458rtjr0v92cnmswpsjscgt2vcse3sgpz3uapa';

  const decoded = await decode(invoice);

  assert.strictEqual(decoded.millisatoshis, '2500000000');
  assert.strictEqual(decoded.tagsObject.description, 'coffee beans');
  assert(decoded.tagsObject.feature_bits);
  assert.strictEqual(
    decoded.signature,
    '5755469bf4b8e6b6ae7a1308d5f9bad5c82812e0855cd24fac242aa323fa820c5c551ede4faeabcb7fb6d5a464ad0e35c86f615589ee0e0c250c216a662198c1',
  );
});
