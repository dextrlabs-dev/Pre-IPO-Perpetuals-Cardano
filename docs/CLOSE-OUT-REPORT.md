# Project Close-out Report

## Name of Project and Project URL

**Pre-IPO Perpetuals on Cardano — Trade Private Company Valuations**

Project URL: `[Project URL — fill from Catalyst dashboard]`

## Project Number

Project ID: `[Project ID — fill from Catalyst dashboard]`

## Name of Project Manager

`[Project Manager — Dextr Labs]`

## Date Project Started

October 21, 2025

## Date Project Completed

May 14, 2026

---

## List of Challenge KPIs and How the Project Addressed Them

The project focused on building a privacy-respecting, Cardano-native marketplace for **synthetic valuation-index exposure** to high-profile private companies (Anthropic, OpenAI, SpaceX), backed by an Aiken Plutus V3 validator and an off-chain transaction service.

### Open-Source Infrastructure Delivery

A fully open-source Pre-IPO Perpetuals MVP was delivered, integrating:

- A single Aiken Plutus V3 spend validator (`preipo`) covering oracle updates, mint, redeem, and constant-product swaps
- A Deno HTTP API over Lucid Evolution exposing every redeemer path with an OpenAPI / Swagger contract
- An in-process oracle worker that maps an external reference feed onto bounded on-chain price updates
- A Vite + React trader dashboard with charts, a USDCx-denominated faucet view, and an embedded Preprod trade history
- A reproducible Preprod end-to-end batch script that produces a versioned CSV evidence file

All sources, the compiled blueprint (`plutus.json`), documentation, and Preprod evidence are committed to the public repository.

### Cardano-Native DeFi Surface

The MVP demonstrates how a single Aiken validator can host **multiple independent markets** (one UTxO per market) with strict transition rules — preserved native value, monotonic `seq`, bounded oracle moves via `max_variance_bps`, TWAV blending (`9 / 10`), and pool deviation guards — using only Cardano-native primitives. No external chain, bridge, or off-chain settlement layer is required for the on-chain economic state.

### End-to-End Validation on Cardano Preprod

Validated workflows executed against Cardano Preprod include:

- Per-market lock (open market with seeded reserves)
- Oracle updates (`+1%` bump with `max_variance_bps` enforcement)
- Mint against TWAV-priced collateral
- Constant-product swap with pool-deviation check vs TWAV
- Redeem (burn) returning collateral on the same TWAV basis

The full **lock → oracle → mint → swap → redeem** cycle executed across three markets (Anthropic, OpenAI, SpaceX) for a total of **15 Preprod transactions**, all of which landed on-chain successfully and are recorded in `docs/preprod-run-2026-03-23T10-48-17-980Z.csv` with explorer links surfaced in the UI.

---

## List of Project KPIs and How the Project Addressed Them

### Milestone 1 — Technical Architecture & Initiation

A complete Technical Architecture Document and Project Initiation Document were produced covering:

- System architecture, core components, technology stack, and data flows
- Project scope, objectives, assumptions, constraints, and high-level roadmap
- High-level functional overview for technical + non-technical stakeholders
- Development approach and phased delivery strategy

Both documents are published as versioned PDFs in the public repository.

### Milestone 2 — MVP Development

A comprehensive MVP technical documentation set was produced and the MVP itself shipped:

- System architecture with module-level breakdown
- Integration workflows + API specifications, including a normative `openapi.json`
- Reproducible environment setup for emulator, Preprod, and (architecturally) mainnet
- A testing strategy covering validator checks (`aiken check`), end-to-end Preprod batch, and frontend integration
- Demo video showing the working MVP end-to-end
- Public GitHub repository with progressive commit history and a tagged MVP state

### Milestone 3 — Testing, Launch & Close-Off

The final milestone delivered the complete tested + launched state of the platform, captured by this report and its companion documents:

- Final Technical Documentation: [`docs/FINAL-TECHNICAL-DOCUMENTATION.md`](./FINAL-TECHNICAL-DOCUMENTATION.md) — testing outcomes, launch procedures, operational guidelines, with the 15-row Preprod evidence table inlined.
- Post-Launch Operations: [`docs/POST-LAUNCH-OPERATIONS.md`](./POST-LAUNCH-OPERATIONS.md) — monitoring signals, maintenance cadence, incident-response playbooks, governance.
- Close-Out Report: this document.
- Versioned PDF exports of all three documents committed under `docs/`.

---

## Key Achievements

- Delivered one of the first end-to-end Cardano-native marketplaces for **synthetic valuation-index exposure to private companies**, with all economic state encoded in inline datums and all transitions guarded by a single Aiken validator.
- Demonstrated three independent markets (Anthropic, OpenAI, SpaceX) running concurrently on the same validator address with full economic separation per UTxO and a shared oracle worker.
- Submitted and confirmed **15 / 15 Preprod transactions** across the full redeemer surface — `Oracle`, `Mint`, `Redeem`, and `Swap` — for all three markets, with on-chain evidence preserved in a committed CSV.
- Established a complete operational profile (launch procedures, SLOs, incident response, governance) documented for any future deployment phase.
- Released the full stack (Aiken validator, Deno API, React UI, CLI runners, evidence pipeline) under the repository's MIT-aligned open-source posture.

---

## Impact

The project generated measurable technical and ecosystem impact through:

