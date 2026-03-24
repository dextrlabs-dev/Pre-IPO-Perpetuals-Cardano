/**
 * Opens anthropic, openai, spacex; runs 10 oracle + 10 pool swap per market.
 * Default: Mesh Yaci (`https://meshjs.dev/yaci`). Preprod: `PREIPO_USE_PREPROD=1`.
 * Mint/Redeem: `deno run -A cli/preipo.ts mint|redeem`.
 * Prints TSV: market<TAB>step<TAB>txHash<TAB>explorerUrl
 */
import { txExplorerUrl } from "./cardano-env.ts";
import {
  fetchScriptUtxoFromTx,
  lockMarket,
  parsePerpDatum,
  sleep,
  submitOracle,
  submitSwap,
} from "./preipo-evo-core.ts";

const markets = ["anthropic", "openai", "spacex"] as const;
const rows: string[] = [];

/** Lock tx always places the script output at index 0 (change at 1). Lucid sometimes mis-associates datum to the wrong index. */

for (const name of markets) {
  const lockTx = await lockMarket(
    name,
    25_000_000n,
    1_000_000n,
    10_000_000n,
    10_000_000n,
  );
  rows.push(`${name}\tlock\t${lockTx}\t${txExplorerUrl(lockTx)}`);
  let u = await fetchScriptUtxoFromTx(lockTx);

  for (let i = 0; i < 10; i++) {
    const st = parsePerpDatum(u).market!;
    const newPrice = st.current_price * 101n / 100n;
    const otx = await submitOracle(u, newPrice);
    rows.push(`${name}\toracle_${i + 1}\t${otx}\t${txExplorerUrl(otx)}`);
    u = await fetchScriptUtxoFromTx(otx);

    const stx = await submitSwap(u, 1, 8_000n);
    rows.push(`${name}\tswap_${i + 1}\t${stx}\t${txExplorerUrl(stx)}`);
    u = await fetchScriptUtxoFromTx(stx);
  }
}

console.log("market\tstep\ttxHash\turl");
for (const r of rows) console.log(r);
