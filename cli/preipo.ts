/**
 * CLI for unified pre-IPO marketplace validator (oracle + vault + pool).
 * Shared logic: ./preipo-core.ts
 */
import type { UTxO } from "https://deno.land/x/lucid@0.10.10/mod.ts";
import {
  contractAddress,
  encodePlutusData,
  lucid,
  marketStateConstr,
  parsePerpDatum,
  perpDatumConstr,
  pickUtxo,
  redeemRedeemer,
  someMarket,
  submitMint,
  submitOracle,
  submitSwap,
  contractScript,
} from "./preipo-core.ts";

async function submitRedeem(utxo: UTxO, burnQty: bigint): Promise<string> {
  const p = parsePerpDatum(utxo);
  if (!p.market) throw new Error("redeem: need market");
  const o = p.market;
  const newSupply = o.vtoken_supply - burnQty;
  const payout = burnQty * o.twav_price / 1_000_000n;
  const newColl = o.collateral_locked - payout;
  const newM = marketStateConstr(
    o.index_id,
    o.current_price,
    o.twav_price,
    o.publisher_keyset_hash,
    o.last_oracle_time,
    newColl,
    newSupply,
    o.reserve_a,
    o.reserve_b,
    o.seq + 1n,
  );
  const outLovelace = utxo.assets.lovelace - payout;
  const datum = encodePlutusData(
    perpDatumConstr(p.trader, p.operator, someMarket(newM)),
  );
  const addr = await lucid.wallet.address();
  const tx = await lucid
    .newTx()
    .collectFrom([utxo], redeemRedeemer(newM))
    .payToAddressWithData(contractAddress, { inline: datum }, {
      lovelace: outLovelace,
    })
    .addSigner(addr)
    .attachSpendingValidator(contractScript)
    .complete();
  return await (await tx.sign().complete()).submit();
}

function printHelp() {
  console.log(`
Unified pre-IPO script (oracle + collateral vault + pool) — default Mesh Yaci; Preprod: PREIPO_USE_PREPROD=1

  deno run -A cli/preipo.ts lock-market <indexName> [lovelace=15000000] [price=1000000]
  deno run -A cli/preipo.ts oracle [txHash] <newPrice>
  deno run -A cli/preipo.ts mint [txHash] <qty>
  deno run -A cli/preipo.ts redeem [txHash] <qty>
  deno run -A cli/preipo.ts swap [txHash] <sellA:0|1> <amountIn>
  deno run -A cli/preipo.ts info

pickUtxo by index: use env or first datum UTxO. For multi-market use txHash or info.

  deno run -A cli/e2e-three-markets.ts   # 3 markets × (mint + 10 oracle + 10 swap)
`);
}

async function info() {
  const utxos = await lucid.utxosAt(contractAddress);
  console.log("contract:", contractAddress);
  console.log("utxos:", utxos.length);
  for (const u of utxos) {
    console.log(" —", u.txHash, String(u.outputIndex), "lovelace:", u.assets.lovelace);
    if (u.datum) {
      try {
        const p = parsePerpDatum(u);
        console.log("   market:", p.market);
      } catch (e) {
        console.log("   parse error", e);
      }
    }
  }
}

const cmd = Deno.args[0] ?? "help";

if (cmd === "help" || cmd === "-h" || cmd === "--help") {
  printHelp();
} else if (cmd === "info") {
  await info();
} else if (cmd === "lock-market") {
  const name = Deno.args[1];
  if (!name) {
    printHelp();
    Deno.exit(1);
  }
  const love = BigInt(Deno.args[2] ?? "15000000");
  const price = BigInt(Deno.args[3] ?? "1000000");
  const { lockMarket } = await import("./preipo-core.ts");
  const tx = await lockMarket(name, love, price, 10_000_000n, 10_000_000n);
  console.log("lock-market submitted:", tx);
} else {
  const utxos = await lucid.utxosAt(contractAddress);

  if (cmd === "oracle") {
    if (Deno.args.length < 2) {
      printHelp();
      Deno.exit(1);
    }
    const utxo = Deno.args.length >= 3
      ? pickUtxo(utxos, Deno.args[1])
      : pickUtxo(utxos, undefined);
    const newP = BigInt(Deno.args.length >= 3 ? Deno.args[2]! : Deno.args[1]!);
    console.log("oracle submitted:", await submitOracle(utxo, newP));
  } else if (cmd === "mint") {
    if (Deno.args.length < 2) {
      printHelp();
      Deno.exit(1);
    }
    const utxo = Deno.args.length >= 3
      ? pickUtxo(utxos, Deno.args[1])
      : pickUtxo(utxos, undefined);
    const q = BigInt(Deno.args.length >= 3 ? Deno.args[2]! : Deno.args[1]!);
    console.log("mint submitted:", await submitMint(utxo, q));
  } else if (cmd === "redeem") {
    if (Deno.args.length < 2) {
      printHelp();
      Deno.exit(1);
    }
    const utxo = Deno.args.length >= 3
      ? pickUtxo(utxos, Deno.args[1])
      : pickUtxo(utxos, undefined);
    const q = BigInt(Deno.args.length >= 3 ? Deno.args[2]! : Deno.args[1]!);
    console.log("redeem submitted:", await submitRedeem(utxo, q));
  } else if (cmd === "swap") {
    if (Deno.args.length < 3) {
      printHelp();
      Deno.exit(1);
    }
    const utxo = Deno.args.length >= 4
      ? pickUtxo(utxos, Deno.args[1])
      : pickUtxo(utxos, undefined);
    const sellA = Number(
      Deno.args.length >= 4 ? Deno.args[2]! : Deno.args[1]!,
    ) as 0 | 1;
    const amt = BigInt(Deno.args.length >= 4 ? Deno.args[3]! : Deno.args[2]!);
    console.log("swap submitted:", await submitSwap(utxo, sellA, amt));
  } else {
    printHelp();
    Deno.exit(1);
  }
}
