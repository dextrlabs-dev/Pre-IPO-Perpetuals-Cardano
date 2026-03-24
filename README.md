# pre-ipo-perps

Synthetic **valuation-index** markets (Anthropic, OpenAI, SpaceX) on **Cardano**: one **Aiken** spend validator (`preipo`), a **Deno** API over **Lucid Evolution** (`cli/preipo-evo-core.ts`), and a **Vite + React** trader UI.

**Denominations:** On-chain `current_price`, `twav_price`, `collateral_locked`, and pool `reserve_*` use a fixed **μ-scale** (`1e6`). The product surfaces this as **USDCx** (treated as USD-pegged for display). Wallet **USDCx** for demos is tracked in a **server-side faucet ledger** (`/api/v1/faucet/usdcx`), while the script UTxO carries **lovelace**; mint/redeem paths preserve **native value** at the validator output and update **datum** collateral accounting (see `validators/preipo.ak`).

## Quick start

Full stack (emulator + frontend):

```bash
cd offchain-platform-backend && deno task serve:emulator
# other terminal:
cd preipo-frontend && npm install && npm run dev:emulator
```

See **[SETUP.md](./SETUP.md)** for Preprod, PDF docs, troubleshooting, and environment variables.

## Documentation

| Doc | Purpose |
|-----|---------|
| **[docs/MVP-TECHNICAL-DOCUMENTATION.md](./docs/MVP-TECHNICAL-DOCUMENTATION.md)** | Architecture, API summary, USDCx/faucet model, testing, Preprod CSV evidence |
| **[docs/MVP-TECHNICAL-DOCUMENTATION.pdf](./docs/MVP-TECHNICAL-DOCUMENTATION.pdf)** | PDF export (run `deno run -A docs/render-pdf.ts` from repo root) |
| **`offchain-platform-backend/openapi.json`** | Machine-readable API (also at `/openapi.json` live) |

## Validator (Aiken)

```bash
aiken build
aiken check
```

Outputs **`plutus.json`** consumed by the CLI and backend.

## Preprod evidence CSV

Regenerate on-chain batch report (lock → oracle → mint → swap → redeem per market):

```bash
PREIPO_USE_PREPROD=1 deno run -A cli/preprod-three-markets-report.ts
```

Copy the resulting CSV into **`preipo-frontend/src/data/preprodLedger.ts`** (`PREPROD_LEDGER_CSV`) so **Trade history** in the UI stays in sync, or keep the generated file under `docs/preprod-run-*.csv` for your records.

## Repository layout

| Path | Role |
|------|------|
| `validators/preipo.ak` | Oracle, mint, redeem, swap redeemers |
| `cli/preipo-evo-core.ts` | Tx builder (lock / oracle / mint / redeem / swap) |
| `cli/cardano-env.ts` | Emulator / Preprod / Blockfrost env |
| `cli/preprod-three-markets-report.ts` | Preprod multi-market CSV export |
| `offchain-platform-backend/` | Hono API, oracle worker, USDCx faucet |
| `preipo-frontend/` | Trader dashboard, charts, Preprod trade history |

## Resources

- [Aiken language](https://aiken-lang.org)
- [Lucid Evolution](https://anastasia-labs.github.io/lucid-evolution/)
