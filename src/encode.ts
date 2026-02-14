/**
 * BOLT 11 payment request encoder
 */

import { bech32Encode, eightToFive, fiveToEight } from './bech32.js';
import {
  concatBytes,
  getCurrentTimestamp,
  hexToBytes,
  intToWords,
  sha256,
  stringToBytes,
  bytesToHex,
} from './utils.js';
import { signCompact, getPublicKey as getPubKey } from './crypto.js';
import type {
  EncodeOptions,
  Network,
  PaymentRequestObject,
  SignedPaymentRequest,
  TagData,
  TagsObject,
} from './types.js';
import { NETWORKS } from './types.js';

/* ── Tag name → 5-bit type code ────────────────────────────────────────────── */

const TAG_NAME_TO_CODE: Record<string, number> = {
  payment_hash: 1,
  payment_secret: 16,
  description: 13,
  purpose_commit_hash: 23,
  payee: 19,
  expire_time: 6,
  min_final_cltv_expiry: 24,
  fallback_address: 9,
  route_hint: 3,
  feature_bits: 5,
  metadata: 27,
};

/* ── Encode (unsigned) ─────────────────────────────────────────────────────── */

export function encode(options: EncodeOptions): PaymentRequestObject {
  const network = options.network ?? NETWORKS.bitcoin;
  const timestamp = options.timestamp ?? getCurrentTimestamp();

  validateTags(options.tags);

  const hrp = buildHRP(network, options.satoshis, options.millisatoshis);
  // const timestampWords = intToWords(timestamp, 7);
  // const tagWords = encodeAllTags(options.tags);
  // const dataWords = [...timestampWords, ...tagWords]; // TODO: use for signing

  const tagsObj = buildTagsObject(options.tags);
  const expireTime = tagsObj.expire_time ?? 3600;
  const timeExpireDate = timestamp + expireTime;

  return {
    complete: false,
    prefix: hrp,
    wordsTemp: '',
    network,
    satoshis: options.satoshis ?? null,
    millisatoshis: options.millisatoshis?.toString() ?? null,
    timestamp,
    timestampString: new Date(timestamp * 1000).toISOString(),
    timeExpireDate,
    timeExpireDateString: new Date(timeExpireDate * 1000).toISOString(),
    payeeNodeKey: null,
    signature: '',
    recoveryFlag: 0,
    tags: options.tags,
    tagsObject: tagsObj,
  };
}

/* ── Sign ──────────────────────────────────────────────────────────────────── */

export async function sign(
  pr: PaymentRequestObject,
  privateKeyHex: string,
): Promise<SignedPaymentRequest> {
  const privateKey = hexToBytes(privateKeyHex);

  const network = pr.network ?? NETWORKS.bitcoin;
  const hrp = buildHRP(network, pr.satoshis, pr.millisatoshis);
  const timestampWords = intToWords(pr.timestamp, 7);
  const tagWords = encodeAllTags(pr.tags);
  const dataWords = [...timestampWords, ...tagWords];

  // Signing data = hrp (UTF-8) || data-words→bytes (with 0-pad to byte boundary)
  const hrpBytes = stringToBytes(hrp);
  const dataBytes = fiveToEight(dataWords, true);
  const sigHash = sha256(concatBytes(hrpBytes, dataBytes));

  const { signature, recoveryFlag } = await signCompact(sigHash, privateKey);

  // Signature → 5-bit words: 64 bytes R‖S → 103 words, then recovery flag as 104th word
  const sigWords = eightToFive(signature); // 103 words (64*8/5 = 102.4 → 103 with pad)
  // Ensure exactly 103 words
  while (sigWords.length < 103) sigWords.push(0);
  sigWords.push(recoveryFlag); // 104th word

  const allWords = [...dataWords, ...sigWords];
  const paymentRequest = bech32Encode(hrp, allWords);

  return {
    ...pr,
    paymentRequest,
    complete: true,
    signature: bytesToHex(signature),
    recoveryFlag,
    payeeNodeKey: getPubKey(privateKey),
  };
}

/* ── HRP builder ───────────────────────────────────────────────────────────── */

function buildHRP(
  network: Network,
  satoshis?: number | null,
  millisatoshis?: string | number | null,
): string {
  let hrp = 'ln' + network.bech32;
  if (satoshis != null) {
    hrp += encodeAmountFromMsat(satoshis * 1000);
  } else if (millisatoshis != null) {
    const msat = typeof millisatoshis === 'string' ? parseInt(millisatoshis, 10) : millisatoshis;
    hrp += encodeAmountFromMsat(msat);
  }
  return hrp;
}

/**
 * Encode amount for the HRP. Input is millisatoshis.
 * Chooses the shortest representation per spec.
 */
