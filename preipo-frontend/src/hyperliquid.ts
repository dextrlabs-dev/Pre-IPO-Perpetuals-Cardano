/**
 * Hyperliquid public `info` API (POST JSON). Ventuals perps use `vntl:` coin ids.
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
 * @see https://docs.ventuals.com/developers/api
 */

export type HlCandleInterval = "15m" | "1h" | "4h" | "1d";

export type HlCandle = {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
};

/** Maps UI / Cardano market ids to Hyperliquid perp symbols on the Ventuals dex. */
export const VENTUALS_HL_COIN = {
  anthropic: "vntl:ANTHROPIC",
  openai: "vntl:OPENAI",
  spacex: "vntl:SPACEX",
} as const;

export type VentualsMarketId = keyof typeof VENTUALS_HL_COIN;

export function hlInfoEndpoint(): string {
  const u = import.meta.env.VITE_HL_INFO_URL;
  if (typeof u === "string" && u.length > 0) return u.replace(/\/$/, "");
  if (import.meta.env.DEV) return "/hl-info";
  return "https://api.hyperliquid.xyz/info";
}

export async function fetchCandleSnapshot(
  coin: string,
  interval: HlCandleInterval,
  startTime: number,
  endTime: number,
): Promise<HlCandle[]> {
  const res = await fetch(hlInfoEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "candleSnapshot",
      req: { coin, interval, startTime, endTime },
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Price feed ${res.status}: ${t.slice(0, 200)}`);
  }
  const data: unknown = await res.json();
  if (!Array.isArray(data)) {
    throw new Error("Unexpected candle response");
  }
  return data as HlCandle[];
}

export function candlesToClosesSorted(candles: HlCandle[]): number[] {
  return [...candles]
    .sort((a, b) => a.t - b.t)
    .map((c) => Number(c.c))
    .filter((n) => Number.isFinite(n));
}
