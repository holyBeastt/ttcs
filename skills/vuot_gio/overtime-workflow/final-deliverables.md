# Final Deliverables — Overtime Workflow Skill

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**.

This skill lives at `skills/vuot_gio/overtime-workflow/` and currently contains:

- `SKILL.md` — scope and source-of-truth rules.
- `workflow.md` — projected/official/snapshot workflow.
- `architecture.md` — route/service/repository/mapper map.
- `formulas.md` — Policy V1/V2 formulas, defaults, and payment rate.
- `protected-rules.md` — protected approval, quota, snapshot, and identity rules.
- `edge-cases.md` — edge cases and regression scenarios.
- `change-tracking.md` — drift-detection design and validator caveat.
- `references/REFERENCE.md` — index.
- `examples/fixtures.json`, `reports/` — historical fixtures/reports; they are not authoritative over current source.

## Current caveat

`scripts/validate_implementation.js` expects `summary.mapper.calculateOvertime`, but that function is not exported by the current mapper. The validator must be updated to exercise `PolicyV1`/`PolicyV2` before it can serve as a reliable CI check.

## Recommended maintenance

1. Keep the explicit V2 year list synchronized with `OvertimePolicyFactory.js`.
2. Add policy-level tests for V1/V2 and approval-gate integration tests.
3. Repair the validator or replace it with tests against the exported policy modules.
4. Mark any historical analysis/report as historical rather than using it as runtime documentation.
