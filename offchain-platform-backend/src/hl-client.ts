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

export type HlCandleInterval = "15m" | "1h" | "4h" | "1d";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function hlInfoUrl(): string {
  return (Deno.env.get("HL_INFO_URL") ?? "https://api.hyperliquid.xyz/info").replace(
    /\/$/,
    "",
  );
}

/**
 * POST candleSnapshot with retries on 429 (burst traffic from parallel clients
 * often hits upstream rate limits).
 */
export async function fetchCandleSnapshot(
  coin: string,
  interval: HlCandleInterval,
  startTime: number,
  endTime: number,
): Promise<HlCandle[]> {
  const url = hlInfoUrl();
  const payload = JSON.stringify({
    type: "candleSnapshot",
    req: { coin, interval, startTime, endTime },
  });
  let last429 = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt > 0) {
      const backoff = 400 * 2 ** (attempt - 1);
      await sleep(backoff);
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    const text = await res.text();
    if (res.status === 429) {
      last429 = true;
      continue;
    }
    if (!res.ok) {
      throw new Error(`Price feed ${res.status}: ${text.slice(0, 120)}`);
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Price feed: invalid JSON");
    }
    if (!Array.isArray(data)) {
      throw new Error("Price feed: unexpected candle response");
    }
    return data as HlCandle[];
  }
  throw new Error(
    last429
      ? "Price feed rate limited — try again shortly"
      : "Price feed: request failed",
  );
}

/** Last closed candle `c` as USD/index number from perp candles. */
export async function fetchLastCloseUsd(
  coin: string,
  interval: HlCandleInterval = "1h",
): Promise<number> {
  const end = Date.now();
  const start = end - 7 * 86_400_000;
  const data = await fetchCandleSnapshot(coin, interval, start, end);
  if (data.length === 0) {
    throw new Error("Price feed: no candles");
  }
  const sorted = [...data].sort((a, b) => a.t - b.t);
  const last = sorted[sorted.length - 1]!;
  const c = Number(last.c);
  if (!Number.isFinite(c) || c <= 0) throw new Error("Price feed: bad close");
  return c;
}
