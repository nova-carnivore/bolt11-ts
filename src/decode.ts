/**
 * BOLT 11 payment request decoder
 *
 * Spec: https://github.com/lightning/bolts/blob/master/11-payment-encoding.md
 */

import { bech32Decode, fiveToEight, fiveToEightTrim } from './bech32.js';
import {
  bytesToHex,
  bytesToInt,
  bytesToString,
  sha256,
  stringToBytes,
  wordsToInt,
  concatBytes,
} from './utils.js';
import { recoverPublicKey as recoverPubKey } from './crypto.js';
import type {
  FallbackAddress,
  FeatureBits,
  Network,
  PaymentRequestObject,
  RoutingInfo,
  TagData,
  TagsObject,
} from './types.js';
import { NETWORKS } from './types.js';

/* ── Tag type code → name ──────────────────────────────────────────────────── */

const TAG_CODE_TO_NAME: Record<number, string> = {
  1: 'payment_hash', // p
  16: 'payment_secret', // s
  13: 'description', // d
  27: 'metadata', // m
  19: 'payee', // n
  23: 'purpose_commit_hash', // h
  6: 'expire_time', // x
  24: 'min_final_cltv_expiry', // c
  9: 'fallback_address', // f
  3: 'route_hint', // r
  5: 'feature_bits', // 9
};

/* ── Main decoder ──────────────────────────────────────────────────────────── */

export async function decode(paymentRequest: string): Promise<PaymentRequestObject> {
  const { hrp, data } = bech32Decode(paymentRequest);

  // ── HRP ──
  const { prefix, network, amount } = parseHRP(hrp);

  // ── Timestamp (first 7 × 5 = 35 bits) ──
  if (data.length < 7 + 104) {
    throw new Error('Payment request too short');
  }
  const timestamp = wordsToInt(data.slice(0, 7));

  // ── Signature is the last 104 words (65 bytes = 64 R‖S + 1 recovery) ──
  const signatureStart = data.length - 104;
  const tagWords = data.slice(7, signatureStart);
  const signatureWords = data.slice(signatureStart);

  // Parse tags from 5-bit words
  const tags = parseTags(tagWords);

  // Extract 64-byte signature + 1-byte recovery flag
  const sigBytes = fiveToEightTrim(signatureWords.slice(0, 103)); // 103 words → 64 bytes
  const recoveryFlag = signatureWords[103]; // last word is recovery id (0-3)
  const signature = bytesToHex(sigBytes);

  // ── Signing data (hrp UTF-8 || data-words→bytes with zero-pad) ──
  const preSignatureWords = data.slice(0, signatureStart);
  const hrpBytes = stringToBytes(hrp);
  const dataBytes = fiveToEight(preSignatureWords, true); // pad trailing bits with 0
  const signingData = concatBytes(hrpBytes, dataBytes);
  const sigHash = sha256(signingData);

  // ── Recover / verify payee node key ──
  const payeeNodeKey = await resolvePayeeKey(sigHash, sigBytes, recoveryFlag, tags);

  // ── Build output ──
  const tagsObject = buildTagsObject(tags);
  const expireTime = tagsObject.expire_time ?? 3600;
  const timeExpireDate = timestamp + expireTime;

  return {
    paymentRequest,
    complete: true,
    prefix,
    wordsTemp: '',
    network,
    satoshis: amount?.satoshis ?? null,
    millisatoshis: amount?.millisatoshis ?? null,
    timestamp,
    timestampString: new Date(timestamp * 1000).toISOString(),
    timeExpireDate,
    timeExpireDateString: new Date(timeExpireDate * 1000).toISOString(),
    payeeNodeKey,
    signature,
    recoveryFlag,
    tags,
    tagsObject,
  };
}

/* ── HRP parser ────────────────────────────────────────────────────────────── */

interface ParsedAmount {
  satoshis: number | null;
  millisatoshis: string | null;
}

function parseHRP(hrp: string): {
  prefix: string;
  network: Network | null;
  amount: ParsedAmount | null;
} {
  if (!hrp.startsWith('ln')) throw new Error('Invalid prefix: must start with "ln"');

  // Try each known network prefix, longest first to match "bcrt" before "bc"
  const prefixes = Object.values(NETWORKS)
    .map((n) => ({ net: n, pfx: 'ln' + n.bech32 }))
    .sort((a, b) => b.pfx.length - a.pfx.length);

  for (const { net, pfx } of prefixes) {
    if (hrp.startsWith(pfx)) {
      const amountStr = hrp.slice(pfx.length);
      return {
        prefix: hrp,
        network: net,
        amount: amountStr ? parseAmount(amountStr) : null,
      };
    }
  }

  throw new Error(`Unknown network in prefix "${hrp}"`);
}

