/**
 * Cardano tx builder (Lucid Evolution). Default: Mesh Yaci; Preprod: `PREIPO_USE_PREPROD=1`;
 * local instant ledger: `PREIPO_USE_EMULATOR=1`.
 * @see https://meshjs.dev/yaci
 */
import {
  Blockfrost,
  Constr,
  Data,
  Lucid,
  type Datum,
  type Script,
  type UTxO,
} from "npm:@lucid-evolution/lucid@0.4.29";
import { Emulator } from "npm:@lucid-evolution/provider@0.1.90";
import { walletFromSeed } from "npm:@lucid-evolution/wallet@0.1.72";
import {
  getAddressDetails,
  validatorToAddress,
} from "npm:@lucid-evolution/utils@0.1.66";
import {
  blockfrostBaseUrl,
  blockfrostProjectId,
  lucidEvoNetwork,
  postTxSyncSleepMs,
  PREIPO_USE_EMULATOR,
  PREIPO_USE_PREPROD,
} from "./cardano-env.ts";

/** Off-chain Plutus shapes built with `Constr`; Lucid types this as `unknown` in this release. */
type PlutusData = Parameters<typeof Data.to>[0];

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

const seed = Deno.env.get("PREIPO_WALLET_SEED") ??
  "wood bench lock genuine relief coral guard reunion follow radio jewel cereal actual erosion recall";

export const L = await (PREIPO_USE_EMULATOR
  ? Lucid(
    new Emulator([
      {
        seedPhrase: "",
        address: walletFromSeed(seed, {
          addressType: "Base",
          accountIndex: 0,
          network: lucidEvoNetwork,
        }).address,
        assets: { lovelace: 200_000_000_000n },
        privateKey: "",
      },
    ]),
    lucidEvoNetwork,
  )
  : Lucid(
    new Blockfrost(blockfrostBaseUrl, blockfrostProjectId),
    lucidEvoNetwork,
  ));

L.selectWallet.fromSeed(seed);

const walletAddr = await L.wallet().address();
const details = getAddressDetails(walletAddr);
const pkh = details.paymentCredential?.hash;
if (!pkh) throw new Error("No payment credential");

export const operatorPkh = Deno.env.get("OPERATOR_PKH") ?? pkh;
export const traderPkh = Deno.env.get("TRADER_PKH") ?? pkh;

export const contractAddress = validatorToAddress(
  lucidEvoNetwork,
  contractScript,
);

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
): PlutusData {
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
  ]) as PlutusData;
}

function someMarket(m: PlutusData): PlutusData {
  return new Constr(0, [m]) as PlutusData;
}

function perpDatumConstr(
  trader: string,
  operator: string,
  marketOpt: PlutusData,
): PlutusData {
  return new Constr(0, [trader, operator, marketOpt]) as PlutusData;
}

function toDatum(d: PlutusData): Datum {
  return Data.to(d as never) as Datum;
}

function encodeDatum(c: PlutusData): Datum {
  return toDatum(c);
}

function oracleRedeemer(m: PlutusData): Datum {
  return toDatum(new Constr(0, [m]) as PlutusData);
}

function mintRedeemerPlutus(m: PlutusData): Datum {
  return toDatum(new Constr(1, [m]) as PlutusData);
}

function redeemRedeemerPlutus(m: PlutusData): Datum {
  return toDatum(new Constr(2, [m]) as PlutusData);
}

