import {
  Blockfrost,
  Constr,
  Data,
  Lucid,
  type Data as PlutusData,
  type Script,
  type UTxO,
} from "https://deno.land/x/lucid@0.10.10/mod.ts";
import {
  blockfrostBaseUrl,
  blockfrostProjectId,
  lucidClassicNetwork,
} from "./cardano-env.ts";

type PConstr = Constr<PlutusData>;

const SCALE = 1_000_000n;
const TWAV_NUM = 9n;
const TWAV_DEN = 10n;

export function utf8Hex(s: string): string {
  return Array.from(new TextEncoder().encode(s))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const plutus = JSON.parse(
  await Deno.readTextFile(new URL("../plutus.json", import.meta.url)),
) as { validators: Array<{ title: string; compiledCode: string }> };

const v = plutus.validators.find((x) => x.title.includes("preipo")) ??
  plutus.validators[0];

export const contractScript: Script = {
  type: "PlutusV2",
  script: v.compiledCode,
};

export const lucid = await Lucid.new(
  new Blockfrost(blockfrostBaseUrl, blockfrostProjectId),
  lucidClassicNetwork,
);

const seed = Deno.env.get("PREIPO_WALLET_SEED") ??
  "wood bench lock genuine relief coral guard reunion follow radio jewel cereal actual erosion recall";

lucid.selectWalletFromSeed(seed);

const { paymentCredential } = lucid.utils.getAddressDetails(
  await lucid.wallet.address(),
);
if (!paymentCredential?.hash) {
  throw new Error("Could not read payment credential from wallet.");
}

export const pkh: string = paymentCredential.hash;
export const operatorPkh = Deno.env.get("OPERATOR_PKH") ?? pkh;
export const traderPkh = Deno.env.get("TRADER_PKH") ?? pkh;

export const contractAddress = lucid.utils.validatorToAddress(contractScript);

export function marketStateConstr(
  indexIdHex: string,
  currentPrice: bigint,
  twavPrice: bigint,
  publisherKeysetHash: string,
  lastOracleTime: bigint,
  collateralLocked: bigint,
  vtokenSupply: bigint,
  reserveA: bigint,
  reserveB: bigint,
  seq: bigint,
): PConstr {
  return new Constr(0, [
    indexIdHex,
    currentPrice,
    twavPrice,
    publisherKeysetHash,
    lastOracleTime,
    collateralLocked,
    vtokenSupply,
    reserveA,
    reserveB,
    seq,
  ]);
}

export function someMarket(m: PConstr): PConstr {
  return new Constr(0, [m]);
}

export function perpDatumConstr(
  trader: string,
  operator: string,
  marketOpt: PConstr,
): PConstr {
  return new Constr(0, [trader, operator, marketOpt]);
}

export function encodePlutusData(c: PConstr): string {
  return Data.to(c);
}

export function oracleRedeemer(m: PConstr): string {
  return encodePlutusData(new Constr(0, [m]));
}

export function mintRedeemer(m: PConstr): string {
  return encodePlutusData(new Constr(1, [m]));
}

export function redeemRedeemer(m: PConstr): string {
  return encodePlutusData(new Constr(2, [m]));
}

export function swapRedeemer(
  sellA: bigint,
  amountIn: bigint,
  minOut: bigint,
  m: PConstr,
): string {
  return encodePlutusData(new Constr(3, [sellA, amountIn, minOut, m]));
}

export type ParsedMarket = {
  index_id: string;
  current_price: bigint;
  twav_price: bigint;
  publisher_keyset_hash: string;
  last_oracle_time: bigint;
  collateral_locked: bigint;
  vtoken_supply: bigint;
  reserve_a: bigint;
  reserve_b: bigint;
  seq: bigint;
};

export function parsePerpDatum(utxo: UTxO): {
  trader: string;
  operator: string;
  market: ParsedMarket | null;
} {
  if (!utxo.datum) {
    throw new Error("UTxO needs inline datum.");
  }
  const root = Data.from(utxo.datum) as PConstr;
  if (root.index !== 0) {
    throw new Error(`Expected PerpDatum 0, got ${root.index}`);
  }
  const [trader, operator, opt] = root.fields as unknown as [
    string,
    string,
    PConstr,
  ];
  if (opt.index === 1) {
    return { trader, operator, market: null };
  }
  if (opt.index !== 0) {
    throw new Error(`Bad option ${opt.index}`);
  }
  const mc = opt.fields[0] as unknown as PConstr;
  if (mc.index !== 0) {
    throw new Error(`Bad MarketState ${mc.index}`);
  }
  const f = mc.fields as unknown as [
    string,
    bigint,
    bigint,
    string,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
    bigint,
  ];
  return {
    trader,
    operator,
    market: {
      index_id: f[0].toLowerCase(),
      current_price: f[1],
      twav_price: f[2],
      publisher_keyset_hash: f[3],
      last_oracle_time: f[4],
      collateral_locked: f[5],
      vtoken_supply: f[6],
      reserve_a: f[7],
      reserve_b: f[8],
      seq: f[9],
    },
  };
}

export function pickUtxoByIndex(utxos: UTxO[], indexName: string): UTxO {
  const want = utf8Hex(indexName).toLowerCase();
  let best: UTxO | undefined;
  let bestSeq = -1n;
  for (const u of utxos) {
    if (!u.datum) continue;
    try {
      const p = parsePerpDatum(u);
      if (!p.market || p.market.index_id !== want) continue;
      if (p.market.seq > bestSeq) {
        bestSeq = p.market.seq;
        best = u;
      }
    } catch { /* skip */ }
  }
  if (!best) {
    throw new Error(`No UTxO for index ${indexName} at ${contractAddress}`);
  }
  return best;
}

/** Wait for Blockfrost to show the market UTxO (new script deployments are slow to index). */
export async function waitForMarketIndex(
  indexName: string,
  maxTries = 30,
  delayMs = 2000,
): Promise<UTxO> {
  for (let i = 0; i < maxTries; i++) {
    const utxos = await lucid.utxosAt(contractAddress);
    try {
      return pickUtxoByIndex(utxos, indexName);
    } catch {
      await sleep(delayMs);
    }
  }
  throw new Error(`Timeout waiting for market UTxO: ${indexName}`);
}

export function pickUtxo(utxos: UTxO[], txHash?: string): UTxO {
  if (txHash) {
    const u = utxos.find((x) => x.txHash === txHash);
    if (!u) throw new Error(`No UTxO ${txHash}`);
    return u;
  }
  const d = utxos.find((x) => x.datum);
  if (!d) throw new Error("No datum UTxO");
  return d;
}

/** Bootstrap one market UTxO (seq=0). */
export function initialMarket(
  indexName: string,
  price: bigint,
  reserveA: bigint,
  reserveB: bigint,
  nowMs: bigint,
): PConstr {
  return marketStateConstr(
    utf8Hex(indexName),
    price,
    price,
    operatorPkh,
    nowMs,
    0n,
    0n,
    reserveA,
    reserveB,
    0n,
  );
}

export function nextOracleState(o: ParsedMarket, newPrice: bigint, nowMs: bigint): PConstr {
  const twav = o.seq === 0n
    ? newPrice
    : (o.twav_price * TWAV_NUM + newPrice) / TWAV_DEN;
  return marketStateConstr(
    o.index_id,
    newPrice,
    twav,
    o.publisher_keyset_hash,
    nowMs,
    o.collateral_locked,
    o.vtoken_supply,
    o.reserve_a,
    o.reserve_b,
    o.seq + 1n,
  );
}

export function nextMintState(o: ParsedMarket, mintQty: bigint): PConstr {
  const newSupply = o.vtoken_supply + mintQty;
  const newColl = o.collateral_locked + mintQty * o.twav_price / SCALE;
  return marketStateConstr(
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
}

/** sellA=1: add A, remove B. Matches on-chain constant product. */
export function nextSwapState(
  o: ParsedMarket,
  sellA: 0 | 1,
  amountIn: bigint,
): { next: PConstr; minOut: bigint } {
  let newA: bigint;
  let newB: bigint;
  let out: bigint;
  if (sellA === 1) {
    newA = o.reserve_a + amountIn;
    out = o.reserve_b * amountIn / newA;
    newB = o.reserve_b - out;
  } else {
    newB = o.reserve_b + amountIn;
    out = o.reserve_a * amountIn / newB;
    newA = o.reserve_a - out;
  }
  const next = marketStateConstr(
    o.index_id,
    o.current_price,
    o.twav_price,
    o.publisher_keyset_hash,
    o.last_oracle_time,
    o.collateral_locked,
    o.vtoken_supply,
    newA,
    newB,
    o.seq + 1n,
  );
  return { next, minOut: out };
}

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Build a script UTxO from Blockfrost (fixes wrong outputIndex/assets from Lucid). */
export async function fetchScriptUtxoFromTx(
  spendTx: string,
  maxAttempts = 30,
): Promise<UTxO> {
  const pid = blockfrostProjectId;
  const base = blockfrostBaseUrl.replace(/\/$/, "");
  for (let a = 0; a < maxAttempts; a++) {
    const res = await fetch(
      `${base}/addresses/${contractAddress}/utxos`,
      { headers: { project_id: pid } },
    );
    if (!res.ok) {
      await sleep(2000);
      continue;
    }
    const rows = await res.json() as Array<{
      tx_hash: string;
      output_index: number;
      amount: Array<{ unit: string; quantity: string }>;
      inline_datum?: string | null;
    }>;
    const row = rows.find((u) => u.tx_hash === spendTx && u.inline_datum);
    if (row) {
      const assets: Record<string, bigint> = { lovelace: 0n };
      for (const am of row.amount) {
        if (am.unit === "lovelace") {
          assets.lovelace = BigInt(am.quantity);
        } else {
          assets[am.unit] = BigInt(am.quantity);
        }
      }
      return {
        txHash: row.tx_hash,
        outputIndex: row.output_index,
        assets,
        address: contractAddress,
        datum: row.inline_datum!,
      };
    }
    await sleep(2000);
  }
  throw new Error(`Blockfrost: no script UTxO for tx ${spendTx}`);
}

export async function waitForUtxo(
  pred: (u: UTxO) => boolean,
  tries = 40,
  delayMs = 1500,
): Promise<UTxO> {
  for (let i = 0; i < tries; i++) {
    const utxos = await lucid.utxosAt(contractAddress);
    const u = utxos.find(pred);
    if (u) return u;
    await sleep(delayMs);
  }
  throw new Error("Timeout waiting for UTxO");
}

export async function lockMarket(
  indexName: string,
  lovelace: bigint,
  price: bigint,
  reserveA: bigint,
  reserveB: bigint,
): Promise<string> {
  const now = BigInt(Date.now());
  const m = initialMarket(indexName, price, reserveA, reserveB, now);
  const datum = encodePlutusData(
    perpDatumConstr(traderPkh, operatorPkh, someMarket(m)),
  );
  const tx = await lucid
    .newTx()
    .payToAddressWithData(contractAddress, { inline: datum }, { lovelace })
    .complete();
  const signed = await tx.sign().complete();
  return await signed.submit();
}

export async function submitOracle(utxo: UTxO, newPrice: bigint): Promise<string> {
  const p = parsePerpDatum(utxo);
  if (!p.market) throw new Error("oracle: need market");
  const o = p.market;
  const newM = nextOracleState(o, newPrice, BigInt(Date.now()));
  const datum = encodePlutusData(
    perpDatumConstr(p.trader, p.operator, someMarket(newM)),
  );
  const addr = await lucid.wallet.address();
  const tx = await lucid
    .newTx()
    .collectFrom([utxo], oracleRedeemer(newM))
    .payToAddressWithData(contractAddress, { inline: datum }, {
      lovelace: utxo.assets.lovelace,
    })
    .addSigner(addr)
    .attachSpendingValidator(contractScript)
    .complete();
  return await (await tx.sign().complete()).submit();
}

export async function submitMint(utxo: UTxO, mintQty: bigint): Promise<string> {
  const p = parsePerpDatum(utxo);
  if (!p.market) throw new Error("mint: need market");
  const o = p.market;
  const newM = nextMintState(o, mintQty);
  const deposit = mintQty * o.twav_price / SCALE;
  const outLovelace = utxo.assets.lovelace + deposit;
  const datum = encodePlutusData(
    perpDatumConstr(p.trader, p.operator, someMarket(newM)),
  );
  const addr = await lucid.wallet.address();
  const tx = await lucid
    .newTx()
    .collectFrom([utxo], mintRedeemer(newM))
    .payToAddressWithData(contractAddress, { inline: datum }, {
      lovelace: outLovelace,
    })
    .addSigner(addr)
    .attachSpendingValidator(contractScript)
    .complete();
  return await (await tx.sign().complete()).submit();
}

export async function submitSwap(
  utxo: UTxO,
  sellA: 0 | 1,
  amountIn: bigint,
): Promise<string> {
  const p = parsePerpDatum(utxo);
  if (!p.market) throw new Error("swap: need market");
  const o = p.market;
  const { next, minOut } = nextSwapState(o, sellA, amountIn);
  const datum = encodePlutusData(
    perpDatumConstr(p.trader, p.operator, someMarket(next)),
  );
  const addr = await lucid.wallet.address();
  const tx = await lucid
    .newTx()
    .collectFrom(
      [utxo],
      swapRedeemer(BigInt(sellA), amountIn, minOut, next),
    )
    .payToAddressWithData(contractAddress, { inline: datum }, {
      lovelace: utxo.assets.lovelace,
    })
    .addSigner(addr)
    .attachSpendingValidator(contractScript)
    .complete();
  return await (await tx.sign().complete()).submit();
}
