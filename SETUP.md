# Setup Guide

This guide gets the full stack running locally (backend + frontend), in **emulator** or **Preprod** mode, and points to **USDCx faucet** and **Preprod reporting** workflows.

## 1) Prerequisites

Install these tools first:

- `git`
- `deno` (for backend and CLI scripts)
- `node` + `npm` (for frontend)
- `aiken` (for validator build/check)

Optional, only for rendering docs PDF with Mermaid:

- Chrome managed by Puppeteer:

```bash
npx puppeteer browsers install chrome
```

## 2) Clone and install dependencies

```bash
git clone https://github.com/SamJeffrey8/pre-ipo-perps.git
cd pre-ipo-perps
cd preipo-frontend && npm install
```

No extra install step is required for the Deno backend.

## 3) Run in emulator mode (recommended for local dev)

Open two terminals from the repo root.

**Terminal A (backend):**

```bash
cd offchain-platform-backend
deno task serve:emulator
```

**Terminal B (frontend):**

```bash
cd preipo-frontend
npm run dev:emulator
```

Open:

- Frontend: [http://127.0.0.1:5173](http://127.0.0.1:5173)
- Backend health: [http://127.0.0.1:8787/health](http://127.0.0.1:8787/health)
- Backend docs: [http://127.0.0.1:8787/docs](http://127.0.0.1:8787/docs)

### USDCx faucet (demo wallet)

The UI and API treat **USDCx** as a session-side ledger (μ-units, scale `1e6`). Credit the operator wallet used by the backend:

```http
POST /api/v1/faucet/usdcx
Content-Type: application/json

{}
```

Default body credits **1000 USDCx** (configurable via `amountUnits` or `amountUsdcx` in JSON). Inspect balance with `GET /api/v1/account`.

**Mint** debits USDCx from this ledger (against `twav_price`); **redeem** credits it back — see `offchain-platform-backend/src/app.ts` and `usdcx-faucet.ts`.

Optional: `PREIPO_USDCX_FAUCET_PATH` overrides the JSON file backing the ledger (default under `/tmp/`).

## 4) Run in Preprod mode

Preprod requires a funded wallet and Blockfrost (see `cli/cardano-env.ts`: `PREIPO_USE_PREPROD=1`, `PREIPO_WALLET_SEED`, `BLOCKFROST_PROJECT_ID`, etc.). **Do not commit secrets.**

**Terminal A (backend):**

```bash
cd offchain-platform-backend
deno task serve:preprod
```

**Terminal B (frontend):**

```bash
cd preipo-frontend
npm run dev:preprod
```

## 5) Build and checks

From repo root:

```bash
aiken build
aiken check
```

Backend integration script:

```bash
cd offchain-platform-backend
deno task test
```

**Preprod CSV report** (three markets, lock → oracle → mint → swap → redeem):

```bash
# from repo root
PREIPO_USE_PREPROD=1 deno run -A cli/preprod-three-markets-report.ts
```

Writes `docs/preprod-run-<timestamp>.csv` and prints TSV-style rows. To refresh the **Trade history** section in the UI, paste the CSV into `preipo-frontend/src/data/preprodLedger.ts` as `PREPROD_LEDGER_CSV` (or keep that file as the single source after each run).

Frontend production build:

```bash
cd preipo-frontend
npm run build
```

## 6) Environment notes

- Frontend dev uses Vite proxy to forward `/api` to the backend (`http://127.0.0.1:8787` by default).
- In `preipo-frontend/.env.development`, keep `VITE_DEV_BACKEND` commented unless you intentionally need direct browser-to-backend routing.
- Default backend port is `8787`; override with `PORT`.

Useful backend toggles:

- `PREIPO_USE_EMULATOR=1` or `PREIPO_USE_PREPROD=1`
- `PREIPO_ORACLE_WORKER=0` to disable oracle worker
- `HL_ORACLE_INTERVAL` to change candle interval
- `ORACLE_POLL_MS` to change oracle polling period
- `PREIPO_USDCX_FAUCET_PATH` for faucet JSON location

## 7) Generate MVP documentation PDF (optional)

From repo root:

```bash
deno run -A docs/render-pdf.ts
```

Output file:

- `docs/MVP-TECHNICAL-DOCUMENTATION.pdf`

## 8) Troubleshooting

- `EADDRINUSE` on backend: stop the process using port `8787` or change `PORT`.
- Frontend cannot reach API: confirm backend is running and open `http://127.0.0.1:8787/health`.
- Empty chart/reference data: retry after a short delay; upstream reference feed can rate-limit bursts.
- In WSL + Windows browser setups, prefer same-origin frontend calls through Vite proxy (default behavior).
- Mint/swap fails with insufficient USDCx: `POST /api/v1/faucet/usdcx` first.