function parseAmount(amountStr: string): ParsedAmount {
  // Multipliers map a suffix letter to millisatoshis-per-unit.
  // The unit in the HRP is BTC.  1 BTC = 100 000 000 000 msat.
  const MSAT_PER_BTC = 100_000_000_000; // 1e11
  const multipliers: Record<string, number> = {
    m: MSAT_PER_BTC / 1_000, // milli-bitcoin
    u: MSAT_PER_BTC / 1_000_000, // micro-bitcoin
    n: MSAT_PER_BTC / 1_000_000_000, // nano-bitcoin  → 100 msat
    p: MSAT_PER_BTC / 1e12, // pico-bitcoin  → 0.1 msat
  };

  let numStr = amountStr;
  let mult = MSAT_PER_BTC; // no suffix → whole bitcoin

  const lastChar = amountStr[amountStr.length - 1];
  if (lastChar in multipliers) {
    numStr = amountStr.slice(0, -1);
    mult = multipliers[lastChar];
  }

  if (!numStr || !/^\d+$/.test(numStr) || (numStr.length > 1 && numStr[0] === '0')) {
    throw new Error(`Invalid amount: "${amountStr}"`);
  }

  // pico amounts must be multiples of 10 (spec: last decimal must be 0)
  if (lastChar === 'p' && parseInt(numStr) % 10 !== 0) {
    throw new Error('pico-bitcoin amount must be a multiple of 10');
  }

  const num = parseInt(numStr, 10);
  const msat = Math.round(num * mult);

  return {
    satoshis: msat % 1000 === 0 ? msat / 1000 : null,
    millisatoshis: msat.toString(),
  };
}

/* ── Tag parser ────────────────────────────────────────────────────────────── */

function parseTags(words: number[]): TagData[] {
  const tags: TagData[] = [];
  let pos = 0;

  while (pos < words.length) {
    if (pos + 3 > words.length) break; // malformed trailing data
    const type = words[pos];
    const dataLen = words[pos + 1] * 32 + words[pos + 2];
    const tagEnd = pos + 3 + dataLen;
    if (tagEnd > words.length) throw new Error('Tag data extends beyond data part');

    const tagWords = words.slice(pos + 3, tagEnd);
    const name = TAG_CODE_TO_NAME[type];

    if (name) {
      const parsed = parseTagData(name, tagWords, dataLen);
      if (parsed) tags.push(parsed);
    }
    // Unknown tags are silently skipped (spec: extensibility).

    pos = tagEnd;
  }

  return tags;
}

function parseTagData(name: string, words: number[], dataLen: number): TagData | null {
  switch (name) {
    case 'payment_hash':
    case 'payment_secret':
    case 'purpose_commit_hash': {
      if (dataLen !== 52) return null; // spec: MUST be 52
      const hex = bytesToHex(fiveToEightTrim(words));
      return { tagName: name, data: hex } as TagData;
    }

    case 'payee': {
      if (dataLen !== 53) return null; // spec: MUST be 53
      const hex = bytesToHex(fiveToEightTrim(words));
      return { tagName: 'payee', data: hex };
    }

    case 'description': {
      const text = bytesToString(fiveToEightTrim(words));
      return { tagName: 'description', data: text };
    }

    case 'metadata': {
      const hex = bytesToHex(fiveToEightTrim(words));
      return { tagName: 'metadata', data: hex };
    }

    case 'expire_time':
      return { tagName: 'expire_time', data: wordsToInt(words) };

    case 'min_final_cltv_expiry':
      return { tagName: 'min_final_cltv_expiry', data: wordsToInt(words) };

    case 'fallback_address':
      return { tagName: 'fallback_address', data: parseFallbackAddress(words) };

    case 'route_hint':
      return { tagName: 'route_hint', data: parseRouteHint(words) };

    case 'feature_bits':
      return { tagName: 'feature_bits', data: parseFeatureBits(words) };

    default:
      return null;
  }
}

/* ── Fallback address ──────────────────────────────────────────────────────── */

