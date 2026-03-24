import { createApp } from "./app.ts";
import { ensureVentualsForEmulator } from "./emulator-bootstrap.ts";
import { startOracleWorker } from "./oracle-worker.ts";
import { initSessionStore } from "./session-store.ts";
import { ensureFaucetWallet } from "./usdcx-faucet.ts";

export async function startServer() {
  await initSessionStore();
  await ensureFaucetWallet();
  await ensureVentualsForEmulator();
  if (Deno.env.get("PREIPO_ORACLE_WORKER") !== "0") {
    startOracleWorker();
  }
  const app = createApp();
  const port = Number(Deno.env.get("PORT") ?? "8787");
  console.log(`pre-ipo backend listening on http://127.0.0.1:${port}`);
  console.log(`OpenAPI UI: http://127.0.0.1:${port}/docs`);
  Deno.serve({ port, hostname: "0.0.0.0" }, app.fetch);
}
