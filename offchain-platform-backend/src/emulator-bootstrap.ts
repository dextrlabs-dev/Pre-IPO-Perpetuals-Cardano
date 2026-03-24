import { PREIPO_USE_EMULATOR } from "../../cli/cardano-env.ts";
import {
  fetchScriptUtxoFromTx,
  lockMarket,
} from "../../cli/preipo-evo-core.ts";
import { fetchLastCloseUsd } from "./hl-client.ts";
import { VENTUALS_MARKETS } from "./markets-config.ts";
import { getSession, rememberTx } from "./session-store.ts";

/** On the in-process emulator, Preprod bootstrap tx hashes are invalid — lock fresh markets. */
export async function ensureVentualsForEmulator(): Promise<void> {
  if (!PREIPO_USE_EMULATOR) return;
  const hlInterval = (Deno.env.get("HL_ORACLE_INTERVAL") ?? "1h") as
    | "15m"
    | "1h"
    | "4h"
    | "1d";
  const SCALE = 1_000_000n;
  const SEED_WHOLE_TOKENS = 10n;
  const SEED_TOKEN_UNITS = SEED_WHOLE_TOKENS * SCALE; // 10 whole tokens

  for (const m of VENTUALS_MARKETS) {
    const tip = getSession(m.id)?.lastSpendTx;
    if (tip) {
      try {
        await fetchScriptUtxoFromTx(tip);
        console.log(`[emulator] market ${m.id} tip ok`);
        continue;
      } catch {
        console.log(`[emulator] market ${m.id} tip stale, re-locking`);
      }
    } else {
      console.log(`[emulator] market ${m.id} no tip, locking`);
    }
    let reserveA = 10_000_000n;
    let reserveB = SEED_TOKEN_UNITS;
    let price = 1_000_000n;
    let lockLovelace = 25_000_000n;
    try {
      const usd = await fetchLastCloseUsd(m.hlCoin, hlInterval);
      const usdcxPerToken = usd; // 1 USDCx ~= 1 USD
      if (Number.isFinite(usdcxPerToken) && usdcxPerToken > 0) {
        // `current_price / 1e6 = USDCx per token`
        price = BigInt(Math.max(1, Math.round(usdcxPerToken * 1_000_000)));
        // Seed with 10 whole tokens, derive USDCx-side reserve so ratio matches oracle.
        const reserveAFloat = Number(SEED_WHOLE_TOKENS) * usdcxPerToken *
          1_000_000;
        reserveA = BigInt(Math.max(1, Math.round(reserveAFloat)));
        // Keep lock amount safely above reserve amount (script UTxO min-ADA carrier).
        lockLovelace = reserveA + 5_000_000n;
      }
      console.log(
        `[emulator] ${m.id} seeded from oracle: ${usd.toFixed(2)} USDCx, reserves A=${reserveA} B=${reserveB}, lock=${lockLovelace}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(
        `[emulator] ${m.id} oracle seed unavailable (${msg}); using defaults`,
      );
    }
    const txHash = await lockMarket(
      m.id,
      lockLovelace,
      price,
      reserveA,
      reserveB,
    );
    rememberTx(m.id, txHash);
  }
}
