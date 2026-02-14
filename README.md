# bolt11-ts

Modern TypeScript implementation of BOLT 11 Lightning Network payment request encoder/decoder with a minimal dependency tree.

## Why bolt11-ts?

The original [bolt11](https://github.com/bitcoinjs/bolt11) library hasn't been updated in years and has a large dependency tree (including `elliptic`). This library is a complete rewrite in TypeScript that:

- ✅ **Minimal dependencies** - Only depends on `@noble/secp256k1` and `@noble/hashes` (audited, zero transitive deps)
- ✅ **Full BOLT 11 compliance** - Passes all specification test vectors
- ✅ **Modern TypeScript** - Full type safety and excellent IDE support
- ✅ **ESM native** - Built for modern JavaScript
- ✅ **Universal runtime** - Works in Node.js, Bun, Deno, and browsers (no polyfills needed)
- ✅ **Well tested** - Comprehensive test suite including spec vectors
- ✅ **Easy migration** - Similar API to the original library (see [migration guide](#migration-from-bolt11))

## Installation

```bash
npm install bolt11-ts
```

## Runtime Compatibility

| Runtime | Status | Notes |
|---------|--------|-------|
| **Node.js** 20+ | ✅ Tested in CI | Full support |
| **Bun** 1.x | ✅ Tested in CI | Full support |
| **Deno** 2.x | ✅ Tested in CI | Use `--unstable-sloppy-imports` for `.js` extensions |
| **Browsers** (Chromium, Firefox, WebKit) | ✅ Tested in CI | Playwright tests against real browser engines |

No polyfills required — uses `@noble/hashes` for SHA-256, `TextEncoder`/`TextDecoder`, and `@noble/secp256k1` which are all universal.

## Quick Start

```typescript
import { decode, encode, sign } from 'bolt11-ts';

// Decode a payment request
const invoice = 'lnbc2500u1pvjluezsp5zyg3zyg3zyg3...';
const decoded = await decode(invoice);

console.log(decoded.satoshis); // 250000
console.log(decoded.tagsObject.description); // '1 cup coffee'
console.log(decoded.payeeNodeKey); // '03e7156ae33b0a...'

// Encode and sign a payment request
const unsigned = encode({
  network: 'bitcoin',
  satoshis: 250000,
  tags: [
    { tagName: 'payment_hash', data: '...' },
    { tagName: 'payment_secret', data: '...' },
    { tagName: 'description', data: '1 cup coffee' },
    { tagName: 'expire_time', data: 3600 },
  ],
});

const signed = await sign(unsigned, privateKeyHex);
console.log(signed.paymentRequest); // 'lnbc2500u1...'
```

## API

### `decode(paymentRequest: string): Promise<PaymentRequestObject>`

Decodes a BOLT 11 payment request string.

```typescript
const decoded = await decode('lnbc2500u1pvjluez...');

// Returns:
{
  paymentRequest: string;
  complete: boolean;
  prefix: string;
  network: Network;
  satoshis: number | null;
  millisatoshis: string | null;
  timestamp: number;
  timestampString: string;
  timeExpireDate: number;
  timeExpireDateString: string;
  payeeNodeKey: string | null;
  signature: string;
  recoveryFlag: number;
  tags: TagData[];
  tagsObject: TagsObject;
}
```

### `encode(options: EncodeOptions): PaymentRequestObject`

Creates an unsigned payment request.

```typescript
const unsigned = encode({
  network: 'bitcoin', // or 'testnet', 'regtest', 'simnet'
  satoshis: 1000, // optional
  millisatoshis: '1000000', // optional (alternative to satoshis)
  timestamp: 1496314658, // optional (defaults to current time)
  tags: [
    { tagName: 'payment_hash', data: 'hex string' },
    { tagName: 'payment_secret', data: 'hex string' },
    { tagName: 'description', data: 'Coffee' },
    { tagName: 'expire_time', data: 3600 },
    { tagName: 'min_final_cltv_expiry', data: 144 },
    // ... more tags
  ],
});
```

### `sign(paymentRequest: PaymentRequestObject, privateKey: string): Promise<SignedPaymentRequest>`

Signs a payment request with a private key.

```typescript
const signed = await sign(unsigned, privateKeyHex);
console.log(signed.paymentRequest); // Full encoded payment request
```

## Supported Tags

| Tag Name | BOLT 11 Code | Description |
|----------|--------------|-------------|
| `payment_hash` | `p` (1) | Payment hash (required) |
| `payment_secret` | `s` (16) | Payment secret (required) |
| `description` | `d` (13) | Short UTF-8 description |
| `purpose_commit_hash` | `h` (23) | Hash of description >639 bytes |
| `payee` | `n` (19) | Payee public key |
| `expire_time` | `x` (6) | Expiry time in seconds |
| `min_final_cltv_expiry` | `c` (24) | Min final CLTV expiry |
| `fallback_address` | `f` (9) | On-chain fallback address |
| `route_hint` | `r` (3) | Routing hints for private channels |
| `feature_bits` | `9` (5) | Feature bits |
| `metadata` | `m` (27) | Payment metadata |

## Migration from bolt11

This library has a similar API but is **not** a drop-in replacement — key methods are now async:

```typescript
// Old:
import * as bolt11 from 'bolt11';
const decoded = bolt11.decode('lnbc...');

// New:
import { decode } from 'bolt11-ts';
const decoded = await decode('lnbc...');
// Note: decode() is now async due to crypto operations
```

### Key Differences

1. **Async crypto**: `decode()` and `sign()` are async (use `@noble/secp256k1`)
2. **ESM only**: No CommonJS support (use Node.js 20+)
3. **Stricter types**: Full TypeScript with strict type checking

## Examples

### Decode with all features

```typescript
const decoded = await decode(invoice);

// Access common fields
console.log(decoded.satoshis);
console.log(decoded.timestamp);
console.log(decoded.payeeNodeKey);

// Access specific tags
console.log(decoded.tagsObject.description);
console.log(decoded.tagsObject.payment_hash);
console.log(decoded.tagsObject.expire_time);
console.log(decoded.tagsObject.route_hint);
```

### Create invoice with routing hints

```typescript
const unsigned = encode({
  network: 'bitcoin',
  satoshis: 10000,
  tags: [
    { tagName: 'payment_hash', data: paymentHashHex },
    { tagName: 'payment_secret', data: secretHex },
    { tagName: 'description', data: 'Premium coffee' },
    { 
      tagName: 'route_hint', 
      data: [
        {
          pubkey: '029e03a901b85534ff1e92c43c74431f7ce72046060fcf7a95c37e148f78c77255',
          short_channel_id: '0102030405060708',
          fee_base_msat: 1000,
          fee_proportional_millionths: 100,
          cltv_expiry_delta: 40,
        },
      ],
    },
  ],
});

const signed = await sign(unsigned, privateKey);
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npx tsx test/decode.test.ts
npx tsx test/encode.test.ts
npx tsx test/spec-vectors.test.ts

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests with coverage
npm test -- --experimental-test-coverage

# Format code
npm run format
```

## Specification

This library implements [BOLT #11: Invoice Protocol for Lightning Payments](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md).

All test vectors from the specification are included in the test suite and pass.

## Security

### Minimal Dependency Tree

This library has two production dependencies, both from the audited [@noble](https://paulmillr.com/noble/) family by Paul Miller:

- [`@noble/secp256k1`](https://github.com/paulmillr/noble-secp256k1) — elliptic curve cryptography
- [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) — SHA-256 hashing

Both have zero transitive dependencies, are audited, and work across all runtimes. A minimal dependency tree reduces the attack surface compared to the original `bolt11` package.

### Reporting Vulnerabilities

If you discover a security vulnerability, please [open a GitHub issue](https://github.com/nova-carnivore/bolt11-ts/issues).

## License

MIT © Nova Carnivore

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Format code: `npm run format`
6. Submit a pull request

## Acknowledgments

- Original [bolt11](https://github.com/bitcoinjs/bolt11) library by the bitcoinjs contributors
- [BOLT 11 specification](https://github.com/lightning/bolts/blob/master/11-payment-encoding.md) authors
- [@noble/secp256k1](https://github.com/paulmillr/noble-secp256k1) by Paul Miller

## See Also

- [BOLT Specifications](https://github.com/lightning/bolts)
- [Lightning Network](https://lightning.network/)
- [BIP-173: Bech32](https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki)
