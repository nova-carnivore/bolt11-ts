# Migration Guide from `bolt11` to `@nova-carnivore/bolt11-ts`

## Overview

This library is a modern, TypeScript-first drop-in replacement for the original `bolt11` package with zero vulnerable dependencies. The API is largely compatible, with a few improvements for modern JavaScript/TypeScript usage.

## Key Differences

### 1. Async/Await (Breaking Change)

**Old (`bolt11`):**
```javascript
const decoded = lightningPayReq.decode(invoice);
const signed = lightningPayReq.sign(encoded, privateKey);
```

**New (`@nova-carnivore/bolt11-ts`):**
```typescript
const decoded = await decode(invoice);
const signed = await sign(encoded, privateKey);
```

**Why:** Public key recovery and signing are now async operations using `@noble/secp256k1`.

### 2. ESM-Only (Breaking Change)

**Old (`bolt11`):**
```javascript
const lightningPayReq = require('bolt11');
```

**New (`@nova-carnivore/bolt11-ts`):**
```typescript
import { decode, encode, sign } from '@nova-carnivore/bolt11-ts';
```

**Why:** Modern Node.js best practices. ESM is the future.

### 3. Named Exports

**Old (`bolt11`):**
```javascript
const bolt11 = require('bolt11');
bolt11.decode(invoice);
bolt11.encode(options);
```

**New (`@nova-carnivore/bolt11-ts`):**
```typescript
import { decode, encode, sign, NETWORKS } from '@nova-carnivore/bolt11-ts';

decode(invoice);
encode(options);
sign(encoded, privateKey);
```

**Why:** Tree-shaking, better TypeScript experience.

### 4. TypeScript-First

**New features:**
- Full TypeScript type definitions included
- Properly typed `TagData` union types
- Exported interfaces for all data structures
- IDE autocomplete for all options and return values

```typescript
import type {
  PaymentRequestObject,
  TagData,
  Network,
  SignedPaymentRequest,
} from '@nova-carnivore/bolt11-ts';
```

### 5. Dependency Changes

**Old:** Uses `elliptic` (has CVE)
**New:** Uses `@noble/secp256k1` v1 (audited, no vulnerabilities)

## API Compatibility

### `decode(paymentRequest: string): Promise<PaymentRequestObject>`

✅ **Fully compatible** - Returns the same structure as the original, with all fields.

```typescript
const decoded = await decode(invoice);
// decoded.paymentRequest
// decoded.complete
// decoded.prefix
// decoded.network
// decoded.satoshis
// decoded.millisatoshis
// decoded.timestamp
// decoded.payeeNodeKey
// decoded.signature
// decoded.tags
// decoded.tagsObject  // convenience getter
```

### `encode(options: EncodeOptions): PaymentRequestObject`

✅ **Mostly compatible** - Same options, synchronous.

```typescript
const encoded = encode({
  network: NETWORKS.bitcoin,
  satoshis: 1000,
  timestamp: Math.floor(Date.now() / 1000),
  tags: [
    { tagName: 'payment_hash', data: '...' },
    { tagName: 'payment_secret', data: '...' },
    { tagName: 'description', data: 'Coffee' },
  ],
});
```

### `sign(paymentRequest: PaymentRequestObject, privateKeyHex: string): Promise<SignedPaymentRequest>`

⚠️ **Async** - Now returns a Promise.

```typescript
const signed = await sign(encoded, privateKey);
console.log(signed.paymentRequest); // The bech32 invoice string
```

### Networks

**Old:**
```javascript
const network = {
  bech32: 'bc',
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  validWitnessVersions: [0, 1]
};
```

**New:** Export predefined networks:
```typescript
import { NETWORKS } from '@nova-carnivore/bolt11-ts';

NETWORKS.bitcoin;   // mainnet
NETWORKS.testnet;   // testnet
NETWORKS.regtest;   // regtest
NETWORKS.simnet;    // simnet
```

## Migration Checklist

- [ ] **Update Node.js to v20+** (required)
- [ ] **Replace `require()` with `import`**
  ```diff
  - const bolt11 = require('bolt11');
  + import { decode, encode, sign } from '@nova-carnivore/bolt11-ts';
  ```
- [ ] **Add `await` to decode/sign calls**
  ```diff
  - const decoded = bolt11.decode(invoice);
  + const decoded = await decode(invoice);
  ```
- [ ] **Update function signatures to async**
  ```diff
  - function processInvoice(invoice) {
  + async function processInvoice(invoice) {
      const decoded = await decode(invoice);
  ```
- [ ] **Update tests to handle async**
  ```diff
  - it('decodes invoice', () => {
  + it('decodes invoice', async () => {
      const decoded = await decode(invoice);
  ```
- [ ] **Use named exports**
  ```diff
  - bolt11.encode(...)
  + encode(...)
  ```

## Additional Exports

The new library also exports utility functions for working with bech32:

```typescript
import {
  bech32Decode,
  bech32Encode,
  fiveToEight,      // Convert 5-bit words to bytes
  eightToFive,      // Convert bytes to 5-bit words
  fiveToEightTrim,  // Convert with trimming
  bytesToWords,     // Alias for eightToFive
  wordsToBytes,     // Alias for fiveToEightTrim
} from '@nova-carnivore/bolt11-ts';
```

## Feature Parity

| Feature | Old `bolt11` | New `@nova-carnivore/bolt11-ts` |
|---------|-------------|--------------------------------|
| Decode invoices | ✅ | ✅ |
| Encode invoices | ✅ | ✅ |
| Sign invoices | ✅ | ✅ (async) |
| Public key recovery | ✅ | ✅ |
| High-S signatures | ✅ | ✅ |
| All tag types | ✅ | ✅ |
| Network support | ✅ | ✅ |
| Amount parsing | ✅ | ✅ |
| TypeScript types | ❌ | ✅ |
| Zero vulnerabilities | ❌ | ✅ |
| ESM support | ❌ | ✅ |

## Performance

The new library uses `@noble/secp256k1`, which is slightly slower than `elliptic` for signing but significantly more secure. For most use cases, the difference is negligible (microseconds).

## Support

- **GitHub Issues:** https://github.com/nova-carnivore/bolt11-ts/issues
- **Spec:** https://github.com/lightning/bolts/blob/master/11-payment-encoding.md
- **Original package:** https://github.com/bitcoinjs/bolt11

## License

MIT (same as original `bolt11`)
