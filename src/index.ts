/**
 * @nova-carnivore/bolt11-ts
 * Modern TypeScript BOLT 11 Lightning Network payment request encoder/decoder
 */

export { decode } from './decode.js';
export { encode, sign } from './encode.js';
export { satToHrp, millisatToHrp, hrpToSat, hrpToMillisat } from './helpers.js';
export { NETWORKS } from './types.js';
export type {
  Network,
  FallbackAddress,
  RoutingInfo,
  FeatureBits,
  TagData,
  TagsObject,
  PaymentRequestObject,
  EncodeOptions,
  SignedPaymentRequest,
} from './types.js';
export {
  bech32Decode,
  bech32Encode,
  fiveToEight,
  fiveToEightTrim,
  eightToFive,
  wordsToBytes,
  bytesToWords,
} from './bech32.js';