function encodeAmountFromMsat(msat: number): string {
  // 1 BTC = 1e11 msat.  multipliers map suffix → msat-per-unit
  const options: { suffix: string; divisor: number }[] = [
    { suffix: 'm', divisor: 100_000_000 }, // milli-bitcoin
    { suffix: 'u', divisor: 100_000 }, // micro-bitcoin
    { suffix: 'n', divisor: 100 }, // nano-bitcoin
    { suffix: 'p', divisor: 0.1 }, // pico-bitcoin
  ];

  for (const { suffix, divisor } of options) {
    const val = msat / divisor;
    if (Number.isInteger(val) && val >= 1) {
      return val.toString() + suffix;
    }
  }

  // Fallback: pico (always works for integer msat, albeit with trailing 0)
  const picoVal = Math.round(msat / 0.1);
  return picoVal.toString() + 'p';
}

/* ── Tag encoder ───────────────────────────────────────────────────────────── */

function encodeAllTags(tags: TagData[]): number[] {
  const words: number[] = [];
  for (const tag of tags) words.push(...encodeTag(tag));
  return words;
}

function encodeTag(tag: TagData): number[] {
  const code = TAG_NAME_TO_CODE[tag.tagName];
  if (code === undefined) throw new Error(`Unknown tag: ${tag.tagName}`);

  const tagWords = encodeTagData(tag);
  const len = tagWords.length;
  return [code, (len >> 5) & 0x1f, len & 0x1f, ...tagWords];
}

function encodeTagData(tag: TagData): number[] {
  switch (tag.tagName) {
    case 'payment_hash':
    case 'payment_secret':
    case 'purpose_commit_hash':
    case 'payee':
    case 'metadata':
      return eightToFive(hexToBytes(tag.data));

    case 'description':
      return eightToFive(stringToBytes(tag.data));

    case 'expire_time':
    case 'min_final_cltv_expiry':
      return intToMinWords(tag.data);

    case 'fallback_address':
      return [tag.data.code, ...eightToFive(hexToBytes(tag.data.addressHash))];

    case 'route_hint': {
      // Each hop: 33+8+4+4+2 = 51 bytes
      const hopBytes: number[] = [];
      for (const hop of tag.data) {
        const hb = hexToBytes(hop.pubkey);
        const sc = hexToBytes(hop.short_channel_id);
        hopBytes.push(...hb, ...sc);
        hopBytes.push(
          (hop.fee_base_msat >> 24) & 0xff,
          (hop.fee_base_msat >> 16) & 0xff,
          (hop.fee_base_msat >> 8) & 0xff,
          hop.fee_base_msat & 0xff,
        );
        hopBytes.push(
          (hop.fee_proportional_millionths >> 24) & 0xff,
          (hop.fee_proportional_millionths >> 16) & 0xff,
          (hop.fee_proportional_millionths >> 8) & 0xff,
          hop.fee_proportional_millionths & 0xff,
        );
        hopBytes.push((hop.cltv_expiry_delta >> 8) & 0xff, hop.cltv_expiry_delta & 0xff);
      }
      return eightToFive(new Uint8Array(hopBytes));
    }

    case 'feature_bits': {
      // Encode from the FeatureBits object back to 5-bit words.
      // Simplified: just store the word_length of zeros (overridden below if needed).
      const fb = tag.data;
      const totalBits = fb.word_length * 5;
      const bits = new Uint8Array(totalBits);

      const setBit = (i: number): void => {
        if (i < totalBits) bits[i] = 1;
      };
      const setFeature = (even: number, f?: { required: boolean; supported: boolean }): void => {
        if (!f) return;
        if (f.required) setBit(even);
        if (f.supported) setBit(even + 1);
      };

      setFeature(0, fb.option_data_loss_protect);
      setFeature(2, fb.initial_routing_sync);
      setFeature(4, fb.option_upfront_shutdown_script);
      setFeature(6, fb.gossip_queries);
      setFeature(8, fb.var_onion_optin);
      setFeature(10, fb.gossip_queries_ex);
      setFeature(12, fb.option_static_remotekey);
      setFeature(14, fb.payment_secret);
      setFeature(16, fb.basic_mpp);
      setFeature(18, fb.option_support_large_channel);
      if (fb.extra_bits) for (const b of fb.extra_bits.bits) setBit(b);

      // Convert bit array to 5-bit words (big-endian)
      const words: number[] = [];
      for (let w = 0; w < fb.word_length; w++) {
        let val = 0;
        for (let b = 0; b < 5; b++) {
          const bitIdx = totalBits - 1 - (w * 5 + (4 - b));
          if (bitIdx >= 0 && bits[bitIdx]) val |= 1 << b;
        }
        words.push(val);
      }
      return words;
    }
  }
}

function intToMinWords(num: number): number[] {
  if (num === 0) return [0];
  const words: number[] = [];
  let n = num;
  while (n > 0) {
    words.unshift(n & 0x1f);
    n >>= 5;
  }
  return words;
}

/* ── Validation ────────────────────────────────────────────────────────────── */

function validateTags(tags: TagData[]): void {
  if (!tags.some((t) => t.tagName === 'payment_hash'))
    throw new Error('payment_hash tag is required');
  if (!tags.some((t) => t.tagName === 'payment_secret'))
    throw new Error('payment_secret tag is required');
  if (!tags.some((t) => t.tagName === 'description' || t.tagName === 'purpose_commit_hash'))
    throw new Error('description or purpose_commit_hash tag is required');
}

/* ── Tags → object ─────────────────────────────────────────────────────────── */

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
