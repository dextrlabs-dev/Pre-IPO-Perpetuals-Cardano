/**
 * Preprod run export from `cli/preprod-three-markets-report.ts`:
 * market, step, txHash, explorerUrl, on-chain datum snapshot, swap leg, note.
 */
export const PREPROD_LEDGER_CSV = `market,step,txHash,explorerUrl,current_price,twav_price,collateral_locked,vtoken_supply,reserve_a,reserve_b,seq,sellA,amountIn,note
anthropic,lock,b15cd6d048304c9ade05fe36bb82c5d6279da9de0d4b66b6ffadd701d0657b34,https://preprod.cardanoscan.io/transaction/b15cd6d048304c9ade05fe36bb82c5d6279da9de0d4b66b6ffadd701d0657b34,1000000,1000000,0,0,10000000,10000000,0,,,initial
anthropic,oracle_1,a4e80d92dd3cbcd228e996bd027d122f8a5bf7bc6cff52d976958d6236073cb2,https://preprod.cardanoscan.io/transaction/a4e80d92dd3cbcd228e996bd027d122f8a5bf7bc6cff52d976958d6236073cb2,1010000,1010000,0,0,10000000,10000000,1,,,bump +1%
anthropic,mint,2c6034e8cdcab97d2bace4d439c43598039bd12068d287de983d391f8d4894ae,https://preprod.cardanoscan.io/transaction/2c6034e8cdcab97d2bace4d439c43598039bd12068d287de983d391f8d4894ae,1010000,1010000,5050,5000,10000000,10000000,2,,,qty=5000
anthropic,swap_1,0389c0da166602894b09bca762ca9fc20df9aece0124a28ab7c9712ae23be4df,https://preprod.cardanoscan.io/transaction/0389c0da166602894b09bca762ca9fc20df9aece0124a28ab7c9712ae23be4df,1010000,1010000,5050,5000,10008000,9992007,3,1,8000,pool trade
anthropic,redeem,7743d8340c107206afd568e341318615c1ab4740c45e055558e7f460f5707b4e,https://preprod.cardanoscan.io/transaction/7743d8340c107206afd568e341318615c1ab4740c45e055558e7f460f5707b4e,1010000,1010000,3030,3000,10008000,9992007,4,,,burn=2000
openai,lock,5e19c84ee7dd313a7f2c92a9fbf55b7b19eb0e3d0460da22f8acd1460c851692,https://preprod.cardanoscan.io/transaction/5e19c84ee7dd313a7f2c92a9fbf55b7b19eb0e3d0460da22f8acd1460c851692,1000000,1000000,0,0,10000000,10000000,0,,,initial
openai,oracle_1,f81c7037eb5945a645147094f2fccb0c5285044a2fabc7292aea5fb953311418,https://preprod.cardanoscan.io/transaction/f81c7037eb5945a645147094f2fccb0c5285044a2fabc7292aea5fb953311418,1010000,1010000,0,0,10000000,10000000,1,,,bump +1%
openai,mint,e297b02842166871f03507b41585ddb4ed50f43f38429b8383beb4ce4f9adfae,https://preprod.cardanoscan.io/transaction/e297b02842166871f03507b41585ddb4ed50f43f38429b8383beb4ce4f9adfae,1010000,1010000,5050,5000,10000000,10000000,2,,,qty=5000
openai,swap_1,2091531c02a5bcd3fb832f2bc9fe59774c9904369de0bdba4f24b416770c57f1,https://preprod.cardanoscan.io/transaction/2091531c02a5bcd3fb832f2bc9fe59774c9904369de0bdba4f24b416770c57f1,1010000,1010000,5050,5000,10008000,9992007,3,1,8000,pool trade
openai,redeem,adf0696d88c19146a8cc01c6f7a6aa773f356fea5c44d7d94ad940a738332933,https://preprod.cardanoscan.io/transaction/adf0696d88c19146a8cc01c6f7a6aa773f356fea5c44d7d94ad940a738332933,1010000,1010000,3030,3000,10008000,9992007,4,,,burn=2000
spacex,lock,9c0f3fcec7edb0cc0e5458b790015941a1895fce7abb8b73138b8abcbed39aaa,https://preprod.cardanoscan.io/transaction/9c0f3fcec7edb0cc0e5458b790015941a1895fce7abb8b73138b8abcbed39aaa,1000000,1000000,0,0,10000000,10000000,0,,,initial
spacex,oracle_1,544148d49c7fa3dd9c75a7e3da5608a9274de9461e6399c0ed396665f3a91f0a,https://preprod.cardanoscan.io/transaction/544148d49c7fa3dd9c75a7e3da5608a9274de9461e6399c0ed396665f3a91f0a,1010000,1010000,0,0,10000000,10000000,1,,,bump +1%
spacex,mint,7d274822e6092555f772bf2ae4da6f13d669c6d20598b16b5d7ca64eafb1b088,https://preprod.cardanoscan.io/transaction/7d274822e6092555f772bf2ae4da6f13d669c6d20598b16b5d7ca64eafb1b088,1010000,1010000,5050,5000,10000000,10000000,2,,,qty=5000
spacex,swap_1,9a884a1b9dc350b5c8aaf30a54c4c4b8d29cf8c36670231c000e249c293e8e58,https://preprod.cardanoscan.io/transaction/9a884a1b9dc350b5c8aaf30a54c4c4b8d29cf8c36670231c000e249c293e8e58,1010000,1010000,5050,5000,10008000,9992007,3,1,8000,pool trade
spacex,redeem,5ac137ac0ea90bf6c05a4c7ad111be1ef9c6506bd5dce2eb31276afad51f5b73,https://preprod.cardanoscan.io/transaction/5ac137ac0ea90bf6c05a4c7ad111be1ef9c6506bd5dce2eb31276afad51f5b73,1010000,1010000,3030,3000,10008000,9992007,4,,,burn=2000`;