function swapRedeemer(
  sellA: bigint,
  amountIn: bigint,
  minOut: bigint,
  m: PlutusData,
): Datum {
  return toDatum(new Constr(3, [sellA, amountIn, minOut, m]) as PlutusData);
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

function asConstr(d: PlutusData): Constr<PlutusData> {
  if (typeof d === "object" && d !== null && "index" in d && "fields" in d) {
    return d as Constr<PlutusData>;
  }
  throw new Error("Expected Constr");
}

export function parsePerpDatum(utxo: UTxO): {
  trader: string;
  operator: string;
  market: ParsedMarket | null;
} {
  if (!utxo.datum) throw new Error("inline datum required");
  const root = asConstr(Data.from(utxo.datum));
  if (root.index !== 0) throw new Error("PerpDatum");
  const [trader, operator, opt] = root.fields as [string, string, PlutusData];
  const oc = asConstr(opt);
  if (oc.index === 1) return { trader, operator, market: null };
  const mc = asConstr(oc.fields[0] as PlutusData);
  const f = mc.fields as [
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
      index_id: String(f[0]).toLowerCase(),
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

export async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function fetchScriptUtxoFromTx(
  spendTx: string,
  maxAttempts = 40,
): Promise<UTxO> {
  if (PREIPO_USE_EMULATOR) {
    for (let a = 0; a < maxAttempts; a++) {
      const utxos = await L.utxosAt(contractAddress);
      const row = utxos.find((u) => u.txHash === spendTx && u.datum);
      if (row) return row;
      await sleep(50);
    }
    throw new Error(`No script UTxO for ${spendTx}`);
  }
  const base = blockfrostBaseUrl.replace(/\/$/, "");
  const headers = { project_id: blockfrostProjectId };
  for (let a = 0; a < maxAttempts; a++) {
    const res = await fetch(`${base}/txs/${spendTx}/utxos`, { headers });
    if (res.status === 404) {
      await sleep(2000);
      continue;
    }
    if (res.ok) {
      const j = await res.json() as {
        outputs: Array<{
          address: string;
          output_index: number;
          amount: Array<{ unit: string; quantity: string }>;
          inline_datum?: string | null;
        }>;
      };
      const row = j.outputs.find(
        (u) => u.address === contractAddress && u.inline_datum,
      );
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
          txHash: spendTx,
          outputIndex: row.output_index,
          assets,
          address: contractAddress,
          datum: row.inline_datum!,
        };
      }
    }
    await sleep(2000);
  }
  throw new Error(`No script UTxO for ${spendTx}`);
}

export function initialMarket(
  indexName: string,
  price: bigint,
  reserveA: bigint,
  reserveB: bigint,
  nowMs: bigint,
): PlutusData {
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

export function nextMintState(o: ParsedMarket, mintQty: bigint): PlutusData {
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
  ) as PlutusData;
}

export function nextRedeemState(o: ParsedMarket, burnQty: bigint): PlutusData {
  const newSupply = o.vtoken_supply - burnQty;
  const payout = burnQty * o.twav_price / SCALE;
  const newColl = o.collateral_locked - payout;
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
  ) as PlutusData;
}

