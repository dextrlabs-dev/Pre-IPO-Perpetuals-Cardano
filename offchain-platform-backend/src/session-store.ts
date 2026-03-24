import { PREIPO_USE_EMULATOR } from "../../cli/cardano-env.ts";
import { VENTUALS_MARKETS } from "./markets-config.ts";

export type SessionRow = { lastSpendTx: string };

const sessions = new Map<string, SessionRow>();

export function sessionsFile(): string {
  return Deno.env.get("PREIPO_SESSIONS_PATH") ??
    new URL("../data/sessions.json", import.meta.url).pathname;
}

function sessionsDir(): string {
  const p = sessionsFile();
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(0, i) : ".";
}

export function getSession(marketId: string): SessionRow | undefined {
  return sessions.get(marketId);
}

export function rememberTx(marketId: string, txHash: string) {
  sessions.set(marketId, { lastSpendTx: txHash });
  void persistSessions();
}

function parseEnvTips(): Record<string, string> | null {
  const raw = Deno.env.get("PREIPO_MARKET_TIPS");
  if (!raw) return null;
  const o: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const [id, tx] = part.split(":").map((s) => s.trim());
    if (id && tx) o[id] = tx;
  }
  return Object.keys(o).length ? o : null;
}

export async function initSessionStore() {
  await loadSessionsFromDisk();
  if (PREIPO_USE_EMULATOR) {
    return;
  }
  const envTips = parseEnvTips();
  for (const m of VENTUALS_MARKETS) {
    if (sessions.has(m.id)) continue;
    const tx = envTips?.[m.id] ?? m.bootstrapTipTx;
    sessions.set(m.id, { lastSpendTx: tx });
  }
}

async function loadSessionsFromDisk() {
  const path = sessionsFile();
  try {
    const text = await Deno.readTextFile(path);
    const j = JSON.parse(text) as Record<string, { lastSpendTx?: string }>;
    for (const [k, v] of Object.entries(j)) {
      if (v?.lastSpendTx) sessions.set(k, { lastSpendTx: v.lastSpendTx });
    }
  } catch {
    /* missing file ok */
  }
}

async function persistSessions() {
  const path = sessionsFile();
  const obj: Record<string, SessionRow> = {};
  for (const [k, v] of sessions) obj[k] = v;
  try {
    await Deno.mkdir(sessionsDir(), { recursive: true });
  } catch {
    /* ok */
  }
  await Deno.writeTextFile(path, JSON.stringify(obj, null, 2) + "\n");
}
