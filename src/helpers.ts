/**
 * BOLT 11 amount conversion helpers
 *
 * These mirror the helpers from the original `bolt11` npm package.
 */

const MSAT_PER_BTC = 100_000_000_000; // 1e11

const MULTIPLIERS: Record<string, number> = {
  m: MSAT_PER_BTC / 1_000, // milli-bitcoin → 1e8 msat
  u: MSAT_PER_BTC / 1_000_000, // micro-bitcoin → 1e5 msat
  n: MSAT_PER_BTC / 1_000_000_000, // nano-bitcoin → 100 msat
  p: MSAT_PER_BTC / 1e12, // pico-bitcoin → 0.1 msat
};

/**
 * Convert satoshis to an HRP amount string.
 * e.g. 250000 → "2500u", 1000000 → "10m"
 */
export function satToHrp(sat: number): string {
  return msatToHrpString(sat * 1000);
}

/**
 * Convert millisatoshis to an HRP amount string.
 * e.g. 250000000 → "2500u"
 */
export function millisatToHrp(msat: number | string): string {
  const m = typeof msat === 'string' ? parseInt(msat, 10) : msat;
  return msatToHrpString(m);
}

/**
 * Convert an HRP amount string to satoshis.
 * e.g. "2500u" → 250000
 * Throws if the amount is not a whole number of satoshis.
 */
export function hrpToSat(hrp: string): string {
  const msat = hrpToMillisatNum(hrp);
  if (msat % 1000 !== 0) {
    throw new Error(`Amount ${hrp} is not a whole number of satoshis`);
  }
  return (msat / 1000).toString();
}

/**
 * Convert an HRP amount string to millisatoshis.
 * e.g. "2500u" → "250000000"
 */
export function hrpToMillisat(hrp: string): string {
  return hrpToMillisatNum(hrp).toString();
}

/* ── Internal ──────────────────────────────────────────────────────────────── */

function hrpToMillisatNum(amountStr: string): number {
  let numStr = amountStr;
  let mult = MSAT_PER_BTC; // no suffix → whole bitcoin

  const lastChar = amountStr[amountStr.length - 1];
  if (lastChar in MULTIPLIERS) {
    numStr = amountStr.slice(0, -1);
    mult = MULTIPLIERS[lastChar];
  }

  if (!numStr || !/^\d+$/.test(numStr) || (numStr.length > 1 && numStr[0] === '0')) {
    throw new Error(`Invalid amount: "${amountStr}"`);
  }

  if (lastChar === 'p' && parseInt(numStr) % 10 !== 0) {
    throw new Error('pico-bitcoin amount must be a multiple of 10');
  }

  return Math.round(parseInt(numStr, 10) * mult);
}

function msatToHrpString(msat: number): string {
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

  // Fallback: pico (always works for integer msat)
  const picoVal = Math.round(msat / 0.1);
  return picoVal.toString() + 'p';
}
