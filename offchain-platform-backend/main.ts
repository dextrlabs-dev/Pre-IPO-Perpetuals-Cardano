/**
 * HTTP API for pre-IPO script flows (wraps ../cli/preipo-evo-core.ts).
 *
 * Chain: PREIPO_USE_PREPROD=1 | PREIPO_USE_EMULATOR=1 — same as CLI. PORT=8787.
 * Quick emulator: `deno task serve:emulator` (auto-locks anthropic/openai/spacex on first run).
 *
 * Ventuals oracle worker (default on): POSTs Hyperliquid `candleSnapshot` per
 * `vntl:*` market, ratio-steps on-chain oracle within validator variance (20%).
 * PREIPO_ORACLE_WORKER=0 to disable.
 *
 * HL_ORACLE_INTERVAL=1h|15m|4h|1d — candle granularity (default 1h).
 * ORACLE_POLL_MS — loop period (default 60s preprod, 15s emulator).
 * ORACLE_TX_GAP_MS — pause between Preprod oracle txs (default 12000).
 * HL_INFO_URL — override Hyperliquid info URL.
 * PREIPO_SESSIONS_PATH — JSON map of marketId → { lastSpendTx }.
 * PREIPO_MARKET_TIPS — `anthropic:tx,openai:tx` overrides bootstrap tips.
 */
import { startServer } from "./src/server.ts";

await startServer();
