import { useCallback, useEffect, useState } from "react";
import { postReferenceCandles } from "./api.ts";
import { MARKET_BRAND } from "./data/preprodLedger.ts";
import {
  type HlCandleInterval,
  type VentualsMarketId,
  candlesToClosesSorted,
} from "./hyperliquid.ts";

const MARKETS: VentualsMarketId[] = ["anthropic", "openai", "spacex"];

const INTERVALS: { v: HlCandleInterval; label: string }[] = [
  { v: "15m", label: "15m" },
  { v: "1h", label: "1h" },
  { v: "4h", label: "4h" },
  { v: "1d", label: "1d" },
];

const RANGES: { days: number; label: string }[] = [
  { days: 2, label: "2d" },
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
];

function PriceLineChart({
  closes,
  id,
}: {
  closes: number[];
  id: string;
}) {
  const w = 480;
  const h = 140;
  const padX = 6;
  const padY = 10;
  if (closes.length < 2) {
    return (
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="vntl-chart-svg"
        role="img"
        aria-label="Not enough data for chart"
      />
    );
  }
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;
  const coordPairs = closes.map((c, i) => {
    const x = padX + (i / (closes.length - 1)) * innerW;
    const y = padY + (1 - (c - min) / span) * innerH;
    return { x, y };
  });
  let d = `M ${coordPairs[0]!.x} ${coordPairs[0]!.y}`;
  for (let i = 1; i < coordPairs.length; i++) {
    d += ` L ${coordPairs[i]!.x} ${coordPairs[i]!.y}`;
  }
  const areaD = `${d} L ${coordPairs[coordPairs.length - 1]!.x} ${h - padY} L ${padX} ${h - padY} Z`;
  const firstC = closes[0]!;
  const lastC = closes[closes.length - 1]!;
  const deltaPct = firstC !== 0 ? ((lastC - firstC) / firstC) * 100 : 0;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="vntl-chart-svg"
      preserveAspectRatio="none"
      role="img"
      aria-label={`Close price chart, ${closes.length} candles, about ${deltaPct.toFixed(2)} percent change`}
    >
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#fill-${id})`} stroke="none" />
      <path
        d={d}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VentualsCharts() {
  const [interval, setInterval] = useState<HlCandleInterval>("1h");
  const [rangeDays, setRangeDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [series, setSeries] = useState<
    Partial<Record<VentualsMarketId, number[]>>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const end = Date.now();
    const start = end - rangeDays * 86_400_000;
    try {
      const pack = await postReferenceCandles({
        interval,
        startTime: start,
        endTime: end,
      });
      const next: Partial<Record<VentualsMarketId, number[]>> = {};
      for (const m of MARKETS) {
        const raw = pack[m] ?? [];
        next[m] = candlesToClosesSorted(raw);
      }
      setSeries(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setSeries({});
    } finally {
      setLoading(false);
    }
  }, [interval, rangeDays]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="vntl-wrap" aria-labelledby="ref-charts-heading">
      <div className="vntl-intro">
        <h2 id="ref-charts-heading" className="vntl-title">
          Reference charts
        </h2>
      </div>

      <div className="vntl-controls">
        <div className="vntl-field">
          <label htmlFor="vntl-interval">Interval</label>
          <select
            id="vntl-interval"
            value={interval}
            onChange={(e) =>
              setInterval(e.target.value as HlCandleInterval)
            }
          >
            {INTERVALS.map((x) => (
              <option key={x.v} value={x.v}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <div className="vntl-field">
          <label htmlFor="vntl-range">Range</label>
          <select
            id="vntl-range"
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
          >
            {RANGES.map((x) => (
              <option key={x.days} value={x.days}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err && (
        <p className="vntl-error" role="alert">
          {err}
        </p>
      )}

      <div className="vntl-grid">
        {MARKETS.map((m) => {
          const brand = MARKET_BRAND[m];
          const closes = series[m] ?? [];
          const last = closes.length ? closes[closes.length - 1]! : null;
          const first = closes.length ? closes[0]! : null;
          const dPct =
            first != null && last != null && first !== 0
              ? ((last - first) / first) * 100
              : null;

          return (
            <article key={m} className="vntl-card">
              <div className="vntl-card-head">
                {brand?.logoSrc ? (
                  <img
                    src={brand.logoSrc}
                    width={40}
                    height={40}
                    alt=""
                    className="ledger-logo"
                  />
                ) : null}
                <div>
                  <div className="vntl-card-name">{brand?.label ?? m}</div>
                </div>
              </div>
              <div className="vntl-card-price">
                {last != null ? (
                  <>
                    <span className="vntl-last">{last.toLocaleString()}</span>
                    {dPct != null && (
                      <span
                        className={
                          dPct >= 0 ? "vntl-delta vntl-up" : "vntl-delta vntl-down"
                        }
                      >
                        {dPct >= 0 ? "+" : ""}
                        {dPct.toFixed(2)}%
                      </span>
                    )}
                    <span className="vntl-price-hint">last close</span>
                  </>
                ) : loading ? (
                  <span className="vntl-muted">…</span>
                ) : (
                  <span className="vntl-muted">No data</span>
                )}
              </div>
              <PriceLineChart closes={closes} id={m} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
