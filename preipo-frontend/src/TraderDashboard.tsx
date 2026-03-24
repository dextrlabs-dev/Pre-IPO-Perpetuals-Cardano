import { useCallback, useEffect, useState } from "react";
import {
  getAccount,
  apiBase,
  displayInstrumentSymbol,
  getHealth,
  getMeta,
  postUsdcxFaucet,
  getVentualsMarkets,
  postMint,
  postRedeem,
  postSwap,
  type AccountSummary,
  type Meta,
  type TxResponse,
  type VentualsMarketRow,
} from "./api.ts";
import { PreprodLedger } from "./PreprodLedger.tsx";
import { VentualsCharts } from "./VentualsCharts.tsx";
import { MARKET_BRAND } from "./data/preprodLedger.ts";

type LogEntry = { t: string; kind: "ok" | "err"; msg: string };
type SessionBal = { token: bigint };
export type TraderPage = "swap" | "mint-redeem";
const TOKEN_SCALE = 1_000_000n;

function parseBig(v?: string): bigint | null {
  if (!v) return null;
  try {
    return BigInt(v);
  } catch {
    return null;
  }
}

function formatInt(v: bigint | null): string {
  if (v == null) return "—";
  return v.toLocaleString();
}

function formatWholeTokens(units: bigint | null): string {
  if (units == null) return "—";
  const whole = Number(units) / Number(TOKEN_SCALE);
  return whole.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function formatAdaFromLovelace(v: bigint | null): string {
  if (v == null) return "—";
  return `${(Number(v) / 1_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })} USDCx`;
}

function lovelaceFromAda(ada: number): bigint | null {
  if (!Number.isFinite(ada) || Number.isNaN(ada) || ada < 0) return null;
  return BigInt(Math.round(ada * 1_000_000));
}

function estimateSwapOut(
  reserveIn: bigint | null,
  reserveOut: bigint | null,
  amountIn: bigint | null,
): bigint | null {
  if (reserveIn == null || reserveOut == null || amountIn == null) return null;
  if (reserveIn <= 0n || reserveOut <= 0n || amountIn <= 0n) return null;
  // Constant-product quote without fee; chain validation determines final execution.
  return (reserveOut * amountIn) / (reserveIn + amountIn);
}

function isFiniteNumber(n: number): boolean {
  return Number.isFinite(n) && !Number.isNaN(n);
}

function parseDisplayNumber(raw: string | undefined): number {
  if (!raw) return Number.NaN;
  return Number(raw.replaceAll(",", "").trim());
}

function perUnitFromOracle(row: VentualsMarketRow): {
  usdText: string;
  usdcxText: string;
} {
  if (row.hl.lastCloseUsd != null) {
    const usd = row.hl.lastCloseUsd;
    const usdcx = usd;
    return {
      usdText: usd.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      usdcxText: usdcx.toLocaleString(undefined, { maximumFractionDigits: 4 }),
    };
  }
  return {
    usdText: row.market?.displayUsd ?? "—",
    usdcxText: row.market?.displayUsdcx ?? "—",
  };
}

function swapQuote(row: VentualsMarketRow, sellA: 0 | 1, amountInRaw: string) {
  const m = row.market;
  const reserveA = parseBig(m?.reserve_a);
  const reserveB = parseBig(m?.reserve_b);
  const amountIn = parseBig(amountInRaw);
  const inIsA = sellA === 1;
  const reserveIn = inIsA ? reserveA : reserveB;
  const reserveOut = inIsA ? reserveB : reserveA;
  const amountOut = estimateSwapOut(reserveIn, reserveOut, amountIn);
  const inLabel = inIsA ? "Token A (USDCx-side reserve)" : "Token B (market token)";
  const outLabel = inIsA ? "Token B (market token)" : "Token A (USDCx-side reserve)";
  const outAda = !inIsA ? formatAdaFromLovelace(amountOut) : null;
  const inAda = inIsA ? formatAdaFromLovelace(amountIn) : null;
  return {
    amountIn,
    amountOut,
    inLabel,
    outLabel,
    inAda,
    outAda,
  };
}

export function TraderDashboard({ page }: { page: TraderPage }) {
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [rows, setRows] = useState<VentualsMarketRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [account, setAccount] = useState<AccountSummary | null>(null);
  const [sessionBal, setSessionBal] = useState<Record<string, SessionBal>>({
    anthropic: { token: 0n },
    openai: { token: 0n },
    spacex: { token: 0n },
  });

  const [swapSellA, setSwapSellA] = useState<Record<string, 0 | 1>>({
    anthropic: 1,
    openai: 1,
    spacex: 1,
  });
  const [swapAmt, setSwapAmt] = useState<Record<string, string>>({
    anthropic: "8000",
    openai: "8000",
    spacex: "8000",
  });
  const [mintAda, setMintAda] = useState<Record<string, string>>({
    anthropic: "",
    openai: "",
    spacex: "",
  });
  const [redeemAda, setRedeemAda] = useState<Record<string, string>>({
    anthropic: "",
    openai: "",
    spacex: "",
  });

  const pushLog = useCallback((kind: LogEntry["kind"], msg: string) => {
    setLog((prev) =>
      [{ t: new Date().toISOString(), kind, msg }, ...prev].slice(0, 40),
    );
  }, []);

  const refreshMarkets = useCallback(async () => {
    try {
      const { markets } = await getVentualsMarkets();
      setRows(markets);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      pushLog("err", `Markets: ${msg}`);
    }
  }, [pushLog]);

  useEffect(() => {
    void (async () => {
      try {
        setHealthOk(!!(await getHealth()).ok);
      } catch {
        setHealthOk(false);
      }
      try {
        setMeta(await getMeta());
      } catch {
        setMeta(null);
      }
      try {
        setAccount(await getAccount());
      } catch {
        setAccount(null);
      }
    })();
  }, []);

  useEffect(() => {
    void refreshMarkets();
    void (async () => {
      try {
        setAccount(await getAccount());
      } catch {
        setAccount(null);
      }
    })();
    const t = setInterval(() => void refreshMarkets(), 12_000);
    const tAcc = setInterval(async () => {
      try {
        setAccount(await getAccount());
      } catch {
        setAccount(null);
      }
    }, 18_000);
    return () => {
      clearInterval(t);
      clearInterval(tAcc);
    };
  }, [refreshMarkets]);

  const run = useCallback(
    async (marketId: string, label: string, fn: () => Promise<TxResponse>) => {
      setBusyId(marketId);
      try {
        const r = await fn();
        pushLog("ok", `${label}: ${r.txHash}`);
        await refreshMarkets();
      } catch (e) {
        pushLog("err", `${label}: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBusyId(null);
      }
    },
    [pushLog, refreshMarkets],
  );

  const rowById = useCallback(
    (marketId: string) => rows.find((r) => r.id === marketId),
    [rows],
  );

  return (
    <div style={layout.page}>
      <header style={layout.header}>
        <div>
          <h1 style={layout.h1}>Pre-IPO perps</h1>
          <p style={layout.lede}>
            {page === "swap"
              ? "Swap terminal: trade Token A and Token B using current pool reserves with receive estimates before submit."
              : "Mint + Redeem terminal: manage synthetic exposure by minting tokens against USDCx collateral or redeeming tokens back to USDCx value."}{" "}
            Oracle prices and market tips are maintained on the server from
            external reference markets, stepped to stay within validator limits.
            Collateral and pool reserve A are denominated in USDCx (USD-pegged).
          </p>
        </div>
        <div style={layout.statusBlock}>
          <div style={layout.pill(healthOk === true)}>
            API {healthOk === null ? "…" : healthOk ? "live" : "down"}
          </div>
          {meta && (
            <div style={layout.metaLine}>
              <span style={layout.pill(!!meta.preprod)}>
                {meta.preprod
                  ? "Preprod"
                  : meta.emulator
                  ? "Emulator"
                  : "Dev net"}
              </span>
            </div>
          )}
          <span
            className="mono"
            style={{ fontSize: "0.72rem", color: "var(--ink-muted)" }}
          >
            {apiBase() || "same-origin"}
          </span>
        </div>
      </header>

      <div className="trader-grid">
        <section className="terminal-top">
          <article className="terminal-panel account-panel">
            <h2 className="terminal-title">Account</h2>
            <p className="trader-muted">
              Wallet USDCx is live from backend faucet ledger. Token balances are your session-side
              net flow from swaps/mint/redeem on this UI.
            </p>
            <dl className="trader-dl">
              <div>
                <dt>Wallet USDCx balance</dt>
                <dd>
                  {account
                    ? formatAdaFromLovelace(parseBig(account.usdcxBalance ?? "0"))
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Wallet address</dt>
                <dd className="mono">
                  {account?.address ? `${account.address.slice(0, 14)}…${account.address.slice(-10)}` : "—"}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  try {
                    const r = await postUsdcxFaucet(1000);
                    pushLog(
                      "ok",
                      `USDCx faucet credited 1000. New balance: ${(
                        Number(r.usdcxBalance) / 1_000_000
                      ).toLocaleString(undefined, { maximumFractionDigits: 6 })} USDCx`,
                    );
                    setAccount(await getAccount());
                  } catch (e) {
                    pushLog(
                      "err",
                      `USDCx faucet failed: ${e instanceof Error ? e.message : String(e)}`,
                    );
                  }
                })();
              }}
            >
              Request 1000 USDCx
            </button>
            <table className="session-table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Token balance</th>
                  <th>USDCx</th>
                </tr>
              </thead>
              <tbody>
                {["anthropic", "openai", "spacex"].map((id) => {
                  const s = sessionBal[id] ?? { token: 0n };
                  const label = rows.find((r) => r.id === id)?.label ?? id;
                  return (
                    <tr key={id}>
                      <td>{label}</td>
                      <td className="mono">{formatWholeTokens(s.token)}</td>
                      <td className="mono">{account ? formatAdaFromLovelace(parseBig(account.usdcxBalance ?? "0")) : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </article>
        </section>
      </div>

      <div className="trader-grid">
        {rows.map((row) => {
          const brand = MARKET_BRAND[row.id];
          const m = row.market;
          const busy = busyId === row.id;
          const perUnit = perUnitFromOracle(row);
          const tokenSym = row.label.toUpperCase();
          const supply = parseBig(m?.vtoken_supply);
          const collateral = parseBig(m?.collateral_locked);
          const reserveAda = parseBig(m?.reserve_a);
          const reserveTok = parseBig(m?.reserve_b);
          return (
            <article key={row.id} className="trader-card">
              <div className="trader-card-head">
                {brand?.logoSrc ? (
                  <img
                    className="ledger-logo"
                    src={brand.logoSrc}
                    width={44}
                    height={44}
                    alt=""
                  />
                ) : null}
                <div>
                  <h2 className="trader-name">{row.label}</h2>
                  <p className="mono trader-coin">
                    {displayInstrumentSymbol(row.hlCoin)}
                  </p>
                  <div className="pair-badges">
                    <span className="pair-badge">{`${row.label.toUpperCase()}/USDCx`}</span>
                    <span className="pair-badge">{`${row.label.toUpperCase()}/USD`}</span>
                  </div>
                </div>
              </div>

              <section className="trader-market">
                <h3 className="trader-section-title">Market</h3>
                {m ? (
                  <dl className="trader-dl trader-market-dl">
                    <div>
                      <dt>Unit price</dt>
                      <dd className="trader-usd">
                        ${perUnit.usdText}{" "}
                        <span className="trader-hint">| {perUnit.usdcxText} USDCx</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Oracle</dt>
                      <dd>
                        {row.hl.interval} close:{" "}
                        {row.hl.lastCloseUsd != null
                          ? `$${row.hl.lastCloseUsd.toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}`
                          : row.hl.error ?? "—"}
                      </dd>
                    </div>
                    <div>
                      <dt>Supply</dt>
                      <dd>
                        {formatWholeTokens(supply)} {tokenSym}
                      </dd>
                    </div>
                    <div>
                      <dt>Collateral</dt>
                      <dd>{formatAdaFromLovelace(collateral)}</dd>
                    </div>
                    <div>
                      <dt>Pool stats</dt>
                      <dd>
                        {formatAdaFromLovelace(reserveAda)}{" "}
                        <span className="trader-hint">
                          | {formatWholeTokens(reserveTok)} {tokenSym} tokens
                        </span>
                      </dd>
                    </div>
                    {row.chainError && (
                      <p className="trader-warn">Chain: {row.chainError}</p>
                    )}
                  </dl>
                ) : (
                  <p className="trader-muted">
                    {row.chainError ?? "No on-chain state"}
                  </p>
                )}
              </section>

              {page === "swap" && (
                <section className="trader-actions">
                  <h3 className="trader-section-title">Swap</h3>
                  <div className="row">
                    <div>
                      <label htmlFor={`sa-${row.id}`}>sellA</label>
                      <select
                        id={`sa-${row.id}`}
                        value={swapSellA[row.id] ?? 1}
                        disabled={busy}
                        onChange={(e) =>
                          setSwapSellA((s) => ({
                            ...s,
                            [row.id]: Number(e.target.value) as 0 | 1,
                          }))
                        }
                      >
                        <option value={1}>Token A (USDCx-side)</option>
                        <option value={0}>Token B ({row.label})</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`am-${row.id}`}>amountIn</label>
                      <input
                        id={`am-${row.id}`}
                        className="mono"
                        value={swapAmt[row.id] ?? ""}
                        disabled={busy}
                        onChange={(e) =>
                          setSwapAmt((s) => ({ ...s, [row.id]: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  {(() => {
                    const q = swapQuote(
                      row,
                      swapSellA[row.id] ?? 1,
                      swapAmt[row.id] ?? "0",
                    );
                  const sellA = swapSellA[row.id] ?? 1;
                  const amountIn = q.amountIn ?? 0n;
                  const walletAda = parseBig(account?.usdcxBalance ?? "0") ?? 0n;
                  const tokenBal = sessionBal[row.id]?.token ?? 0n;
                  const canSwap = sellA === 1
                    ? amountIn > 0n && amountIn <= walletAda
                    : amountIn > 0n && amountIn <= tokenBal;
                    return (
                      <p className="trader-hint trader-quote">
                        You sell{" "}
                        <span className="mono">
                          {formatInt(q.amountIn)} {q.inLabel}
                        </span>{" "}
                        and receive about{" "}
                        <span className="mono">
                          {formatInt(q.amountOut)} {q.outLabel}
                        </span>
                        .{" "}
                      {q.inAda
                          ? `Input value: ${q.inAda}.`
                          : q.outAda
                          ? `Estimated receive value: ${q.outAda}.`
                        : "Add reserves + amount to calculate estimate."}{" "}
                      {!canSwap && "Insufficient balance for this swap."}
                      </p>
                    );
                  })()}
                  <button
                    type="button"
                    className="primary"
                  disabled={(() => {
                    const q = swapQuote(
                      row,
                      swapSellA[row.id] ?? 1,
                      swapAmt[row.id] ?? "0",
                    );
                    const sellA = swapSellA[row.id] ?? 1;
                    const amountIn = q.amountIn ?? 0n;
                    const walletAda = parseBig(account?.usdcxBalance ?? "0") ?? 0n;
                    const tokenBal = sessionBal[row.id]?.token ?? 0n;
                    if (q.amountOut == null || q.amountOut <= 0n) return true;
                    if (sellA === 1) return busy || amountIn <= 0n || amountIn > walletAda;
                    return busy || amountIn <= 0n || amountIn > tokenBal;
                  })()}
                    onClick={() => {
                      const sellA = swapSellA[row.id] ?? 1;
                      const amountIn = swapAmt[row.id] ?? "0";
                      const q = swapQuote(row, sellA, amountIn);
                    const inAmt = q.amountIn ?? 0n;
                    const outAmt = q.amountOut ?? 0n;
                    const walletAda = parseBig(account?.usdcxBalance ?? "0") ?? 0n;
                    const tokenBal = sessionBal[row.id]?.token ?? 0n;
                    const valid = sellA === 1
                      ? inAmt > 0n && outAmt > 0n && inAmt <= walletAda
                      : inAmt > 0n && outAmt > 0n && inAmt <= tokenBal;
                    if (!valid) {
                      pushLog("err", `[${row.label}] Swap blocked: insufficient balance or invalid amount.`);
                      return;
                    }
                      pushLog(
                        "ok",
                        `[${row.label}] Swap request: sell ${formatInt(q.amountIn)} ${q.inLabel} -> est. receive ${formatInt(q.amountOut)} ${q.outLabel}${q.inAda ? ` | input ${q.inAda}` : ""}${q.outAda ? ` | receive ~${q.outAda}` : ""}`,
                      );
                      setSessionBal((prev) => {
                      const cur = prev[row.id] ?? { token: 0n };
                        return {
                          ...prev,
                          [row.id]:
                            sellA === 1
                              ? {
                                  token: cur.token + outAmt,
                                }
                              : {
                                  token: cur.token - inAmt,
                                },
                        };
                      });
                      void run(row.id, "Swap", () =>
                        postSwap(row.id, {
                          sellA,
                          amountIn,
                        }),
                      );
                    }}
                  >
                    Swap
                  </button>
                </section>
              )}

              {page === "mint-redeem" && (
                <section className="trader-actions">
                  <h3 className="trader-section-title">Mint</h3>
                  <div style={{ marginTop: "0.5rem" }}>
                    <label htmlFor={`ma-${row.id}`}>USDCx amount</label>
                    <input
                      id={`ma-${row.id}`}
                      className="mono"
                      value={mintAda[row.id] ?? ""}
                      disabled={busy}
                      placeholder="Enter USDCx to estimate tokens"
                      onChange={(e) =>
                        setMintAda((s) => ({ ...s, [row.id]: e.target.value }))
                      }
                    />
                  </div>
                  {(() => {
                    const adaNum = Number(mintAda[row.id] ?? "");
                    const perUnitAda = parseDisplayNumber(perUnit.usdcxText);
                    const estTokens =
                      isFiniteNumber(adaNum) && isFiniteNumber(perUnitAda) &&
                        perUnitAda > 0
                        ? adaNum / perUnitAda
                        : null;
                    const mintQty =
                      estTokens != null
                        ? Math.max(0, Math.floor(estTokens * 1_000_000))
                        : null;
                    const mintQtyBig = mintQty != null ? BigInt(mintQty) : 0n;
                    const needAda = mintQty != null
                      ? (mintQty / 1_000_000) * perUnitAda
                      : null;
                    const needLovelace = needAda != null ? lovelaceFromAda(needAda) : null;
                    const walletAda = parseBig(account?.usdcxBalance ?? "0") ?? 0n;
                    const canMint = mintQtyBig > 0n && needLovelace != null &&
                      needLovelace <= walletAda;
                    return (
                      <p className="trader-hint trader-quote">
                        {mintQty != null && estTokens != null
                          ? `${adaNum.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDCx -> estimated ${estTokens.toLocaleString(undefined, { maximumFractionDigits: 6 })} tokens; submit quantity = ${(mintQty / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} tokens (scaled on-chain).`
                          : "Enter USDCx amount to estimate mint quantity."}
                        {!canMint && " Insufficient USDCx balance for mint."}
                      </p>
                    );
                  })()}
                  <button
                    type="button"
                    disabled={(() => {
                      const adaNum = Number(mintAda[row.id] ?? "");
                      const perUnitAda = parseDisplayNumber(perUnit.usdcxText);
                      const estTokens =
                        isFiniteNumber(adaNum) && isFiniteNumber(perUnitAda) &&
                          perUnitAda > 0
                          ? adaNum / perUnitAda
                          : null;
                      const qty = estTokens != null
                        ? Math.max(0, Math.floor(estTokens * 1_000_000))
                        : 0;
                      const qtyBig = BigInt(qty);
                      const needAda = qty * perUnitAda;
                      const needLovelace = lovelaceFromAda(needAda);
                      const walletAda = parseBig(account?.usdcxBalance ?? "0") ?? 0n;
                      return busy || qtyBig <= 0n || needLovelace == null ||
                        needLovelace > walletAda;
                    })()}
                    onClick={() => {
                      const adaNum = Number(mintAda[row.id] ?? "");
                      const perUnitAda = parseDisplayNumber(perUnit.usdcxText);
                      const estTokens =
                        isFiniteNumber(adaNum) && isFiniteNumber(perUnitAda) &&
                          perUnitAda > 0
                          ? adaNum / perUnitAda
                          : null;
                      const qty = estTokens != null
                        ? String(Math.max(0, Math.floor(estTokens * 1_000_000)))
                        : "0";
                      const mkt = rowById(row.id)?.market;
                      const pxAdaRaw = mkt?.displayUsdcx;
                      const pxUsdRaw = mkt?.displayUsd;
                      const qtyNum = Number(qty);
                      const pxAdaNum = parseDisplayNumber(pxAdaRaw);
                      const pxUsdNum = parseDisplayNumber(pxUsdRaw);
                      const estAda =
                        isFiniteNumber(qtyNum) && isFiniteNumber(pxAdaNum)
                          ? qtyNum * pxAdaNum
                          : null;
                      const estUsd =
                        isFiniteNumber(qtyNum) && isFiniteNumber(pxUsdNum)
                          ? qtyNum * pxUsdNum
                          : null;
                      pushLog(
                        "ok",
                        `[${row.label}] Mint request: USDCx ${mintAda[row.id] || "0"} -> quantity ${(Number(qty) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} tokens${estAda != null ? ` | est. value ${estAda.toLocaleString(undefined, { maximumFractionDigits: 4 })} USDCx` : ""}${estUsd != null ? ` (${estUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD)` : ""}`,
                      );
                      setSessionBal((prev) => {
                        const cur = prev[row.id] ?? { token: 0n };
                        const qBig = parseBig(qty) ?? 0n;
                        const walletAda = parseBig(account?.usdcxBalance ?? "0") ?? 0n;
                        const neededLovelace = estAda != null
                          ? lovelaceFromAda(estAda) ?? 0n
                          : 0n;
                        if (qBig <= 0n || neededLovelace > walletAda) {
                          pushLog("err", `[${row.label}] Mint blocked: insufficient USDCx or invalid amount.`);
                          return prev;
                        }
                        return {
                          ...prev,
                          [row.id]: {
                            token: cur.token + qBig,
                          },
                        };
                      });
                      void run(row.id, "Mint", () =>
                        postMint(row.id, { quantity: qty }),
                      );
                    }}
                  >
                    Mint
                  </button>
                </section>
              )}

              {page === "mint-redeem" && (
                <section className="trader-actions">
                  <h3 className="trader-section-title">Redeem</h3>
                  <div style={{ marginTop: "0.5rem" }}>
                    <label htmlFor={`ra-${row.id}`}>target USDCx amount</label>
                    <input
                      id={`ra-${row.id}`}
                      className="mono"
                      value={redeemAda[row.id] ?? ""}
                      disabled={busy}
                      placeholder="Enter USDCx to estimate token burn"
                      onChange={(e) =>
                        setRedeemAda((s) => ({ ...s, [row.id]: e.target.value }))
                      }
                    />
                  </div>
                  {(() => {
                    const adaNum = Number(redeemAda[row.id] ?? "");
                    const perUnitAda = parseDisplayNumber(perUnit.usdcxText);
                    const tokensNeeded =
                      isFiniteNumber(adaNum) && isFiniteNumber(perUnitAda) &&
                        perUnitAda > 0
                        ? adaNum / perUnitAda
                        : null;
                    const redeemQty =
                      tokensNeeded != null
                        ? Math.max(0, Math.floor(tokensNeeded * 1_000_000))
                        : null;
                    const tokenBal = sessionBal[row.id]?.token ?? 0n;
                    const canRedeem = redeemQty != null && BigInt(redeemQty) > 0n &&
                      BigInt(redeemQty) <= tokenBal;
                    return (
                      <p className="trader-hint trader-quote">
                        {redeemQty != null && tokensNeeded != null
                          ? `Target ${adaNum.toLocaleString(undefined, { maximumFractionDigits: 6 })} USDCx -> estimated ${tokensNeeded.toLocaleString(undefined, { maximumFractionDigits: 6 })} tokens; submit quantity = ${(redeemQty / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} tokens (scaled on-chain).`
                          : "Enter target USDCx amount to estimate redeem quantity."}
                        {!canRedeem && " Not enough token balance to redeem this amount."}
                      </p>
                    );
                  })()}
                  <button
                    type="button"
                    disabled={(() => {
                      const adaNum = Number(redeemAda[row.id] ?? "");
                      const perUnitAda = parseDisplayNumber(perUnit.usdcxText);
                      const tokensNeeded =
                        isFiniteNumber(adaNum) && isFiniteNumber(perUnitAda) &&
                          perUnitAda > 0
                          ? adaNum / perUnitAda
                          : null;
                      const qty = tokensNeeded != null
                        ? Math.max(0, Math.floor(tokensNeeded * 1_000_000))
                        : 0;
                      const tokenBal = sessionBal[row.id]?.token ?? 0n;
                      return busy || qty <= 0 || BigInt(qty) > tokenBal;
                    })()}
                    onClick={() => {
                      const adaNum = Number(redeemAda[row.id] ?? "");
                      const perUnitAda = parseDisplayNumber(perUnit.usdcxText);
                      const tokensNeeded =
                        isFiniteNumber(adaNum) && isFiniteNumber(perUnitAda) &&
                          perUnitAda > 0
                          ? adaNum / perUnitAda
                          : null;
                      const qty = tokensNeeded != null
                        ? String(Math.max(0, Math.floor(tokensNeeded * 1_000_000)))
                        : "0";
                      const mkt = rowById(row.id)?.market;
                      const pxAdaRaw = mkt?.displayUsdcx;
                      const pxUsdRaw = mkt?.displayUsd;
                      const qtyNum = Number(qty);
                      const pxAdaNum = parseDisplayNumber(pxAdaRaw);
                      const pxUsdNum = parseDisplayNumber(pxUsdRaw);
                      const estAda =
                        isFiniteNumber(qtyNum) && isFiniteNumber(pxAdaNum)
                          ? qtyNum * pxAdaNum
                          : null;
                      const estUsd =
                        isFiniteNumber(qtyNum) && isFiniteNumber(pxUsdNum)
                          ? qtyNum * pxUsdNum
                          : null;
                      pushLog(
                        "ok",
                        `[${row.label}] Redeem request: target USDCx ${redeemAda[row.id] || "0"} -> quantity ${(Number(qty) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 6 })} tokens${estAda != null ? ` | est. return ${estAda.toLocaleString(undefined, { maximumFractionDigits: 4 })} USDCx` : ""}${estUsd != null ? ` (${estUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} USD)` : ""}`,
                      );
                      setSessionBal((prev) => {
                        const cur = prev[row.id] ?? { token: 0n };
                        const qBig = parseBig(qty) ?? 0n;
                        if (qBig <= 0n || qBig > cur.token) {
                          pushLog("err", `[${row.label}] Redeem blocked: insufficient token balance or invalid amount.`);
                          return prev;
                        }
                        return {
                          ...prev,
                          [row.id]: {
                            token: cur.token - qBig,
                          },
                        };
                      });
                      void run(row.id, "Redeem", () =>
                        postRedeem(row.id, { quantity: qty }),
                      );
                    }}
                  >
                    Redeem
                  </button>
                </section>
              )}
            </article>
          );
        })}
      </div>

      <VentualsCharts />

      <PreprodLedger />

      <section className="trader-log">
        <h2 className="trader-log-title">Activity</h2>
        <p className="trader-muted">
          Trade history for this session with amount, token side, receive estimate,
          and USDCx/USD context from current market price.
        </p>
        <ul className="trader-log-list">
          {log.map((e, i) => (
            <li
              key={`${e.t}-${i}`}
              className={e.kind === "ok" ? "trader-log-ok" : "trader-log-err"}
            >
              <span className="mono">{e.t.slice(11, 19)}</span> {e.msg}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const layout = {
  page: {
    minHeight: "100vh",
    padding: "clamp(1rem, 3vw, 2.5rem)",
    maxWidth: "1180px",
    margin: "0 auto",
  } as const,
  header: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "1.5rem",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "2rem",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid var(--border)",
  } as const,
  h1: {
    fontFamily: "var(--font-display)",
    fontWeight: 700,
    fontSize: "clamp(1.75rem, 2.5vw, 2.35rem)",
    letterSpacing: "-0.03em",
    lineHeight: 1.1,
    margin: "0 0 0.4rem",
    color: "var(--ink)",
  } as const,
  lede: {
    margin: 0,
    maxWidth: "40rem",
    color: "var(--ink-muted)",
    fontSize: "0.98rem",
    lineHeight: 1.55,
  } as const,
  statusBlock: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.45rem",
    alignItems: "flex-end",
    textAlign: "right" as const,
  },
  metaLine: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.5rem",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  pill: (on: boolean) =>
    ({
      display: "inline-block",
      padding: "0.25rem 0.6rem",
      borderRadius: "999px",
      fontFamily: "var(--font-display)",
      fontSize: "0.72rem",
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase" as const,
      background: on ? "var(--accent-soft)" : "var(--paper-2)",
      border: `1px solid ${on ? "color-mix(in oklch, var(--accent) 40%, var(--border))" : "var(--border)"}`,
    }) as const,
};
