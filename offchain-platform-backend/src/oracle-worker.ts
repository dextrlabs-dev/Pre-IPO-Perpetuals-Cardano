import {
  fetchScriptUtxoFromTx,
  parsePerpDatum,
  submitOracle,
} from "../../cli/preipo-evo-core.ts";
import { PREIPO_USE_PREPROD } from "../../cli/cardano-env.ts";
import { fetchLastCloseUsd } from "./hl-client.ts";
import { VENTUALS_MARKETS } from "./markets-config.ts";
import { getSession, rememberTx } from "./session-store.ts";

/** On-chain `max_variance_bps` in preipo.ak */
const MAX_VARIANCE_BPS = 2000n;

const lastHlClose = new Map<string, number>();

function clampToVariance(current: bigint, target: bigint): bigint {
  const maxUp = current * (10000n + MAX_VARIANCE_BPS) / 10000n;
  const minDown = current * (10000n - MAX_VARIANCE_BPS) / 10000n;
  if (target > maxUp) return maxUp;
  if (target < minDown) return minDown;
  return target;
}

function ratioTarget(current: bigint, hlPrev: number, hlNow: number): bigint {
  const prev = hlPrev * 1_000_000;
  const now = hlNow * 1_000_000;
  const p = Math.round(prev);
  const n = Math.round(now);
  if (p <= 0 || n <= 0) return current;
  return (current * BigInt(n)) / BigInt(p);
}

let ticking = false;

export async function oracleTickOnce(): Promise<void> {
  if (ticking) return;
  ticking = true;
  try {
    const interval = (Deno.env.get("HL_ORACLE_INTERVAL") ?? "1h") as
      | "15m"
      | "1h"
      | "4h"
      | "1d";
    for (const m of VENTUALS_MARKETS) {
      const row = getSession(m.id);
      if (!row?.lastSpendTx) continue;
      let close: number;
      try {
        close = await fetchLastCloseUsd(m.hlCoin, interval);
      } catch (e) {
        console.warn(`[oracle] HL ${m.id}:`, e);
        continue;
      }
      const prevHl = lastHlClose.get(m.id);
      lastHlClose.set(m.id, close);
      if (prevHl === undefined || prevHl <= 0) {
        console.log(`[oracle] ${m.id}: HL baseline ${close}`);
        continue;
      }

      const utxo = await fetchScriptUtxoFromTx(row.lastSpendTx);
      const parsed = parsePerpDatum(utxo);
      const st = parsed.market;
      if (!st) continue;
      const cur = st.current_price;
      if (cur <= 0n) continue;

      const rawTarget = ratioTarget(cur, prevHl, close);
      const next = clampToVariance(cur, rawTarget);
      if (next === cur) continue;

      console.log(
        `[oracle] ${m.id}: ${cur.toString()} → ${next.toString()} (HL ${prevHl}→${close})`,
      );
      const tx = await submitOracle(utxo, next);
      rememberTx(m.id, tx);

      const gapMs = PREIPO_USE_PREPROD
        ? Number(Deno.env.get("ORACLE_TX_GAP_MS") ?? "12000")
        : 500;
      await new Promise((r) => setTimeout(r, gapMs));
    }
  } finally {
    ticking = false;
  }
}

export function startOracleWorker(): void {
  const base = Number(Deno.env.get("ORACLE_POLL_MS") ?? "");
  const defaultMs = PREIPO_USE_PREPROD ? 60_000 : 15_000;
  const ms = Number.isFinite(base) && base > 5000 ? base : defaultMs;
  console.log(
    `[oracle] worker every ${ms}ms (HL interval ${Deno.env.get("HL_ORACLE_INTERVAL") ?? "1h"} candles, Preprod tx gap tuned)`,
  );
  setInterval(() => {
    void oracleTickOnce().catch((e) => console.error("[oracle]", e));
  }, ms);
  setTimeout(() => {
    void oracleTickOnce().catch((e) => console.error("[oracle]", e));
  }, 8000);
}
