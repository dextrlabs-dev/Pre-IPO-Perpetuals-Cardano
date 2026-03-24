/**
 * Preprod: for anthropic, openai, spacex runs lock → oracle → mint → swap → redeem
 * and writes CSV with tx hashes, explorer URLs, and parsed on-chain market state.
 *
 *   PREIPO_USE_PREPROD=1 deno run -A cli/preprod-three-markets-report.ts
 *
 * Optional: PREIPO_REPORT_CSV=path (default docs/preprod-run-<timestamp>.csv)
 */
import { PREIPO_USE_PREPROD, txExplorerUrl } from "./cardano-env.ts";
import type { UTxO } from "npm:@lucid-evolution/lucid@0.4.29";
import {
  fetchScriptUtxoFromTx,
  lockMarket,
  parsePerpDatum,
  type ParsedMarket,
  submitMint,
  submitOracle,
  submitRedeem,
  submitSwap,
} from "./preipo-evo-core.ts";

const markets = ["anthropic", "openai", "spacex"] as const;

const LOCK_LOVELACE = 25_000_000n;
const LOCK_PRICE = 1_000_000n;
const RESERVE_A = 10_000_000n;
const RESERVE_B = 10_000_000n;
const MINT_QTY = 5_000n;
const SWAP_SELL_A = 1 as const;
const SWAP_AMOUNT_IN = 8_000n;
const REDEEM_QTY = 2_000n;

function csvCell(v: string | bigint): string {
  const s = typeof v === "bigint" ? v.toString() : v;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(cells: (string | bigint)[]): string {
  return cells.map(csvCell).join(",");
}

function appendState(
  rows: string[],
  market: string,
  step: string,
  txHash: string,
  u: UTxO,
  sellA: string,
  amountIn: string,
  note: string,
) {
  const url = txExplorerUrl(txHash);
  let m: ParsedMarket | null = null;
  try {
    m = parsePerpDatum(u).market;
  } catch {
    /* datum missing */
  }
  rows.push(
    csvRow([
      market,
      step,
      txHash,
      url,
      m?.current_price ?? "",
      m?.twav_price ?? "",
      m?.collateral_locked ?? "",
      m?.vtoken_supply ?? "",
      m?.reserve_a ?? "",
      m?.reserve_b ?? "",
      m?.seq ?? "",
      sellA,
      amountIn,
      note,
    ]),
  );
}

async function main() {
  if (!PREIPO_USE_PREPROD) {
    console.error("Set PREIPO_USE_PREPROD=1 (this script submits to Preprod).");
    Deno.exit(1);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = Deno.env.get("PREIPO_REPORT_CSV") ??
    new URL(`../docs/preprod-run-${ts}.csv`, import.meta.url).pathname;

  const header = csvRow([
    "market",
    "step",
    "txHash",
    "explorerUrl",
    "current_price",
    "twav_price",
    "collateral_locked",
    "vtoken_supply",
    "reserve_a",
    "reserve_b",
    "seq",
    "sellA",
    "amountIn",
    "note",
  ]);
  const rows: string[] = [header];

  for (const name of markets) {
    console.error(`[${name}] lock…`);
    const lockTx = await lockMarket(
      name,
      LOCK_LOVELACE,
      LOCK_PRICE,
      RESERVE_A,
      RESERVE_B,
    );
    console.error(`[${name}] lock`, lockTx);
    let u = await fetchScriptUtxoFromTx(lockTx);
    appendState(rows, name, "lock", lockTx, u, "", "", "initial");

    const st0 = parsePerpDatum(u).market!;
    const newPrice = st0.current_price * 101n / 100n;
    console.error(`[${name}] oracle…`);
    const otx = await submitOracle(u, newPrice);
    console.error(`[${name}] oracle_1`, otx);
    u = await fetchScriptUtxoFromTx(otx);
    appendState(rows, name, "oracle_1", otx, u, "", "", "bump +1%");

    console.error(`[${name}] mint…`);
    const mtx = await submitMint(u, MINT_QTY);
    console.error(`[${name}] mint`, mtx);
    u = await fetchScriptUtxoFromTx(mtx);
    appendState(rows, name, "mint", mtx, u, "", "", `qty=${MINT_QTY}`);

    console.error(`[${name}] swap…`);
    const stx = await submitSwap(u, SWAP_SELL_A, SWAP_AMOUNT_IN);
    console.error(`[${name}] swap_1`, stx);
    u = await fetchScriptUtxoFromTx(stx);
    appendState(
      rows,
      name,
      "swap_1",
      stx,
      u,
      String(SWAP_SELL_A),
      String(SWAP_AMOUNT_IN),
      "pool trade",
    );

    console.error(`[${name}] redeem…`);
    const rtx = await submitRedeem(u, REDEEM_QTY);
    console.error(`[${name}] redeem`, rtx);
    u = await fetchScriptUtxoFromTx(rtx);
    appendState(
      rows,
      name,
      "redeem",
      rtx,
      u,
      "",
      "",
      `burn=${REDEEM_QTY}`,
    );
  }

  const body = rows.join("\n") + "\n";
  await Deno.mkdir(new URL("../docs", import.meta.url).pathname, {
    recursive: true,
  }).catch(() => {});
  await Deno.writeTextFile(outPath, body);
  console.log(body);
  console.error("Wrote", outPath);
}

await main();