export type LedgerRow = {
  market: string;
  step: string;
  txHash: string;
  /** Cardanoscan (or other) transaction URL */
  url: string;
  /** μ-units per on-chain SCALE (1e6) */
  current_price?: string;
  twav_price?: string;
  collateral_locked?: string;
  vtoken_supply?: string;
  reserve_a?: string;
  reserve_b?: string;
  seq?: string;
  sellA?: string;
  amountIn?: string;
  note?: string;
};

/** Brand SVG URLs (jsDelivr); follow each vendor’s trademark guidelines in production. */
const SI_VER = "13.21.0";

export const MARKET_BRAND: Record<
  string,
  { label: string; logoSrc: string; accent: string }
> = {
  anthropic: {
    label: "Anthropic",
    logoSrc: `https://cdn.jsdelivr.net/npm/simple-icons@${SI_VER}/icons/anthropic.svg`,
    accent: "#191919",
  },
  openai: {
    label: "OpenAI",
    logoSrc: `https://cdn.jsdelivr.net/npm/simple-icons@${SI_VER}/icons/openai.svg`,
    accent: "#412991",
  },
  spacex: {
    label: "SpaceX",
    logoSrc: `https://cdn.jsdelivr.net/npm/simple-icons@${SI_VER}/icons/spacex.svg`,
    accent: "#000000",
  },
};

const LEGACY_ROW =
  /^([^,]+),([^,]+),([a-fA-F0-9]{64}),(https:\/\/[^\s,]+)$/;

function parseExtendedRow(parts: string[]): LedgerRow | null {
  if (parts.length !== 14) return null;
  const [
    market,
    step,
    txHash,
    url,
    current_price,
    twav_price,
    collateral_locked,
    vtoken_supply,
    reserve_a,
    reserve_b,
    seq,
    sellA,
    amountIn,
    note,
  ] = parts;
  if (!/^[a-fA-F0-9]{64}$/.test(txHash) || !url.startsWith("http")) {
    return null;
  }
  return {
    market,
    step,
    txHash: txHash.toLowerCase(),
    url,
    current_price,
    twav_price,
    collateral_locked,
    vtoken_supply,
    reserve_a,
    reserve_b,
    seq,
    sellA: sellA || undefined,
    amountIn: amountIn || undefined,
    note: note || undefined,
  };
}

export function parseLedgerCsv(text: string): LedgerRow[] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = lines[0];
  const extended = header.includes("explorerUrl");
  const out: LedgerRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (extended) {
      const row = parseExtendedRow(line.split(","));
      if (row) out.push(row);
      continue;
    }
    const m = line.match(LEGACY_ROW);
    if (!m) continue;
    out.push({
      market: m[1],
      step: m[2],
      txHash: m[3].toLowerCase(),
      url: m[4],
    });
  }
  return out;
}

export const LEDGER_ROWS: LedgerRow[] = parseLedgerCsv(PREPROD_LEDGER_CSV);

export function groupByMarket(rows: LedgerRow[]): Map<string, LedgerRow[]> {
  const m = new Map<string, LedgerRow[]>();
  for (const r of rows) {
    const list = m.get(r.market) ?? [];
    list.push(r);
    m.set(r.market, list);
  }
  return m;
}

export function marketStats(rows: LedgerRow[]) {
  const oracles = rows.filter((r) => r.step.startsWith("oracle_")).length;
  const swaps = rows.filter((r) => r.step.startsWith("swap_")).length;
  const mints = rows.filter((r) => r.step === "mint").length;
  const redeems = rows.filter((r) => r.step === "redeem").length;
  const lock = rows.some((r) => r.step === "lock");
  return { total: rows.length, oracles, swaps, mints, redeems, lock };
}

const SCALE = 1_000_000;

/** Format μ-units as human-scale numbers (contract SCALE = 1e6). */
export function fmtMicroUnits(raw: string | undefined, maxFrac = 4): string {
  if (raw == null || raw === "") return "—";
  const x = Number(raw);
  if (!Number.isFinite(x)) return "—";
  const v = x / SCALE;
  return v.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

/** One-line datum snapshot for table cells. */
export function formatLedgerSnapshot(r: LedgerRow): string {
  if (r.current_price == null || r.current_price === "") return "—";
  const idx = fmtMicroUnits(r.current_price, 3);
  const tw = fmtMicroUnits(r.twav_price, 3);
  const vt = fmtMicroUnits(r.vtoken_supply, 4);
  const co = fmtMicroUnits(r.collateral_locked, 4);
  const ra = fmtMicroUnits(r.reserve_a, 2);
  const rb = fmtMicroUnits(r.reserve_b, 2);
  return `#${r.seq ?? "—"} · idx ${idx} · TWAV ${tw} · vTok ${vt} · coll ${co} · rA ${ra} · rB ${rb}`;
}

export function formatSwapLeg(r: LedgerRow): string {
  if (r.sellA == null || r.sellA === "" || r.amountIn == null || r.amountIn === "") {
    return "—";
  }
  const side = r.sellA === "1" ? "A→B" : "B→A";
  return `${side} ${Number(r.amountIn).toLocaleString()} μ in`;
}
