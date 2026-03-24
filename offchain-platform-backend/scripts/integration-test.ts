/**
 * Unless BACKEND_URL is set, spawns the backend:
 * - Default: PREIPO_USE_EMULATOR=1 (fast local ledger)
 * - Preprod: PREIPO_USE_PREPROD=1 (unset emulator; needs funded PREIPO_WALLET_SEED / Blockfrost)
 *
 * Flow: lock → 3× oracle → 3× swap.
 */
const BACKEND = Deno.env.get("BACKEND_URL");
const TEST_PORT = Deno.env.get("TEST_PORT") ?? "9876";
const usePreprod = Deno.env.get("PREIPO_USE_PREPROD") === "1";
const MARKET = Deno.env.get("PREIPO_TEST_MARKET") ??
  (usePreprod ? `preprod_api_${Date.now()}` : "api_backend_demo");

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function waitHealth(base: string, maxMs = usePreprod ? 300_000 : 120_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const r = await fetch(`${base}/health`);
      if (r.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("health timeout");
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function postJson(url: string, body: unknown) {
  const attempts = usePreprod ? 5 : 1;
  let lastErr: unknown;
  for (let a = 1; a <= attempts; a++) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(`HTTP ${r.status}: ${JSON.stringify(j)}`);
      }
      return j as Record<string, string>;
    } catch (e) {
      lastErr = e;
      if (a < attempts) {
        await sleep(4000 * a);
      }
    }
  }
  throw lastErr;
}

async function main() {
  let base = BACKEND;
  let child: Deno.ChildProcess | null = null;

  if (!base) {
    const root = new URL("..", import.meta.url).pathname;
    const childEnv: Record<string, string> = {
      ...Deno.env.toObject(),
      PORT: TEST_PORT,
    };
    if (usePreprod) {
      delete childEnv.PREIPO_USE_EMULATOR;
      childEnv.PREIPO_USE_PREPROD = "1";
    } else {
      childEnv.PREIPO_USE_EMULATOR = "1";
      delete childEnv.PREIPO_USE_PREPROD;
    }
    child = new Deno.Command(Deno.execPath(), {
      args: ["run", "-A", `${root}/main.ts`],
      cwd: root,
      env: childEnv,
      stdout: "inherit",
      stderr: "inherit",
    }).spawn();
    base = `http://127.0.0.1:${TEST_PORT}`;
    console.log(
      "Waiting for server",
      base,
      usePreprod ? "(Preprod)" : "(emulator)",
    );
    await waitHealth(base);
  }

  try {
    console.log("marketId", MARKET);
    const lock = await postJson(
      `${base}/api/v1/markets/${encodeURIComponent(MARKET)}/lock`,
      {},
    );
    assert(lock.txHash?.length === 64, "lock txHash");
    console.log("lock", lock.txHash);
    if (usePreprod) await sleep(3000);

    for (let i = 1; i <= 3; i++) {
      const o = await postJson(
        `${base}/api/v1/markets/${encodeURIComponent(MARKET)}/oracle`,
        { bumpBps: 10100 },
      );
      assert(o.txHash?.length === 64, `oracle ${i} txHash`);
      console.log(`oracle_${i}`, o.txHash);
      if (usePreprod) await sleep(3000);
    }

    for (let i = 1; i <= 3; i++) {
      const s = await postJson(
        `${base}/api/v1/markets/${encodeURIComponent(MARKET)}/swap`,
        { sellA: 1, amountIn: "8000" },
      );
      assert(s.txHash?.length === 64, `swap ${i} txHash`);
      console.log(`swap_${i}`, s.txHash);
      if (usePreprod) await sleep(3000);
    }

    console.log("\nAll 1 + 3 + 3 transactions returned tx hashes OK.");
  } finally {
    child?.kill("SIGTERM");
    await child?.status;
  }
}

await main();
