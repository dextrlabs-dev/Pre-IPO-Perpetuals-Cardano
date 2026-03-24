/**
 * API origin for fetch().
 * - Production: set `VITE_API_BASE` at build time, or "" if UI and API share the same host.
 * - Development: default is "" (same origin) so requests use the Vite dev proxy (`/api`, `/health`,
 *   … → `vite.config.ts` target). Use this when the UI runs in the browser on Windows and the API
 *   runs in WSL — the browser cannot reliably open `http://127.0.0.1:8787` on the VM.
 * - Set `VITE_DEV_BACKEND` only if you need the browser to call Deno directly (same machine as both).
 */

import type { HlCandle, HlCandleInterval } from "./hyperliquid.ts";

export function apiBase(): string {
  const explicit = import.meta.env.VITE_API_BASE;
  if (typeof explicit === "string" && explicit.length > 0) {
    return explicit.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    const back = import.meta.env.VITE_DEV_BACKEND;
    if (typeof back === "string" && back.length > 0) {
      return back.replace(/\/$/, "");
    }
    return "";
  }
  return "";
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || `HTTP ${res.status}`);
  }
}

export async function postReferenceCandles(body: {
  interval: HlCandleInterval;
  startTime: number;
  endTime: number;
}): Promise<Record<string, HlCandle[]>> {
  const res = await fetch(`${apiBase()}/api/v1/reference-candles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: { series?: Record<string, HlCandle[]>; error?: string };
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`);
  }
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data.series ?? {};
}

export type Meta = {
  contractAddress?: string;
  preprod?: boolean;
  emulator?: boolean;
};

export type AccountSummary = {
  address: string;
  lovelace: string;
  usdcxBalance?: string;
  usdcxDisplay?: number;
  assets: Record<string, string>;
  note?: string;
};

export type TxResponse = {
  txHash: string;
  explorerUrl: string;
  marketId?: string;
};

/** Human-readable instrument label (hides internal vendor-style prefixes). */
export function displayInstrumentSymbol(raw: string): string {
  return raw.replace(/^vntl:/i, "").trim() || raw;
}

export type VentualsMarketRow = {
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
  pricingNote?: string;
};

export async function getHealth(): Promise<{ ok: boolean }> {
  const res = await fetch(`${apiBase()}/health`);
  return parseJson(res);
}

export async function getMeta(): Promise<Meta> {
  const res = await fetch(`${apiBase()}/api/v1/meta`);
  if (!res.ok) throw new Error(await res.text());
  return parseJson(res);
}

export async function getAccount(): Promise<AccountSummary> {
  const res = await fetch(`${apiBase()}/api/v1/account`);
  if (!res.ok) throw new Error(await res.text());
  return parseJson(res);
}

export async function postUsdcxFaucet(amountUsdcx = 1000): Promise<{
  ok: boolean;
  creditedUnits: string;
  usdcxBalance: string;
  usdcxDisplay: number;
}> {
  const res = await fetch(`${apiBase()}/api/v1/faucet/usdcx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amountUsdcx }),
  });
  const data = await parseJson<{
    ok?: boolean;
    creditedUnits?: string;
    usdcxBalance?: string;
    usdcxDisplay?: number;
    error?: string;
  }>(res);
  if (!res.ok || !data.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return {
    ok: true,
    creditedUnits: data.creditedUnits ?? "0",
    usdcxBalance: data.usdcxBalance ?? "0",
    usdcxDisplay: data.usdcxDisplay ?? 0,
  };
}

export async function getVentualsMarkets(): Promise<{
  markets: VentualsMarketRow[];
}> {
  const base = apiBase();
  const paths = ["/api/v1/ventuals/markets", "/api/v1/markets"];
  let lastUrl = "";
  for (const p of paths) {
    lastUrl = `${base}${p}`;
    const res = await fetch(lastUrl);
    if (res.ok) {
      return parseJson<{ markets: VentualsMarketRow[] }>(res);
    }
    if (res.status !== 404) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(
        data.error ?? `HTTP ${res.status} when loading markets`,
      );
    }
  }
  throw new Error(
    "No markets data (404). Start the API server, use the Vite dev server so /api is proxied, or set VITE_API_BASE to your API URL.",
  );
}

export async function postSwap(
  marketId: string,
  body: { sellA: 0 | 1; amountIn: string },
): Promise<TxResponse> {
  const res = await fetch(
    `${apiBase()}/api/v1/markets/${encodeURIComponent(marketId)}/swap`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = await parseJson<TxResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? JSON.stringify(data));
  return data;
}

export async function postMint(
  marketId: string,
  body: { quantity: string },
): Promise<TxResponse> {
  const res = await fetch(
    `${apiBase()}/api/v1/markets/${encodeURIComponent(marketId)}/mint`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = await parseJson<TxResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? JSON.stringify(data));
  return data;
}

export async function postRedeem(
  marketId: string,
  body: { quantity: string },
): Promise<TxResponse> {
  const res = await fetch(
    `${apiBase()}/api/v1/markets/${encodeURIComponent(marketId)}/redeem`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = await parseJson<TxResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(data.error ?? JSON.stringify(data));
  return data;
}
