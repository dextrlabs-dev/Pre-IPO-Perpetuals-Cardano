# Project Close-out Report

## Name of Project and Project URL

**Pre-IPO Perpetuals: Trade Private Companies on Cardano**

Project URL: [https://projectcatalyst.io/funds/14/cardano-use-cases-concepts/pre-ipo-perpetuals-trade-private-companies-on-cardano](https://projectcatalyst.io/funds/14/cardano-use-cases-concepts/pre-ipo-perpetuals-trade-private-companies-on-cardano)

## Project Number

Project ID: **1400099**

## Name of Project Manager

Dinesh Kumar

## Date Project Started

October 21, 2025

## Date Project Completed

May 14, 2026

---

## Challenge KPIs and How the Project Addressed Them

The project delivered a Cardano-native marketplace for synthetic valuation-index exposure to Anthropic, OpenAI, and SpaceX, backed by an Aiken Plutus V3 validator and an off-chain Lucid Evolution service. All sources, the compiled blueprint (`plutus.json`), documentation, and Preprod evidence are committed to the public repository: [github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano).

### Open-Source Infrastructure Delivery

A fully open-source Pre-IPO Perpetuals MVP was delivered, integrating:

- A single Aiken Plutus V3 spend validator (`preipo`) covering oracle updates, mint, redeem, and constant-product swaps
- A Deno HTTP API over Lucid Evolution exposing every redeemer path with an OpenAPI / Swagger contract
- An in-process oracle worker that maps an external reference feed onto bounded on-chain price updates
- A Vite + React trader dashboard with charts, USDCx-denominated faucet view, and embedded Preprod trade history
- A reproducible Preprod end-to-end batch script that produces a versioned CSV evidence file

### Cardano-Native DeFi Surface

The MVP demonstrates how a single Aiken validator can host multiple independent markets (one UTxO per market) with strict transition rules: preserved native value, monotonic `seq`, bounded oracle moves via `max_variance_bps = 2000`, TWAV blending (`9 / 10`), and pool deviation guards. No external chain, bridge, or off-chain settlement layer is required for the on-chain economic state.

### End-to-End Validation on Cardano Preprod

Validated workflows executed against Cardano Preprod include per-market lock (open market with seeded reserves), oracle updates (`+1%` bump with `max_variance_bps` enforcement), mint against TWAV-priced collateral, constant-product swap with pool-deviation check vs TWAV, and redeem (burn) returning collateral on the same TWAV basis. The full `lock → oracle → mint → swap → redeem` cycle executed across three markets (Anthropic, OpenAI, SpaceX) for a total of 15 Preprod transactions, all recorded in [`docs/preprod-run-2026-03-23T10-48-17-980Z.csv`](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/preprod-run-2026-03-23T10-48-17-980Z.csv) with explorer links surfaced in the UI.

---

## Project KPIs and How the Project Addressed Them

### Technical Architecture and Project Initiation

Complete Technical Architecture and Project Initiation documents were produced covering system architecture, core components, technology stack, data flows, project scope, objectives, assumptions, constraints, and the phased delivery strategy. Both are published as versioned PDFs in the public repository.

### MVP Development

Comprehensive MVP technical documentation was produced and the MVP itself shipped: system architecture with module-level breakdown, integration workflows and API specifications (including a normative `openapi.json`), reproducible environment setup for emulator and Preprod, a testing strategy covering validator checks (`aiken check`), an end-to-end Preprod batch, frontend integration, a demo video of the working MVP, and a public GitHub repository with progressive commit history and a tagged MVP state.

### Testing, Launch, and Close-Off

The final phase delivered the complete tested and launched state of the platform, captured by this report and its companion documents:

- Final Technical Documentation: [`docs/FINAL-TECHNICAL-DOCUMENTATION.md`](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/FINAL-TECHNICAL-DOCUMENTATION.md), covering testing outcomes, launch procedures, operational guidelines, with the 15-row Preprod evidence table inlined.
- Post-Launch Operations: [`docs/POST-LAUNCH-OPERATIONS.md`](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/POST-LAUNCH-OPERATIONS.md), covering monitoring signals, maintenance cadence, incident-response playbooks, and governance.
- Close-Out Report (this document).
- Versioned PDF exports of all three documents committed under `docs/`, with release tag [`final-v1.0`](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/releases/tag/final-v1.0).

---

## Key Achievements

- Delivered one of the first end-to-end Cardano-native marketplaces for synthetic valuation-index exposure to private companies, with all economic state encoded in inline datums and all transitions guarded by a single Aiken validator.
- Demonstrated three independent markets (Anthropic, OpenAI, SpaceX) running concurrently on the same validator address with full economic separation per UTxO and a shared oracle worker.
- Submitted and confirmed 15 of 15 Preprod transactions across the full redeemer surface (`Oracle`, `Mint`, `Redeem`, `Swap`) for all three markets, with on-chain evidence preserved in a committed CSV.
- Established a complete operational profile (launch procedures, SLOs, incident response, governance) documented for any future deployment phase.
- Released the full stack (Aiken validator, Deno API, React UI, CLI runners, evidence pipeline) under the repository's open-source posture.

---

## Impact

All three funded outputs were completed and approved, with a functional MVP deployment exercised on Cardano Preprod and public, link-verifiable transaction evidence. The release includes a reference Aiken Plutus V3 validator demonstrating composable single-validator multi-market design, a Lucid Evolution-based transaction service reusable by other Cardano DeFi builders, and a documentation set covering architecture, MVP, launch, operations, and close-off, all in shareable version-tagged form.

The project contributes to recurring challenges in Cardano DeFi development: a reproducible pattern for valuation-index markets that do not require fiat rails or off-chain custody; a single-validator pattern for multiple independent markets that keeps on-chain rules auditable in one place; and a clear separation between datum-authoritative on-chain economics and off-chain display plumbing (USDCx faucet ledger), useful for projects that want to surface USD-style numbers without minting a stablecoin.

---

## Why is this Project Important?

This project demonstrates that Cardano can host complex, multi-market economic systems under a single Aiken validator with strict bounded-move oracle updates, constant-product swaps, and collateral accounting, all without secondary chains, bridges, or off-chain settlement layers.

As Cardano DeFi continues to grow, there is increasing demand for composable single-validator designs that keep economic rules auditable; patterns for routing external reference data into bounded on-chain updates; reference implementations that combine Aiken, Lucid Evolution, and modern frontend tooling end-to-end; and open documentation that lowers onboarding friction for new builders.

The Pre-IPO Perpetuals marketplace addresses these through its single-validator multi-market design, its TWAV + variance-bounded oracle, and its full open-source release including documentation, CLI, and a Preprod evidence pipeline. The outcomes establish a strong foundation for future synthetic-asset platforms, oracle-driven derivatives, and Cardano-native trading infrastructure.

---

## Lessons Learned and Next Steps

**Lessons learned.** Single-validator multi-market is a strong pattern: every market is a separate UTxO at the same address, the validator stays small, and operational concerns scale linearly. Datum-authoritative accounting lets USD-style display numbers (the USDCx faucet) live entirely off-chain without ever compromising on-chain correctness. Bounded oracle updates with TWAV blending absorbed feed jitter without rejecting legitimate moves in the Preprod batch. Versioning evidence inside the repository keeps the trader UI honest: any divergence between Trade history and Cardanoscan is immediately visible. Operational separation matters: keeping operator seed, faucet ledger, and on-chain validator state in clearly different trust zones simplified the incident-response playbooks.

**Next steps (out of current scope, documented in Post-Launch Operations §4.3).** Multi-trader markets via script-credential `PerpDatum.trader`; distributed oracle keyset (multisig redeemer check); native USDCx asset to retire the off-chain faucet ledger; governance-controlled reference datum for validator parameters.

---

## Links to Other Relevant Project Sources or Documents

| Resource | Link |
|----------|------|
| Project Repository | [github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano) |
| MVP Technical Documentation | [docs/MVP-TECHNICAL-DOCUMENTATION.md](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/MVP-TECHNICAL-DOCUMENTATION.md) |
| Final Technical Documentation | [docs/FINAL-TECHNICAL-DOCUMENTATION.md](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/FINAL-TECHNICAL-DOCUMENTATION.md) |
| Post-Launch Operations | [docs/POST-LAUNCH-OPERATIONS.md](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/POST-LAUNCH-OPERATIONS.md) |
| Preprod Evidence CSV | [docs/preprod-run-2026-03-23T10-48-17-980Z.csv](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/preprod-run-2026-03-23T10-48-17-980Z.csv) |
| Validator Source | [validators/preipo.ak](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/validators/preipo.ak) |
| Plutus Blueprint | [plutus.json](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/plutus.json) |
| API Specification | [offchain-platform-backend/openapi.json](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/offchain-platform-backend/openapi.json) |
| Release Tag | [final-v1.0](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/releases/tag/final-v1.0) |

## Project Close-out Video

[https://youtu.be/DrKNIKBUV9c](https://youtu.be/DrKNIKBUV9c)
