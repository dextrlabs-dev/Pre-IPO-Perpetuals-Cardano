/**
 * Default chain: Mesh hosted Yaci (Blockfrost-compatible REST).
 * @see https://meshjs.dev/yaci
 *
 * - Preprod: `PREIPO_USE_PREPROD=1` (optional `BLOCKFROST_URL` / `BLOCKFROST_PROJECT_ID`).
 * - In-process ledger (same Plutus paths, instant): `PREIPO_USE_EMULATOR=1` (when Yaci HTTP is down or for CI).
 */
export const PREIPO_USE_EMULATOR = Deno.env.get("PREIPO_USE_EMULATOR") === "1";

export const PREIPO_USE_PREPROD = Deno.env.get("PREIPO_USE_PREPROD") === "1";

export const blockfrostBaseUrl = Deno.env.get("BLOCKFROST_URL") ??
  (PREIPO_USE_PREPROD
    ? "https://cardano-preprod.blockfrost.io/api/v0"
    : "https://yaci-node.meshjs.dev/api/v1");

export const blockfrostProjectId = Deno.env.get("BLOCKFROST_PROJECT_ID") ??
  (PREIPO_USE_PREPROD ? "preprodJS4XP8SQVx5WWpsfMU7dfaOdCy9TTloQ" : "");

/** Lucid `Custom` uses slotLength 0 — avoid. Yaci defaults to Preview-like slots; override if your devnet differs. */
export type LucidEvoNetwork = "Preview" | "Preprod";

export const lucidEvoNetwork = (Deno.env.get("PREIPO_LUCID_NETWORK") ??
  (PREIPO_USE_PREPROD ? "Preprod" : "Preview")) as LucidEvoNetwork;

/** Classic lucid@0.10 uses the same string names. */
export const lucidClassicNetwork = lucidEvoNetwork;

/** Blockfrost address index can lag; Yaci is fast — shorter pause is enough. */
export const postTxSyncSleepMs = PREIPO_USE_EMULATOR
  ? 0
  : PREIPO_USE_PREPROD
  ? 6000
  : 400;

export function txExplorerUrl(txHash: string): string {
  const base = Deno.env.get("PREIPO_TX_EXPLORER");
  if (base) return `${base.replace(/\/$/, "")}/${txHash}`;
  if (PREIPO_USE_EMULATOR) return `emulator:tx:${txHash}`;
  if (PREIPO_USE_PREPROD) {
    return `https://preprod.cardanoscan.io/transaction/${txHash}`;
  }
  return `${blockfrostBaseUrl.replace(/\/$/, "")}/txs/${txHash}`;
}