- Successful completion of all three funded milestones
- Functional MVP deployment exercised on Cardano Preprod with public, link-verifiable transaction evidence
- Public release of an Aiken Plutus V3 validator demonstrating composable single-validator multi-market design
- Public release of a Lucid Evolution-based transaction service that can be re-used as a reference for other Cardano DeFi builders
- Documentation covering architecture, MVP, launch, operations, and close-off — all in shareable, version-tagged form

The project contributes to solving recurring challenges in Cardano DeFi development:

- A reproducible pattern for **valuation-index markets** that do not require fiat rails or off-chain custody
- A single-validator pattern for **multiple independent markets** that keeps on-chain rules auditable in one place
- A clear separation between **datum-authoritative on-chain economics** and **off-chain display plumbing** (USDCx faucet ledger), useful for projects that want to surface USD-style numbers without minting a stablecoin

---

## Why is this Project Important?

This project demonstrates that Cardano can host **complex, multi-market economic systems** under a single Aiken validator with strict bounded-move oracle updates, constant-product swaps, and collateral accounting — all without requiring secondary chains, bridges, or off-chain settlement layers.

As Cardano DeFi continues to grow, there is increasing demand for:

- Composable single-validator designs that keep economic rules auditable
- Patterns for routing external reference data into bounded on-chain updates
- Reference implementations that combine Aiken, Lucid Evolution, and modern frontend tooling end-to-end
- Open documentation that lowers onboarding friction for new builders

The Pre-IPO Perpetuals marketplace addresses these through its single-validator multi-market design, its TWAV + variance-bounded oracle, and its full open-source release including documentation, CLI, and a Preprod evidence pipeline.

The outcomes establish a strong foundation for future synthetic-asset platforms, oracle-driven derivatives, and Cardano-native trading infrastructure.

---

## Links to Other Relevant Project Sources or Documents

| Resource | Link |
|----------|------|
| Project Repository | [github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano) |
| Project Catalyst Milestones | `[Catalyst milestones URL — fill from dashboard]` |
| Initial Technical Architecture Document | [Technical_Documentation_Pre-IPO_Marketplace_-_Trade_Private_Company_Valuations_on_Cardano.pdf](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/Technical_Documentation_Pre-IPO_Marketplace_-_Trade_Private_Company_Valuations_on_Cardano.pdf) |
| Project Initiation Document | [Initiation_Document_Pre-IPO_Marketplace_-_Trade_Private_Company_Valuations_on_Cardano.pdf](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/Initiation_Document_Pre-IPO_Marketplace_-_Trade_Private_Company_Valuations_on_Cardano.pdf) |
| MVP Technical Documentation | [docs/MVP-TECHNICAL-DOCUMENTATION.md](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/MVP-TECHNICAL-DOCUMENTATION.md) |
| Final Technical Documentation | [docs/FINAL-TECHNICAL-DOCUMENTATION.md](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/FINAL-TECHNICAL-DOCUMENTATION.md) |
| Post-Launch Operations | [docs/POST-LAUNCH-OPERATIONS.md](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/POST-LAUNCH-OPERATIONS.md) |
| Preprod Evidence CSV | [docs/preprod-run-2026-03-23T10-48-17-980Z.csv](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/preprod-run-2026-03-23T10-48-17-980Z.csv) |
| Validator Source | [validators/preipo.ak](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/validators/preipo.ak) |
| Plutus Blueprint | [plutus.json](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/plutus.json) |
| API Specification | [offchain-platform-backend/openapi.json](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/offchain-platform-backend/openapi.json) |

## Project Close-out Video

`[Close-out video URL — to be added once recorded]`

---

## Lessons Learned

- **Single-validator multi-market** is a strong pattern: every market is a separate UTxO at the same address, the validator stays small, and operational concerns scale linearly.
- **Datum-authoritative accounting** lets USD-style display numbers (the USDCx faucet) live entirely off-chain without ever compromising on-chain correctness. The validator only enforces `in_value == out_value`, so the faucet is a UX layer, not a trust layer.
- **Bounded oracle updates with TWAV blending** absorbed feed jitter without rejecting legitimate moves in our Preprod batch — the `9/10` blend and `max_variance_bps = 2000` parameters held up across all three markets.
- **Versioning evidence inside the repository** (CSV + embedded `PREPROD_LEDGER_CSV`) keeps the trader UI honest: any divergence between Trade history and Cardanoscan is immediately visible.
- **Operational separation matters**: keeping operator seed, faucet ledger, and on-chain validator state in clearly different trust zones simplified the incident-response playbooks documented in [`POST-LAUNCH-OPERATIONS.md`](./POST-LAUNCH-OPERATIONS.md).

## Next Steps

The architecture supports several natural extensions that are explicitly **out of the current funded scope** but documented in [`POST-LAUNCH-OPERATIONS.md`](./POST-LAUNCH-OPERATIONS.md) §4.3:

- Multi-trader markets via script-credential `PerpDatum.trader`
- Distributed oracle keyset (multisig redeemer check)
- Native USDCx asset to retire the off-chain faucet ledger
- Governance-controlled reference datum for validator parameters

---

## Document control

| Item | Value |
|---|---|
| Version | `final-v1.0` |
| Companion documents | [`MVP-TECHNICAL-DOCUMENTATION.md`](./MVP-TECHNICAL-DOCUMENTATION.md), [`FINAL-TECHNICAL-DOCUMENTATION.md`](./FINAL-TECHNICAL-DOCUMENTATION.md), [`POST-LAUNCH-OPERATIONS.md`](./POST-LAUNCH-OPERATIONS.md) |
| Render | `deno run -A docs/render-pdf.ts` (point `mdPath` at this file for the PDF export) |
