import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import {
  L,
  contractAddress,
  fetchScriptUtxoFromTx,
  lockMarket,
  parsePerpDatum,
  submitMint,
  submitOracle,
  submitRedeem,
  submitSwap,
} from "../../cli/preipo-evo-core.ts";
import {
  PREIPO_USE_EMULATOR,
  PREIPO_USE_PREPROD,
  txExplorerUrl,
} from "../../cli/cardano-env.ts";
import {
  fetchCandleSnapshot,
  fetchLastCloseUsd,
  type HlCandle,
  type HlCandleInterval,
} from "./hl-client.ts";
import { VENTUALS_MARKETS } from "./markets-config.ts";
import {
  formatUsd,
  scaledToUsdcx,
} from "./price-display.ts";
import { getSession, rememberTx } from "./session-store.ts";
import {
  creditUsdcx,
  debitUsdcx,
  getUsdcxBalanceUnits,
  unitsToUsdcx,
} from "./usdcx-faucet.ts";

function marketKey(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    throw new Error("invalid marketId");
  }
  return id;
}

function parseBigint(s: string, field: string): bigint {
  try {
    return BigInt(s);
  } catch {
    throw new Error(`invalid bigint: ${field}`);
  }
}

async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function resolveUtxo(marketId: string, spendTx?: string) {
  const key = marketKey(marketId);
  const tx = spendTx ?? getSession(key)?.lastSpendTx;
  if (!tx) {
    throw new Error("spendTx required (no prior session for this market)");
  }
  return await fetchScriptUtxoFromTx(tx);
}

/** Shared by `/api/v1/ventuals/markets` and `/api/v1/markets` (alias for older clients). */
async function ventualsMarketsHandler(c: Context) {
  const hlInterval = (Deno.env.get("HL_ORACLE_INTERVAL") ?? "1h") as
    | "15m"
    | "1h"
    | "4h"
    | "1d";
  const out: Array<{
    id: string;
    label: string;
    hlCoin: string;
    lastSpendTx: string;
    market: Record<string, string> | null;
    chainError: string | null;
    hl: {
      lastCloseUsd: number | null;
      interval: string;
      error: string | null;
    };
    pricingNote: string;
  }> = [];
  for (let i = 0; i < VENTUALS_MARKETS.length; i++) {
    const m = VENTUALS_MARKETS[i]!;
    const tip = getSession(m.id)?.lastSpendTx ?? "";
    let market: Record<string, string> | null = null;
    let chainErr: string | null = null;
    if (tip) {
      try {
        const utxo = await fetchScriptUtxoFromTx(tip);
        const p = parsePerpDatum(utxo);
        if (p.market) {
          const cp = p.market.current_price;
          const usdcx = scaledToUsdcx(cp);
          market = {
            index_id: p.market.index_id,
            current_price: cp.toString(),
            twav_price: p.market.twav_price.toString(),
            publisher_keyset_hash: p.market.publisher_keyset_hash,
            last_oracle_time: p.market.last_oracle_time.toString(),
            collateral_locked: p.market.collateral_locked.toString(),
            vtoken_supply: p.market.vtoken_supply.toString(),
            reserve_a: p.market.reserve_a.toString(),
            reserve_b: p.market.reserve_b.toString(),
            seq: p.market.seq.toString(),
            displayUsdcx: formatUsd(usdcx),
            displayUsd: formatUsd(usdcx),
          };
        }
      } catch (e) {
        chainErr = e instanceof Error ? e.message : String(e);
      }
    }
    let hlClose: number | null = null;
    let hlErr: string | null = null;
    try {
      hlClose = await fetchLastCloseUsd(m.hlCoin, hlInterval);
    } catch (e) {
      hlErr = e instanceof Error ? e.message : String(e);
    }
    out.push({
      id: m.id,
      label: m.label,
      hlCoin: m.hlCoin,
      lastSpendTx: tip,
      market,
      chainError: chainErr,
      hl: {
        lastCloseUsd: hlClose,
        interval: hlInterval,
        error: hlErr,
      },
      pricingNote:
        "Prices are denominated in USDCx (1 USDCx ~= 1 USD).",
    });
    if (i < VENTUALS_MARKETS.length - 1) await sleep(220);
  }
  return c.json({ markets: out });
}

