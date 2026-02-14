import * as secp256k1 from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from './utils.js';

// secp256k1 curve order
const N = BigInt('0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141');
const HALF_N = N / 2n;

/**
 * Sign a message hash with secp256k1 and return 64-byte compact signature + recovery flag.
 */
export async function signCompact(
  msgHash: Uint8Array,
  privateKey: Uint8Array,
): Promise<{ signature: Uint8Array; recoveryFlag: number }> {
  const [signature, recoveryFlag] = await secp256k1.sign(msgHash, privateKey, {
    recovered: true,
    der: false,
    canonical: true,
  });
  return { signature, recoveryFlag };
}

/**
 * Get compressed public key (33 bytes) from private key.
 */
export function getPublicKey(privateKey: Uint8Array): string {
  return bytesToHex(secp256k1.getPublicKey(privateKey, true));
}

/**
 * Recover compressed public key from compact signature + recovery flag.
 *
 * BOLT 11 spec says:
 * - If `n` field (payee) is present: use it to verify, MUST fail if low-S violated.
 * - Otherwise (recovery): MUST accept both high-S and low-S.
 *
 * When S is high, @noble/secp256k1's recovery flag semantics differ from the
 * original signing. We detect high-S and try both the original with a flipped
 * flag and the normalized version with the original flag.
 */
export function recoverPublicKey(
  msgHash: Uint8Array,
  signature: Uint8Array,
  recoveryFlag: number,
): string | null {
  const s = bytesToBigInt(signature.slice(32));
  const isHighS = s > HALF_N;

  if (!isHighS) {
    // Standard low-S: use the flag as-is
    try {
      const pub = secp256k1.recoverPublicKey(msgHash, signature, recoveryFlag, true);
      if (pub) return bytesToHex(pub);
    } catch {
      /* fall through */
    }
  } else {
    // High-S: the original signer's recovery flag was computed before normalization.
    // @noble/secp256k1 expects low-S, so we need to normalize and adjust the flag.
    //
    // Approach: with orig sig, flag is inverted; with normalized sig, flag stays.
    try {
      const pub = secp256k1.recoverPublicKey(msgHash, signature, recoveryFlag ^ 1, true);
      if (pub) return bytesToHex(pub);
    } catch {
      /* fall through */
    }

    try {
      const normalized = normalizeSig(signature);
      const pub = secp256k1.recoverPublicKey(msgHash, normalized, recoveryFlag, true);
      if (pub) return bytesToHex(pub);
    } catch {
      /* fall through */
    }
  }

  return null;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt('0x' + bytesToHex(bytes));
}

function normalizeSig(sig: Uint8Array): Uint8Array {
  const r = sig.slice(0, 32);
  const s = bytesToBigInt(sig.slice(32));
  const sNorm = s > HALF_N ? N - s : s;
  const sHex = sNorm.toString(16).padStart(64, '0');
  const result = new Uint8Array(64);
  result.set(r, 0);
  result.set(hexToBytes(sHex), 32);
  return result;
}
