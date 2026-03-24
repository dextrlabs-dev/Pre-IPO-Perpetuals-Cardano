import { L } from "../../cli/preipo-evo-core.ts";

type FaucetState = {
  balances: Record<string, string>;
};

const DEFAULT_BALANCE_UNITS = 10_000_000_000n; // 10,000 USDCx with 1e6 scale
const SCALE = 1_000_000n;
const faucetPath = Deno.env.get("PREIPO_USDCX_FAUCET_PATH") ??
  "/tmp/preipo-usdcx-faucet.json";

function zeroState(): FaucetState {
  return { balances: {} };
}

async function readState(): Promise<FaucetState> {
  try {
    const raw = await Deno.readTextFile(faucetPath);
    const parsed = JSON.parse(raw) as FaucetState;
    if (!parsed || typeof parsed !== "object" || !parsed.balances) {
      return zeroState();
    }
    return parsed;
  } catch {
    return zeroState();
  }
}

async function writeState(s: FaucetState): Promise<void> {
  await Deno.writeTextFile(faucetPath, JSON.stringify(s, null, 2));
}

export async function ensureFaucetWallet(): Promise<void> {
  const state = await readState();
  const addr = await L.wallet().address();
  if (!state.balances[addr]) {
    state.balances[addr] = DEFAULT_BALANCE_UNITS.toString();
    await writeState(state);
  }
}

export async function getUsdcxBalanceUnits(address: string): Promise<bigint> {
  const state = await readState();
  const raw = state.balances[address] ?? "0";
  try {
    return BigInt(raw);
  } catch {
    return 0n;
  }
}

export async function debitUsdcx(address: string, amountUnits: bigint): Promise<void> {
  if (amountUnits < 0n) throw new Error("amount must be non-negative");
  const state = await readState();
  const cur = await getUsdcxBalanceUnits(address);
  if (cur < amountUnits) {
    throw new Error("insufficient USDCx faucet balance");
  }
  state.balances[address] = (cur - amountUnits).toString();
  await writeState(state);
}

export async function creditUsdcx(address: string, amountUnits: bigint): Promise<void> {
  if (amountUnits < 0n) throw new Error("amount must be non-negative");
  const state = await readState();
  const cur = await getUsdcxBalanceUnits(address);
  state.balances[address] = (cur + amountUnits).toString();
  await writeState(state);
}

export function unitsToUsdcx(units: bigint): number {
  return Number(units) / Number(SCALE);
}