function parseFallbackAddress(words: number[]): FallbackAddress {
  if (words.length === 0) throw new Error('Empty fallback address');
  const version = words[0];
  const addrBytes = fiveToEightTrim(words.slice(1));
  return {
    code: version,
    address: '', // full address reconstruction left to caller (needs network context)
    addressHash: bytesToHex(addrBytes),
  };
}

/* ── Route hint ────────────────────────────────────────────────────────────── */

function parseRouteHint(words: number[]): RoutingInfo[] {
  const bytes = fiveToEightTrim(words);
  const routes: RoutingInfo[] = [];
  const HOP = 51; // 33+8+4+4+2

  for (let i = 0; i + HOP <= bytes.length; i += HOP) {
    routes.push({
      pubkey: bytesToHex(bytes.slice(i, i + 33)),
      short_channel_id: bytesToHex(bytes.slice(i + 33, i + 41)),
      fee_base_msat: bytesToInt(bytes.slice(i + 41, i + 45)),
      fee_proportional_millionths: bytesToInt(bytes.slice(i + 45, i + 49)),
      cltv_expiry_delta: bytesToInt(bytes.slice(i + 49, i + 51)),
    });
  }
  return routes;
}

/* ── Feature bits ──────────────────────────────────────────────────────────── */

function parseFeatureBits(words: number[]): FeatureBits {
  // Feature bits are natively in 5-bit words – big-endian, bit 0 is LSB.
  // Reconstruct a flat bit array from the words.
  const totalBits = words.length * 5;
  const bits: boolean[] = new Array(totalBits).fill(false);
  for (let w = 0; w < words.length; w++) {
    for (let b = 0; b < 5; b++) {
      // word 0 is most significant
      const bitIndex = totalBits - 1 - (w * 5 + (4 - b));
      bits[bitIndex] = ((words[w] >> b) & 1) === 1;
    }
  }

  const getBit = (i: number): boolean => (i < bits.length ? bits[i] : false);
  const feature = (even: number): { required: boolean; supported: boolean } | undefined => {
    const req = getBit(even);
    const sup = getBit(even + 1);
    return req || sup ? { required: req, supported: sup || req } : undefined;
  };

  const knownEnd = 20;
  const extraBits: number[] = [];
  let hasRequired = false;
  for (let i = knownEnd; i < bits.length; i++) {
    if (bits[i]) {
      extraBits.push(i);
      if (i % 2 === 0) hasRequired = true;
    }
  }

  return {
    word_length: words.length,
    option_data_loss_protect: feature(0),
    initial_routing_sync: feature(2),
    option_upfront_shutdown_script: feature(4),
    gossip_queries: feature(6),
    var_onion_optin: feature(8),
    gossip_queries_ex: feature(10),
    option_static_remotekey: feature(12),
    payment_secret: feature(14),
    basic_mpp: feature(16),
    option_support_large_channel: feature(18),
    extra_bits: {
      start_bit: knownEnd,
      bits: extraBits,
      has_required: hasRequired,
    },
  };
}

/* ── Signature / public key recovery ───────────────────────────────────────── */

async function resolvePayeeKey(
  sigHash: Uint8Array,
  sigBytes: Uint8Array,
  recoveryFlag: number,
  tags: TagData[],
): Promise<string | null> {
  const payeeTag = tags.find((t) => t.tagName === 'payee');
  if (payeeTag && payeeTag.tagName === 'payee') return payeeTag.data;
  return recoverPubKey(sigHash, sigBytes, recoveryFlag);
}

/* ── Tags → object helper ──────────────────────────────────────────────────── */

function buildTagsObject(tags: TagData[]): TagsObject {
  const obj: TagsObject = {};
  for (const t of tags) {
    switch (t.tagName) {
      case 'payment_hash':
        obj.payment_hash = t.data;
        break;
      case 'payment_secret':
        obj.payment_secret = t.data;
        break;
      case 'description':
        obj.description = t.data;
        break;
      case 'purpose_commit_hash':
        obj.purpose_commit_hash = t.data;
        break;
      case 'payee':
        obj.payee = t.data;
        break;
      case 'expire_time':
        obj.expire_time = t.data;
        break;
      case 'min_final_cltv_expiry':
        obj.min_final_cltv_expiry = t.data;
        break;
      case 'fallback_address':
        obj.fallback_address = t.data;
        break;
      case 'route_hint':
        obj.route_hint = t.data;
        break;
      case 'feature_bits':
        obj.feature_bits = t.data;
        break;
      case 'metadata':
        obj.metadata = t.data;
        break;
    }
  }
  return obj;
}