export function createApp() {
  const app = new Hono();
  app.use("/*", cors({ origin: "*" }));

  app.get("/health", (c) => c.json({ ok: true }));

  app.get("/openapi.json", async (c) => {
    const text = await Deno.readTextFile(
      new URL("../openapi.json", import.meta.url),
    );
    return c.body(text, 200, { "Content-Type": "application/json" });
  });

  app.get("/docs", (c) =>
    c.html(`<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Pre-IPO API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" crossorigin/>
</head><body><div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
<script>SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui' });</script>
</body></html>`));

  app.get("/api/v1/meta", (c) =>
    c.json({
      contractAddress,
      preprod: PREIPO_USE_PREPROD,
      emulator: PREIPO_USE_EMULATOR,
    }));

  app.get("/api/v1/account", async (c) => {
    try {
      const address = await L.wallet().address();
      const utxos = await L.utxosAt(address);
      const usdcxBalanceUnits = await getUsdcxBalanceUnits(address);
      const assets = utxos.reduce<Record<string, string>>((acc, u) => {
        for (const [unit, qty] of Object.entries(u.assets)) {
          const prev = acc[unit] ? BigInt(acc[unit]!) : 0n;
          acc[unit] = (prev + qty).toString();
        }
        return acc;
      }, {});
      return c.json({
        address,
        lovelace: assets.lovelace ?? "0",
        usdcxBalance: usdcxBalanceUnits.toString(),
        usdcxDisplay: unitsToUsdcx(usdcxBalanceUnits),
        assets,
        note:
          "Wallet USDCx balance is managed by faucet ledger; on-chain datum is denominated in USDCx units.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 500);
    }
  });

  app.post("/api/v1/faucet/usdcx", async (c) => {
    try {
      const body = await readJson<{ amountUnits?: string; amountUsdcx?: number }>(
        c.req.raw,
      );
      const addr = await L.wallet().address();
      const amountUnits = body.amountUnits
        ? parseBigint(body.amountUnits, "amountUnits")
        : body.amountUsdcx && Number.isFinite(body.amountUsdcx)
        ? BigInt(Math.max(0, Math.round(body.amountUsdcx * 1_000_000)))
        : 1_000_000_000n; // default 1000 USDCx
      await creditUsdcx(addr, amountUnits);
      const bal = await getUsdcxBalanceUnits(addr);
      return c.json({
        ok: true,
        creditedUnits: amountUnits.toString(),
        usdcxBalance: bal.toString(),
        usdcxDisplay: unitsToUsdcx(bal),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 400);
    }
  });

  /** Trader UI: chain state + HL reference, server-held spend tips. */
  app.get("/api/v1/ventuals/markets", ventualsMarketsHandler);
  /** Alias: some setups only proxy `/api/v1/markets`. */
  app.get("/api/v1/markets", ventualsMarketsHandler);

  /**
   * Reference OHLC candles for the three markets (server-side fetch, staggered +
   * retried) so the browser is not rate-limited by the upstream price API.
   */
  app.post("/api/v1/reference-candles", async (c) => {
    try {
      const body = await readJson<{
        interval?: string;
        startTime?: number;
        endTime?: number;
      }>(c.req.raw);
      const rawIv = body.interval ?? "1h";
      if (rawIv !== "15m" && rawIv !== "1h" && rawIv !== "4h" && rawIv !== "1d") {
        return c.json({ error: "invalid interval" }, 400);
      }
      const iv = rawIv as HlCandleInterval;
      const endTime = typeof body.endTime === "number" ? body.endTime : Date.now();
      const startTime =
        typeof body.startTime === "number"
          ? body.startTime
          : endTime - 7 * 86_400_000;
      if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
        return c.json({ error: "invalid time range" }, 400);
      }
      if (startTime >= endTime) {
        return c.json({ error: "startTime must be before endTime" }, 400);
      }
      if (endTime - startTime > 366 * 86_400_000) {
        return c.json({ error: "range too large" }, 400);
      }
      const series: Record<string, HlCandle[]> = {};
      for (let i = 0; i < VENTUALS_MARKETS.length; i++) {
        const m = VENTUALS_MARKETS[i]!;
        series[m.id] = await fetchCandleSnapshot(
          m.hlCoin,
          iv,
          startTime,
          endTime,
        );
        if (i < VENTUALS_MARKETS.length - 1) await sleep(280);
      }
      return c.json({ series });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 502);
    }
  });

  app.get("/api/v1/markets/:marketId/state", async (c) => {
    try {
      const marketId = marketKey(c.req.param("marketId"));
      const spendTx = c.req.query("spendTx");
      if (!spendTx) {
        return c.json({ error: "query spendTx required" }, 400);
      }
      const utxo = await fetchScriptUtxoFromTx(spendTx);
      const p = parsePerpDatum(utxo);
      const market = p.market
        ? {
          index_id: p.market.index_id,
          current_price: p.market.current_price.toString(),
          twav_price: p.market.twav_price.toString(),
          publisher_keyset_hash: p.market.publisher_keyset_hash,
          last_oracle_time: p.market.last_oracle_time.toString(),
          collateral_locked: p.market.collateral_locked.toString(),
          vtoken_supply: p.market.vtoken_supply.toString(),
          reserve_a: p.market.reserve_a.toString(),
          reserve_b: p.market.reserve_b.toString(),
          seq: p.market.seq.toString(),
        }
        : null;
      return c.json({ trader: p.trader, operator: p.operator, market });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 400);
    }
  });

  app.post("/api/v1/markets/:marketId/lock", async (c) => {
    try {
      const marketId = marketKey(c.req.param("marketId"));
      const body = await readJson<Record<string, string>>(c.req.raw);
      const lovelace = parseBigint(body.lovelace ?? "25000000", "lovelace");
      const price = parseBigint(body.price ?? "1000000", "price");
      const reserveA = parseBigint(body.reserveA ?? "10000000", "reserveA");
      const reserveB = parseBigint(body.reserveB ?? "10000000", "reserveB");
      const txHash = await lockMarket(marketId, lovelace, price, reserveA, reserveB);
      rememberTx(marketId, txHash);
      return c.json({
        txHash,
        explorerUrl: txExplorerUrl(txHash),
        marketId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 500);
    }
  });

  app.post("/api/v1/markets/:marketId/oracle", async (c) => {
    try {
      const marketId = marketKey(c.req.param("marketId"));
      const body = await readJson<{
        spendTx?: string;
        newPrice?: string;
        bumpBps?: number;
      }>(c.req.raw);
      const utxo = await resolveUtxo(marketId, body.spendTx);
      const st = parsePerpDatum(utxo).market;
      if (!st) return c.json({ error: "no market in datum" }, 400);

      let newPrice: bigint;
      if (body.newPrice !== undefined && body.newPrice !== "") {
        newPrice = parseBigint(body.newPrice, "newPrice");
      } else if (body.bumpBps !== undefined && body.bumpBps > 0) {
        newPrice = st.current_price * BigInt(body.bumpBps) / 10000n;
      } else {
        return c.json({ error: "newPrice or bumpBps required" }, 400);
      }

      const txHash = await submitOracle(utxo, newPrice);
      rememberTx(marketId, txHash);
      return c.json({
        txHash,
        explorerUrl: txExplorerUrl(txHash),
        marketId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 500);
    }
  });

  app.post("/api/v1/markets/:marketId/swap", async (c) => {
    try {
      const marketId = marketKey(c.req.param("marketId"));
      const body = await readJson<{
        spendTx?: string;
        sellA?: number;
        amountIn?: string;
      }>(c.req.raw);
      if (body.sellA !== 0 && body.sellA !== 1) {
        return c.json({ error: "sellA must be 0 or 1" }, 400);
      }
      if (!body.amountIn) {
        return c.json({ error: "amountIn required" }, 400);
      }
      const utxo = await resolveUtxo(marketId, body.spendTx);
      const amountIn = parseBigint(body.amountIn, "amountIn");
      const txHash = await submitSwap(utxo, body.sellA, amountIn);
      rememberTx(marketId, txHash);
      return c.json({
        txHash,
        explorerUrl: txExplorerUrl(txHash),
        marketId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 500);
    }
  });

  app.post("/api/v1/markets/:marketId/mint", async (c) => {
    try {
      const marketId = marketKey(c.req.param("marketId"));
      const body = await readJson<{ spendTx?: string; quantity?: string }>(
        c.req.raw,
      );
      if (!body.quantity) return c.json({ error: "quantity required" }, 400);
      const utxo = await resolveUtxo(marketId, body.spendTx);
      const qty = parseBigint(body.quantity, "quantity");
      const parsed = parsePerpDatum(utxo).market;
      if (!parsed) return c.json({ error: "no market in datum" }, 400);
      const costUnits = qty * parsed.twav_price / 1_000_000n;
      const addr = await L.wallet().address();
      const bal = await getUsdcxBalanceUnits(addr);
      if (bal < costUnits) {
        return c.json({ error: "insufficient USDCx faucet balance" }, 400);
      }
      const txHash = await submitMint(utxo, qty);
      await debitUsdcx(addr, costUnits);
      rememberTx(marketId, txHash);
      return c.json({
        txHash,
        explorerUrl: txExplorerUrl(txHash),
        marketId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 500);
    }
  });

  app.post("/api/v1/markets/:marketId/redeem", async (c) => {
    try {
      const marketId = marketKey(c.req.param("marketId"));
      const body = await readJson<{ spendTx?: string; quantity?: string }>(
        c.req.raw,
      );
      if (!body.quantity) return c.json({ error: "quantity required" }, 400);
      const utxo = await resolveUtxo(marketId, body.spendTx);
      const qty = parseBigint(body.quantity, "quantity");
      const parsed = parsePerpDatum(utxo).market;
      if (!parsed) return c.json({ error: "no market in datum" }, 400);
      const payoutUnits = qty * parsed.twav_price / 1_000_000n;
      const addr = await L.wallet().address();
      const txHash = await submitRedeem(utxo, qty);
      await creditUsdcx(addr, payoutUnits);
      rememberTx(marketId, txHash);
      return c.json({
        txHash,
        explorerUrl: txExplorerUrl(txHash),
        marketId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return c.json({ error: msg }, 500);
    }
  });

  return app;
}
