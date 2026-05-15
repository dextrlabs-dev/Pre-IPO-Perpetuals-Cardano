# Project Close-out Report

## Name of Project and Project URL

**Pre-IPO Perpetuals — Trade Private Companies on Cardano**

Project URL: [https://projectcatalyst.io/funds/14/cardano-use-cases-concepts/pre-ipo-perpetuals-trade-private-companies-on-cardano](https://projectcatalyst.io/funds/14/cardano-use-cases-concepts/pre-ipo-perpetuals-trade-private-companies-on-cardano)

## Project Number

Project ID: **1400062**

## Name of Project Manager

Dinesh Kumar

## Date Project Started

October 21, 2025

## Date Project Completed

May 14, 2026

---

## Challenge KPIs and How the Project Addressed Them

The project delivered a Cardano-native marketplace for **synthetic valuation-index exposure** to Anthropic, OpenAI, and SpaceX, backed by an Aiken Plutus V3 validator and an off-chain Lucid Evolution service. All sources, the compiled blueprint (`plutus.json`), documentation, and Preprod evidence are committed to the public repository: [github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano).

**Open-source infrastructure** — single Aiken validator (`preipo`) covering `Oracle`, `Mint`, `Redeem`, and `Swap` redeemers; Deno HTTP API with OpenAPI / Swagger; in-process oracle worker; Vite + React trader UI; reproducible Preprod evidence pipeline.

**Cardano-native DeFi surface** — one UTxO per market at a shared validator address, with strict transition rules (preserved native value, monotonic `seq`, bounded oracle moves via `max_variance_bps = 2000`, TWAV blending `9/10`, pool deviation guard).

**End-to-end Preprod validation** — full `lock → oracle → mint → swap → redeem` cycle executed across three markets, with all 15 transactions landing on-chain successfully.

---

## Project KPIs and How the Project Addressed Them

| Milestone | Deliverables | Status |
|---|---|---|
| **M1** Technical Architecture & Initiation | Technical Architecture PDF + Project Initiation PDF | Delivered (Dec 2025) |
| **M2** MVP Development | MVP technical documentation, OpenAPI spec, Aiken validator, off-chain service, frontend, demo video | Delivered (Jan 2026) |
| **M3** Testing, Launch & Close-Off | Final Technical Documentation, Post-Launch Operations, Close-Out Report (this doc), tagged `final-v1.0` | Delivered (May 2026) |

---

## Key Achievements

- One of the first end-to-end Cardano-native marketplaces for **synthetic valuation-index exposure to private companies**, with all economic state encoded in inline datums and all transitions guarded by a single Aiken validator.
- **15 / 15 Preprod transactions** submitted and confirmed across all three markets and all four redeemer paths — full evidence in [`docs/preprod-run-2026-03-23T10-48-17-980Z.csv`](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/preprod-run-2026-03-23T10-48-17-980Z.csv).
- Three independent markets (Anthropic, OpenAI, SpaceX) running concurrently on the same validator address with full economic separation per UTxO.
- Complete operational profile documented: launch procedures, SLOs, incident-response playbooks, governance — in [`docs/POST-LAUNCH-OPERATIONS.md`](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/POST-LAUNCH-OPERATIONS.md).
- Public release of the full stack (Aiken validator, Deno API, React UI, CLI runners, evidence pipeline) under the repository's open-source posture.

---

## Impact

- All three funded milestones completed and approved.
- Functional MVP deployment exercised on Cardano Preprod with public, link-verifiable transaction evidence.
- Reference Aiken Plutus V3 validator demonstrating composable **single-validator multi-market** design.
- Lucid Evolution-based transaction service reusable by other Cardano DeFi builders.
- Documentation set covering architecture, MVP, launch, operations, and close-off — all version-tagged.

---

## Why is this Project Important?

This project demonstrates that Cardano can host **complex, multi-market economic systems** under a single Aiken validator with bounded-move oracle updates, constant-product swaps, and collateral accounting — without secondary chains, bridges, or off-chain settlement layers. As Cardano DeFi grows, there is increasing demand for composable single-validator designs, patterns for routing external reference data into bounded on-chain updates, and open reference implementations that combine Aiken, Lucid Evolution, and modern frontend tooling end-to-end. The Pre-IPO Perpetuals marketplace addresses these through its single-validator multi-market design, its TWAV + variance-bounded oracle, and its full open-source release including documentation, CLI, and a Preprod evidence pipeline.

---

## Lessons Learned & Next Steps

**Lessons learned** — single-validator multi-market is a strong pattern (small validator, linear operational scale); datum-authoritative accounting lets USD-style display numbers live entirely off-chain without compromising on-chain correctness; bounded oracle + TWAV absorbed feed jitter across all three markets in the Preprod batch; versioning evidence inside the repository keeps the trader UI honest.

**Next steps (out of current scope, documented in Post-Launch Operations §4.3)** — multi-trader markets via script-credential `PerpDatum.trader`; distributed oracle keyset (multisig redeemer); native USDCx asset to retire the off-chain faucet ledger; governance-controlled reference datum for validator parameters.

---

## Links to Other Relevant Project Sources or Documents

| Resource | Link |
|----------|------|
| Project Repository | [github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano) |
| Technical Architecture (M1) | [Technical_Documentation_Pre-IPO_Marketplace.pdf](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/Technical_Documentation_Pre-IPO_Marketplace_-_Trade_Private_Company_Valuations_on_Cardano.pdf) |
| Project Initiation (M1) | [Initiation_Document_Pre-IPO_Marketplace.pdf](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/Initiation_Document_Pre-IPO_Marketplace_-_Trade_Private_Company_Valuations_on_Cardano.pdf) |
| MVP Technical Documentation (M2) | [docs/MVP-TECHNICAL-DOCUMENTATION.md](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/MVP-TECHNICAL-DOCUMENTATION.md) |
| Final Technical Documentation (M3) | [docs/FINAL-TECHNICAL-DOCUMENTATION.md](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/FINAL-TECHNICAL-DOCUMENTATION.md) |
| Post-Launch Operations (M3) | [docs/POST-LAUNCH-OPERATIONS.md](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/POST-LAUNCH-OPERATIONS.md) |
| Preprod Evidence CSV | [docs/preprod-run-2026-03-23T10-48-17-980Z.csv](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/docs/preprod-run-2026-03-23T10-48-17-980Z.csv) |
| Validator Source | [validators/preipo.ak](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/blob/main/validators/preipo.ak) |
| Release Tag | [final-v1.0](https://github.com/dextrlabs-dev/Pre-IPO-Perpetuals-Cardano/releases/tag/final-v1.0) |

## Project Close-out Video

`[Close-out video URL — to be added once recorded]`
