/**
 * Network configuration for Bitcoin networks
 */
export interface Network {
  bech32: string;
  pubKeyHash: number;
  scriptHash: number;
  validWitnessVersions: number[];
}

/**
 * Predefined networks
 */
export const NETWORKS: Record<string, Network> = {
  bitcoin: {
    bech32: 'bc',
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    validWitnessVersions: [0, 1],
  },
  testnet: {
    bech32: 'tb',
    pubKeyHash: 0x6f,
    scriptHash: 0xc4,
    validWitnessVersions: [0, 1],
  },
  signet: {
    bech32: 'tbs',
    pubKeyHash: 0x6f,
    scriptHash: 0xc4,
    validWitnessVersions: [0, 1],
  },
  regtest: {
    bech32: 'bcrt',
    pubKeyHash: 0x6f,
    scriptHash: 0xc4,
    validWitnessVersions: [0, 1],
  },
  simnet: {
    bech32: 'sb',
    pubKeyHash: 0x3f,
    scriptHash: 0x7b,
    validWitnessVersions: [0, 1],
  },
};

/**
 * Fallback address for on-chain payment
 */
export interface FallbackAddress {
  code: number;
  address: string;
  addressHash: string;
}

/**
 * Routing information for private channels
 */
export interface RoutingInfo {
  pubkey: string;
  short_channel_id: string;
  fee_base_msat: number;
  fee_proportional_millionths: number;
  cltv_expiry_delta: number;
}

/**
 * Feature bits configuration
 */
export interface FeatureBits {
  word_length: number;
  option_data_loss_protect?: { required: boolean; supported: boolean };
  initial_routing_sync?: { required: boolean; supported: boolean };
  option_upfront_shutdown_script?: { required: boolean; supported: boolean };
  gossip_queries?: { required: boolean; supported: boolean };
  var_onion_optin?: { required: boolean; supported: boolean };
  gossip_queries_ex?: { required: boolean; supported: boolean };
  option_static_remotekey?: { required: boolean; supported: boolean };
  payment_secret?: { required: boolean; supported: boolean };
  basic_mpp?: { required: boolean; supported: boolean };
  option_support_large_channel?: { required: boolean; supported: boolean };
  extra_bits?: {
    start_bit: number;
    bits: number[];
    has_required: boolean;
  };
}

/**
 * Tagged field in a payment request
 */
export type TagData =
  | { tagName: 'payment_hash'; data: string }
  | { tagName: 'payment_secret'; data: string }
  | { tagName: 'description'; data: string }
  | { tagName: 'purpose_commit_hash'; data: string }
  | { tagName: 'payee'; data: string }
  | { tagName: 'expire_time'; data: number }
  | { tagName: 'min_final_cltv_expiry'; data: number }
  | { tagName: 'fallback_address'; data: FallbackAddress }
  | { tagName: 'route_hint'; data: RoutingInfo[] }
  | { tagName: 'feature_bits'; data: FeatureBits }
  | { tagName: 'metadata'; data: string };

/**
 * Tags as an object (for convenience)
 */
export interface TagsObject {
  payment_hash?: string;
  payment_secret?: string;
  description?: string;
  purpose_commit_hash?: string;
  payee?: string;
  expire_time?: number;
  min_final_cltv_expiry?: number;
  fallback_address?: FallbackAddress;
  route_hint?: RoutingInfo[];
  feature_bits?: FeatureBits;
  metadata?: string;
}

/**
 * Decoded payment request
 */
export interface PaymentRequestObject {
  paymentRequest?: string;
  complete: boolean;
  prefix: string;
  wordsTemp: string;
  network: Network | null;
  satoshis: number | null;
  millisatoshis: string | null;
  timestamp: number;
  timestampString: string;
  timeExpireDate: number | null;
  timeExpireDateString: string | null;
  payeeNodeKey: string | null;
  signature: string;
  recoveryFlag: number;
  tags: TagData[];
  tagsObject: TagsObject;
}

/**
 * Options for encoding a payment request
 */
export interface EncodeOptions {
  network?: Network | string;
  satoshis?: number;
  millisatoshis?: string | number;
  timestamp?: number;
  tags: TagData[];
}

/**
 * Signed payment request
 */
export interface SignedPaymentRequest extends PaymentRequestObject {
  paymentRequest: string;
}
