# Change-Tracking & Drift Detection (Design)

Purpose: ensure workflow changes are detected, reviewed, and recorded; never auto-apply without human confirmation.

Components:

- `meta.json` (skill baseline) — stores `mapperChecksum` and `version` when a baseline is accepted.
- `scripts/validate_implementation.js` — validator that:
  - runs canonical fixtures from `examples/fixtures.json` through the live implementation (`calculateOvertime`),
  - computes sha256 checksum of `src/mappers/vuotgio_v2/summary.mapper.js`,
  - produces a detailed report in `reports/` and (with `--propose`) a `references/proposed_update.md`.

Workflow for changes:

1. Developer or CI runs `node scripts/validate_implementation.js` after code changes.
2. If checksum differs from `meta.json.mapperChecksum` or fixture outputs change, validator reports diffs and writes a proposed update (non-destructive).
3. Human reviewer examines diffs and the `protected-rules.md` list to decide if behavior change is intentional.
4. If accepted, reviewer updates `skills/overtime-workflow/meta.json` with the new `mapperChecksum` and `version` and records reasoning in `references/proposed_update.md` (or a separate changelog).
5. If rejected, rollback or patch the implementation and re-run the validator.

Guidelines:
- NEVER auto-update `meta.json` from CI without explicit human approval.
- Keep `examples/fixtures.json` coverage up-to-date with tests that reflect real data patterns.
- Use the validator as part of the PR checklist for any change touching `vuotgio_v2` code.

Suggested `meta.json` format:

{
  "version": "1.0",
  "mapperChecksum": "<sha256>",
  "createdBy": "<name>",
  "createdAt": "<iso-timestamp>",
  "note": "Baseline for overtime formulas"
}
