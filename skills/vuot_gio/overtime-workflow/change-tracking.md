# Change-Tracking & Drift Detection (Design)

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**.

Purpose: detect undocumented changes to Vượt Giờ behavior without auto-accepting them.

## Current implementation caveat

`scripts/validate_implementation.js` requires `summary.mapper.calculateOvertime`, but the current mapper does not export that helper. It therefore fails before comparing fixtures. The production implementation is exposed through `OvertimePolicyFactory`, `PolicyV1.calculate()`, and `PolicyV2.calculate()`.

## Recommended drift workflow

1. Run policy-level unit tests for all V1/V2 boundary cases.
2. Run integration tests for the LNQC/HDTQ/KTHP approval predicates and the NCKH default `OFFICIAL` scope.
3. Run snapshot/lock tests: successful lock writes the SDO JSON and locked export/statistics reject live-base reads.
4. Compute a checksum of the policy and mapper files for review metadata.
5. Compare fixture output against the current policy modules, not the non-exported helper.
6. Require a human review for any formula, year-list, approval, or snapshot change.

A future `meta.json` may store policy checksums and version information, but it should not be auto-updated by CI.