export function nextOracleState(
  o: ParsedMarket,
  newPrice: bigint,
  nowMs: bigint,
): PlutusData {
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

export function nextSwapState(
  o: ParsedMarket,
  sellA: 0 | 1,
  amountIn: bigint,
): { next: PlutusData; minOut: bigint } {
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

/** Conway collateral prefers lovelace-only UTxOs; put largest pure-ADA first for `findCollateral`. */
function sortWalletUtxosForSelection(utxos: UTxO[]): UTxO[] {
  const isPureAda = (u: UTxO) => {
    const k = Object.keys(u.assets);
    return k.length === 1 && k[0] === "lovelace";
  };
  const pure = utxos.filter(isPureAda).sort((a, b) =>
    a.assets.lovelace < b.assets.lovelace ? 1 : a.assets.lovelace > b.assets.lovelace ? -1 : 0
  );
  return [...pure, ...utxos.filter((u) => !isPureAda(u))];
}

async function completeOptions() {
  if (PREIPO_USE_EMULATOR) {
    return {
      coinSelection: true,
      setCollateral: 25_000_000n,
      localUPLCEval: false,
    } as const;
  }
  const common = {
    coinSelection: true,
    setCollateral: PREIPO_USE_PREPROD ? 55_000_000n : 25_000_000n,
    localUPLCEval: true,
  } as const;
  if (PREIPO_USE_PREPROD) {
    return {
      ...common,
      presetWalletInputs: sortWalletUtxosForSelection(await L.wallet().getUtxos()),
    };
  }
  return { ...common };
}

/** Blockfrost can confirm `/txs/.../cbor` before `/addresses/.../utxos` drops spent outputs; refresh overrides Lucid’s wallet set. */
async function afterSubmit(txHash: string): Promise<void> {
  await L.awaitTx(txHash);
  await sleep(postTxSyncSleepMs);
  const addr = await L.wallet().address();
  L.overrideUTxOs(await L.utxosAt(addr));
  if (PREIPO_USE_PREPROD) {
    await sleep(4000);
    L.overrideUTxOs(await L.utxosAt(addr));
  }
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
  const datum = encodeDatum(perpDatumConstr(traderPkh, operatorPkh, someMarket(m)));
  const tx = await L.newTx()
    .pay.ToAddressWithData(
      contractAddress,
      { kind: "inline", value: datum },
      { lovelace },
    )
    .complete(await completeOptions());
  const signed = await tx.sign.withWallet().complete();
  const h = await signed.submit();
  await afterSubmit(h);
  return h;
}

export async function submitOracle(
  utxo: UTxO,
  newPrice: bigint,
): Promise<string> {
  const p = parsePerpDatum(utxo);
  if (!p.market) throw new Error("oracle");
  const o = p.market;
  const newM = nextOracleState(o, newPrice, BigInt(Date.now()));
  const datum = encodeDatum(
    perpDatumConstr(p.trader, p.operator, someMarket(newM)),
  );
  const tx = await L.newTx()
    .collectFrom([utxo], oracleRedeemer(newM))
    .pay.ToAddressWithData(
      contractAddress,
      { kind: "inline", value: datum },
      { lovelace: utxo.assets.lovelace },
    )
    .addSigner(walletAddr)
    .attach.SpendingValidator(contractScript)
    .complete(await completeOptions());
  const signed = await tx.sign.withWallet().complete();
  const h = await signed.submit();
  await afterSubmit(h);
  return h;
}

export async function submitMint(utxo: UTxO, mintQty: bigint): Promise<string> {
  const p = parsePerpDatum(utxo);
  if (!p.market) throw new Error("mint: need market");
  const o = p.market;
  const newM = nextMintState(o, mintQty);
  const datum = encodeDatum(
    perpDatumConstr(p.trader, p.operator, someMarket(newM)),
  );
  const tx = await L.newTx()
    .collectFrom([utxo], mintRedeemerPlutus(newM))
    .pay.ToAddressWithData(
      contractAddress,
      { kind: "inline", value: datum },
      { lovelace: utxo.assets.lovelace },
    )
    .addSigner(walletAddr)
    .attach.SpendingValidator(contractScript)
    .complete(await completeOptions());
  const signed = await tx.sign.withWallet().complete();
  const h = await signed.submit();
  await afterSubmit(h);
  return h;
}

export async function submitRedeem(utxo: UTxO, burnQty: bigint): Promise<string> {
  const p = parsePerpDatum(utxo);
  if (!p.market) throw new Error("redeem: need market");
  const o = p.market;
  const newM = nextRedeemState(o, burnQty);
  const datum = encodeDatum(
    perpDatumConstr(p.trader, p.operator, someMarket(newM)),
  );
  const tx = await L.newTx()
    .collectFrom([utxo], redeemRedeemerPlutus(newM))
    .pay.ToAddressWithData(
      contractAddress,
      { kind: "inline", value: datum },
      { lovelace: utxo.assets.lovelace },
    )
    .addSigner(walletAddr)
    .attach.SpendingValidator(contractScript)
    .complete(await completeOptions());
  const signed = await tx.sign.withWallet().complete();
  const h = await signed.submit();
  await afterSubmit(h);
  return h;
}

export async function submitSwap(
  utxo: UTxO,
  sellA: 0 | 1,
  amountIn: bigint,
): Promise<string> {
  const p = parsePerpDatum(utxo);
  if (!p.market) throw new Error("swap");
  const o = p.market;
  const { next, minOut } = nextSwapState(o, sellA, amountIn);
  const datum = encodeDatum(
    perpDatumConstr(p.trader, p.operator, someMarket(next)),
  );
  const red = swapRedeemer(BigInt(sellA), amountIn, minOut, next);
  const tx = await L.newTx()
    .collectFrom([utxo], red)
    .pay.ToAddressWithData(
      contractAddress,
      { kind: "inline", value: datum },
      { lovelace: utxo.assets.lovelace },
    )
    .addSigner(walletAddr)
    .attach.SpendingValidator(contractScript)
    .complete(await completeOptions());
  const signed = await tx.sign.withWallet().complete();
  const h = await signed.submit();
  await afterSubmit(h);
  return h;
}
