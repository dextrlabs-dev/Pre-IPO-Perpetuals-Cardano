import { useMemo, useState } from "react";
import {
  LEDGER_ROWS,
  PREPROD_LEDGER_CSV,
  formatLedgerSnapshot,
  formatSwapLeg,
  groupByMarket,
  MARKET_BRAND,
  marketStats,
  type LedgerRow,
} from "./data/preprodLedger.ts";

const MARKET_ORDER = ["anthropic", "openai", "spacex"] as const;

type Props = {
  /** When set, shows “Use in console” to copy tip context for the CLI. */
  onUseMarket?: (marketId: string, lastTxHash: string) => void;
};

function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

function stepLabel(step: string): string {
  if (step === "lock") return "Lock";
  if (step === "mint") return "Mint";
  if (step === "redeem") return "Redeem";
  const om = /^oracle_(\d+)$/.exec(step);
  if (om) return `Oracle ${om[1]}`;
  const sm = /^swap_(\d+)$/.exec(step);
  if (sm) return `Swap ${sm[1]}`;
  return step;
}

export function PreprodLedger({ onUseMarket }: Props) {
  const grouped = useMemo(() => groupByMarket(LEDGER_ROWS), []);
  const [open, setOpen] = useState<string | null>("anthropic");

  return (
    <section className="ledger-wrap" aria-labelledby="ledger-heading">
      <div className="ledger-intro">
        <h2 id="ledger-heading" className="ledger-title">
          Trade history
        </h2>
        <p className="ledger-sub">
          Latest Preprod batch from <code className="mono">preprod-three-markets-report</code>
          : per market, <strong>lock → oracle → mint → swap → redeem</strong> with inline
          datum snapshot columns in the raw CSV (
          <code className="mono">explorerUrl, current_price, …</code>
          ). <strong>{LEDGER_ROWS.length} transactions</strong> across three markets.
        </p>
      </div>

      <div className="ledger-grid">
        {MARKET_ORDER.map((key) => {
          const rows = grouped.get(key) ?? [];
          const brand = MARKET_BRAND[key] ?? {
            label: key,
            logoSrc: "",
            accent: "var(--ink)",
          };
          const stats = marketStats(rows);
          const tipTx = rows.length ? rows[rows.length - 1]!.txHash : "";
          const isOpen = open === key;

          return (
            <article key={key} className="ledger-card">
              <button
                type="button"
                className="ledger-card-head"
                onClick={() => setOpen(isOpen ? null : key)}
                aria-expanded={isOpen}
              >
                <div className="ledger-brand">
                  {brand.logoSrc ? (
                    <img
                      src={brand.logoSrc}
                      width={44}
                      height={44}
                      alt=""
                      className="ledger-logo"
                    />
                  ) : (
                    <span className="ledger-logo-fallback" aria-hidden>
                      {key.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="ledger-brand-text">
                    <span className="ledger-brand-name">{brand.label}</span>
                    <span className="ledger-brand-id mono">{key}</span>
                  </div>
                </div>
                <div className="ledger-stats">
                  <span>{stats.total} txs</span>
                  <span>
                    {stats.lock ? "lock" : "—"} · {stats.oracles} oracle ·{" "}
                    {stats.mints} mint · {stats.swaps} swap · {stats.redeems} redeem
                  </span>
                </div>
                <span className="ledger-chevron" aria-hidden>
                  {isOpen ? "−" : "+"}
                </span>
              </button>

              {isOpen && (
                <div className="ledger-body">
                  {onUseMarket && (
                    <div className="ledger-actions">
                      <button
                        type="button"
                        className="primary"
                        disabled={!tipTx}
                        onClick={() => onUseMarket(key, tipTx)}
                      >
                        Use in console
                      </button>
                      <span className="ledger-hint mono">
                        Sets market id to <code>{key}</code> and last tx to chain
                        tip.
                      </span>
                    </div>
                  )}
                  <div className="ledger-table-wrap">
                    <table className="ledger-table">
                      <thead>
                        <tr>
                          <th scope="col">Step</th>
                          <th scope="col">Tx hash</th>
                          <th scope="col">Explorer</th>
                          <th scope="col">Note</th>
                          <th scope="col">Datum after tx</th>
                          <th scope="col">Pool trade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r: LedgerRow) => (
                          <tr key={`${r.step}-${r.txHash}`}>
                            <td className="ledger-step">{stepLabel(r.step)}</td>
                            <td className="mono ledger-hash">{shortHash(r.txHash)}</td>
                            <td>
                              <a
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Cardanoscan
                              </a>
                            </td>
                            <td className="ledger-note">{r.note ?? "—"}</td>
                            <td className="mono ledger-snapshot">
                              {formatLedgerSnapshot(r)}
                            </td>
                            <td className="mono ledger-swap-leg">
                              {formatSwapLeg(r)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <details className="ledger-csv-details">
        <summary className="ledger-csv-summary">Raw CSV</summary>
        <pre className="ledger-csv-pre mono">
          {PREPROD_LEDGER_CSV.trimEnd()}
        </pre>
      </details>
    </section>
  );
}
