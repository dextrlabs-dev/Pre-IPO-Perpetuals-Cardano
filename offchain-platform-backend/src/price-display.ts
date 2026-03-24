import { SCALE } from "./markets-config.ts";

/**
 * USDCx convention: `current_price` / SCALE is USDCx per token.
 * USDCx is treated as USD-pegged for display.
 */
export function scaledToUsdcx(price: bigint): number {
  return Number(price) / Number(SCALE);
}

export function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatAda(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}
