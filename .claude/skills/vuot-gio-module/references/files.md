# Files

## File: skills/vuot_gio/overtime-workflow/architecture.md
````markdown
# Architecture Mapping

Key files and responsibilities (project-specific):

- Aggregation & orchestration:
  - `src/services/vuotgio_v2/tongHop.service.js` — build Atomic/Collection SDOs

- Core formulas and mapping:
  - `src/mappers/vuotgio_v2/summary.mapper.js` — `calculateOvertime`, `toAtomicSDO`, `toCollectionSDO`

- Repositories (data access):
  - `src/repositories/vuotgio_v2/tongHop.repo.js` — aggregation queries for giangday, lnqc, kthp, da, hdtq
  - `src/repositories/vuotgio_v2/kthp.repo.js` — KTHP CRUD and approval updates

- NCKH integration:
  - `src/services/nckh_v3/stats.service.js` — lecturer NCKH totals used by mapper

- Export & reports:
  - `src/services/vuotgio_v2/xuatFile.service.js` — Excel export scaffold
  - `src/services/vuotgio_v2/thongKe.service.js` — grouping and projections

- DB schema:
  - `docs/vuogio_v2/database/vg_so_tiet_tong_hop.sql` — planned snapshot table

Transaction & approval patterns:
- Use transactions in batch inserts (`kthp.service.saveBatch`) and some batch updates, but many per-record updates iterate over records (opportunity to bulk).
- Approval flags: `khoa_duyet`, `khao_thi_duyet` — `khoa_duyet` currently used to gate inclusion.
````

## File: skills/vuot_gio/overtime-workflow/change-tracking.md
````markdown
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
````

## File: skills/vuot_gio/overtime-workflow/edge-cases.md
````markdown
# Edge Cases & Failure-Prone Areas

- Missing `sotietdinhmuc` row → code falls back to `280` silently.
- Partial approvals: records approved in some tables and not others lead to inconsistent totals.
- Negative raw overtime treated as zero (no negative payouts).
- `id_User = 1` is excluded by query logic — special-case user.
- Rounding: code uses `toFixed(2)` in mapper; confirm if this is the canonical rounding approach.
- Deletes (`deleteByYearAndSemester`) are hard deletes; consider soft-delete or pre-checks.
- Batch DB operations performing per-record updates in loops can produce partial commits and performance issues.

Testing suggestions:
- Unit tests for `calculateOvertime` with boundary conditions: exact quota, zero teaching, exact NCKH match, large reductions.
- Integration test that toggles `khoa_duyet` and verifies aggregation inclusion.
````

## File: skills/vuot_gio/overtime-workflow/examples/fixtures.json
````json
[
  {
    "id": "fixture-1",
    "description": "Typical lecturer with some external classes and NCKH partially completed",
    "input": {
      "soTietGiangDay": 300,
      "soTietNgoaiQC": 10,
      "soTietKTHP": 5,
      "soTietDoAn": 8,
      "soTietHDTQ": 2,
      "soTietNCKH": 150,
      "phanTramMienGiam": 10,
      "dinhMucChuan": 280,
      "dinhMucNCKH": 280
    },
    "expected": null
  },
  {
    "id": "fixture-2",
    "description": "Lecturer below quota, no overtime",
    "input": {
      "soTietGiangDay": 200,
      "soTietNgoaiQC": 0,
      "soTietKTHP": 0,
      "soTietDoAn": 0,
      "soTietHDTQ": 0,
      "soTietNCKH": 280,
      "phanTramMienGiam": 0,
      "dinhMucChuan": 280,
      "dinhMucNCKH": 280
    },
    "expected": null
  }
  ,
  {
    "id": "fixture-3",
    "description": "Exact post-discount quota, NCKH satisfied -> no overtime",
    "input": {
      "soTietGiangDay": 252,
      "soTietNgoaiQC": 0,
      "soTietKTHP": 0,
      "soTietDoAn": 0,
      "soTietHDTQ": 0,
      "soTietNCKH": 280,
      "phanTramMienGiam": 10,
      "dinhMucChuan": 280,
      "dinhMucNCKH": 280
    },
    "expected": null
  },
  {
    "id": "fixture-4",
    "description": "Very large actual teaching; paid overtime capped at discounted quota",
    "input": {
      "soTietGiangDay": 600,
      "soTietNgoaiQC": 0,
      "soTietKTHP": 0,
      "soTietDoAn": 0,
      "soTietHDTQ": 0,
      "soTietNCKH": 280,
      "phanTramMienGiam": 0,
      "dinhMucChuan": 280,
      "dinhMucNCKH": 280
    },
    "expected": null
  },
  {
    "id": "fixture-5",
    "description": "Rounding edgecases with decimals in inputs",
    "input": {
      "soTietGiangDay": 280.555,
      "soTietNgoaiQC": 0.333,
      "soTietKTHP": 0.112,
      "soTietDoAn": 0.0,
      "soTietHDTQ": 0,
      "soTietNCKH": 150.789,
      "phanTramMienGiam": 12.345,
      "dinhMucChuan": 280,
      "dinhMucNCKH": 280
    },
    "expected": null
  },
  {
    "id": "fixture-6",
    "description": "Missing dinhMuc fields -> defaults used",
    "input": {
      "soTietGiangDay": 300,
      "soTietNgoaiQC": 0,
      "soTietKTHP": 0,
      "soTietDoAn": 0,
      "soTietHDTQ": 0,
      "soTietNCKH": 0,
      "phanTramMienGiam": 0
    },
    "expected": null
  }
]
````

## File: skills/vuot_gio/overtime-workflow/final-deliverables.md
````markdown
# Final Deliverables — Overtime Workflow Skill

Files created in `skills/overtime-workflow/`:

- `SKILL.md` — skill summary and usage.
- `workflow.md` — concise process flow and inclusion rules.
- `architecture.md` — mapping from functionality to code files and DB tables.
- `formulas.md` — canonical formulas and JS pseudocode.
- `edge-cases.md` — failure-prone areas and test suggestions.
- `protected-rules.md` — authoritative business rules that must be confirmed before change.
- `change-tracking.md` — design for drift detection and baseline management.
- `examples/fixtures.json` — example fixtures used by the validator.
- `scripts/validate_implementation.js` — validator + checksum-based drift detection.
- `references/proposed_update.md` — placeholder for proposed updates (written when validator run with `--propose`).
- `reports/` — validation reports generated by runs of the validator.

Actions performed:

- Scanned and analyzed `vuotgio_v2` code, mappers, repos, services, and docs.
- Extracted canonical formula and implemented validator-based checks.
- Created skill skeleton and final documents listed above.

Next recommended steps:

1. Review `protected-rules.md` and confirm uncertain items with product owners (especially `khao_thi_duyet` usage and rounding policy).
2. If accepted, create `skills/overtime-workflow/meta.json` with the current mapper checksum to establish a baseline.
3. Add `node skills/overtime-workflow/scripts/validate_implementation.js` to CI as a PR check (non-blocking) to notify reviewers of drift.
4. Consider adding unit tests for `calculateOvertime` to `src` test suite using the fixtures here.

If you want, I can create `meta.json` now with the current checksum and commit these skill files to a branch.
````

## File: skills/vuot_gio/overtime-workflow/formulas.md
````markdown
# Canonical Formulas

Notation (per-lecturer, per-year):
- [I] total_actual_teaching = sum(normalized teaching sources)
- [II] standard_quota = configured `dinhMucChuan` (default 280)
- [III] missing_research_hours = max(0, dinhMucNCKH_after_discount - soTietNCKH)
- [IV] reduced_hours = standard_quota * (phanTramMienGiam / 100)
- [V] total_overtime_raw = [I] - [II] - [III] + [IV]
- [V_final] total_overtime = max(0, total_overtime_raw)
- [VI] paid_overtime = min([V_final], [II] - [IV])

JS pseudocode (canonical):

const mienGiam = dinhMucChuan * (phanTramMienGiam / 100);
const dinhMucSauMienGiam = dinhMucChuan - mienGiam;
const mienGiamNCKH = dinhMucNCKH * (phanTramMienGiam / 100);
const dinhMucNCKHSauGiam = dinhMucNCKH - mienGiamNCKH;
const thieuNCKH = Math.max(0, dinhMucNCKHSauGiam - soTietNCKH);
let raw = (total_actual_teaching - thieuNCKH) - dinhMucSauMienGiam;
let V = Math.max(0, raw);
let paid = Math.min(V, dinhMucSauMienGiam);

Rounding: normalize final reported numeric fields to 2 decimal places. Intermediate rounding policy: prefer exact arithmetic until final rounding, unless existing code requires toFixed(2) at intermediate steps (confirm if change desired).

Defaults: if `sotietdinhmuc` missing, default `dinhMucChuan = 280` and `dinhMucNCKH = 280`.

Uncertain items (must verify with product owners):
- Should `phanTramMienGiam` always apply to `dinhMucNCKH`?
- Rounding at each intermediate step vs final only.
````

## File: skills/vuot_gio/overtime-workflow/protected-rules.md
````markdown
# Protected Business Rules (OVERTIME)

These rules are project-specific and must be treated as authoritative before changing any code that affects overtime calculation or reporting.

1. Default quotas
   - If `sotietdinhmuc` row is missing, default `dinhMucChuan = 280` and `dinhMucNCKH = 280`.

2. Discount application (`phanTramMienGiam`)
   - `phanTramMienGiam` is applied to both teaching quota (`dinhMucChuan`) and NCKH quota (`dinhMucNCKH`) before computing deficits.

3. NCKH shortfall reduces payable overtime
   - Compute `thieuNCKH = max(0, dinhMucNCKHSauGiam - soTietNCKH)`. This value reduces the effective teaching before computing overtime.

4. Non-negativity
   - Raw overtime below zero is treated as zero (no negative payouts).

5. Capping rule
   - Paid overtime (`paid_overtime`) is capped at `dinhMucSauMienGiam` (i.e., `standard_quota - reduced_hours`).

6. Approvals and inclusion
   - Aggregation queries currently require `khoa_duyet = 1` to include records from `vg_coi_cham_ra_de` and `vg_lop_ngoai_quy_chuan` where present.
   - `id_User = 1` is excluded from lecturer aggregations.

7. Rounding
   - Reported numeric fields are normalized to two decimal places. Confirm whether intermediate rounding is acceptable before changing code.

8. Snapshot semantics (future)
   - Once snapshots (`vg_so_tiet_tong_hop`) are used, historical reads MUST use snapshot `chi_tiet` JSON and NOT re-query base tables.

Uncertainties (require PO confirmation):
- Does `khao_thi_duyet` also gate inclusion for certain KTHP types? (code uses `khoa_duyet` currently)
- Should rounding be applied only at final outputs or at intermediate steps as currently implemented?
````

## File: skills/vuot_gio/overtime-workflow/references/proposed_update.md
````markdown
Proposed update generated: 2026-05-09T07:24:27.252Z

{
  "mapperChecksum": "52731b84ab7ee8a62e8e50571d9e2bd19375875ea6cedbd7babf7c14e5b6cb0a",
  "baselineChecksum": null,
  "diffs": [],
  "note": "This is a proposed update. Do NOT apply automatically. Human confirmation required."
}
````

## File: skills/vuot_gio/overtime-workflow/references/README.md
````markdown
# References

This folder contains pointers and proposed diffs created by the validator.

- Canonical references:
  - docs/vuogio_v2/logic.md
  - docs/vuogio_v2/database/vg_so_tiet_tong_hop.sql

Validator reports are written to `../reports/` when `scripts/validate_implementation.js` runs.
````

## File: skills/vuot_gio/overtime-workflow/references/REFERENCE.md
````markdown
# Overtime Workflow Reference Guide

This folder contains detailed reference materials for the overtime workflow skill.

## Files

- **formulas.md** — canonical calculation formulas with pseudocode and rounding rules
- **workflow.md** — process flow, data sources, and inclusion rules
- **architecture.md** — mapping from functionality to code files and database tables
- **protected-rules.md** — business rules that are authoritative and must not change without review
- **edge-cases.md** — failure-prone areas, edge cases, and testing recommendations
- **change-tracking.md** — design for drift detection and baseline management strategy
- **final-deliverables.md** — summary of skill contents and next recommended steps
- **proposed_update.md** — generated when validator detects diffs (human-reviewed before accepting)

## Quick reference

For formula details: see [formulas.md](formulas.md)
For protected rules: see [protected-rules.md](protected-rules.md)
For change workflow: see [change-tracking.md](change-tracking.md)
````

## File: skills/vuot_gio/overtime-workflow/reports/diff-report-1778311063319.json
````json
{
  "timestamp": "2026-05-09T07:17:43.319Z",
  "results": [
    {
      "id": "fixture-1",
      "description": "Typical lecturer with some external classes and NCKH partially completed",
      "input": {
        "soTietGiangDay": 300,
        "soTietNgoaiQC": 10,
        "soTietKTHP": 5,
        "soTietDoAn": 8,
        "soTietHDTQ": 2,
        "soTietNCKH": 150,
        "phanTramMienGiam": 10,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 325,
        "mienGiam": 28,
        "dinhMucSauMienGiam": 252,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 102,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null
    },
    {
      "id": "fixture-2",
      "description": "Lecturer below quota, no overtime",
      "input": {
        "soTietGiangDay": 200,
        "soTietNgoaiQC": 0,
        "soTietKTHP": 0,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 280,
        "phanTramMienGiam": 0,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 200,
        "mienGiam": 0,
        "dinhMucSauMienGiam": 280,
        "thieuTietGiangDay": 80,
        "thieuNCKH": 0,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null
    }
  ]
}
````

## File: skills/vuot_gio/overtime-workflow/reports/diff-report-1778311326245.json
````json
{
  "timestamp": "2026-05-09T07:22:06.245Z",
  "results": [
    {
      "id": "fixture-1",
      "description": "Typical lecturer with some external classes and NCKH partially completed",
      "input": {
        "soTietGiangDay": 300,
        "soTietNgoaiQC": 10,
        "soTietKTHP": 5,
        "soTietDoAn": 8,
        "soTietHDTQ": 2,
        "soTietNCKH": 150,
        "phanTramMienGiam": 10,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 325,
        "mienGiam": 28,
        "dinhMucSauMienGiam": 252,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 102,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null
    },
    {
      "id": "fixture-2",
      "description": "Lecturer below quota, no overtime",
      "input": {
        "soTietGiangDay": 200,
        "soTietNgoaiQC": 0,
        "soTietKTHP": 0,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 280,
        "phanTramMienGiam": 0,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 200,
        "mienGiam": 0,
        "dinhMucSauMienGiam": 280,
        "thieuTietGiangDay": 80,
        "thieuNCKH": 0,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null
    },
    {
      "id": "fixture-3",
      "description": "Exact post-discount quota, NCKH satisfied -> no overtime",
      "input": {
        "soTietGiangDay": 252,
        "soTietNgoaiQC": 0,
        "soTietKTHP": 0,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 280,
        "phanTramMienGiam": 10,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 252,
        "mienGiam": 28,
        "dinhMucSauMienGiam": 252,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 0,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null
    },
    {
      "id": "fixture-4",
      "description": "Very large actual teaching; paid overtime capped at discounted quota",
      "input": {
        "soTietGiangDay": 600,
        "soTietNgoaiQC": 0,
        "soTietKTHP": 0,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 280,
        "phanTramMienGiam": 0,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 600,
        "mienGiam": 0,
        "dinhMucSauMienGiam": 280,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 0,
        "tongVuot": 320,
        "thanhToan": 280,
        "dinhMucChuan": 280
      },
      "expected": null
    },
    {
      "id": "fixture-5",
      "description": "Rounding edgecases with decimals in inputs",
      "input": {
        "soTietGiangDay": 280.555,
        "soTietNgoaiQC": 0.333,
        "soTietKTHP": 0.112,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 150.789,
        "phanTramMienGiam": 12.345,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 281,
        "mienGiam": 34.57,
        "dinhMucSauMienGiam": 245.43,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 94.65,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null
    },
    {
      "id": "fixture-6",
      "description": "Missing dinhMuc fields -> defaults used",
      "input": {
        "soTietGiangDay": 300,
        "soTietNgoaiQC": 0,
        "soTietKTHP": 0,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 0,
        "phanTramMienGiam": 0
      },
      "actual": {
        "tongThucHien": 300,
        "mienGiam": 0,
        "dinhMucSauMienGiam": 280,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 280,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null
    }
  ]
}
````

## File: skills/vuot_gio/overtime-workflow/reports/diff-report-1778311467243.json
````json
{
  "timestamp": "2026-05-09T07:24:27.243Z",
  "mapperChecksum": "52731b84ab7ee8a62e8e50571d9e2bd19375875ea6cedbd7babf7c14e5b6cb0a",
  "baselineChecksum": null,
  "results": [
    {
      "id": "fixture-1",
      "description": "Typical lecturer with some external classes and NCKH partially completed",
      "input": {
        "soTietGiangDay": 300,
        "soTietNgoaiQC": 10,
        "soTietKTHP": 5,
        "soTietDoAn": 8,
        "soTietHDTQ": 2,
        "soTietNCKH": 150,
        "phanTramMienGiam": 10,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 325,
        "mienGiam": 28,
        "dinhMucSauMienGiam": 252,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 102,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null,
      "diffs": null
    },
    {
      "id": "fixture-2",
      "description": "Lecturer below quota, no overtime",
      "input": {
        "soTietGiangDay": 200,
        "soTietNgoaiQC": 0,
        "soTietKTHP": 0,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 280,
        "phanTramMienGiam": 0,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 200,
        "mienGiam": 0,
        "dinhMucSauMienGiam": 280,
        "thieuTietGiangDay": 80,
        "thieuNCKH": 0,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null,
      "diffs": null
    },
    {
      "id": "fixture-3",
      "description": "Exact post-discount quota, NCKH satisfied -> no overtime",
      "input": {
        "soTietGiangDay": 252,
        "soTietNgoaiQC": 0,
        "soTietKTHP": 0,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 280,
        "phanTramMienGiam": 10,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 252,
        "mienGiam": 28,
        "dinhMucSauMienGiam": 252,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 0,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null,
      "diffs": null
    },
    {
      "id": "fixture-4",
      "description": "Very large actual teaching; paid overtime capped at discounted quota",
      "input": {
        "soTietGiangDay": 600,
        "soTietNgoaiQC": 0,
        "soTietKTHP": 0,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 280,
        "phanTramMienGiam": 0,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 600,
        "mienGiam": 0,
        "dinhMucSauMienGiam": 280,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 0,
        "tongVuot": 320,
        "thanhToan": 280,
        "dinhMucChuan": 280
      },
      "expected": null,
      "diffs": null
    },
    {
      "id": "fixture-5",
      "description": "Rounding edgecases with decimals in inputs",
      "input": {
        "soTietGiangDay": 280.555,
        "soTietNgoaiQC": 0.333,
        "soTietKTHP": 0.112,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 150.789,
        "phanTramMienGiam": 12.345,
        "dinhMucChuan": 280,
        "dinhMucNCKH": 280
      },
      "actual": {
        "tongThucHien": 281,
        "mienGiam": 34.57,
        "dinhMucSauMienGiam": 245.43,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 94.65,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null,
      "diffs": null
    },
    {
      "id": "fixture-6",
      "description": "Missing dinhMuc fields -> defaults used",
      "input": {
        "soTietGiangDay": 300,
        "soTietNgoaiQC": 0,
        "soTietKTHP": 0,
        "soTietDoAn": 0,
        "soTietHDTQ": 0,
        "soTietNCKH": 0,
        "phanTramMienGiam": 0
      },
      "actual": {
        "tongThucHien": 300,
        "mienGiam": 0,
        "dinhMucSauMienGiam": 280,
        "thieuTietGiangDay": 0,
        "thieuNCKH": 280,
        "tongVuot": 0,
        "thanhToan": 0,
        "dinhMucChuan": 280
      },
      "expected": null,
      "diffs": null
    }
  ]
}
````

## File: skills/vuot_gio/overtime-workflow/scripts/validate_implementation.js
````javascript
#!/usr/bin/env node
/**
 * Validator: compare canonical formulas to implementation
 * Usage: node validate_implementation.js [--propose]
 * - reads examples/fixtures.json
 * - requires ../../src/mappers/vuotgio_v2/summary.mapper.js and calls calculateOvertime
 * - produces a JSON report in reports/
 * - DOES NOT change code or skill files without --propose (and even then will only write a proposed_update.md)
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const fixturesPath = path.join(__dirname, '..', 'examples', 'fixtures.json');
// project root is three levels up from this script: skills/overtime-workflow/scripts -> project
const mapperPath = path.join(__dirname, '..', '..', '..', 'src', 'mappers', 'vuotgio_v2', 'summary.mapper.js');

function checksumOfFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function loadMapper() {
  try {
    const mapper = require(mapperPath);
    if (!mapper || typeof mapper.calculateOvertime !== 'function') {
      throw new Error('calculateOvertime not found in mapper');
    }
    return mapper;
  } catch (err) {
    console.error('Error loading mapper:', err.message);
    process.exit(1);
  }
}

function run() {
  const mapper = loadMapper();
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, 'utf8'));
  const results = [];

  // compute checksum of mapper file
  let mapperChecksum = null;
  try {
    mapperChecksum = checksumOfFile(mapperPath);
  } catch (err) {
    console.warn('Could not compute checksum of mapper file:', err.message);
  }

  // read meta baseline if present
  const metaPath = path.join(__dirname, '..', 'meta.json');
  let baseline = null;
  if (fs.existsSync(metaPath)) {
    try { baseline = JSON.parse(fs.readFileSync(metaPath, 'utf8')); } catch (e) { baseline = null; }
  }

  fixtures.forEach(f => {
    const input = f.input || {};
    const actual = mapper.calculateOvertime(input);
    // if expected provided, compute field diffs
    const expected = f.expected || null;
    let diffs = null;
    if (expected) {
      diffs = [];
      Object.keys(Object.assign({}, expected, actual)).forEach(k => {
        const ev = expected[k];
        const av = actual[k];
        if (JSON.stringify(ev) !== JSON.stringify(av)) {
          diffs.push({ field: k, expected: ev, actual: av });
        }
      });
    }
    results.push({ id: f.id, description: f.description, input, actual, expected, diffs });
  });

  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  const outFile = path.join(reportsDir, `diff-report-${Date.now()}.json`);
  const report = { timestamp: new Date().toISOString(), mapperChecksum, baselineChecksum: baseline?.mapperChecksum || null, results };
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), 'utf8');
  console.log('Validation report written to', outFile);

  // If any expected exists and differs, show a summary
  const diffs = results.filter(r => r.diffs && r.diffs.length > 0);

  if (baseline && baseline.mapperChecksum && mapperChecksum && baseline.mapperChecksum !== mapperChecksum) {
    console.warn('Mapper checksum differs from baseline. Implementation may have drifted.');
  }

  if (diffs.length > 0) {
    console.warn('Found diffs for', diffs.length, 'fixtures. Run with --propose to generate a proposed update.');
  } else {
    console.log('No diffs detected against provided expected outputs.');
  }

  if (process.argv.includes('--propose')) {
    const proposedPath = path.join(__dirname, '..', 'references', 'proposed_update.md');
    const summary = {
      mapperChecksum,
      baselineChecksum: baseline?.mapperChecksum || null,
      diffs: diffs.map(d => ({ id: d.id, diffs: d.diffs })),
      note: 'This is a proposed update. Do NOT apply automatically. Human confirmation required.'
    };
    const text = `Proposed update generated: ${new Date().toISOString()}\n\n` + JSON.stringify(summary, null, 2);
    fs.writeFileSync(proposedPath, text, 'utf8');
    console.log('Proposed update written to', proposedPath);
  }
}

run();
````

## File: skills/vuot_gio/overtime-workflow/SKILL.md
````markdown
---
name: overtime-workflow
description: Understand and safely modify the university teaching overtime (vuotgio) module. Captures canonical formulas, approval workflows, business rules, and drift detection. Use when implementing overtime calculations, managing approvals, or detecting workflow changes.
license: Proprietary
metadata:
  domain: academic-workload
  version: "1.0"
---

# Overtime Workflow Skill

This skill packages domain knowledge for the university's "vuotgio" (overtime/teaching overload) workload management module.

## What it does

Provides agents with:
- **Canonical formulas**: How overtime is calculated with NCKH deductions and caps
- **Business rules**: Approval gates, inclusion criteria, rounding policies
- **Drift detection**: Scripts to validate code against documented formulas
- **Edge cases**: Handling of negative totals, missing quotas, partial approvals

## When to use it

Use this skill when:
- Implementing or modifying overtime calculation logic
- Managing approval workflows or access controls
- Detecting unintended changes to the calculation formula
- Understanding dependencies on NCKH data

## Key files and scripts

See `references/` for detailed documentation:
- `references/formulas.md` — canonical formulas with pseudocode
- `references/protected-rules.md` — business rules that must not change without review
- `references/workflow.md` — data sources and aggregation flow

Run the validator to detect formula drift:

```bash
node scripts/validate_implementation.js --propose
```

See `references/change-tracking.md` for the complete drift detection workflow.
````

## File: skills/vuot_gio/overtime-workflow/workflow.md
````markdown
# Overtime Workflow (concise)

1. Data sources (per academic year/semester):
   - `giangday` (core teaching records)
   - `vg_coi_cham_ra_de` (KTHP: coi/ra đề/chấm)
   - `vg_lop_ngoai_quy_chuan` (external classes)
   - `exportdoantotnghiep` (guidance for theses/projects)
   - `vg_huong_dan_tham_quan_thuc_te` (field trip guidance)
   - NCKH data from `nckh_v3` via `stats.service.js`

2. Inclusion rules:
   - Only records with `khoa_duyet = 1` are counted by current aggregation queries (see repos).
   - `id_User = 1` is excluded from lecturers list.

3. Aggregation:
   - Aggregator builds an Atomic SDO per lecturer in `tongHop.service.getAtomicSDO`.
   - `summary.mapper.calculateOvertime` implements the canonical formula.

4. Approval & Export:
   - Per-record approvals (department/test) prevent edits/deletes once set.
   - Exports rely on SDO outputs; snapshots (`vg_so_tiet_tong_hop`) are planned but currently deferred.

5. Snapshot semantics (future):
   - Once snapshot is implemented, historical views must be read from `vg_so_tiet_tong_hop.chi_tiet` JSON.
````

## File: src/config/vuotgio_v2/templatePreview.alias.js
````javascript
const SOURCE_ALIAS = {
  giangday: {
    TenHocPhan: "ten_hoc_phan",
    SoTC: "so_tc",
    Lop: "lop",
    SoTietCTDT: "so_tiet_ctdt",
    QuyChuan: "quy_chuan",
  },
  vg_coi_cham_ra_de: {
    ten_hoc_phan: "ten_hoc_phan",
    hinh_thuc: "hinh_thuc",
    so_sv: "so_sv",
    tong_so: "so_sv",
    so_tc: "so_tc",
    quy_chuan: "quy_chuan",
  },
  exportdoantotnghiep: {
    SinhVien: "sinh_vien",
    khoa_sinh_vien: "khoa_sinh_vien",
    SoQD: "so_qd",
    SoNguoi: "so_nguoi",
    isHdChinh: "is_hd_chinh",
    SoTiet: "so_tiet",
  },
  nckh_chung: {
    tenCongTrinh: "ten_cong_trinh",
    phanLoai: "phan_loai",
    ngayNghiemThu: "ngay_nghiem_thu",
    xepLoai: "xep_loai",
  },
  nckh_so_tiet: {
    vaiTroGiangVien: "vai_tro",
    soTietGiangVien: "so_tiet",
  },
};

module.exports = {
  SOURCE_ALIAS,
};
````

## File: src/controllers/vuotgio_v2/dataLock.controller.js
````javascript
/**
 * VUOT GIO V2 - Data Lock Controller
 * Controller xử lý API khóa dữ liệu và kiểm tra trạng thái khóa
 */

const dataLockService = require("../../services/vuotgio_v2/dataLock.service");

/**
 * POST /tong-hop/khoa-du-lieu
 * Thực hiện khóa dữ liệu cho một năm học
 * Body: { namHoc: string, ghiChu?: string }
 * Yêu cầu: vai trò tai_chinh
 */
const lockData = async (req, res) => {
    // Kiểm tra đăng nhập
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Kiểm tra quyền: chỉ Lãnh đạo phòng của Văn phòng (VP)
    const role = req.session.role || req.session.Quyen;
    const maPhongBan = req.session.MaPhongBan;
    if (role !== "Lãnh đạo phòng" || maPhongBan !== "VP") {
        return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện thao tác này" });
    }

    const { namHoc, ghiChu } = req.body;

    // Validate: thiếu namHoc
    if (!namHoc || (typeof namHoc === "string" && namHoc.trim() === "")) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học" });
    }

    // Validate: format namHoc
    if (!dataLockService.validateNamHocFormat(namHoc)) {
        return res.status(400).json({ success: false, message: "Định dạng năm học không hợp lệ. Yêu cầu: YYYY - YYYY" });
    }

    try {
        const userId = req.session.userId;
        const result = await dataLockService.lockData(namHoc, userId, ghiChu || null);

        if (!result.success) {
            // Phân biệt lỗi đã khóa (409) vs lỗi khác (400)
            const status = result.message === "Dữ liệu năm học này đã được khóa" ? 409 : 400;
            return res.status(status).json({
                success: false,
                message: result.message,
                errors: result.errors || undefined,
            });
        }

        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error("[dataLock.lockData] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra, vui lòng thử lại" });
    }
};

/**
 * GET /trang-thai-khoa?namHoc=...
 * Kiểm tra trạng thái khóa cho một năm học
 * Query: namHoc (required)
 * Yêu cầu: đã đăng nhập
 */
const getLockStatus = async (req, res) => {
    // Kiểm tra đăng nhập
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { namHoc } = req.query;

    // Validate: thiếu namHoc
    if (!namHoc || (typeof namHoc === "string" && namHoc.trim() === "")) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học" });
    }

    // Validate: format namHoc
    if (!dataLockService.validateNamHocFormat(namHoc)) {
        return res.status(400).json({ success: false, message: "Định dạng năm học không hợp lệ. Yêu cầu: YYYY - YYYY" });
    }

    try {
        const result = await dataLockService.getLockStatus(namHoc);
        res.json({ success: true, locked: result.locked, lockInfo: result.lockInfo });
    } catch (error) {
        console.error("[dataLock.getLockStatus] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra, vui lòng thử lại" });
    }
};

module.exports = {
    lockData,
    getLockStatus,
};
````

## File: src/controllers/vuotgio_v2/index.js
````javascript
/**
 * VUOT GIO V2 Controllers - Entry Point
 * Export tất cả controllers cho module Vượt Giờ V2
 * Date: 2026-01-29
 */

const baseController = require('./base.controller');
const lopNgoaiQCController = require('./lopNgoaiQC.controller');
const themKTHPController = require('./themKTHP.controller');
const duyetKTHPController = require('./duyetKTHP.controller');
const tongHopController = require('./tongHop.controller');
const xuatFileController = require('./xuatFile.controller');

module.exports = {
    // Base controller - render views
    ...baseController,

    // CRUD Controllers
    lopNgoaiQC: lopNgoaiQCController,
    themKTHP: themKTHPController,
    duyetKTHP: duyetKTHPController,

    // Tổng hợp & Export
    tongHop: tongHopController,
    xuatFile: xuatFileController
};
````

## File: src/controllers/vuotgio_v2/thongKeGiangDay.controller.js
````javascript
/**
 * VUOT GIO V2 - Thống Kê Giảng Dạy (TKB) Controller
 * Date: 2026-04-28
 */

const service = require("../../services/vuotgio_v2/giangDay.service");

/**
 * Lấy bộ lọc cho trang thống kê
 */
const getFilters = async (req, res) => {
    try {
        const filters = await service.getFilters();
        res.json({ success: true, data: filters });
    } catch (error) {
        console.error("[thongKeGiangDay.getFilters] Error:", error);
        res.status(500).json({ success: false, message: "Không thể tải bộ lọc" });
    }
};

/**
 * Lấy dữ liệu thống kê giảng dạy
 */
const getData = async (req, res) => {
    try {
        const { dot, ki, namHoc, khoa, heDaoTao } = req.body || {};
        const filters = { dot, ki, namHoc, khoa, heDaoTao };

        const result = await service.getStatistics(filters);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("[thongKeGiangDay.getData] Error:", error);
        res.status(500).json({ success: false, message: "Không thể lấy dữ liệu thống kê" });
    }
};

module.exports = {
    getFilters,
    getData,
};
````

## File: src/mappers/vuotgio_v2/base.mapper.js
````javascript
/**
 * VUOT GIO V2 - Base Mapper
 * Tập hợp các hàm tiện ích chuyển đổi dữ liệu dùng chung
 */

/**
 * Lấy giá trị đầu tiên không rỗng từ danh sách các key
 */
const pick = (source, ...keys) => {
    if (!source) return undefined;
    for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
            return source[key];
        }
    }
    return undefined;
};

/**
 * Ép kiểu số nguyên an toàn
 */
const toInt = (value, fallback = 0) => {
    if (value === undefined || value === null) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Ép kiểu số thập phân an toàn
 */
const toDecimal = (value, fallback = 0) => {
    if (value === undefined || value === null) return fallback;
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Làm sạch chuỗi
 */
const trim = (value) => {
    if (typeof value !== 'string') return value;
    return value.trim();
};

module.exports = {
    pick,
    toInt,
    toDecimal,
    trim
};
````

## File: src/mappers/vuotgio_v2/kthp.mapper.js
````javascript
/**
 * VUOT GIO V2 - KTHP Mapper
 * Chuyển đổi dữ liệu cho module Kết Thúc Học Phần (Coi chấm ra đề)
 */

const base = require("./base.mapper");

/**
 * Map từ Request Body sang Database Entity (v2 schema)
 */
const toEntity = (body) => {
    return {
        giang_vien: base.pick(body, "giang_vien", "giangvien", "hoVaTen") || "",
        khoa: base.pick(body, "khoa", "Khoa") || "",
        hoc_ky: base.toInt(base.pick(body, "hoc_ky", "ki", "HocKy"), 1),
        nam_hoc: base.pick(body, "nam_hoc", "namhoc", "NamHoc") || "",
        hinh_thuc: base.pick(body, "hinh_thuc", "hinhthuc", "HinhThuc", "Type", "loai") || "",
        ten_hoc_phan: base.pick(body, "ten_hoc_phan", "tenhocphan", "TenHocPhan") || "",
        lop_hoc_phan: base.pick(body, "lop_hoc_phan", "lophocphan", "LopHocPhan") || "",
        doi_tuong: base.pick(body, "doi_tuong", "doituong", "DoiTuong") || "",
        bai_cham_1: base.toInt(base.pick(body, "bai_cham_1", "baicham1", "BaiCham1", "soBaiCham1"), 0),
        bai_cham_2: base.toInt(base.pick(body, "bai_cham_2", "baicham2", "BaiCham2", "soBaiCham2"), 0),
        tong_so: base.toInt(base.pick(body, "tong_so", "tongso", "TongSo", "sosv", "soDe", "soCa", "tongSoBai"), 0),
        quy_chuan: base.toDecimal(base.pick(body, "quy_chuan", "sotietqc", "SoTietQC", "soTietQC"), 0),
        ghi_chu: base.pick(body, "ghi_chu", "ghichu", "GhiChu") || "",
        so_tc: base.toInt(base.pick(body, "so_tc", "sotc", "SoTC"), 0),
        so_sv: base.toInt(base.pick(body, "so_sv", "sosv", "SoSV"), 0),
    };
};

/**
 * Map từ Database Row sang DTO (Data Transfer Object) cho UI
 */
const toDTO = (row) => {
    if (!row) return null;
    return {
        id: row.id || row.ID,
        giangVien: row.giang_vien,
        khoa: row.khoa,
        hocKy: row.hoc_ky,
        namHoc: row.nam_hoc,
        hinhThuc: row.hinh_thuc,
        tenHocPhan: row.ten_hoc_phan,
        lopHocPhan: row.lop_hoc_phan,
        doiTuong: row.doi_tuong,
        baiCham1: row.bai_cham_1,
        baiCham2: row.bai_cham_2,
        tongSo: row.tong_so,
        quyChuan: row.quy_chuan,
        khoaDuyet: row.khoa_duyet,
        khaoThiDuyet: row.khao_thi_duyet,
        ghiChu: row.ghi_chu,
        soTinChi: row.so_tc,
        soSinhVien: row.so_sv
    };
};

module.exports = {
    toEntity,
    toDTO
};
````

## File: src/mappers/vuotgio_v2/trainingSystem.mapper.js
````javascript
/**
 * VUOT GIO V2 - Training System Mapper
 * Centralized logic for classifying and mapping training systems (Hệ đào tạo)
 * to standardized categories (vn, lao, cuba, cpc, dongHP).
 */

/**
 * Core classification logic based on training system names
 * @param {string} tenHeDaoTao 
 * @returns {Object} { isMatMa, vungMien }
 */
const classify = (tenHeDaoTao) => {
    const name = String(tenHeDaoTao || "").toLowerCase();
    const isMatMa = name.includes("mật mã");

    let vungMien = "viet_nam";
    if (name.includes("lào")) vungMien = "lao";
    else if (name.includes("campuchia")) vungMien = "campuchia";
    else if (name.includes("cuba")) vungMien = "cuba";

    return { isMatMa, vungMien };
};

/**
 * Map training system name to standardized category key
 * @param {string} tenHeDaoTao 
 * @returns {string} vn | lao | cuba | cpc | dongHP
 */
const getCategoryKey = (tenHeDaoTao) => {
    const { isMatMa, vungMien } = classify(tenHeDaoTao);
    if (!isMatMa) return "dongHP";

    const regionToCategory = {
        viet_nam: "vn",
        lao: "lao",
        cuba: "cuba",
        campuchia: "cpc",
    };

    return regionToCategory[vungMien] || "vn";
};

/**
 * Friendly labels for display
 */
const CATEGORY_LABELS = {
    vn: "Việt Nam",
    lao: "Lào",
    cuba: "Cuba",
    cpc: "Campuchia",
    dongHP: "Đóng học phí",
};

const getLabel = (key) => CATEGORY_LABELS[key] || key;

module.exports = {
    classify,
    getCategoryKey,
    getLabel,
    CATEGORY_LABELS
};
````

## File: src/public/js/vuotgio_v2/khoaFilter.utils.js
````javascript
/**
 * Khoa Filter Utilities - Frontend
 * Dùng chung cho các trang vượt giờ (LNQC, KTHP, HDTQ)
 * 
 * Logic:
 * - Nếu user có isKhoa = 1: lock dropdown khoa = MaPhongBan, không cho chọn khoa khác
 * - Nếu user không phải khoa: hiển thị bình thường
 */

const KhoaFilterUtils = {
    /**
     * Kiểm tra user có phải là khoa không
     */
    isKhoaUser() {
        const isKhoa = localStorage.getItem('isKhoa');
        return isKhoa === '1' || isKhoa === 1;
    },

    /**
     * Lấy MaPhongBan của user
     */
    getUserKhoa() {
        return localStorage.getItem('MaPhongBan') || '';
    },

    /**
     * Áp dụng filter khoa cho dropdown select element.
     * Nếu user là khoa: set value = MaPhongBan, disable dropdown.
     * 
     * @param {string|HTMLElement} selectElement - ID hoặc element của dropdown khoa
     * @param {Object} options - Tùy chọn
     * @param {boolean} options.removeOtherOptions - Xóa các option khác (default: false)
     */
    applyKhoaFilter(selectElement, options = {}) {
        if (typeof selectElement === 'string') {
            selectElement = document.getElementById(selectElement);
        }
        if (!selectElement) return;

        if (!this.isKhoaUser()) return;

        const userKhoa = this.getUserKhoa();
        if (!userKhoa) return;

        // Set value = MaPhongBan của user
        selectElement.value = userKhoa;

        // Disable dropdown để không cho chọn khoa khác
        selectElement.disabled = true;

        // Nếu cần xóa các option khác
        if (options.removeOtherOptions) {
            const currentOption = selectElement.querySelector(`option[value="${userKhoa}"]`);
            const label = currentOption ? currentOption.textContent : userKhoa;
            selectElement.innerHTML = `<option value="${userKhoa}">${label}</option>`;
        }
    },

    /**
     * Lấy giá trị khoa để gửi API.
     * Nếu user là khoa → luôn trả về MaPhongBan, bất kể dropdown chọn gì.
     * 
     * @param {string|HTMLElement} selectElement - ID hoặc element của dropdown khoa
     * @returns {string} Giá trị khoa
     */
    getKhoaValue(selectElement) {
        if (this.isKhoaUser()) {
            return this.getUserKhoa();
        }

        if (typeof selectElement === 'string') {
            selectElement = document.getElementById(selectElement);
        }
        return selectElement ? selectElement.value : '';
    }
};

// Export cho cả module và global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KhoaFilterUtils;
}
````

## File: src/public/js/vuotgio_v2/lopNgoaiQC/index.js
````javascript
/**
 * Lớp Ngoài Quy Chuẩn - Frontend JS
 * VuotGio V2
 */

let gridApi = null;

// Column Definitions - Phù hợp với cấu trúc bảng lopngoaiquychuan
const columnDefs = [
    { headerName: 'STT', valueGetter: 'node.rowIndex + 1', width: 60, pinned: 'left' },
    { field: 'GiangVien', headerName: 'Giảng viên', width: 180 },
    { field: 'Khoa', headerName: 'Khoa', width: 80 },
    { field: 'HocKy', headerName: 'HK', width: 60 },
    { field: 'TenHocPhan', headerName: 'Tên học phần', width: 200, flex: 1 },
    { field: 'MaHocPhan', headerName: 'Mã HP', width: 90 },
    { field: 'SoTC', headerName: 'Số TC', width: 70, type: 'numericColumn' },
    { field: 'Lop', headerName: 'Lớp', width: 100 },
    { field: 'LenLop', headerName: 'Lên lớp', width: 80 },
    { field: 'SoSV', headerName: 'Sĩ số', width: 70, type: 'numericColumn' },
    { field: 'SoTietCTDT', headerName: 'Số tiết CTĐT', width: 100, type: 'numericColumn' },
    { field: 'SoTietKT', headerName: 'Số tiết KT', width: 90, type: 'numericColumn' },
    { field: 'HeSoT7CN', headerName: 'HS T7CN', width: 80, type: 'numericColumn' },
    { field: 'HeSoLopDong', headerName: 'HS Lớp đông', width: 100, type: 'numericColumn' },
    { field: 'QuyChuan', headerName: 'Quy chuẩn', width: 90, type: 'numericColumn',
        cellStyle: { fontWeight: 'bold', color: '#28a745' }
    },
    { field: 'he_dao_tao', headerName: 'Hệ ĐT', width: 80 },
    { field: 'DoiTuong', headerName: 'Đối tượng', width: 100 },
    { field: 'GhiChu', headerName: 'Ghi chú', width: 150 },
    {
        headerName: 'Thao tác',
        width: 120,
        pinned: 'right',
        cellRenderer: params => {
            return `
                <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="editRecord(${params.data.ID})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteRecord(${params.data.ID})">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
    }
];

// Grid Options
const gridOptions = {
    columnDefs: columnDefs,
    defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true
    },
    rowData: [],
    pagination: true,
    paginationPageSize: 20,
    animateRows: true,
    onGridReady: params => {
        gridApi = params.api;
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('[lopNgoaiQC] DOMContentLoaded fired');
    
    // Init AG Grid
    const gridDiv = document.querySelector('#gridContainer');
    console.log('[lopNgoaiQC] gridDiv:', gridDiv);
    new agGrid.Grid(gridDiv, gridOptions);
    gridApi = gridOptions.api;
    console.log('[lopNgoaiQC] AG Grid initialized');

    // Load năm học options
    loadNamHocOptions();
    loadKhoaOptions();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('lopNgoaiQCForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('saveEditBtn').addEventListener('click', handleEditSubmit);
    document.getElementById('khoaForm').addEventListener('change', loadTeachers);

    // Initial load - disabled
    // setTimeout(loadData, 500);
});

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    console.log('[VuotGio V2 FE] loadNamHocOptions called');
    try {
        console.log('[VuotGio V2 FE] Fetching /api/namhoc...');
        const response = await fetch('/api/namhoc');
        console.log('[VuotGio V2 FE] Response status:', response.status);
        const data = await response.json();
        console.log('[VuotGio V2 FE] NamHoc data:', data);
        
        const namHocSelects = document.querySelectorAll('.namHoc');
        console.log('[VuotGio V2 FE] Found namHoc selects:', namHocSelects.length);
        namHocSelects.forEach(select => {
            select.innerHTML = '';
            data.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = item.NamHoc;
                option.textContent = item.NamHoc;
                // Chọn năm học đầu tiên có trangthai = 1, hoặc năm đầu tiên
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading nam hoc:', error);
        // Fallback to current year if API fails
        const currentYear = new Date().getFullYear();
        const namHocSelects = document.querySelectorAll('.namHoc');
        namHocSelects.forEach(select => {
            select.innerHTML = `<option value="${currentYear}-${currentYear + 1}">${currentYear}-${currentYear + 1}</option>`;
        });
    }
}

// Load khoa từ API có sẵn
async function loadKhoaOptions() {
    console.log('[VuotGio V2 FE] loadKhoaOptions called');
    try {
        console.log('[VuotGio V2 FE] Fetching /api/khoa...');
        const response = await fetch('/api/khoa');
        console.log('[VuotGio V2 FE] Response status:', response.status);
        const data = await response.json();
        console.log('[VuotGio V2 FE] Khoa data:', data);
        
        const khoaSelects = document.querySelectorAll('.khoa');
        console.log('[VuotGio V2 FE] Found khoa selects:', khoaSelects.length);
        khoaSelects.forEach(select => {
            const hasAll = select.id.includes('Xem');
            if (!hasAll) select.innerHTML = '<option value="">-- Chọn Khoa --</option>';
            
            data.forEach(dept => {
                const option = document.createElement('option');
                option.value = dept.MaPhongBan;
                option.textContent = dept.TenPhongBan || dept.MaPhongBan;
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// Load teachers
async function loadTeachers() {
    const khoa = document.getElementById('khoaForm').value;
    if (!khoa) return;
    
    try {
        const response = await fetch(`/v2/vuotgio/api/teachers?Khoa=${khoa}`);
        const teachers = await response.json();
        
        const select = document.getElementById('giangVienForm');
        select.innerHTML = '<option value="">-- Chọn giảng viên --</option>';
        
        teachers.forEach(t => {
            const option = document.createElement('option');
            option.value = t.HoTen;
            option.textContent = t.HoTen;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading teachers:', error);
    }
}

// Load data
async function loadData() {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;
    
    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        gridApi.showLoadingOverlay();
        
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/${namHoc}/${khoa}`);
        const data = await response.json();
        
        gridApi.setRowData(data);
        
        if (data.length === 0) {
            gridApi.showNoRowsOverlay();
        }
    } catch (error) {
        console.error('Error loading data:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu', 'error');
    }
}

// Form submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = {
        NamHoc: document.getElementById('namHocForm').value,
        HocKy: document.getElementById('hocKyForm').value,
        Khoa: document.getElementById('khoaForm').value,
        TenHocPhan: document.getElementById('tenHPForm').value,
        MaHocPhan: document.getElementById('maHPForm').value,
        SoTC: document.getElementById('soTCForm').value,
        GiangVien: document.getElementById('giangVienForm').value,
        Lop: document.getElementById('lopForm').value,
        LenLop: document.getElementById('lenLopForm')?.value || '',
        SoSV: document.getElementById('soSVForm').value,
        SoTietCTDT: document.getElementById('soTietCTDTForm').value,
        SoTietKT: document.getElementById('soTietKTForm')?.value || 0,
        HeSoT7CN: document.getElementById('heSoT7CNForm')?.value || 1,
        HeSoLopDong: document.getElementById('heSoLopDongForm')?.value || 1,
        QuyChuan: document.getElementById('quyChuanForm').value,
        he_dao_tao: document.getElementById('heDaoTaoForm')?.value || '',
        DoiTuong: document.getElementById('doiTuongForm')?.value || '',
        HinhThucKTGiuaKy: document.getElementById('hinhThucKTForm')?.value || '',
        SoDe: document.getElementById('soDeForm')?.value || 0,
        GhiChu: document.getElementById('ghiChuForm').value,
        HoanThanh: 0
    };

    try {
        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            document.getElementById('lopNgoaiQCForm').reset();
            loadData();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi lưu', 'error');
    }
}

// Edit record
function editRecord(id) {
    const rowData = [];
    gridApi.forEachNode(node => rowData.push(node.data));
    const record = rowData.find(r => r.ID === id);
    
    if (!record) return;

    // Fill modal
    document.getElementById('editID').value = record.ID;
    document.getElementById('editNamHoc').value = record.NamHoc;
    document.getElementById('editHocKy').value = record.HocKy;
    document.getElementById('editKhoa').value = record.Khoa;
    document.getElementById('editTenHP').value = record.TenHocPhan || '';
    document.getElementById('editMaHP').value = record.MaHocPhan || '';
    document.getElementById('editSoTC').value = record.SoTC || 0;
    document.getElementById('editGiangVien').value = record.GiangVien || '';
    document.getElementById('editLop').value = record.Lop || '';
    document.getElementById('editLenLop').value = record.LenLop || '';
    document.getElementById('editSoSV').value = record.SoSV || 0;
    document.getElementById('editSoTietCTDT').value = record.SoTietCTDT || 0;
    document.getElementById('editSoTietKT').value = record.SoTietKT || 0;
    document.getElementById('editHeSoT7CN').value = record.HeSoT7CN || 1;
    document.getElementById('editHeSoLopDong').value = record.HeSoLopDong || 1;
    document.getElementById('editQuyChuan').value = record.QuyChuan || 0;
    document.getElementById('editHeDaoTao').value = record.he_dao_tao || '';
    document.getElementById('editDoiTuong').value = record.DoiTuong || '';
    document.getElementById('editGhiChu').value = record.GhiChu || '';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Handle edit submit
async function handleEditSubmit() {
    const id = document.getElementById('editID').value;
    
    const formData = {
        NamHoc: document.getElementById('editNamHoc').value,
        HocKy: document.getElementById('editHocKy').value,
        Khoa: document.getElementById('editKhoa').value,
        TenHocPhan: document.getElementById('editTenHP').value,
        MaHocPhan: document.getElementById('editMaHP').value,
        SoTC: document.getElementById('editSoTC').value,
        GiangVien: document.getElementById('editGiangVien').value,
        Lop: document.getElementById('editLop').value,
        LenLop: document.getElementById('editLenLop').value,
        SoSV: document.getElementById('editSoSV').value,
        SoTietCTDT: document.getElementById('editSoTietCTDT').value,
        SoTietKT: document.getElementById('editSoTietKT').value,
        HeSoT7CN: document.getElementById('editHeSoT7CN').value,
        HeSoLopDong: document.getElementById('editHeSoLopDong').value,
        QuyChuan: document.getElementById('editQuyChuan').value,
        he_dao_tao: document.getElementById('editHeDaoTao').value,
        DoiTuong: document.getElementById('editDoiTuong').value,
        GhiChu: document.getElementById('editGhiChu').value
    };

    try {
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/edit/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            loadData();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi cập nhật', 'error');
    }
}

// Delete record
async function deleteRecord(id) {
    const result = await Swal.fire({
        title: 'Xác nhận xóa?',
        text: 'Bạn có chắc muốn xóa bản ghi này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (data.success) {
            Swal.fire('Đã xóa', data.message, 'success');
            loadData();
        } else {
            Swal.fire('Lỗi', data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa', 'error');
    }
}
````

## File: src/public/js/vuotgio_v2/tongHop/giangVienRutGon.js
````javascript
/**
 * Tổng hợp theo Giảng viên - Bảng Rút Gọn
 * VuotGio V2 - Hiển thị bảng tóm tắt chỉ với các cột quan trọng nhất
 * 
 * Sử dụng chung globalData từ giangVien.js
 * Cần load SAU giangVien.js
 */

(function () {
    'use strict';

    let isCompactMode = false;

    // ==================== COMPACT TABLE STRUCTURE ====================

    /**
     * Cấu trúc bảng rút gọn:
     * STT | Họ tên GV | Khoa | Định mức phải giảng | Tổng tiết cả năm | Tổng vượt giờ | Mức TT chuẩn | Tổng thành tiền | Thực nhận
     */

    const COMPACT_COLUMNS = [
        { key: 'stt', label: 'STT', width: '40px', cls: 's-base' },
        { key: 'hoTen', label: 'Họ tên Giảng viên', width: '200px', cls: 's-base', align: 'left' },
        { key: 'khoa', label: 'Khoa', width: '120px', cls: 's-base', align: 'left' },
        { key: 'dinhMuc', label: 'Định mức phải giảng', width: '80px', cls: 's-base' },
        { key: 'tongCaNam', label: 'Tổng tiết cả năm', width: '90px', cls: 's-teaching' },
        { key: 'vuotVN', label: 'Vượt VN', width: '70px', cls: 's-over-sub' },
        { key: 'vuotLao', label: 'Vượt Lào', width: '70px', cls: 's-over-sub' },
        { key: 'vuotCuba', label: 'Vượt Cuba', width: '70px', cls: 's-over-sub' },
        { key: 'vuotCPC', label: 'Vượt CPC', width: '70px', cls: 's-over-sub' },
        { key: 'vuotDongHP', label: 'Vượt Đóng HP', width: '70px', cls: 's-over-sub' },
        { key: 'vuotTong', label: 'Tổng vượt giờ', width: '90px', cls: 's-over' },
        { key: 'mucTT', label: 'Mức TT chuẩn', width: '90px', cls: 's-rate' },
        { key: 'tongTien', label: 'Tổng thành tiền', width: '110px', cls: 's-money' },
        { key: 'thucNhan', label: 'Thực nhận', width: '110px', cls: 's-net' },
    ];

    // ==================== UI CREATION ====================

    /**
     * Tạo nút toggle giữa bảng đầy đủ và bảng rút gọn
     */
    function createToggleButton() {
        const btn = document.createElement('button');
        btn.id = 'btnToggleCompact';
        btn.className = 'btn btn-outline-secondary';
        btn.style.cssText = 'height: 45px; margin: 0; margin-left: 5px;';
        btn.innerHTML = '<i class="bi bi-table me-1"></i> Bảng rút gọn';
        btn.title = 'Chuyển đổi giữa bảng đầy đủ và bảng rút gọn';
        btn.addEventListener('click', toggleCompactMode);
        return btn;
    }

    /**
     * Tạo container cho bảng rút gọn
     */
    function createCompactContainer() {
        const container = document.createElement('div');
        container.id = 'compactTableContainer';
        container.style.display = 'none';
        container.innerHTML = `
            <div style="overflow-x: auto;">
                <table class="table table-hover table-bordered text-center" id="compactTable">
                    <thead id="compactTableHead"></thead>
                    <tbody id="compactTableBody"></tbody>
                    <tfoot id="compactTableFoot"></tfoot>
                </table>
            </div>
        `;
        return container;
    }

    // ==================== TOGGLE LOGIC ====================

    function toggleCompactMode() {
        isCompactMode = !isCompactMode;

        const fullTable = document.getElementById('renderInfo');
        const compactContainer = document.getElementById('compactTableContainer');
        const btn = document.getElementById('btnToggleCompact');

        if (isCompactMode) {
            fullTable.style.display = 'none';
            compactContainer.style.display = 'block';
            btn.innerHTML = '<i class="bi bi-table me-1"></i> Bảng đầy đủ';
            btn.classList.remove('btn-outline-secondary');
            btn.classList.add('btn-outline-primary');
            renderCompactTable(globalData);
        } else {
            fullTable.style.display = '';
            compactContainer.style.display = 'none';
            btn.innerHTML = '<i class="bi bi-table me-1"></i> Bảng rút gọn';
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-outline-secondary');
        }
    }

    // ==================== COMPACT TABLE RENDERING ====================

    function renderCompactTable(data) {
        if (!data || data.length === 0) return;

        renderCompactHeader();
        renderCompactBody(data);
        renderCompactFooter(data);
    }

    function renderCompactHeader() {
        const thead = document.getElementById('compactTableHead');
        thead.innerHTML = '';

        const tr = document.createElement('tr');
        COMPACT_COLUMNS.forEach(col => {
            const th = document.createElement('th');
            th.className = col.cls;
            th.style.width = col.width;
            th.textContent = col.label;
            tr.appendChild(th);
        });
        thead.appendChild(tr);
    }

    function renderCompactBody(data) {
        const tbody = document.getElementById('compactTableBody');
        tbody.innerHTML = '';

        let stt = 1;
        let lastKhoa = null;

        data.forEach((row) => {
            // Dòng tiêu đề nhóm khoa
            if (row.khoa !== lastKhoa) {
                const groupRow = document.createElement('tr');
                groupRow.className = 'group-header table-light fw-bold';
                groupRow.innerHTML = `
                    <td colspan="${COMPACT_COLUMNS.length}" class="text-start px-3 py-2">
                        <i class="fas fa-university me-2"></i> ${row.khoa || 'Khác'}
                    </td>
                `;
                tbody.appendChild(groupRow);
                lastKhoa = row.khoa;
            }

            const bd = row.breakdown || emptyBreakdownCompact();
            const mucTT = bd.mucTT || 0;
            const thucNhan = bd.thucNhan || 0;

            // Tổng tiết cả năm = tổng tất cả loại trong year
            const tongCaNam = (bd.year.vn || 0) + (bd.year.lao || 0) + (bd.year.cuba || 0) + (bd.year.cpc || 0) + (bd.year.dongHP || 0);

            const tr = document.createElement('tr');
            tr.setAttribute('data-khoa', row.khoa || '');

            if (row.thieuTietGiangDay > 0) {
                tr.classList.add('row-warning-danger');
            }

            // Highlight nếu có vượt giờ
            const vuotTong = bd.vuot.total || 0;
            if (vuotTong > 0) {
                tr.classList.add('highlight-vuotgio');
            }

            tr.innerHTML = `
                <td>${stt++}</td>
                <td style="text-align: left; padding-left: 8px; white-space: nowrap;">${row.giangVien || ''}</td>
                <td style="text-align: left; padding-left: 8px; font-size: 0.7rem;">${row.khoa || ''}</td>
                <td>${formatNumberCompact(row.dinhMucSauMienGiam)}</td>
                <td>${formatNumberCompact(tongCaNam)}</td>
                <td class="${bd.vuot.vn > 0 ? 'text-success-bold' : ''}">${formatNumberCompact(bd.vuot.vn)}</td>
                <td class="${bd.vuot.lao > 0 ? 'text-success-bold' : ''}">${formatNumberCompact(bd.vuot.lao)}</td>
                <td class="${bd.vuot.cuba > 0 ? 'text-success-bold' : ''}">${formatNumberCompact(bd.vuot.cuba)}</td>
                <td class="${bd.vuot.cpc > 0 ? 'text-success-bold' : ''}">${formatNumberCompact(bd.vuot.cpc)}</td>
                <td class="${bd.vuot.dongHP > 0 ? 'text-success-bold' : ''}">${formatNumberCompact(bd.vuot.dongHP)}</td>
                <td style="font-weight: 700; color: #059669;">${formatNumberCompact(vuotTong)}</td>
                <td>${formatNumberCompact(mucTT)}</td>
                <td style="font-weight: 600;">${formatNumberCompact(bd.money.total)}</td>
                <td style="font-weight: 700; color: #1a5276;">${formatNumberCompact(thucNhan)}</td>
            `;

            tbody.appendChild(tr);
        });
    }

    function renderCompactFooter(data) {
        const tfoot = document.getElementById('compactTableFoot');
        tfoot.innerHTML = '';

        // Tính tổng
        let totals = {
            dinhMuc: 0, tongCaNam: 0,
            vuotVN: 0, vuotLao: 0, vuotCuba: 0, vuotCPC: 0, vuotDongHP: 0, vuotTong: 0,
            tongTien: 0, thucNhan: 0
        };

        data.forEach(row => {
            const bd = row.breakdown || emptyBreakdownCompact();
            totals.dinhMuc += row.dinhMucSauMienGiam || 0;
            totals.tongCaNam += (bd.year.vn || 0) + (bd.year.lao || 0) + (bd.year.cuba || 0) + (bd.year.cpc || 0) + (bd.year.dongHP || 0);
            totals.vuotVN += bd.vuot.vn || 0;
            totals.vuotLao += bd.vuot.lao || 0;
            totals.vuotCuba += bd.vuot.cuba || 0;
            totals.vuotCPC += bd.vuot.cpc || 0;
            totals.vuotDongHP += bd.vuot.dongHP || 0;
            totals.vuotTong += bd.vuot.total || 0;
            totals.tongTien += bd.money.total || 0;
            totals.thucNhan += bd.thucNhan || 0;
        });

        const tr = document.createElement('tr');
        tr.style.fontWeight = 'bold';
        tr.style.backgroundColor = '#e9ecef';
        tr.innerHTML = `
            <td colspan="3" style="text-align: center;">TỔNG CỘNG</td>
            <td>${formatNumberCompact(totals.dinhMuc)}</td>
            <td>${formatNumberCompact(totals.tongCaNam)}</td>
            <td>${formatNumberCompact(totals.vuotVN)}</td>
            <td>${formatNumberCompact(totals.vuotLao)}</td>
            <td>${formatNumberCompact(totals.vuotCuba)}</td>
            <td>${formatNumberCompact(totals.vuotCPC)}</td>
            <td>${formatNumberCompact(totals.vuotDongHP)}</td>
            <td>${formatNumberCompact(totals.vuotTong)}</td>
            <td></td>
            <td>${formatNumberCompact(totals.tongTien)}</td>
            <td>${formatNumberCompact(totals.thucNhan)}</td>
        `;
        tfoot.appendChild(tr);
    }

    // ==================== HELPERS ====================

    function formatNumberCompact(val) {
        if (val === null || val === undefined || val === 0) return '0';
        return Number(val).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function emptyBreakdownCompact() {
        return {
            hk1: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
            hk2: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
            year: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
            vuot: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
            money: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
            thucNhan: 0,
            mucTT: 0,
        };
    }

    // ==================== FILTER SUPPORT ====================

    /**
     * Lọc bảng rút gọn theo tên giảng viên (đồng bộ với filter bảng chính)
     */
    function filterCompactTable() {
        if (!isCompactMode) return;

        const keyword = (document.getElementById('filterGiangVien').value || '').toLowerCase().trim();
        const tbody = document.getElementById('compactTableBody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            if (row.classList.contains('group-header')) {
                // Ẩn/hiện group header dựa trên có row con nào visible không
                row.style.display = '';
                return;
            }
            const nameCell = row.cells[1];
            if (!nameCell) return;

            const name = nameCell.textContent.toLowerCase();
            row.style.display = (!keyword || name.includes(keyword)) ? '' : 'none';
        });

        // Ẩn group header nếu không có row con nào visible
        let currentGroup = null;
        let hasVisibleChild = false;
        rows.forEach(row => {
            if (row.classList.contains('group-header')) {
                // Xử lý group trước đó
                if (currentGroup && !hasVisibleChild) {
                    currentGroup.style.display = 'none';
                }
                currentGroup = row;
                hasVisibleChild = false;
            } else {
                if (row.style.display !== 'none') {
                    hasVisibleChild = true;
                }
            }
        });
        // Xử lý group cuối cùng
        if (currentGroup && !hasVisibleChild) {
            currentGroup.style.display = 'none';
        }
    }

    // ==================== INITIALIZATION ====================

    function init() {
        // Chèn nút toggle vào controls-container (sau nút "Thống kê khoa")
        const btnSwitchToKhoa = document.getElementById('btnSwitchToKhoa');
        if (btnSwitchToKhoa) {
            const toggleBtn = createToggleButton();
            btnSwitchToKhoa.parentNode.insertBefore(toggleBtn, btnSwitchToKhoa.nextSibling);
        }

        // Chèn container bảng rút gọn sau #renderInfo
        const renderInfo = document.getElementById('renderInfo');
        if (renderInfo) {
            const compactContainer = createCompactContainer();
            renderInfo.parentNode.insertBefore(compactContainer, renderInfo.nextSibling);
        }

        // Lắng nghe sự kiện filter để đồng bộ với bảng rút gọn
        const filterInput = document.getElementById('filterGiangVien');
        if (filterInput) {
            filterInput.addEventListener('input', filterCompactTable);
        }

        // Hook vào loadData: khi bảng chính render xong, cập nhật bảng rút gọn nếu đang ở compact mode
        const originalRenderTable = window.renderTable;
        if (typeof originalRenderTable === 'function') {
            window.renderTable = function (data) {
                originalRenderTable(data);
                if (isCompactMode) {
                    renderCompactTable(data);
                }
            };
        }

        // Expose để có thể gọi từ bên ngoài nếu cần
        window.toggleCompactMode = toggleCompactMode;
        window.renderCompactTable = renderCompactTable;
    }

    // Khởi tạo khi DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
````

## File: src/repositories/vuotgio_v2/dataLock.repo.js
````javascript
const LOCK_TABLE = "vg_khoa_du_lieu";
const LNQC_TABLE = "vg_lop_ngoai_quy_chuan";
const KTHP_TABLE = "vg_coi_cham_ra_de";
const HDTQ_TABLE = "vg_huong_dan_tham_quan_thuc_te";
const NAMHOC_TABLE = "namhoc";
const NHANVIEN_TABLE = "nhanvien";

/**
 * Lấy bản ghi khóa theo năm học
 * @param {Connection} connection
 * @param {string} namHoc - Năm học (e.g. "2025 - 2026")
 * @returns {Promise<object|null>} Bản ghi khóa hoặc null
 */
const getLockRecord = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT id, nam_hoc, ngay_khoa, nguoi_khoa_id, ghi_chu
         FROM ${LOCK_TABLE}
         WHERE nam_hoc = ?`,
        [namHoc]
    );
    return rows[0] || null;
};

/**
 * Lấy bản ghi khóa kèm tên người khóa (JOIN với bảng nhanvien)
 * @param {Connection} connection
 * @param {string} namHoc
 * @returns {Promise<object|null>} Bản ghi khóa với tên người khóa hoặc null
 */
const getLockRecordWithUserName = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT kd.id, kd.nam_hoc, kd.ngay_khoa, kd.nguoi_khoa_id, kd.ghi_chu,
                nv.TenNhanVien AS nguoi_khoa
         FROM ${LOCK_TABLE} kd
         LEFT JOIN ${NHANVIEN_TABLE} nv ON nv.id_User = kd.nguoi_khoa_id
         WHERE kd.nam_hoc = ?`,
        [namHoc]
    );
    return rows[0] || null;
};

/**
 * Thêm bản ghi khóa mới
 * @param {Connection} connection
 * @param {{namHoc: string, userId: number, ghiChu: string|null}} data
 * @returns {Promise<object>} Insert result
 */
const insertLockRecord = async (connection, { namHoc, userId, ghiChu }) => {
    const [result] = await connection.execute(
        `INSERT INTO ${LOCK_TABLE} (nam_hoc, ngay_khoa, nguoi_khoa_id, ghi_chu)
         VALUES (?, NOW(), ?, ?)`,
        [namHoc, userId, ghiChu || null]
    );
    return result;
};

/**
 * Truy vấn số bản ghi chưa duyệt 2 cấp trên 3 bảng song song
 * @param {Connection} connection
 * @param {string} namHoc
 * @returns {Promise<Array<{table: string, total: number, unapproved: number}>>}
 *
 * Điều kiện duyệt 2 cấp:
 * - vg_lop_ngoai_quy_chuan: khoa_duyet = 1 AND dao_tao_duyet = 1
 * - vg_coi_cham_ra_de: khoa_duyet = 1 AND khao_thi_duyet = 1
 * - vg_huong_dan_tham_quan_thuc_te: khoa_duyet = 1 AND dao_tao_duyet = 1
 */
const getUnapprovedCounts = async (connection, namHoc) => {
    const queries = [
        {
            table: "Lớp ngoài quy chuẩn",
            tableName: LNQC_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND dao_tao_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${LNQC_TABLE}
                     WHERE nam_hoc = ?`,
        },
        {
            table: "Coi chấm ra đề",
            tableName: KTHP_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND khao_thi_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${KTHP_TABLE}
                     WHERE nam_hoc = ?`,
        },
        {
            table: "Hướng dẫn tham quan thực tế",
            tableName: HDTQ_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND dao_tao_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${HDTQ_TABLE}
                     WHERE nam_hoc = ?`,
        },
    ];

    const results = await Promise.all(
        queries.map(async ({ table, tableName, query }) => {
            const [rows] = await connection.execute(query, [namHoc]);
            const { total, unapproved } = rows[0];
            return {
                table,
                tableName,
                total: Number(total) || 0,
                unapproved: Number(unapproved) || 0,
            };
        })
    );

    return results;
};

/**
 * Kiểm tra năm học có tồn tại trong bảng namhoc
 * @param {Connection} connection
 * @param {string} namHoc
 * @returns {Promise<boolean>}
 */
const checkNamHocExists = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT NamHoc FROM ${NAMHOC_TABLE} WHERE NamHoc = ?`,
        [namHoc]
    );
    return rows.length > 0;
};

module.exports = {
    LOCK_TABLE,
    getLockRecord,
    getLockRecordWithUserName,
    insertLockRecord,
    getUnapprovedCounts,
    checkNamHocExists,
};
````

## File: src/repositories/vuotgio_v2/datn.repo.js
````javascript
/**
 * VUOT GIO V2 - Đồ án tốt nghiệp Repository
 */

const buildKhoaFilter = (khoa, field, params) => {
    if (khoa && khoa !== "ALL") {
        params.push(khoa);
        return ` AND ${field} = ?`;
    }
    return "";
};

const getTable = async (connection, { namHoc, dot, ki, khoa, heDaoTao }) => {
    let query = `
        SELECT 
            ID,
            GiangVien,
            MaPhongBan AS Khoa,
            SinhVien,
            khoa_sinh_vien AS KhoaSV,
            TenDeTai,
            SoTiet
        FROM exportdoantotnghiep
        WHERE isMoiGiang = 0
    `;
    const params = [];

    if (namHoc) {
        query += ` AND NamHoc = ?`;
        params.push(namHoc);
    }
    if (dot) {
        query += ` AND Dot = ?`;
        params.push(dot);
    }
    if (ki) {
        query += ` AND Ki = ?`;
        params.push(ki);
    }
    query += buildKhoaFilter(khoa, "MaPhongBan", params);
    if (heDaoTao) {
        query += ` AND he_dao_tao = ?`;
        params.push(heDaoTao);
    }

    query += ` ORDER BY MaPhongBan, GiangVien, SinhVien`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const getChiTiet = async (connection, { giangVien, namHoc, dot, ki, khoa, heDaoTao }) => {
    let query = `
        SELECT 
            ID,
            SinhVien,
            MaSV,
            khoa_sinh_vien AS KhoaSV,
            nganh AS Nganh,
            TenDeTai,
            GiangVien,
            SoTiet,
            NgayBatDau,
            NgayKetThuc,
            MaPhongBan AS Khoa,
            SoQD,
            isHDChinh
        FROM exportdoantotnghiep
        WHERE isMoiGiang = 0 AND GiangVien = ?
    `;
    const params = [giangVien];

    if (namHoc) {
        query += ` AND NamHoc = ?`;
        params.push(namHoc);
    }
    if (dot) {
        query += ` AND Dot = ?`;
        params.push(dot);
    }
    if (ki) {
        query += ` AND Ki = ?`;
        params.push(ki);
    }
    query += buildKhoaFilter(khoa, "MaPhongBan", params);
    if (heDaoTao) {
        query += ` AND he_dao_tao = ?`;
        params.push(heDaoTao);
    }

    query += ` ORDER BY SinhVien`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

module.exports = {
    getTable,
    getChiTiet
};
````

## File: src/repositories/vuotgio_v2/giangDay.repo.js
````javascript
/**
 * VUOT GIO V2 - Giảng dạy (TKB) Repository
 */

const buildKhoaFilter = (khoa, field, params) => {
    if (khoa && khoa !== "ALL") {
        params.push(khoa);
        return ` AND ${field} = ?`;
    }
    return "";
};

const getStatistics = async (connection, { dot, ki, namHoc, khoa, heDaoTao }) => {
    const BASE_CONDITION = "id_User IS NOT NULL AND id_User <> 1";
    let query = `
        SELECT
            id_User,
            GiangVien,
            TenHocPhan,
            Lop,
            SoTC,
            Dot,
            HocKy,
            NamHoc,
            QuyChuan,
            Khoa,
            he_dao_tao
        FROM giangday
        WHERE ${BASE_CONDITION}
    `;

    const params = [];

    if (dot && dot !== "ALL") {
        query += " AND Dot = ?";
        params.push(dot);
    }
    if (ki && ki !== "ALL") {
        query += " AND HocKy = ?";
        params.push(ki);
    }
    if (namHoc && namHoc !== "ALL") {
        query += " AND NamHoc = ?";
        params.push(namHoc);
    }
    query += buildKhoaFilter(khoa, "Khoa", params);
    if (heDaoTao && heDaoTao !== "ALL") {
        query += " AND he_dao_tao = ?";
        params.push(heDaoTao);
    }

    query += ` ORDER BY GiangVien ASC, TenHocPhan ASC, Lop ASC`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const getDistinctValues = async (connection, column) => {
    const BASE_CONDITION = "id_User IS NOT NULL AND id_User <> 1";
    const [rows] = await connection.execute(
        `SELECT DISTINCT ${column} FROM giangday WHERE ${BASE_CONDITION} ORDER BY ${column} ${column === 'NamHoc' ? 'DESC' : 'ASC'}`
    );
    return rows.map(r => r[column]);
};

module.exports = {
    getStatistics,
    getDistinctValues
};
````

## File: src/repositories/vuotgio_v2/lnqc.repo.js
````javascript
const LNQC_TABLE = "vg_lop_ngoai_quy_chuan";
const DRAFT_TABLE = "course_schedule_details";

const buildDraftSelect = () => `
    id,
    course_id,
    course_name,
    course_code,
    major,
    lecturer,
    start_date,
    end_date,
    ll_total,
    credit_hours,
    ll_code,
    student_quantity,
    student_bonus,
    bonus_time,
    qc,
    dot,
    ki_hoc,
    nam_hoc,
    note,
    he_dao_tao
`;

const buildOfficialSelect = () => `
    id AS ID,
    id_user,
    tt,
    so_tin_chi AS SoTinChi,
    so_tin_chi,
    lop_hoc_phan AS LopHocPhan,
    lop_hoc_phan,
    ma_bo_mon AS MaBoMon,
    ma_bo_mon,
    ll AS LL,
    so_tiet_ctdt AS SoTietCTDT,
    so_tiet_ctdt,
    he_so_t7cn AS HeSoT7CN,
    he_so_t7cn,
    so_sv AS SoSV,
    he_so_lop_dong AS HeSoLopDong,
    he_so_lop_dong,
    quy_chuan AS QuyChuan,
    quy_chuan,
    hoc_ky AS KiHoc,
    hoc_ky,
    nam_hoc AS NamHoc,
    nam_hoc,
    ma_hoc_phan AS MaHocPhan,
    ma_hoc_phan,
    giang_vien AS GiangVien,
    giang_vien,
    giao_vien_giang_day AS GiaoVienGiangDay,
    giao_vien_giang_day,
    moi_giang AS MoiGiang,
    moi_giang,
    he_dao_tao_id AS he_dao_tao,
    ten_lop AS TenLop,
    ten_lop,
    khoa_duyet AS KhoaDuyet,
    dao_tao_duyet AS DaoTaoDuyet,
    tai_chinh_duyet AS TaiChinhDuyet,
    ngay_bat_dau AS NgayBatDau,
    ngay_ket_thuc AS NgayKetThuc,
    khoa AS Khoa,
    dot AS Dot,
    ghi_chu AS GhiChu,
    ghi_chu,
    hoan_thanh AS HoanThanh,
    0 AS DaLuu
`;

const getDraftTable = async (connection, { dot, kiHoc, namHoc, khoa }) => {
    let query = `
        SELECT ${buildDraftSelect()}
        FROM ${DRAFT_TABLE}
        WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? AND da_luu = 0 AND class_type = ?
    `;
    const params = [dot, kiHoc, namHoc, "ngoai_quy_chuan"];

    if (khoa && khoa !== "ALL") {
        query += ` AND major = ?`;
        params.push(khoa);
    }

    query += ` ORDER BY lecturer, course_name`;
    const [rows] = await connection.execute(query, params);
    return rows;
};

const insertDraft = async (connection, values) => {
    const query = `
        INSERT INTO ${DRAFT_TABLE}
        (tt, course_code, credit_hours, student_quantity, student_bonus, bonus_time,
         ll_code, ll_total, qc, course_name, lecturer, major, he_dao_tao, course_id,
         start_date, end_date, dot, ki_hoc, nam_hoc, note, class_type, da_luu)
        VALUES ?
    `;

    return connection.query(query, [values]);
};

const getDraftMaxTT = async (connection, { dot, kiHoc, namHoc }) => {
    const [rows] = await connection.query(
        `SELECT MAX(tt) AS maxTT FROM ${DRAFT_TABLE} WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ?`,
        [dot, kiHoc, namHoc]
    );
    return rows[0]?.maxTT || 0;
};

const updateDraftSaved = async (connection, { dot, kiHoc, namHoc, major, excludedIds }) => {
    let query = `UPDATE ${DRAFT_TABLE} SET da_luu = 1 WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? AND class_type = ?`;
    const params = [dot, kiHoc, namHoc, "ngoai_quy_chuan"];

    if (major === "ALL" && excludedIds.length > 0) {
        query += ` AND id NOT IN (${excludedIds.join(", ")})`;
    } else if (major !== "ALL") {
        query += ` AND major = ?`;
        params.push(major);
    }

    return connection.query(query, params);
};

const deleteDraftByFilter = async (connection, { namHoc, kiHoc, dot, major }) => {
    let query = `DELETE FROM ${DRAFT_TABLE} WHERE nam_hoc = ? AND class_type = ? AND da_luu = 0`;
    const params = [namHoc, "ngoai_quy_chuan"];

    if (kiHoc) {
        query += ` AND ki_hoc = ?`;
        params.push(kiHoc);
    }
    if (dot) {
        query += ` AND dot = ?`;
        params.push(dot);
    }
    if (major && major !== "ALL") {
        query += ` AND major = ?`;
        params.push(major);
    }

    return connection.execute(query, params);
};

const getOfficialTable = async (connection, { namHoc, khoa }) => {
    let query = `
        SELECT ${buildOfficialSelect()}
        FROM ${LNQC_TABLE}
        WHERE nam_hoc = ?
    `;
    const params = [namHoc];

    if (khoa && khoa !== "ALL") {
        query += ` AND khoa = ?`;
        params.push(khoa);
    }

    query += ` ORDER BY giang_vien, lop_hoc_phan`;
    const [rows] = await connection.execute(query, params);
    return rows;
};

const insertOfficialBatch = async (connection, insertValues) => {
    const query = `
        INSERT INTO ${LNQC_TABLE}
        (tt, so_tin_chi, lop_hoc_phan, ma_bo_mon, id_user, ll, so_tiet_ctdt, he_so_t7cn,
         so_sv, he_so_lop_dong, quy_chuan, hoc_ky, nam_hoc, ma_hoc_phan, giang_vien,
         giao_vien_giang_day, moi_giang, he_dao_tao_id, ten_lop, khoa_duyet, dao_tao_duyet,
         tai_chinh_duyet, ngay_bat_dau, ngay_ket_thuc, khoa, dot, ghi_chu, hoan_thanh)
        VALUES ?
    `;
    return connection.query(query, [insertValues]);
};

const updateOfficial = async (connection, id, values) => {
    const query = `
        UPDATE ${LNQC_TABLE} SET
            nam_hoc = ?, hoc_ky = ?, lop_hoc_phan = ?, ma_hoc_phan = ?, so_tin_chi = ?,
            ten_lop = ?, ll = ?, so_sv = ?, so_tiet_ctdt = ?, he_so_t7cn = ?,
            he_so_lop_dong = ?, quy_chuan = ?, giang_vien = ?, khoa = ?,
            he_dao_tao_id = ?, ghi_chu = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?,
            tt = ?, ma_bo_mon = ?, giao_vien_giang_day = ?, moi_giang = ?,
            dot = ?, hoan_thanh = ?
        WHERE id = ?
    `;
    return connection.execute(query, [...values, id]);
};

const deleteOfficial = async (connection, id) => connection.execute(`DELETE FROM ${LNQC_TABLE} WHERE id = ?`, [id]);

const updateApproval = async (connection, id, column, value) =>
    connection.execute(`UPDATE ${LNQC_TABLE} SET ${column} = ? WHERE id = ?`, [value, id]);

const batchUpdateApproval = async (connection, groups) => {
    let updatedCount = 0;
    for (const [key, ids] of Object.entries(groups)) {
        const [khoa, daoTao] = key.split("_").map(Number);
        const [result] = await connection.query(
            `UPDATE ${LNQC_TABLE} SET khoa_duyet = ?, dao_tao_duyet = ? WHERE id IN (?)`,
            [khoa, daoTao, ids]
        );
        updatedCount += result.affectedRows;
    }
    return updatedCount;
};

const getLecturerIdsByNames = async (connection, names) => {
    if (!names || names.length === 0) return new Map();
    const placeholders = names.map(() => "?").join(", ");
    const [rows] = await connection.query(
        `SELECT id_User, TenNhanVien FROM nhanvien WHERE TenNhanVien IN (${placeholders})`,
        names
    );
    const map = new Map();
    rows.forEach((row) => map.set(row.TenNhanVien, row.id_User));
    return map;
};

const getKhoaList = async (connection) => {
    const [rows] = await connection.query(`SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`);
    return rows.map((row) => row.MaPhongBan);
};

module.exports = {
    LNQC_TABLE,
    buildDraftSelect,
    buildOfficialSelect,
    getDraftTable,
    insertDraft,
    getDraftMaxTT,
    updateDraftSaved,
    deleteDraftByFilter,
    getOfficialTable,
    insertOfficialBatch,
    updateOfficial,
    deleteOfficial,
    updateApproval,
    batchUpdateApproval,
    getLecturerIdsByNames,
    getKhoaList,
};
````

## File: src/repositories/vuotgio_v2/shared.repo.js
````javascript
const getTeachers = async (connection, khoa) => {
    let query = `SELECT id_User, TenNhanVien AS HoTen, MaPhongBan AS Khoa FROM nhanvien WHERE 1=1`;
    const params = [];

    if (khoa && khoa !== "ALL") {
        query += ` AND MaPhongBan = ?`;
        params.push(khoa);
    }

    query += ` ORDER BY TenNhanVien`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const getHocPhan = async (connection) => {
    const query = `
        SELECT DISTINCT TenHP, MaHP, SoTC
        FROM quychuan
        ORDER BY TenHP
    `;

    const [rows] = await connection.execute(query);
    return rows;
};

const getLopHoc = async (connection, namHoc) => {
    let query = `SELECT DISTINCT MaLop FROM giangday WHERE 1=1`;
    const params = [];

    if (namHoc) {
        query += ` AND NamHoc = ?`;
        params.push(namHoc);
    }

    query += ` ORDER BY MaLop`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const getDinhMuc = async (connection) => {
    const [rows] = await connection.execute(
        `SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1`
    );

    return rows[0] || null;
};

module.exports = {
    getTeachers,
    getHocPhan,
    getLopHoc,
    getDinhMuc,
};
````

## File: src/services/vuotgio_v2/datn.service.js
````javascript
/**
 * VUOT GIO V2 - Đồ án tốt nghiệp Service
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/datn.repo");

const withConnection = async (connection, callback) => {
    let shouldRelease = false;
    if (!connection) {
        connection = await createPoolConnection();
        shouldRelease = true;
    }
    try {
        return await callback(connection);
    } finally {
        if (shouldRelease && connection) {
            connection.release();
        }
    }
};

const getTable = async (filters) => withConnection(null, async (connection) => {
    const rows = await repo.getTable(connection, filters);
    const tongSoTiet = rows.reduce((sum, row) => sum + (parseFloat(row.SoTiet) || 0), 0);
    return {
        data: rows,
        tongSoTiet
    };
});

const getChiTiet = async (params) => withConnection(null, async (connection) => {
    const rows = await repo.getChiTiet(connection, params);
    const tongSoTiet = rows.reduce((sum, row) => sum + (parseFloat(row.SoTiet) || 0), 0);
    return {
        data: rows,
        giangVien: params.giangVien,
        tongSoTiet
    };
});

module.exports = {
    getTable,
    getChiTiet
};
````

## File: src/services/vuotgio_v2/department_excel/components/header.component.js
````javascript
/**
 * Header Component - Handles header creation for department sheets (36 columns)
 */

const CellFormatter = require("../../shared_excel/core/cell.formatter");
const DepartmentLayout = require("../layouts/department.layout");

class HeaderComponent {
  /**
   * Create department sheet header with 36 columns (A1:AJ)
   */
  static createDepartmentHeader(worksheet, { khoa, namHoc }) {
    const colors = DepartmentLayout.getColors();

    // Title row (A1:AJ1)
    CellFormatter.mergeAndStyle(worksheet, 1, 1, 1, 36, 
      `DANH SÁCH GIẢNG VIÊN VƯỢT GIỜ NĂM ${namHoc || ""}`, 
      { 
        title: true, 
        bgColor: colors.titleFill.fgColor.argb,
        fontSize: 15
      }
    );

    // Subheader: khoa (A2:AJ2)
    CellFormatter.mergeAndStyle(worksheet, 2, 1, 2, 36, 
      `KHOA : ${khoa || ""}`, 
      { 
        title: true, 
        fontSize: 13, 
        bgColor: colors.titleFill.fgColor.argb
      }
    );

    return 3; // Next available row
  }

  /**
   * Create department column headers (36 columns structure)
   */
  static createDepartmentColumnHeaders(worksheet, startRow) {
    const colors = DepartmentLayout.getColors();

    // Helper function to style headers
    const styleHeader = (cell, fill, wrapText = true) => {
      cell.fill = fill;
      cell.font = { bold: true, size: 12.5, color: { argb: "FFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText };
      CellFormatter.applyBorder(cell);
    };

    const styleSubHeader = (cell, fill) => {
      cell.fill = fill;
      cell.font = { bold: true, size: 11.5 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      CellFormatter.applyBorder(cell);
    };

    // Row 3-5 headers (main headers)
    // A3:A5 - STT
    CellFormatter.mergeAndStyle(worksheet, startRow, 1, startRow + 2, 1, "STT", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // B3:B5 - Họ tên Giảng viên
    CellFormatter.mergeAndStyle(worksheet, startRow, 2, startRow + 2, 2, "Họ tên Giảng viên", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // C3:C5 - Thu nhập
    CellFormatter.mergeAndStyle(worksheet, startRow, 3, startRow + 2, 3, "Thu nhập", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // D3:D5 - Định mức giờ giảng
    CellFormatter.mergeAndStyle(worksheet, startRow, 4, startRow + 2, 4, "Định mức giờ giảng", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // E3:E5 - Được giảm
    CellFormatter.mergeAndStyle(worksheet, startRow, 5, startRow + 2, 5, "Được giảm", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // F3:F5 - Số tiết chưa hoàn thành NCKH
    CellFormatter.mergeAndStyle(worksheet, startRow, 6, startRow + 2, 6, "Số tiết chưa hoàn thành NCKH", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });
    // G3:G5 - Định mức phải giảng
    CellFormatter.mergeAndStyle(worksheet, startRow, 7, startRow + 2, 7, "Định mức phải giảng", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // H3:V3 - Thực tế giảng dạy + coi, ra đề, chấm thi + ĐATN + HDTQ
    CellFormatter.mergeAndStyle(worksheet, startRow, 8, startRow, 22, "Thực tế giảng dạy + coi, ra đề, chấm thi + ĐATN + HDTQ", {
      header: true, bgColor: colors.teachingFill.fgColor.argb, fontSize: 12.5
    });

    // W3:AB3 - Số tiết vượt định mức
    CellFormatter.mergeAndStyle(worksheet, startRow, 23, startRow, 28, "Số tiết vượt định mức", {
      header: true, bgColor: colors.overFill.fgColor.argb, fontSize: 12.5
    });

    // AC3:AC5 - Mức TT chuẩn
    CellFormatter.mergeAndStyle(worksheet, startRow, 29, startRow + 2, 29, "Mức TT chuẩn", {
      header: true, bgColor: colors.rateFill.fgColor.argb, fontSize: 12.5
    });

    // AD3:AI3 - Thành tiền
    CellFormatter.mergeAndStyle(worksheet, startRow, 30, startRow, 35, "Thành tiền", {
      header: true, bgColor: colors.moneyFill.fgColor.argb, fontSize: 12.5
    });

    // AJ3:AJ5 - Thực nhận
    CellFormatter.mergeAndStyle(worksheet, startRow, 36, startRow + 2, 36, "Thực nhận", {
      header: true, bgColor: colors.netFill.fgColor.argb, fontSize: 12.5
    });

    // Row 4 sub-headers
    // H4:L4 - Học kỳ I (bao gồm ĐATN + HDTQ vì không có thông tin HK)
    CellFormatter.mergeAndStyle(worksheet, startRow + 1, 8, startRow + 1, 12, "Học kỳ I (gồm ĐA & TQ)", {
      header: true, bgColor: colors.teachingSubFill.fgColor.argb, fontSize: 12.5, wrapText: false
    });

    // M4:Q4 - Học kỳ II
    CellFormatter.mergeAndStyle(worksheet, startRow + 1, 13, startRow + 1, 17, "Học kỳ II", {
      header: true, bgColor: colors.teachingSubFill.fgColor.argb, fontSize: 12.5, wrapText: false
    });

    // R4:V4 - Cả năm
    CellFormatter.mergeAndStyle(worksheet, startRow + 1, 18, startRow + 1, 22, "Cả năm", {
      header: true, bgColor: colors.teachingSubFill.fgColor.argb, fontSize: 12.5, wrapText: false
    });

    // W4:AB4 - Empty (vượt định mức)
    CellFormatter.mergeAndStyle(worksheet, startRow + 1, 23, startRow + 1, 28, "", {
      header: true, bgColor: colors.overSubFill.fgColor.argb, fontSize: 12.5, wrapText: false
    });

    // AD4:AI4 - Empty (thành tiền)
    CellFormatter.mergeAndStyle(worksheet, startRow + 1, 30, startRow + 1, 35, "", {
      header: true, bgColor: colors.moneySubFill.fgColor.argb, fontSize: 12.5, wrapText: false
    });

    // Row 5 detailed sub-headers
    const subHeaders = [
      [8, "VN"], [9, "Lào"], [10, "Cuba"], [11, "CPC"], [12, "Đóng HP"],        // H5:L5 - HK1
      [13, "VN"], [14, "Lào"], [15, "Cuba"], [16, "CPC"], [17, "Đóng HP"],       // M5:Q5 - HK2
      [18, "VN"], [19, "Lào"], [20, "Cuba"], [21, "CPC"], [22, "Đóng HP"],       // R5:V5 - Cả năm
      [23, "VN"], [24, "Lào"], [25, "Cuba"], [26, "CPC"], [27, "Đóng HP"], [28, "Tổng"], // W5:AB5 - Vượt
      [30, "VN"], [31, "Lào"], [32, "Cuba"], [33, "CPC"], [34, "Đóng HP"], [35, "Tổng"]  // AD5:AI5 - Thành tiền
    ];

    subHeaders.forEach(([colIndex, label]) => {
      const cell = worksheet.getCell(startRow + 2, colIndex);
      cell.value = label;
      
      // Determine fill color based on column position
      let fillColor;
      if (colIndex >= 8 && colIndex <= 22) {
        fillColor = colors.columnSubFill;
      } else if (colIndex >= 23 && colIndex <= 28) {
        fillColor = colors.columnOverSubFill;
      } else if (colIndex >= 30 && colIndex <= 35) {
        fillColor = colors.columnMoneySubFill;
      } else {
        fillColor = colors.baseFill;
      }
      
      styleSubHeader(cell, fillColor);
    });

    return startRow + 3; // Next available row (row 6)
  }

  /**
   * Create master sheet header (simplified version)
   */
  static createMasterHeader(worksheet, { namHoc }) {
    CellFormatter.mergeAndStyle(worksheet, 1, 1, 1, 7, 
      `TỔNG HỢP VƯỢT GIỜ - ${namHoc || ""}`, 
      { title: true, bgColor: "203864" }
    );

    return 2; // Next available row
  }

  /**
   * Create payment sheet header
   */
  static createPaymentHeader(worksheet, { namHoc, khoa }) {
    CellFormatter.mergeAndStyle(worksheet, 1, 1, 1, 7, 
      "TIỀN CHUYỂN KHOẢN", 
      { title: true, bgColor: "1F4E79" }
    );

    if (khoa) {
      CellFormatter.mergeAndStyle(worksheet, 2, 1, 2, 7, 
        `Khoa/Phòng: ${khoa}`, 
        { title: true, fontSize: 12.5, bgColor: "D9EAF7", fontColor: "000000" }
      );
    }

    CellFormatter.mergeAndStyle(worksheet, khoa ? 3 : 2, 1, khoa ? 3 : 2, 7, 
      `Năm học: ${namHoc || ""}`, 
      { title: true, fontSize: 12.5, bgColor: khoa ? "D9EAF7" : "1F4E79", fontColor: khoa ? "000000" : "FFFFFF" }
    );

    return khoa ? 4 : 3; // Next available row
  }

  /**
   * Create master sheet column headers
   */
  static createMasterColumnHeaders(worksheet, startRow) {
    const headers = [
      "STT", "Khoa/Phòng", "Số giảng viên", "Tiết thực hiện", 
      "Tiết vượt", "Thanh toán", "Ghi chú"
    ];

    headers.forEach((label, index) => {
      const cell = worksheet.getCell(startRow, index + 1);
      cell.value = label;
      CellFormatter.applyHeaderStyle(cell, { bgColor: "4472C4" });
    });

    return startRow + 1; // Next available row
  }

  /**
   * Create payment sheet column headers
   */
  static createPaymentColumnHeaders(worksheet, startRow) {
    const headers = [
      "STT", "Khoa/Phòng", "Số tiền", "Ghi chú", "", "", ""
    ];

    headers.forEach((label, index) => {
      const cell = worksheet.getCell(startRow, index + 1);
      cell.value = label;
      CellFormatter.applyHeaderStyle(cell, { bgColor: "A9D08E", fontColor: "000000" });
    });

    return startRow + 1; // Next available row
  }
}

module.exports = HeaderComponent;
````

## File: src/services/vuotgio_v2/department_excel/generators/consolidated.generator.js
````javascript
/**
 * Consolidated Generator — Generates the full multi-department workbook (Type B).
 *
 * Sheet order:
 *   1. [N] Sheet per Khoa/Phòng   — DepartmentGenerator (36 columns per khoa)
 *      → isKhoa=0 units are merged into ONE sheet: "Ban giám đốc & các phòng"
 *   2. Sheet "TỔNG HỢP"           — MasterSheetGenerator (mirrors tongHopGV.ejs)
 *   3. Sheet "Tiền chuyển khoản"  — PaymentGenerator (flat GV list)
 */

const WorkbookFactory      = require('../../shared_excel/core/workbook.factory');
const DepartmentGenerator  = require('./department.generator');
const MasterSheetGenerator = require('./master.generator');
const PaymentGenerator     = require('./payment.generator');
const DataAggregator       = require('../data/aggregator');
const tongHopService       = require('../../tongHop.service.js');
const createPoolConnection = require('../../../../config/databasePool.js');

class ConsolidatedGenerator {
    /**
     * Generate the full consolidated workbook for all departments.
     *
     * @param {string} namHoc
     * @returns {Promise<ExcelJS.Workbook>}
     */
    static async generateConsolidatedWorkbook(namHoc) {
        if (!namHoc) throw new Error('Thiếu thông tin Năm học');

        let connection;
        try {
            connection = await createPoolConnection();

            // ── 1. Fetch all Atomic SDOs ─────────────────────────────────────────
            const allSummaries = await tongHopService.getCollectionSDODetail(namHoc, 'ALL');
            if (!allSummaries.length) throw new Error('Không có dữ liệu để xuất file');

            console.info('[ConsolidatedGenerator] start', {
                namHoc,
                totalSDOs: allSummaries.length,
            });

            // ── 2. Group by department ───────────────────────────────────────────
            // - isKhoa=1 → one group per khoa
            // - isKhoa=0 → all merged into "Ban giám đốc & các phòng" (last in list)
            const departmentList = DataAggregator.groupByDepartment(allSummaries);

            // ── 3. Create workbook ───────────────────────────────────────────────
            const workbook = WorkbookFactory.createWorkbook({
                title  : `Tổng hợp vượt giờ ${namHoc}`,
                subject: `Báo cáo vượt giờ V2 ${namHoc}`,
                creator: 'VuotGioV2',
            });

            // ── 4. Department sheets ─────────────────────────────────────────────
            for (const dept of departmentList) {
                const result = DepartmentGenerator.createDepartmentSheet(workbook, {
                    khoa     : dept.khoa,
                    maKhoa   : dept.maKhoa,
                    summaries: dept.summaries,
                    namHoc,
                    isExport : true,   // ← Excel formulas for dynamic recalculation
                });
                // Write back actual totals for use in master/payment sheets
                dept.totalThanhToan = result.totalThanhToan;
                dept.totalVuot      = result.totalVuot;
                dept.dataRowCount   = result.dataRowCount;
            }

            // ── 5. Master summary sheet (mirrors tongHopGV.ejs) ─────────────────
            MasterSheetGenerator.createMasterSheet(workbook, { departmentList, namHoc, isExport: true });

            // ── 6. Payment sheet (flat list of all lecturers, sorted by dept) ────
            PaymentGenerator.createPaymentSheet(workbook, {
                summaries: allSummaries,
                namHoc,
            });

            return workbook;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Return structured preview data (no Excel generated).
     * Used by the web UI preview endpoint.
     *
     * @param {string} namHoc
     */
    static async getConsolidatedPreviewData(namHoc) {
        if (!namHoc) throw new Error('Thiếu thông tin Năm học');

        let connection;
        try {
            connection = await createPoolConnection();
            const allSummaries = await tongHopService.getCollectionSDODetail(namHoc, 'ALL');
            if (!allSummaries.length) throw new Error('Không có dữ liệu để xuất file');
            return DataAggregator.createConsolidatedData(namHoc, allSummaries);
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = ConsolidatedGenerator;
````

## File: src/services/vuotgio_v2/department_excel/generators/department.generator.js
````javascript
/**
 * Department Generator - Generates single department Excel sheets
 *
 * Hybrid mode:
 *   createDepartmentSheet with isExport=false (default) → static values (preview/PDF)
 *   generateDepartmentWorkbook                         → Excel formulas (file export)
 */

const WorkbookFactory = require("../../shared_excel/core/workbook.factory");
const HeaderComponent = require("../components/header.component");
const SummaryComponent = require("../components/summary.component");
const DepartmentLayout = require("../layouts/department.layout");

class DepartmentGenerator {
  /**
   * Generate department sheet in existing workbook.
   *
   * @param {ExcelJS.Workbook} workbook
   * @param {object} opts
   * @param {string}  opts.khoa
   * @param {string}  [opts.maKhoa]
   * @param {Array}   opts.summaries
   * @param {string}  opts.namHoc
   * @param {boolean} [opts.isExport=false] - true → write Excel formulas; false → static values
   */
  static createDepartmentSheet(workbook, { khoa, maKhoa, summaries, namHoc, isExport = false }) {
    const sheetName = WorkbookFactory.sanitizeWorksheetName(khoa || maKhoa || "Khác", "PreviewKhoa");
    const worksheet = WorkbookFactory.createWorksheet(workbook, sheetName, {
      frozenRows: 5,
      pageSetup: {
        orientation: "landscape",
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        margins: {
          left: 0.2,
          right: 0.2,
          top: 0.25,
          bottom: 0.25,
          header: 0.1,
          footer: 0.1,
        },
      }
    });

    // Apply layout (36 columns)
    DepartmentLayout.applyLayout(worksheet);

    // Create header (rows 1-2)
    let currentRow = HeaderComponent.createDepartmentHeader(worksheet, { khoa, namHoc });
    
    // Create column headers (rows 3-5)
    currentRow = HeaderComponent.createDepartmentColumnHeaders(worksheet, currentRow);

    // Create summary table — pass isExport flag for hybrid formula/value mode
    const result = SummaryComponent.createDepartmentSummaryTable(
      worksheet, summaries, currentRow, { isExport }
    );

    return {
      sheet: worksheet,
      totalThanhToan: result.totalThanhToan,
      totalVuot: result.totalVuot,
      dataRowCount: result.dataRowCount
    };
  }

  /**
   * Generate standalone department workbook for file download.
   * Uses isExport=true → Excel formulas for dynamic recalculation.
   */
  static generateDepartmentWorkbook({ summaries, khoa, namHoc }) {
    const workbook = WorkbookFactory.createWorkbook({
      title: `Department Report - ${khoa}`,
      subject: `Vượt giờ ${namHoc}`
    });

    this.createDepartmentSheet(workbook, { khoa, summaries, namHoc, isExport: true });

    return workbook;
  }
}

module.exports = DepartmentGenerator;
````

## File: src/services/vuotgio_v2/department_excel/generators/payment.generator.js
````javascript
/**
 * Payment Generator - Generates payment sheets for bank transfers
 */

const WorkbookFactory = require("../../shared_excel/core/workbook.factory");
const HeaderComponent = require("../components/header.component");
const SummaryComponent = require("../components/summary.component");
const PaymentLayout = require("../layouts/payment.layout");

class PaymentGenerator {
  /**
   * Create payment sheet in existing workbook
   */
  static createPaymentSheet(workbook, { summaries, khoa, namHoc }) {
    const sheetName = WorkbookFactory.sanitizeWorksheetName("Tiền chuyển khoản", "TienChuyenKhoan");
    const worksheet = WorkbookFactory.createWorksheet(workbook, sheetName, {
      frozenRows: 4,
      pageSetup: {
        orientation: "landscape",
        paperSize: 9,
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        margins: {
          left: 0.2,
          right: 0.2,
          top: 0.25,
          bottom: 0.25,
          header: 0.1,
          footer: 0.1,
        },
      }
    });

    // Apply layout
    PaymentLayout.applyLayout(worksheet);

    // Create header
    let currentRow = HeaderComponent.createPaymentHeader(worksheet, { khoa, namHoc });
    
    // Create column headers
    currentRow = HeaderComponent.createPaymentColumnHeaders(worksheet, currentRow);

    // Create payment table
    const result = SummaryComponent.createPaymentSummaryTable(worksheet, summaries, currentRow);

    return {
      sheet: worksheet,
      totalPayment: result.totalPayment
    };
  }

  /**
   * Generate standalone payment workbook
   */
  static generatePaymentWorkbook({ summaries, khoa, namHoc }) {
    const workbook = WorkbookFactory.createWorkbook({
      title: `Payment Report - ${khoa}`,
      subject: `Thanh toán vượt giờ ${namHoc}`
    });

    this.createPaymentSheet(workbook, { summaries, khoa, namHoc });

    return workbook;
  }
}

module.exports = PaymentGenerator;
````

## File: src/services/vuotgio_v2/department_excel/index.js
````javascript
/**
 * Department Excel Module
 *
 * Handles department-level and consolidated Excel generation for Vượt Giờ V2.
 *
 * Generators:
 *   - DepartmentGenerator    → One sheet per khoa (36-column detail table)
 *   - ConsolidatedGenerator  → Full multi-sheet workbook (Dept + Master + Payment)
 *   - MasterSheetGenerator   → "TỔNG HỢP" sheet mirroring tongHopGV.ejs
 *   - PaymentGenerator       → "Tiền chuyển khoản" sheet (bank transfer list)
 *
 * Layouts:
 *   - DepartmentLayout → 36-column widths (shared by Dept + Master sheets)
 *   - MasterLayout     → (legacy, kept for compat — use DepartmentLayout for new Master)
 *   - PaymentLayout    → 7-column widths
 *
 * Data:
 *   - DataAggregator   → Groups SDOs by department, handles isKhoa=0 merging
 *   - PaymentCalculator → Financial calculations (100k/tiết, TRUNC rules)
 */

module.exports = {
    // Generators
    DepartmentGenerator  : require('./generators/department.generator'),
    ConsolidatedGenerator: require('./generators/consolidated.generator'),
    MasterSheetGenerator : require('./generators/master.generator'),
    PaymentGenerator     : require('./generators/payment.generator'),
    FormulaGenerator     : require('./generators/formula.generator'),

    // Components (legacy — prefer dedicated generators)
    HeaderComponent  : require('./components/header.component'),
    SummaryComponent : require('./components/summary.component'),

    // Layouts
    DepartmentLayout : require('./layouts/department.layout'),
    MasterLayout     : require('./layouts/master.layout'),
    PaymentLayout    : require('./layouts/payment.layout'),

    // Data utilities
    DataAggregator  : require('./data/aggregator'),
    PaymentCalculator: require('./data/calculator'),
};
````

## File: src/services/vuotgio_v2/department_excel/layouts/department.layout.js
````javascript
/**
 * Department Layout - Column widths and layout for department sheets (36 columns)
 */

class DepartmentLayout {
  /**
   * Apply department sheet layout with 36 columns
   */
  static applyLayout(worksheet) {
    // Set column widths for 36 columns (A-AJ)
    const columnWidths = [
      4,    // A - STT
      18,   // B - Họ tên Giảng viên
      8.5,  // C - Thu nhập
      9.5,  // D - Định mức giờ giảng
      7.5,  // E - Được giảm
      9.5,  // F - Số tiết chưa hoàn thành NCKH
      9.5,  // G - Định mức phải giảng
      5.5,  // H - HK1 VN
      5.5,  // I - HK1 Lào
      5.5,  // J - HK1 Cuba
      5.5,  // K - HK1 CPC
      7,    // L - HK1 Đóng HP
      5.5,  // M - HK2 VN
      5.5,  // N - HK2 Lào
      5.5,  // O - HK2 Cuba
      5.5,  // P - HK2 CPC
      7,    // Q - HK2 Đóng HP
      5.5,  // R - Cả năm VN
      5.5,  // S - Cả năm Lào
      5.5,  // T - Cả năm Cuba
      5.5,  // U - Cả năm CPC
      7,    // V - Cả năm Đóng HP
      5.5,  // W - Vượt VN
      5.5,  // X - Vượt Lào
      5.5,  // Y - Vượt Cuba
      5.5,  // Z - Vượt CPC
      7,    // AA - Vượt Đóng HP
      7,    // AB - Tổng vượt
      8.5,  // AC - Mức TT chuẩn
      8.5,  // AD - Thành tiền VN
      8.5,  // AE - Thành tiền Lào
      8.5,  // AF - Thành tiền Cuba
      8.5,  // AG - Thành tiền CPC
      8.5,  // AH - Thành tiền Đóng HP
      11,   // AI - Tổng thành tiền
      11    // AJ - Thực nhận
    ];

    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // Set default row height
    worksheet.properties.defaultRowHeight = 22;
    
    // Set print titles (repeat header rows when printing)
    worksheet.pageSetup.printTitlesRow = "1:5";
  }

  /**
   * Get color definitions for different sections
   * Synchronized with vuotgio.tongHopGV.ejs styles
   */
  static getColors() {
    return {
      // Main headers
      baseFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF64748B" } }, // s-base, s-action
      teachingFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } }, // s-teaching
      overFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } }, // s-over
      rateFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } }, // s-rate
      moneyFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFB45309" } }, // s-money
      netFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } }, // s-net

      // Sub headers (HK1, HK2, Cả năm)
      teachingSubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } }, // s-teaching-hk1/2/year
      overSubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } }, // s-over-sub
      moneySubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } }, // s-money-sub

      // Column headers (VN, Lào, Cuba, ...)
      columnSubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF60A5FA" } }, // s-teaching-sub (light blue)
      columnOverSubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF34D399" } }, // light emerald
      columnMoneySubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } }, // light amber

      // Title row
      titleFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } } // default header
    };
  }
}

module.exports = DepartmentLayout;
````

## File: src/services/vuotgio_v2/department_excel/layouts/master.layout.js
````javascript
/**
 * Master Layout - Column widths and layout for master summary sheets
 */

class MasterLayout {
  /**
   * Apply master sheet layout
   */
  static applyLayout(worksheet) {
    // Set column widths
    const columnWidths = [
      5,   // STT
      30,  // Khoa/Phòng
      14,  // Số giảng viên
      14,  // Tiết thực hiện
      12,  // Tiết vượt
      14,  // Thanh toán
      20   // Ghi chú
    ];

    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // Set default row height
    worksheet.properties.defaultRowHeight = 22;
  }
}

module.exports = MasterLayout;
````

## File: src/services/vuotgio_v2/department_excel/layouts/payment.layout.js
````javascript
/**
 * Payment Layout - Column widths and layout for payment sheets
 */

class PaymentLayout {
  /**
   * Apply payment sheet layout
   */
  static applyLayout(worksheet) {
    // Set column widths for payment sheet (7 columns)
    const columnWidths = [
      6,   // A - STT
      26,  // B - Họ tên giảng viên
      12,  // C - Mã phòng ban
      22,  // D - Số tài khoản
      24,  // E - Ngân hàng
      18,  // F - Số tiền chuyển khoản
      26   // G - Ghi chú
    ];

    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // Set default row height
    worksheet.properties.defaultRowHeight = 22;
  }

  /**
   * Get color definitions for payment sheet
   */
  static getColors() {
    return {
      titleFill: { type: "pattern", pattern: "solid", fgColor: { argb: "1F4E79" } },
      subFill: { type: "pattern", pattern: "solid", fgColor: { argb: "D9EAF7" } },
      headerFill: { type: "pattern", pattern: "solid", fgColor: { argb: "A9D08E" } }
    };
  }
}

module.exports = PaymentLayout;
````

## File: src/services/vuotgio_v2/giangDay.service.js
````javascript
/**
 * VUOT GIO V2 - Giảng dạy (TKB) Service
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/giangDay.repo");

const withConnection = async (connection, callback) => {
    let shouldRelease = false;
    if (!connection) {
        connection = await createPoolConnection();
        shouldRelease = true;
    }
    try {
        return await callback(connection);
    } finally {
        if (shouldRelease && connection) {
            connection.release();
        }
    }
};

const getFilters = async () => withConnection(null, async (connection) => {
    const dot = await repo.getDistinctValues(connection, "Dot");
    const ki = await repo.getDistinctValues(connection, "HocKy");
    const namHoc = await repo.getDistinctValues(connection, "NamHoc");
    const khoa = await repo.getDistinctValues(connection, "Khoa");
    const heDaoTao = await repo.getDistinctValues(connection, "he_dao_tao");

    return {
        dot: ["ALL", ...dot],
        ki: ["ALL", ...ki],
        namHoc: ["ALL", ...namHoc],
        khoa: ["ALL", ...khoa],
        heDaoTao: ["ALL", ...heDaoTao]
    };
});

const getStatistics = async (filters) => withConnection(null, async (connection) => {
    const rows = await repo.getStatistics(connection, filters);

    const groupedMap = new Map();
    rows.forEach((row) => {
        const teacherKey = `${row.id_User}__${row.GiangVien}`;
        if (!groupedMap.has(teacherKey)) {
            groupedMap.set(teacherKey, {
                idUser: row.id_User,
                giangVien: row.GiangVien,
                khoa: row.Khoa,
                tongSoTietKy: 0,
                courses: [],
            });
        }

        const courseQuyChuan = parseFloat(row.QuyChuan) || 0;
        const teacher = groupedMap.get(teacherKey);
        teacher.tongSoTietKy += courseQuyChuan;
        teacher.courses.push({
            tenHocPhan: row.TenHocPhan,
            lop: row.Lop,
            soTinChi: row.SoTC,
            dot: row.Dot,
            kiHoc: row.HocKy,
            namHoc: row.NamHoc,
            quyChuan: courseQuyChuan,
            khoa: row.Khoa,
            heDaoTao: row.he_dao_tao,
        });
    });

    const groupedData = Array.from(groupedMap.values()).map((teacher) => ({
        ...teacher,
        tongSoTietKy: parseFloat(teacher.tongSoTietKy.toFixed(2)),
    }));

    const totalQuyChuan = groupedData.reduce((sum, teacher) => sum + teacher.tongSoTietKy, 0);

    return {
        data: groupedData,
        summary: {
            totalTeachers: groupedData.length,
            totalCourses: rows.length,
            totalQuyChuan: parseFloat(totalQuyChuan.toFixed(2)),
        }
    };
});

module.exports = {
    getFilters,
    getStatistics
};
````

## File: src/services/vuotgio_v2/lnqcImport.service.js
````javascript
/**
 * VUOT GIO V2 - Import Lớp Ngoài Quy Chuẩn Service
 * Parse Excel → INSERT vào course_schedule_details (class_type='ngoai_quy_chuan')
 */

const XLSX = require("xlsx");
const createPoolConnection = require("../../config/databasePool");
const tkbServices = require("../../services/tkbServices");
const LogService = require("../logService");
const repo = require("../../repositories/vuotgio_v2/lnqc.repo");

const CLASS_TYPE = "ngoai_quy_chuan";

function getFirstParenthesesContent(str) {
  const match = String(str || "").match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

function extractPrefix(str) {
  const match = String(str || "").match(/^[A-Za-z]+/);
  return match ? match[0] : "";
}

function getHeDaoTao(classType, heDaoTaoArr) {
  const prefix = extractPrefix(classType);
  const found = heDaoTaoArr.find(
    (item) => item.viet_tat.toUpperCase().trim() === prefix.toUpperCase().trim()
  );

  if (!found) {
    return { he_dao_tao: "1", bonus_time: 1 };
  }

  return {
    he_dao_tao: found.gia_tri_so_sanh,
    bonus_time: found.he_so,
  };
}

function findHeaderRow(sheet) {
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const requiredColumns = ["TT", "Số TC", "Lớp học phần", "Giáo Viên"];

  for (let row = 0; row <= Math.min(range.e.r, 10); row += 1) {
    const rowData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: row,
    })[0] || [];

    const rowText = rowData.map((cell) => (cell || "").toString().trim());
    const matchCount = requiredColumns.filter((col) =>
      rowText.some((cell) => cell.includes(col))
    ).length;

    if (matchCount >= 3) {
      console.log(`✅ [LopNgoaiQC Import] Tìm thấy header tại dòng ${row + 1}`);
      return row;
    }
  }

  console.warn("⚠️ [LopNgoaiQC Import] Không tìm thấy header, mặc định dòng 4");
  return 3;
}

function convertDateToMySQL(str) {
  if (!str) return null;
  const parts = String(str).trim().split(/[\/\-.]/);
  if (parts.length === 3) {
    let day = parseInt(parts[0], 10);
    let month = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }
    const dateObj = new Date(year, month - 1, day);
    if (
      dateObj.getFullYear() === year &&
      dateObj.getMonth() === month - 1 &&
      dateObj.getDate() === day
    ) {
      const mm = String(month).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      return `${year}-${mm}-${dd}`;
    }
  }
  return null;
}

function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

function formatDateToMySQL(dateObj) {
  if (!dateObj || Number.isNaN(dateObj.getTime())) return null;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function masterConvert(input) {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return formatDateToMySQL(excelSerialToDate(input));
  if (input instanceof Date) return formatDateToMySQL(input);
  if (typeof input === "string") return convertDateToMySQL(input);
  return null;
}

const getUserContext = (req) => ({
  userId: req.session?.userId || 1,
  userName: req.session?.TenNhanVien || req.session?.username || "ADMIN",
});

const parseExcel = async (req, res) => {
  const { NamHoc, HocKy, Dot } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, message: "Vui lòng chọn file Excel." });
  }

  try {
    const bonusRules = await tkbServices.getBonusRules();
    const kiTuBatDauArr = await tkbServices.getHeDaoTaoList();
    const majorMap = await tkbServices.getMajorPrefixMap();

    const workbook = XLSX.read(req.file.buffer, {
      type: "buffer",
      cellDates: false,
      raw: false,
      cellText: true,
    });

    let allData = [];

    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      const headerRowIndex = findHeaderRow(sheet);
      const dataStartIndex = headerRowIndex + 1;

      const headerRow = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: headerRowIndex,
      })[0] || [];

      const validHeaders = headerRow.map((header) => (header || "").toString().trim());
      const normalizedHeaders = validHeaders.map((header) =>
        header.replace(/[\r\n\t]+/g, " ").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
      );

      console.log(`[LopNgoaiQC Import] Sheet "${sheetName}" headers:`, JSON.stringify(normalizedHeaders));

      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        header: normalizedHeaders,
        range: dataStartIndex,
        defval: "",
        raw: false,
        cellText: true,
      });

      rawRows.forEach((row, rowIndex) => {
        const realRowNumber = dataStartIndex + rowIndex + 1;
        for (let col = 0; col < normalizedHeaders.length; col += 1) {
          const colLetter = XLSX.utils.encode_col(col);
          const cellAddress = `${colLetter}${realRowNumber}`;
          const cell = sheet[cellAddress];
          if (cell && cell.w !== undefined) {
            row[normalizedHeaders[col]] = cell.w;
          }
        }
        row.sheet_name = sheetName;
      });

      allData = allData.concat(rawRows);
    });

    if (allData.length === 0) {
      return res.status(400).json({ success: false, message: "File Excel không có dữ liệu." });
    }

    const columnsToMerge = ["TT", "Mã HP", "Số TC", "Lớp học phần", "Giáo Viên", "Số SV", "ST/ tuần"];
    for (let i = 1; i < allData.length; i += 1) {
      for (const key of Object.keys(allData[i])) {
        if (columnsToMerge.includes(key) && (allData[i][key] === "" || allData[i][key] === undefined)) {
          allData[i][key] = allData[i - 1][key];
        }
      }
    }

    const renameMap = {
      TT: "tt",
      "Mã HP": "course_code",
      "Số TC": "credit_hours",
      LL: "ll_total",
      "Số SV": "student_quantity",
      "HS lớp đông": "student_bonus",
      "Ngoài giờ HC": "bonus_time",
      "LL thực": "ll_code_actual",
      "Lớp học phần": "course_name",
      "Hình thức học": "study_format",
      "ST/ tuần": "periods_per_week",
      Thứ: "day_of_week",
      "Tiết học": "period_range",
      "Phòng học": "classroom",
      "Ngày BĐ": "start_date",
      "Ngày KT": "end_date",
      "Giáo Viên": "lecturer",
    };

    const renamedData = allData.map((row, index) => {
      const newRow = {};
      for (const [oldKey, newKey] of Object.entries(renameMap)) {
        newRow[newKey] = row[oldKey] ?? "";
      }

      if (!newRow.lecturer || newRow.lecturer.toString().trim() === "") {
        for (const key of Object.keys(row)) {
          if (key !== "sheet_name" && /Gi[áa]o|Vi[êe]n|GV/i.test(key)) {
            const val = row[key];
            if (val && val.toString().trim() !== "") {
              console.log(`🔄 [LopNgoaiQC] Fallback lecturer từ key "${key}": "${val}"`);
              newRow.lecturer = val;
              break;
            }
          }
        }
      }

      newRow.sheet_name = row.sheet_name;
      newRow.start_date = masterConvert(newRow.start_date);
      newRow.end_date = masterConvert(newRow.end_date);

      const courseCode = (newRow.course_code || "").trim().toUpperCase();
      const firstChar = courseCode.charAt(0);
      newRow.major = majorMap[firstChar] || "";

      if (index === 0) {
        console.log(`📍 [LopNgoaiQC] Row 0 - Keys:`, JSON.stringify(Object.keys(row).filter((key) => key !== "sheet_name")));
        console.log(`📍 [LopNgoaiQC] Row 0 - lecturer: "${newRow.lecturer}", course_name: "${newRow.course_name}"`);
        console.log(`📍 [LopNgoaiQC] Row 0 - Course Code: "${newRow.course_code}", Major: "${newRow.major}"`);
      }

      return newRow;
    });

    let preTT = 0;
    let llTmp = 0;
    let lastTTValue = 0;

    for (let i = 0; i < renamedData.length; i += 1) {
      const row = renamedData[i];
      const classType = getFirstParenthesesContent(row.course_name) || "";
      const { he_dao_tao, bonus_time } = getHeDaoTao(classType, kiTuBatDauArr);
      row.he_dao_tao = he_dao_tao;
      row.bonus_time = bonus_time;

      let tmp = 0;
      const range = typeof row.period_range === "string"
        ? row.period_range
        : (row.period_range != null ? String(row.period_range) : null);

      if (range && range.includes("->")) {
        const [start, end] = range.split("->").map(Number);
        row.period_start = Number.isNaN(start) ? null : start;
        row.period_end = Number.isNaN(end) ? null : end;
        if (!Number.isNaN(start) && start >= 13) {
          tmp += 1;
        }
      } else {
        row.period_start = null;
        row.period_end = null;
      }

      const dayOfWeek = String(row.day_of_week || "").trim().toUpperCase();
      if (dayOfWeek === "CN" || dayOfWeek === "7") {
        tmp += 1;
      }

      if (tmp > 0) {
        row.bonus_time = row.bonus_time * 1.5;
      }

      row.student_bonus = tkbServices.calculateStudentBonus(
        parseInt(row.student_quantity, 10) || 0,
        bonusRules
      );

      if (i > 0) {
        if (row.tt !== preTT) {
          preTT = row.tt;
          row.tt = ++lastTTValue;
          llTmp = row.ll_total || 0;
        } else {
          row.tt = lastTTValue;
        }
      } else {
        preTT = row.tt;
        row.tt = ++lastTTValue;
        llTmp = row.ll_total || 0;
      }

      row.ll_total = llTmp;
      row.qc = parseFloat((row.ll_total * row.bonus_time * row.student_bonus).toFixed(2));
    }

    const filteredData = renamedData.filter(
      (row) =>
        (row.course_name && row.course_name.toString().trim() !== "") ||
        (row.lecturer && row.lecturer.toString().trim() !== "")
    );

    console.log(`[LopNgoaiQC Import] Parsed ${filteredData.length} raw rows from Excel`);

    const groupedMap = {};

    for (const row of filteredData) {
      const key = row.tt;
      if (!key && key !== 0) continue;

      if (!groupedMap[key]) {
        groupedMap[key] = { ...row };
      } else {
        const group = groupedMap[key];
        group.ll_total = Math.max(parseFloat(group.ll_total) || 0, parseFloat(row.ll_total) || 0);
        group.credit_hours = Math.max(parseFloat(group.credit_hours) || 0, parseFloat(row.credit_hours) || 0);
        group.student_quantity = Math.max(parseInt(group.student_quantity, 10) || 0, parseInt(row.student_quantity, 10) || 0);
        group.student_bonus = Math.max(parseFloat(group.student_bonus) || 1, parseFloat(row.student_bonus) || 1);
        group.bonus_time = Math.max(parseFloat(group.bonus_time) || 1, parseFloat(row.bonus_time) || 1);
        group.qc = Math.max(parseFloat(group.qc) || 0, parseFloat(row.qc) || 0);

        if (row.start_date && (!group.start_date || row.start_date < group.start_date)) {
          group.start_date = row.start_date;
        }
        if (row.end_date && (!group.end_date || row.end_date > group.end_date)) {
          group.end_date = row.end_date;
        }
        if (row.course_name) group.course_name = row.course_name;
        if (row.course_code) group.course_code = row.course_code;
        if (row.lecturer) group.lecturer = row.lecturer;
        if (row.major) group.major = row.major;
      }
    }

    const groupedData = Object.values(groupedMap).map((row) => ({
      tt: row.tt,
      course_id: (row.course_code || "").toString().trim().match(/^[A-Za-z]+/)?.[0] || "",
      course_name: row.course_name || "",
      course_code: row.course_code || "",
      major: row.major || "",
      lecturer: row.lecturer || "",
      start_date: row.start_date || null,
      end_date: row.end_date || null,
      ll_total: row.ll_total || 0,
      credit_hours: row.credit_hours || 0,
      ll_code: 0,
      student_quantity: row.student_quantity || 0,
      student_bonus: row.student_bonus || 1,
      bonus_time: row.bonus_time || 1,
      qc: row.qc || 0,
      dot: Dot || "1",
      ki_hoc: HocKy || "1",
      nam_hoc: NamHoc || "",
      note: "",
      he_dao_tao: row.he_dao_tao || "",
    }));

    console.log(`[LopNgoaiQC Import] Grouped into ${groupedData.length} unique classes (from ${filteredData.length} sub-rows)`);

    if (groupedData.length > 0) {
      console.log(`[LopNgoaiQC Import] Sample row[0]:`, JSON.stringify({
        tt: groupedData[0].tt,
        course_name: groupedData[0].course_name,
        lecturer: groupedData[0].lecturer,
        major: groupedData[0].major,
        start_date: groupedData[0].start_date,
        end_date: groupedData[0].end_date,
      }));
    }

    res.status(200).json({
      success: true,
      message: `Đọc file thành công: ${groupedData.length} lớp học phần (gom từ ${filteredData.length} dòng)`,
      data: groupedData,
    });
  } catch (error) {
    console.error("[LopNgoaiQC Import] Lỗi khi parse Excel:", error);
    res.status(500).json({ success: false, message: "Lỗi khi xử lý file Excel: " + error.message });
  }
};

const confirmImport = async (req, res) => {
  const { userId, userName } = getUserContext(req);
  const records = req.body.records;
  const dot = req.body.dot || 1;
  const ki_hoc = req.body.ki_hoc || 1;
  const nam_hoc = req.body.nam_hoc;

  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, message: "Không có dữ liệu để import." });
  }

  let connection;
  try {
    connection = await createPoolConnection();

    let lastTT = await repo.getDraftMaxTT(connection, { dot, kiHoc: ki_hoc, namHoc: nam_hoc });

    if (records.length > 0) {
      console.log(`[LopNgoaiQC confirmImport] records[0] keys:`, Object.keys(records[0]));
      console.log(`[LopNgoaiQC confirmImport] records[0].lecturer:`, JSON.stringify(records[0].lecturer));
    }

    const values = records.map((row) => {
      lastTT += 1;
      return [
        lastTT,
        row.course_code || "",
        row.credit_hours || 0,
        row.student_quantity || 0,
        row.student_bonus || 1,
        row.bonus_time || 1,
        row.ll_code || 0,
        row.ll_total || 0,
        row.qc || 0,
        row.course_name || "",
        row.lecturer || "",
        row.major || "",
        row.he_dao_tao || "",
        row.course_id || "",
        row.start_date || null,
        row.end_date || null,
        dot,
        ki_hoc,
        nam_hoc || row.nam_hoc || "",
        row.note || "",
        CLASS_TYPE,
        0,
      ];
    });

    const [result] = await repo.insertDraft(connection, values);

    try {
      await LogService.logChange(userId, userName, "Import lớp ngoài QC (nháp)", `Import ${result.affectedRows} dòng từ file Excel`);
    } catch (error) {
      console.error("Log error:", error);
    }

    console.log(`[LopNgoaiQC Import] Inserted ${result.affectedRows} rows into course_schedule_details`);

    res.status(200).json({
      success: true,
      message: `Import thành công ${result.affectedRows} dòng vào bảng nháp!`,
    });
  } catch (error) {
    console.error("[LopNgoaiQC Import] Lỗi confirm import:", error);
    res.status(500).json({ success: false, message: "Có lỗi xảy ra: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};

const checkDataExist = async (req, res) => {
  const { nam_hoc, ki_hoc, dot } = req.body;

  let connection;
  try {
    connection = await createPoolConnection();

    const [rows] = await connection.execute(
      `SELECT COUNT(*) as count FROM course_schedule_details WHERE nam_hoc = ? AND ki_hoc = ? AND dot = ? AND class_type = ? AND da_luu = 0`,
      [nam_hoc, ki_hoc || 1, dot || 1, CLASS_TYPE]
    );

    res.json({
      exists: rows[0].count > 0,
      count: rows[0].count,
    });
  } catch (error) {
    console.error("[LopNgoaiQC Import] Lỗi check exist:", error);
    res.status(500).json({ success: false, message: "Lỗi kiểm tra dữ liệu" });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  parseExcel,
  confirmImport,
  checkDataExist,
};
````

## File: src/services/vuotgio_v2/shared_excel/core/cell.formatter.js
````javascript
/**
 * Cell Formatter - Common cell formatting utilities
 */

class CellFormatter {
  /**
   * Apply border to cell
   */
  static applyBorder(cell, borderStyle = "thin") {
    cell.border = {
      top: { style: borderStyle },
      left: { style: borderStyle },
      bottom: { style: borderStyle },
      right: { style: borderStyle }
    };
  }

  /**
   * Apply standard header styling
   */
  static applyHeaderStyle(cell, options = {}) {
    const defaultOptions = {
      bold: true,
      fontSize: 11,
      fontColor: "FFFFFF",
      bgColor: "70AD47",
      hAlign: "center",
      vAlign: "middle",
      wrapText: true
    };

    const opts = { ...defaultOptions, ...options };

    cell.font = {
      bold: opts.bold,
      size: opts.fontSize,
      color: { argb: opts.fontColor }
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: opts.bgColor }
    };

    cell.alignment = {
      horizontal: opts.hAlign,
      vertical: opts.vAlign,
      wrapText: opts.wrapText
    };

    this.applyBorder(cell);
  }

  /**
   * Apply standard title styling
   */
  static applyTitleStyle(cell, options = {}) {
    const defaultOptions = {
      bold: true,
      fontSize: 14,
      fontColor: "FFFFFF",
      bgColor: "1F4E79",
      hAlign: "center",
      vAlign: "middle"
    };

    const opts = { ...defaultOptions, ...options };

    cell.font = {
      bold: opts.bold,
      size: opts.fontSize,
      color: { argb: opts.fontColor }
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: opts.bgColor }
    };

    cell.alignment = {
      horizontal: opts.hAlign,
      vertical: opts.vAlign
    };

    this.applyBorder(cell);
  }

  /**
   * Apply data cell styling
   */
  static applyDataStyle(cell, options = {}) {
    const defaultOptions = {
      hAlign: "center",
      vAlign: "middle",
      fontSize: 11
    };

    const opts = { ...defaultOptions, ...options };

    if (opts.fontSize) {
      cell.font = { size: opts.fontSize };
    }

    cell.alignment = {
      horizontal: opts.hAlign,
      vertical: opts.vAlign,
      wrapText: opts.wrapText
    };

    if (opts.numFmt) {
      cell.numFmt = opts.numFmt;
    }

    this.applyBorder(cell);
  }

  /**
   * Apply total row styling
   */
  static applyTotalStyle(cell, options = {}) {
    const defaultOptions = {
      bold: true,
      bgColor: "FFEAECEE",
      hAlign: "center",
      vAlign: "middle",
      numFmt: "#,##0.00"
    };

    const opts = { ...defaultOptions, ...options };

    cell.font = { bold: opts.bold };

    if (opts.bgColor) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: opts.bgColor }
      };
    }

    cell.alignment = {
      horizontal: opts.hAlign,
      vertical: opts.vAlign,
      shrinkToFit: true
    };

    if (opts.numFmt) {
      cell.numFmt = opts.numFmt;
    }

    this.applyBorder(cell);
  }

  /**
   * Merge cells and apply styling
   */
  static mergeAndStyle(worksheet, startRow, startCol, endRow, endCol, value, options = {}) {
    const range = `${this.columnToLetter(startCol)}${startRow}:${this.columnToLetter(endCol)}${endRow}`;
    worksheet.mergeCells(range);
    
    const cell = worksheet.getCell(startRow, startCol);
    cell.value = value;

    if (options.title) {
      this.applyTitleStyle(cell, options);
    } else if (options.header) {
      this.applyHeaderStyle(cell, options);
    } else if (options.total) {
      this.applyTotalStyle(cell, options);
    } else {
      this.applyDataStyle(cell, options);
    }
  }

  /**
   * Convert column number to Excel letter
   */
  static columnToLetter(column) {
    let result = '';
    while (column > 0) {
      column--;
      result = String.fromCharCode(65 + (column % 26)) + result;
      column = Math.floor(column / 26);
    }
    return result;
  }

  /**
   * Truncate number to specified decimal places
   */
  static truncDecimals(value, digits = 2) {
    const factor = Math.pow(10, digits);
    return Math.trunc(value * factor) / factor;
  }

  /**
   * Write an Excel formula to a cell with optional pre-calculated result.
   *
   * The `result` field is used by ExcelJS as a cached value so that the file
   * renders correctly even when opened by tools that do not evaluate formulas
   * (e.g. LibreOffice in headless PDF conversion mode).
   *
   * @param {ExcelJS.Cell} cell    - Target cell
   * @param {string}       formula - Formula string WITHOUT leading "=", e.g. "SUM(H9:H12)"
   * @param {number}       [result=0] - Pre-calculated result for cache
   * @param {object}       [options={}] - Forwarded to applyDataStyle
   */
  static applyFormula(cell, formula, result = 0, options = {}) {
    cell.value = { formula, result };
    this.applyDataStyle(cell, options);
  }
}

module.exports = CellFormatter;
````

## File: src/services/vuotgio_v2/shared_excel/core/workbook.factory.js
````javascript
/**
 * Workbook Factory - Common workbook creation utilities
 */

const ExcelJS = require("exceljs");

class WorkbookFactory {
  /**
   * Create a new workbook with standard metadata
   */
  static createWorkbook(options = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = options.creator || "VuotGioV2";
    workbook.created = new Date();
    workbook.modified = new Date();
    
    if (options.title) {
      workbook.title = options.title;
    }
    
    if (options.subject) {
      workbook.subject = options.subject;
    }
    
    return workbook;
  }

  /**
   * Create worksheet with standard page setup
   */
  static createWorksheet(workbook, name, options = {}) {
    const defaultPageSetup = {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.2,
        right: 0.2,
        top: 0.25,
        bottom: 0.25,
        header: 0.1,
        footer: 0.1
      }
    };

    const worksheet = workbook.addWorksheet(name, {
      pageSetup: { ...defaultPageSetup, ...options.pageSetup }
    });

    // Default properties
    worksheet.properties.defaultRowHeight = options.defaultRowHeight || 22;
    
    if (options.frozenRows) {
      worksheet.views = [{ state: "frozen", ySplit: options.frozenRows }];
    }

    return worksheet;
  }

  /**
   * Sanitize worksheet name to be Excel-compatible
   */
  static sanitizeWorksheetName(name, fallback = "Sheet1") {
    const trimmed = String(name || fallback)
      .replace(/[\\/?*:[\]]/g, " ")
      .trim();
    return (trimmed || fallback).slice(0, 31);
  }
}

module.exports = WorkbookFactory;
````

## File: src/services/vuotgio_v2/shared_excel/index.js
````javascript
/**
 * Shared Excel Module
 * Common utilities for Excel generation
 */

module.exports = {
  // Core utilities
  WorkbookFactory: require('./core/workbook.factory'),
  CellFormatter: require('./core/cell.formatter'),
  PDFConverter: require('./core/pdf.converter')
};
````

## File: src/views/vuotgio_v2/vuotgio.thongKeGiangDay.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Thống kê giảng dạy cơ hữu - Vượt giờ V2</title>

		<link
			rel="stylesheet"
			href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"
		/>
		<link
			rel="stylesheet"
			href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"
		/>
		<link rel="stylesheet" href="/css/styles.css" />
		<link rel="stylesheet" href="/css/table.css" />

		<style>
			.page-wrap {
				padding: 20px;
			}

			.panel {
				background: #fff;
				border-radius: 12px;
				padding: 16px;
				box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
			}

			.title {
				font-size: 1.3rem;
				font-weight: 600;
				margin-bottom: 14px;
			}

			.header-actions {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: 20px;
			}

			.loc {
				display: flex;
				gap: 10px;
				align-items: center;
			}

			.summary {
				position: fixed;
				bottom: 20px;
				right: 20px;
				display: flex;
				flex-direction: column;
				gap: 5px;
				z-index: 1000;
				background: rgba(255, 255, 255, 0.9);
				padding: 12px 16px;
				border-radius: 12px;
				box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
				border: 1px solid rgba(255, 255, 255, 0.18);
				backdrop-filter: blur(8px);
				-webkit-backdrop-filter: blur(8px);
				transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
			}

			.summary.collapsed {
				transform: translateY(calc(100% + 10px));
			}

			.summary-toggle {
				position: absolute;
				top: -35px;
				right: 0;
				width: 35px;
				height: 35px;
				background: #1f4ea8;
				color: white;
				border: none;
				border-radius: 10px 0 0 10px;
				display: flex;
				align-items: center;
				justify-content: center;
				cursor: pointer;
				box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
				transition: all 0.3s ease;
			}

			.summary.collapsed .summary-toggle {
				transform: translateY(5px);
				border-radius: 10px 10px 0 0;
				right: 10px;
				top: -40px;
			}

			.summary-box {
				display: flex;
				justify-content: space-between;
				align-items: center;
				gap: 20px;
				min-width: 200px;
				padding: 4px 0;
			}

			.search {
				height: 45px !important;
				padding: 0 1rem !important;
				box-sizing: border-box;
			}

			.btn {
				height: 45px !important;
				display: inline-flex;
				align-items: center;
				justify-content: center;
				padding: 0 1.5rem !important;
				box-sizing: border-box;
				margin-bottom: 0 !important; /* Xóa margin bottom mặc định của .btn */
			}

			.summary-box .label {
				color: #516078;
				font-size: 0.85rem;
				font-weight: 500;
			}

			.summary-box .value {
				color: #1f4ea8;
				font-weight: 700;
				font-size: 1rem;
			}

			.table-wrap {
				margin-top: 14px;
				overflow: auto;
			}

			table.class-table {
				width: 100%;
				border-collapse: collapse;
			}

			.class-table th,
			.class-table td {
				border: 1px solid #dbe3f0;
				padding: 8px;
				font-size: 0.9rem;
				vertical-align: middle;
				text-align: center;
			}

			.class-table th:nth-child(1),
			.class-table td:nth-child(1) {
				width: 42px;
				min-width: 42px;
				max-width: 42px;
				padding-left: 4px;
				padding-right: 4px;
			}

			.class-table th:nth-child(2),
			.class-table td:nth-child(2) {
				width: 190px;
				min-width: 190px;
				max-width: 190px;
			}

			.class-table th:nth-child(3),
			.class-table td:nth-child(3) {
				width: 200px;
				min-width: 200px;
				max-width: 200px;
			}

			.class-table th:nth-child(4),
			.class-table td:nth-child(4) {
				width: 130px;
				min-width: 130px;
				max-width: 130px;
			}

			.class-table th:nth-child(5),
			.class-table td:nth-child(5) {
				width: 64px;
				min-width: 64px;
				max-width: 64px;
			}

			.class-table th:nth-child(6),
			.class-table td:nth-child(6) {
				width: 52px;
				min-width: 52px;
				max-width: 52px;
			}

			.class-table th:nth-child(7),
			.class-table td:nth-child(7) {
				width: 48px;
				min-width: 48px;
				max-width: 48px;
			}

			.class-table th:nth-child(8),
			.class-table td:nth-child(8) {
				width: 110px;
				min-width: 110px;
				max-width: 110px;
			}

			.class-table th:nth-child(9),
			.class-table td:nth-child(9) {
				width: 110px;
				min-width: 110px;
				max-width: 110px;
			}

			.class-table th:nth-child(10),
			.class-table td:nth-child(10) {
				width: 110px;
				min-width: 110px;
				max-width: 110px;
			}

			.class-table th:nth-child(11),
			.class-table td:nth-child(11) {
				width: 80px;
				min-width: 80px;
				max-width: 80px;
			}

			.class-table th:nth-child(12),
			.class-table td:nth-child(12) {
				width: 160px;
				min-width: 160px;
				max-width: 160px;
			}

			.class-table th {
				background: #1f4ea8;
				color: #fff;
				position: sticky;
				top: 0;
				z-index: 1;
			}

			.group-head {
				background: #f8fbff;
			}

			.empty-cell {
				text-align: center;
				color: #7a879c;
				padding: 16px;
			}

			@media (max-width: 1200px) {
				.header-actions {
					flex-direction: column;
					height: auto !important;
					align-items: stretch;
					gap: 15px;
				}
				.loc {
					flex-wrap: wrap;
				}
			}
		</style>
	</head>

	<body>
		<%- include('../header') %>

		<div class="page-wrap">
			<div class="panel">
				<div class="title">Thống kê lớp giảng dạy theo giảng viên </div>

				<div class="header-actions" style="height: 45px">
					<input
						id="searchInput"
						type="text"
						class="search"
						placeholder="Tìm kiếm theo Tên..."
						style="width: 250px"
					/>

					<div class="loc d-flex">
						<select id="filterDot" class="selectop mx-1">
							<option value="">Đợt</option>
						</select>
						<select id="filterKi" class="selectop mx-1">
							<option value="">Kỳ</option>
						</select>
						<select id="filterNamHoc" class="selectop mx-1">
							<option value="">Năm học</option>
						</select>
						<select id="filterKhoa" class="selectop mx-1">
							<option value="">Khoa</option>
						</select>
						<select id="filterHeDaoTao" class="selectop mx-1">
							<option value="">Hệ đào tạo</option>
						</select>
						
						<button class="btn text-nowrap mx-2" id="btnShow" style="height: 45px">Hiển thị</button>
					</div>
				</div>

				<div class="summary" id="summaryBox">
					<button class="summary-toggle" id="btnToggleSummary" title="Ẩn/Hiện tổng kết">
						<i class="bi bi-chevron-down"></i>
					</button>
					<div class="summary-box">
						<div class="label">Tổng giảng viên</div>
						<div class="value" id="totalTeachers">0</div>
					</div>
					<div class="summary-box">
						<div class="label">Tổng lớp học phần</div>
						<div class="value" id="totalCourses">0</div>
					</div>
					<div class="summary-box">
						<div class="label">Tổng tiết Quy chuẩn</div>
						<div class="value" id="totalQuyChuan">0.00</div>
					</div>
				</div>

				<div class="table-wrap">
					<table class="class-table" id="classTable">
						<thead>
							<tr>
								<th>STT</th>
								<th>Giảng viên</th>
								<th>Môn học</th>
								<th>Tên lớp</th>
								<th>Số tín chỉ</th>
								<th>Đợt</th>
								<th>Kỳ</th>
								<th>Năm học</th>
								<th>Số tiết QC</th>
								<th>Tổng số tiết</th>
								<th>Khoa</th>
								<th>Hệ đào tạo</th>
							</tr>
						</thead>
						<tbody id="dataTableBody"></tbody>
					</table>
				</div>
			</div>
		</div>

		<script>
			const state = {
				rawGroups: [],
				filteredGroups: [],
				heDaoTaoMap: new Map(),
				lastSummary: {
					totalTeachers: 0,
					totalCourses: 0,
					totalQuyChuan: 0,
				},
			};

			const els = {
				dot: document.getElementById("filterDot"),
				ki: document.getElementById("filterKi"),
				namHoc: document.getElementById("filterNamHoc"),
				khoa: document.getElementById("filterKhoa"),
				heDaoTao: document.getElementById("filterHeDaoTao"),
				search: document.getElementById("searchInput"),
				btnShow: document.getElementById("btnShow"),
				btnReset: document.getElementById("btnReset"),
				tableBody: document.getElementById("dataTableBody"),
				totalTeachers: document.getElementById("totalTeachers"),
				totalCourses: document.getElementById("totalCourses"),
				totalQuyChuan: document.getElementById("totalQuyChuan"),
			};

			function getHeDaoTaoLabel(rawValue) {
				if (rawValue === null || rawValue === undefined || rawValue === "") return "";
				if (rawValue === "ALL") return "Tất cả";

				const key = String(rawValue).trim();
				return state.heDaoTaoMap.get(key) || rawValue;
			}

			function setSelectOptions(selectElement, values, options = {}) {
				const { isHeDaoTao = false, defaultLabel = "" } = options;
				selectElement.innerHTML = "";

				if (defaultLabel) {
					const defaultOpt = document.createElement("option");
					defaultOpt.value = "ALL";
					defaultOpt.textContent = defaultLabel;
					selectElement.appendChild(defaultOpt);
				}

				values.forEach((value) => {
					if (value === "ALL" && defaultLabel) return; // Tránh lặp "Tất cả" nếu đã có defaultLabel

					const option = document.createElement("option");
					option.value = value;
					option.textContent = isHeDaoTao
						? getHeDaoTaoLabel(value)
						: value === "ALL"
						? "Tất cả"
						: value;
					selectElement.appendChild(option);
				});
			}

			function updateSummary(groups) {
				const totalTeachers = groups.length;
				const totalCourses = groups.reduce(
					(sum, teacher) => sum + teacher.courses.length,
					0
				);
				const totalQuyChuan = groups.reduce(
					(sum, teacher) => sum + (Number(teacher.tongSoTietKy) || 0),
					0
				);

				els.totalTeachers.textContent = totalTeachers;
				els.totalCourses.textContent = totalCourses;
				els.totalQuyChuan.textContent = totalQuyChuan.toFixed(2);
			}

			function getTeacherHeDaoTaoSortKey(teacher) {
				const labels = Array.from(
					new Set((teacher.courses || []).map((c) => getHeDaoTaoLabel(c.heDaoTao) || ""))
				).sort((a, b) => a.localeCompare(b, "vi"));

				return labels[0] || "";
			}

			function sortTeacherGroups(groups) {
				return [...groups].sort((a, b) => {
					const heA = getTeacherHeDaoTaoSortKey(a);
					const heB = getTeacherHeDaoTaoSortKey(b);
					const byHe = heA.localeCompare(heB, "vi");
					if (byHe !== 0) return byHe;

					return String(a.giangVien || "").localeCompare(String(b.giangVien || ""), "vi");
				});
			}

			function renderTable(groups) {
				els.tableBody.innerHTML = "";

				if (!groups.length) {
					const tr = document.createElement("tr");
					tr.innerHTML =
						'<td class="empty-cell" colspan="12">Không có dữ liệu phù hợp bộ lọc</td>';
					els.tableBody.appendChild(tr);
					updateSummary([]);
					return;
				}

				let stt = 1;
				groups.forEach((teacher) => {
					const rowSpan = teacher.courses.length;
					if (!rowSpan) return;

					teacher.courses.forEach((course, index) => {
						const tr = document.createElement("tr");
						if (index === 0) {
							tr.classList.add("group-head");
						}

						let rowHtml = "";
						if (index === 0) {
									rowHtml += `<td rowspan="${rowSpan}">${stt}</td>`;
							rowHtml += `<td rowspan="${rowSpan}">${teacher.giangVien}</td>`;
						}

						rowHtml += `<td>${course.tenHocPhan || ""}</td>`;
						rowHtml += `<td>${course.lop || ""}</td>`;
								rowHtml += `<td>${course.soTinChi ?? ""}</td>`;
								rowHtml += `<td>${course.dot ?? ""}</td>`;
								rowHtml += `<td>${course.kiHoc ?? ""}</td>`;
								rowHtml += `<td>${course.namHoc ?? ""}</td>`;
								rowHtml += `<td>${(Number(course.quyChuan) || 0).toFixed(2)}</td>`;

						if (index === 0) {
									rowHtml += `<td rowspan="${rowSpan}">${(
								Number(teacher.tongSoTietKy) || 0
							).toFixed(2)}</td>`;
									rowHtml += `<td rowspan="${rowSpan}">${teacher.khoa || ""}</td>`;
						}

						rowHtml += `<td>${getHeDaoTaoLabel(course.heDaoTao)}</td>`;
						tr.innerHTML = rowHtml;
						els.tableBody.appendChild(tr);
					});

					stt += 1;
				});

				updateSummary(groups);
			}

			function applyClientSearch() {
				const q = els.search.value.trim().toLowerCase();
				if (!q) {
					state.filteredGroups = sortTeacherGroups(state.rawGroups);
					renderTable(state.filteredGroups);
					return;
				}

				state.filteredGroups = sortTeacherGroups(
					state.rawGroups.filter((teacher) =>
						String(teacher.giangVien || "").toLowerCase().includes(q)
					)
				);
				renderTable(state.filteredGroups);
			}

			function getFilterPayload() {
				return {
					dot: els.dot.value,
					ki: els.ki.value,
					namHoc: els.namHoc.value,
					khoa: els.khoa.value,
					heDaoTao: els.heDaoTao.value,
				};
			}

			async function loadHeDaoTaoMap() {
				try {
					const response = await fetch("/api/gvm/v1/he-dao-tao");
					const json = await response.json();
					if (!json.success || !Array.isArray(json.data)) return;

					json.data.forEach((item) => {
						const key = String(item.id).trim();
						state.heDaoTaoMap.set(key, item.he_dao_tao);
					});
				} catch (error) {
					console.error("Không thể tải danh mục hệ đào tạo:", error);
				}
			}

			async function loadFilters() {
				const response = await fetch("/v2/vuotgio/thong-ke-giang-day/filters");
				const json = await response.json();
				if (!json.success) {
					throw new Error("Không tải được bộ lọc");
				}

				setSelectOptions(els.dot, json.data.dot, { defaultLabel: "Đợt" });
				setSelectOptions(els.ki, json.data.ki, { defaultLabel: "Kỳ" });
				setSelectOptions(els.namHoc, json.data.namHoc, { defaultLabel: "Năm học" });
				setSelectOptions(els.khoa, json.data.khoa, { defaultLabel: "Khoa" });
				setSelectOptions(els.heDaoTao, json.data.heDaoTao, {
					isHeDaoTao: true,
					defaultLabel: "Hệ đào tạo",
				});

				// Mặc định chọn năm học mới nhất nếu có.
				if (els.namHoc.options.length > 1) {
					els.namHoc.selectedIndex = 1;
				}
			}

			async function loadData() {
				const payload = getFilterPayload();
				const response = await fetch("/v2/vuotgio/thong-ke-giang-day/data", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(payload),
				});
				const json = await response.json();

				if (!json.success) {
					throw new Error(json.message || "Không lấy được dữ liệu");
				}

				state.rawGroups = json.data || [];
				applyClientSearch();
			}

			function resetFilters() {
				[els.dot, els.ki, els.namHoc, els.khoa, els.heDaoTao].forEach((s) => {
					s.value = "ALL";
				});
				if (els.namHoc.options.length > 1) {
					els.namHoc.selectedIndex = 1;
				}
				els.search.value = "";
			}

			async function initPage() {
				try {
					await loadHeDaoTaoMap();
					await loadFilters();
					await loadData();
				} catch (error) {
					console.error(error);
					els.tableBody.innerHTML =
						'<tr><td class="empty-cell" colspan="12">Lỗi tải dữ liệu</td></tr>';
				}
			}

			els.btnShow.addEventListener("click", async () => {
				try {
					await loadData();
				} catch (error) {
					console.error(error);
					alert("Không tải được dữ liệu thống kê");
				}
			});

			els.search.addEventListener("input", applyClientSearch);

			document.getElementById("btnToggleSummary").addEventListener("click", () => {
				document.getElementById("summaryBox").classList.toggle("collapsed");
			});

			initPage();
		</script>
	</body>
</html>
````

## File: src/views/vuotgio_v2/vuotGioKyTuBD.ejs
````ejs
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Học Viện Kỹ Thuật Mật Mã</title>
    <link rel="stylesheet" href="/css/table.css" />
    <link rel="stylesheet" href="/css/admin.css" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"
    />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css"
    />
    <link rel="stylesheet" href="/css/styles.css" />

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  </head>
  <style>
    .viet_tat-cell {
      cursor: pointer;
    }
    .edit-input {
      margin: 2px;
      padding: 2px 5px;
      border: 1px solid #ddd;
      border-radius: 3px;
    }

    .save-btn,
    .cancel-btn {
      padding: 2px 8px;
      margin-left: 5px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
    }

    .save-btn {
      background-color: #4caf50;
      color: white;
    }

    .cancel-btn {
      background-color: #f44336;
      color: white;
    }
    .form-group {
      margin-bottom: 20px;
    }

    .navbar-nav .dropdown-menu {
      z-index: 1050 !important;
    }

    .container.my-5.box {
      position: relative;
      z-index: 1;
    }

    .navbar-bottom {
      position: relative;
      z-index: 1040;
    }

    .nav-link.dropdown-toggle {
      z-index: 1050;
      position: relative;
    }

    select.edit-input {
      width: 100%;
      margin-bottom: 5px;
      display: flex;
    }
  </style>
  <body>
    <%- include('../adminHeader') %>
    <div class="container my-5 box">
      <form action="/kytubatdau" method="POST" class="row">
        <div class="col-md-5" style="max-width: 300px;">
          <div class="form-group">
            <label for="viet_tat">Viết tắt:</label>
            <input
              type="text"
              class="form-control"
              id="viet_tat"
              name="viet_tat"
              required
            />
          </div>
        </div>
        <div class="col-md-5" style="max-width: 300px;">
          <div class="form-group">
            <label for="doi_tuong">Đối tượng:</label>
            <input
              type="text"
              class="form-control"
              id="doi_tuong"
              name="doi_tuong"
              required
            />
          </div>
        </div>

        <!-- Loại đào tạo -->
        <div class="col-md-2">
          <div class="form-group">
            <select class="selectop" id="LoaiDaoTao" name="loai_dao_tao">
              <option value="Đại học">Đại học</option>
              <option value="Cao học">Cao học</option>
              <option value="Nghiên cứu sinh">Nghiên cứu sinh</option>
            </select>
          </div>
        </div>

        <!-- Hệ đào tạo -->
        <div class="col-md-2">
          <div class="form-group">
            <select class="selectop" id="he_dao_tao" name="he_dao_tao">
              <option value="Đóng học phí">Đóng học phí</option>
              <option value="Mật Mã">Mật mã</option>
            </select>
          </div>
        </div>

        <div class="col-md-2 d-flex align-items-end">
          <button
            type="submit"
            class="btn btn-primary w-100"
            style="z-index: 1; margin-bottom: 1.5rem"
          >
            Thêm mới
          </button>
        </div>
      </form>

      <!-- Nút Lọc màu giống nút Hiển thị -->
      <div class="pb-3">
        <table id="NamHocTable" class="table table-bordered">
          <thead>
            <tr>
              <th>STT</th>
              <th>Viết tắt</th>
              <th>Tên lớp ví dụ</th>
              <th>Hệ đào tạo</th>
              <th>Đối tượng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="data-table-body">
            <% if (kyTuBD && kyTuBD.length > 0) { %> <% for (var i = 0; i <
            kyTuBD.length; i++) { %>
            <tr
              data-lop-vi-du="<%= kyTuBD[i].lop_vi_du %>"
              data-viet-tat="<%= kyTuBD[i].viet_tat %>"
            >
              <td><%= i + 1 %></td>
              <td class="editable viet_tat-cell"><%= kyTuBD[i].viet_tat %></td>
              <td class="editable lop_vi_du-cell">
                <%= kyTuBD[i].lop_vi_du %>
              </td>
              <td class="editable"><%= kyTuBD[i].gia_tri_so_sanh %></td>
              <td class="editable doi_tuong-cell"><%= kyTuBD[i].doi_tuong %></td>
              <td class="d-flex justify-content-center" style="border: none;">
                <button class="bi bi-pencil action-button edit-btn"></button>
                <button
                  class="bi bi-trash3 action-button me-2"
                  onclick="deleteKyTuBD(this, '<%= kyTuBD[i].lop_vi_du %>')"
                ></button>
              </td>
            </tr>
            <% } %> <% } %>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Link script Sweet alert 2 -->
    <!-- SweetAlert2 CSS -->
    <link
      href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css"
      rel="stylesheet"
    />

    <!-- SweetAlert2 JavaScript -->
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>

    <script>
      function deleteKyTuBD(button, id) {
        if (confirm(`Bạn có chắc chắn muốn xóa Hệ đào tạo${id} không?`)) {
          fetch(`/kytubatdau/${id}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((response) => {
              if (response.ok) {
                alert("Xóa thành công!");
                button.closest("tr").remove();
              } else {
                return response.text().then((text) => {
                  // Kiểm tra nếu phản hồi là HTML, thường là trang đăng nhập hoặc lỗi
                  if (text.startsWith("<!DOCTYPE html>")) {
                    alert(
                      "Có lỗi xảy ra, có thể bạn cần đăng nhập lại hoặc endpoint không tồn tại."
                    );
                  } else {
                    const data = JSON.parse(text); // Xử lý JSON nếu không phải HTML
                    alert("Xóa thất bại: " + data.message);
                  }
                });
              }
            })
            .catch((error) => {
              alert("Có lỗi xảy ra: " + error.message);
            });
        }
      }
    </script>
    <script>
      $(document).ready(function () {
        let originalValues = {};

        $(".edit-btn").click(function () {
          const row = $(this).closest("tr");
          const id = row.data("id");

          // Lưu giá trị gốc
          originalValues[id] = {
            viet_tat: row.find(".viet_tat").text().trim(),
          };

          // Chuyển text thành input
          row.find(".viet_tat").html(`
            <input type="text" class="form-control" value="${originalValues[id].viet_tat}">
          `);

          // Hiển thị/ẩn các nút
          row.find(".edit-btn").hide();
          row.find(".save-btn, .cancel-btn").show();
        });

        $(".save-btn").click(function () {
          const row = $(this).closest("tr");
          const id = row.data("id");
          const newviet_tat = row.find(".viet_tat input").val();

          $.ajax({
            url: "/updateKyTuBD",
            method: "POST",
            data: {
              lop_vi_du: id,
              viet_tat: newviet_tat,
            },
            success: function (response) {
              // Cập nhật giao diện
              row.find(".viet_tat").text(newviet_tat);
              row.find(".edit-btn").show();
              row.find(".save-btn, .cancel-btn").hide();

              // Hiển thị thông báo thành công
              toastr.success("Cập nhật thành công");
            },
            error: function (error) {
              toastr.error("Có lỗi xảy ra khi cập nhật");
            },
          });
        });

        $(".cancel-btn").click(function () {
          const row = $(this).closest("tr");
          const id = row.data("id");

          // Khôi phục giá trị gốc
          row.find(".viet_tat").text(originalValues[id].viet_tat);

          // Hiển thị/ẩn các nút
          row.find(".edit-btn").show();
          row.find(".save-btn, .cancel-btn").hide();
        });
      });
    </script>
    <script>
      document
        .getElementById("changePasswordLink")
        .addEventListener("click", function (event) {
          event.preventDefault(); // Ngăn chặn hành vi mặc định của thẻ a
          const tenDangNhap = localStorage.getItem("TenDangNhap"); // Lấy TenDangNhap từ localStorage

          if (tenDangNhap) {
            // Chuyển hướng đến trang changePassword và truyền TenDangNhap trong URL
            window.location.href = `/changePassword?tenDangNhap=${encodeURIComponent(
              tenDangNhap
            )}`;
          } else {
            alert("Không tìm thấy TenDangNhap trong localStorage.");
          }
        });
    </script>

    <script>
      document.addEventListener("DOMContentLoaded", function () {
        const table = document.querySelector("table");

        // Handle edit button click
        table.addEventListener("click", function (e) {
          if (e.target.classList.contains("edit-btn")) {
            const row = e.target.closest("tr");
            const lop_vi_duCell = row.querySelector(".lop_vi_du-cell");
            const viet_tatCell = row.querySelector(".viet_tat-cell");
            const doiTuongCell = row.querySelector(".doi_tuong-cell");
            const giaTriSoSanhCell = row.querySelector(
              ".editable:nth-child(4)"
            );

            // Lưu giá trị gốc
            row.dataset.originallopViDu = lop_vi_duCell.textContent.trim();
            row.dataset.originalvietTat = viet_tatCell.textContent.trim();
            row.dataset.originaldoiTuong = doiTuongCell.textContent.trim();
            row.dataset.originalgiaTriSoSanh =
              giaTriSoSanhCell.textContent.trim();

            // Parse giá trị gốc của hệ đào tạo
            const match = giaTriSoSanhCell.textContent.match(/(.+) \((.+)\)/);
            const originalLoaiDaoTao = match ? match[1].trim() : "Đại học";
            const originalHeDaoTao = match ? match[2].trim() : "Đóng học phí";

            // Chuyển cells thành inputs
            lop_vi_duCell.innerHTML = `
              <input type="text" class="edit-input" value="${row.dataset.originallopViDu}">
            `;
            viet_tatCell.innerHTML = `
              <input type="text" class="edit-input" value="${row.dataset.originalvietTat}">
            `;
            doiTuongCell.innerHTML = `
              <input type="text" class="edit-input" value="${row.dataset.originaldoiTuong}">
            `;
            giaTriSoSanhCell.innerHTML = `
              <select class="edit-input" id="LoaiDaoTao">
                <option value="Đại học" ${
                  originalLoaiDaoTao === "Đại học" ? "selected" : ""
                }>Đại học</option>
                <option value="Cao học" ${
                  originalLoaiDaoTao === "Cao học" ? "selected" : ""
                }>Cao học</option>
                <option value="Nghiên cứu sinh" ${
                  originalLoaiDaoTao === "Nghiên cứu sinh" ? "selected" : ""
                }>Nghiên cứu sinh</option>
              </select>
              <select class="edit-input" id="HeDaoTao">
                <option value="Đóng học phí" ${
                  originalHeDaoTao === "Đóng học phí" ? "selected" : ""
                }>Đóng học phí</option>
                <option value="Mật mã" ${
                  originalHeDaoTao === "Mật mã" ? "selected" : ""
                }>Mật mã</option>
              </select>
            `;

            // Add save/cancel buttons
            const actionCell = row.querySelector("td:last-child");
            actionCell.innerHTML = `
              <button class="save-btn btn btn-success btn-sm">Lưu</button>
              <button class="cancel-btn btn btn-danger btn-sm ms-2">Hủy</button>
            `;
          }
        });

        // Handle save button click
        table.addEventListener("click", async function (e) {
          if (e.target.classList.contains("save-btn")) {
            const row = e.target.closest("tr");
            const newlop_vi_du = row.querySelector(
              ".lop_vi_du-cell input"
            ).value;
            const newdoi_tuong = row.querySelector(
              ".doi_tuong-cell input"
            ).value;
            const newviet_tat = row.querySelector(".viet_tat-cell input").value;
            const newLoaiDaoTao = row.querySelector("#LoaiDaoTao").value;
            const newHeDaoTao = row.querySelector("#HeDaoTao").value;
            const originallop_vi_du = row.dataset.originallopViDu;

            try {
              const response = await fetch(`/kytubatdau/${originallop_vi_du}`, {
                method: "PUT",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  lop_vi_du: newlop_vi_du,
                  viet_tat: newviet_tat,
                  loai_dao_tao: newLoaiDaoTao,
                  he_dao_tao: newHeDaoTao,
                  doi_tuong: newdoi_tuong,
                }),
              });

              if (response.ok) {
                // Update UI
                row.dataset.lop_vi_du = newlop_vi_du;
                row.dataset.viet_tat = newviet_tat;
                row.dataset.doi_tuong = newdoi_tuong;
                row.querySelector(".lop_vi_du-cell").textContent = newlop_vi_du;
                row.querySelector(".viet_tat-cell").textContent = newviet_tat;
                row.querySelector(".doi_tuong-cell").textContent = newdoi_tuong;
                row.querySelector(
                  ".editable:nth-child(4)"
                ).textContent = `${newLoaiDaoTao} (${newHeDaoTao})`;

                // Restore edit/delete buttons
                const actionCell = row.querySelector("td:last-child");
                actionCell.innerHTML = `
                  <button class="bi bi-pencil action-button edit-btn"></button>
                  <button class="bi bi-trash3 action-button me-2" 
                      onclick="deleteKyTuBD(this, '${newlop_vi_du}')">
                  </button>
                `;

                alert("Cập nhật thành công!");
              } else {
                throw new Error("Có lỗi xảy ra");
              }
            } catch (error) {
              console.error("Error:", error);
              alert("Lỗi khi cập nhật: " + error.message);
            }
          }
        });

        // Handle cancel button click
        table.addEventListener("click", function (e) {
          if (e.target.classList.contains("cancel-btn")) {
            const row = e.target.closest("tr");

            // Restore original values
            row.querySelector(".lop_vi_du-cell").textContent =
              row.dataset.originallopViDu;
            row.querySelector(".viet_tat-cell").textContent =
              row.dataset.originalvietTat;
            row.querySelector(".doi_tuong-cell").textContent =
              row.dataset.originaldoiTuong;
            row.querySelector(".editable:nth-child(4)").textContent =
              row.dataset.originalgiaTriSoSanh;

            // Restore edit/delete buttons
            const actionCell = row.querySelector("td:last-child");
            actionCell.innerHTML = `
              <button class="bi bi-pencil action-button edit-btn"></button>
              <button class="bi bi-trash3 action-button me-2" 
                  onclick="deleteKyTuBD(this, '${row.dataset.originallopViDu}')">
              </button>
            `;
          }
        });
      });
    </script>

    <!-- Script thông báo khi thêm -->
    <script>
      // Lấy query string từ URL
      const urlParams = new URLSearchParams(window.location.search);
      const message = urlParams.get("message");

      // Lấy phần tử div để hiển thị thông báo
      const messageDiv = document.getElementById("message");

      // Hiển thị thông báo dựa trên giá trị của message

      if (message === "insertSuccess") {
        Swal.fire({
          title: "Thông báo",
          html: "Thành công",
          icon: "success",
          confirmButtonText: "OK",
          width: "auto",
          padding: "20px",
        });
      } else if (message === "duplicateKiTu") {
        Swal.fire({
          title: "Thông báo",
          html: "Kí tự bắt đầu đã tồn tại",
          icon: "info",
          confirmButtonText: "OK",
          width: "auto",
          padding: "20px",
        });
      } else if (message === "duplicateKiTuAndHeDaoTao") {
        Swal.fire({
          title: "Thông báo",
          html: "Kí tự bắt đầu với hệ đào tạo này đã tồn tại",
          icon: "info",
          confirmButtonText: "OK",
          width: "auto",
          padding: "20px",
        });
      } else if (message == null) {
      } else {
        alert(message);
      }

      // Sau khi hiển thị thông báo, xóa query string để tránh hiển thị lại khi refresh
      if (message) {
        // Sử dụng window.history để xóa query string mà không refresh lại trang
        const newUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    </script>
    <script>
      $(document).ready(function () {
        // Handle form submission
        $("form").submit(function (event) {
          event.preventDefault(); // Prevent default form submission

          const vietTat = $("#viet_tat").val();
          const loaiDaoTao = $("#LoaiDaoTao").val();
          const heDaoTao = $("#he_dao_tao").val();
          const doiTuong = $("#doi_tuong").val();
          const giaTriSoSanh = `${loaiDaoTao} (${heDaoTao})`;

          // Kiểm tra trùng lặp trước khi thêm mới
          $.ajax({
            url: "/kytubatdau/check",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({
              viet_tat: vietTat,
              gia_tri_so_sanh: giaTriSoSanh,
              doi_tuong: doiTuong,
            }),
            success: function (response) {
              // Nếu không trùng, tiến hành thêm mới
              addNewKyTuBD(vietTat, loaiDaoTao, heDaoTao, giaTriSoSanh, doiTuong);
            },
            error: function (xhr) {
              if (xhr.status === 409) {
                Swal.fire({
                  title: "Thông báo",
                  html:
                    xhr.responseJSON.message ||
                    "Kí tự bắt đầu với hệ đào tạo này đã tồn tại",
                  icon: "error",
                  confirmButtonText: "OK",
                  width: "auto",
                  padding: "20px",
                });
              } else {
                alert("Có lỗi xảy ra khi kiểm tra.");
              }
            },
          });
        });

        function addNewKyTuBD(vietTat, loaiDaoTao, heDaoTao, giaTriSoSanh, doiTuong) {
          $.ajax({
            url: "/kytubatdau",
            method: "POST",
            contentType: "application/json",
            data: JSON.stringify({
              viet_tat: vietTat,
              loai_dao_tao: loaiDaoTao,
              he_dao_tao: heDaoTao,
              gia_tri_so_sanh: giaTriSoSanh,
              doi_tuong: doiTuong,
            }),
            success: function (response) {
              Swal.fire({
                title: "Thông báo",
                html: "Thêm mới thành công!",
                icon: "success",
                confirmButtonText: "OK",
                width: "auto",
                padding: "20px",
              }).then((result) => {
                if (result.isConfirmed) {
                  location.reload();
                }
              });
            },
            error: function (error) {
              alert("Có lỗi xảy ra khi thêm mới.");
            },
          });
        }
      });
    </script>
  </body>
</html>
````

## File: src/views/vuotgio_v2/vuotGioSoTietDM.ejs
````ejs
<!DOCTYPE html>
<html lang="en">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Học Viện Kỹ Thuật Mật Mã</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
  <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet"/>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>
  <style>
    
    .form-label {
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }

    .btn-sm {
      margin-bottom: 0px;
      height: 31px;
    }
    .form-label {
      font-size: 0.875rem;
      margin-bottom: 0.25rem;
    }
    .cardDM{
      overflow: visible; /* Đảm bảo dropdown không bị cắt */
      z-index: 0; /* Đặt giá trị z-index cho card */
      --bs-card-spacer-y: 1rem;
    --bs-card-spacer-x: 1rem;
    --bs-card-title-spacer-y: 0.5rem;
    --bs-card-border-width: 1px;
    --bs-card-border-color: var(--bs-border-color-translucent);
    --bs-card-border-radius: 0.375rem;
    --bs-card-box-shadow: ;
    --bs-card-inner-border-radius: calc(0.375rem - 1px);
    --bs-card-cap-padding-y: 0.5rem;
    --bs-card-cap-padding-x: 1rem;
    --bs-card-cap-bg: rgba(0, 0, 0, 0.03);
    --bs-card-cap-color: ;
    --bs-card-height: ;
    --bs-card-color: ;
    --bs-card-bg: #fff;
    --bs-card-img-overlay-padding: 1rem;
    --bs-card-group-margin: 0.75rem;
;
    flex-direction: column;
    min-width: 0;
    height: var(--bs-card-height);
    word-wrap: break-word;
    background-color: var(--bs-card-bg);
    background-clip: border-box;
    border: var(--bs-card-border-width) solid var(--bs-card-border-color);
    border-radius: var(--bs-card-border-radius);
    }
    .dropdown-menu {
      z-index: 9999; /* Đặt giá trị cao hơn để đảm bảo dropdown hiển thị trên cùng */
      position: absolute;
    }
  </style>
</head>

<body>
  <!-- Phần header -->
  <%- include('../adminHeader') %>

  <!-- Phần nội dung -->

  <div class="container mt-4">
    <div class="row mb-4" >
      <div class="col-md-6 offset-md-3">
        <div class="cardDM">
          <div class="card-header" >
            <h4 class="text-center">Cập nhật số tiết định mức</h4>
          </div>
          <div class="card-body">
            <form id="soTietForm">
              <div class="mb-3">
                <label for="gioGiangDayChuaNghiHuu" class="form-label">Số tiết giảng dạy (Giảng viên CHƯA nghỉ hưu)</label>
                <input type="number" class="form-control" id="gioGiangDayChuaNghiHuu" name="gioGiangDayChuaNghiHuu" 
                    value="<%= currentData.GiangDayChuaNghiHuu || currentData.GiangDay || 280 %>" required>
              </div>
              <div class="mb-3">
                <label for="gioGiangDayDaNghiHuu" class="form-label">Số tiết giảng dạy (Giảng viên ĐÃ nghỉ hưu)</label>
                <input type="number" class="form-control" id="gioGiangDayDaNghiHuu" name="gioGiangDayDaNghiHuu" 
                    value="<%= currentData.GiangDayDaNghiHuu || 560 %>" required>
              </div>
              <div class="mb-3">
                <label for="gioVuotGio" class="form-label">Số tiết vượt giờ</label>
                <input type="number" class="form-control" id="gioVuotGio" name="gioVuotGio" 
                    value="<%= currentData.VuotGio %>" required>
              </div>
              <div class="mb-3">
                <label for="gioNCKH" class="form-label">Số tiết NCKH</label>
                <input type="number" class="form-control" id="gioNCKH" name="gioNCKH" 
                    value="<%= currentData.NCKH %>" required>
              </div>
              <div class="text-center">
                <button type="submit" class="btn btn-primary">Cập nhật</button>
              </div>
            </form>
        </div>
        </div>
      </div>
    </div>
  </div>

</body>

</html>


<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<script>
  document.getElementById("changePasswordLink").addEventListener("click", function (event) {
    event.preventDefault(); // Ngăn chặn hành vi mặc định của thẻ a
    const tenDangNhap = localStorage.getItem("TenDangNhap"); // Lấy TenDangNhap từ localStorage

    if (tenDangNhap) {
      // Chuyển hướng đến trang changePassword và truyền TenDangNhap trong URL
      window.location.href = `/changePassword?tenDangNhap=${encodeURIComponent(tenDangNhap)}`;
    } else {
      alert("Không tìm thấy TenDangNhap trong localStorage.");
    }
  });
</script>

<script>
document.getElementById('soTietForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    
    const formData = {
        soTietDaoTaoChuaNghiHuu: document.getElementById('gioGiangDayChuaNghiHuu').value,
        soTietDaoTaoDaNghiHuu: document.getElementById('gioGiangDayDaNghiHuu').value,
        soTietVuotGio: document.getElementById('gioVuotGio').value,
        soTietNCKH: document.getElementById('gioNCKH').value
    };

    try {
        const response = await fetch('/api/update-dinh-muc', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (data.success) {
            Swal.fire({
                title: "Thông báo",
                html: "Cập nhật số tiết định mức thành công!",
                icon: "success",
                width: "auto",
                padding: "20px",
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            });
        } else {
            Swal.fire({
                title: "Thông báo",
                html: data.message || "Có lỗi xảy ra khi cập nhật",
                icon: "error",
                width: "auto",
                padding: "20px",
                timer: 2000,
                timerProgressBar: true,
                showConfirmButton: false
            });
        }
    } catch (error) {
        console.error('Lỗi:', error);
        Swal.fire({
            title: "Thông báo",
            html: "Có lỗi xảy ra khi cập nhật số tiết định mức",
            icon: "error",
            width: "auto",
            padding: "20px",
            timer: 2000,
            timerProgressBar: true,
            showConfirmButton: false
        });
    } finally {
        submitButton.disabled = false;
    }
});
</script>
  </body>

</html>
````

## File: src/controllers/vuotgio_v2/duyetTongHop.controller.js
````javascript
/**
 * VUOT GIO V2 - Duyệt Tổng Hợp Controller
 * API duyệt tổng hợp vượt giờ theo khoa (Văn phòng thực hiện)
 */

const duyetTongHopService = require("../../services/vuotgio_v2/duyetTongHop.service");

/**
 * GET /tong-hop/duyet-trang-thai?namHoc=...
 * Lấy trạng thái duyệt tổng hợp cho tất cả khoa
 */
const getApprovalStatus = async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { namHoc } = req.query;
    if (!namHoc) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học" });
    }

    try {
        const result = await duyetTongHopService.getApprovalStatus(namHoc);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("[duyetTongHop.getApprovalStatus] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    }
};

/**
 * GET /tong-hop/duyet-kiem-tra?namHoc=...&khoa=...
 * Kiểm tra điều kiện tiên quyết cho 1 khoa trước khi duyệt
 */
const checkPrerequisites = async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { namHoc, khoa } = req.query;
    if (!namHoc || !khoa) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học hoặc khoa" });
    }

    try {
        const result = await duyetTongHopService.checkPrerequisites(namHoc, khoa);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("[duyetTongHop.checkPrerequisites] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    }
};

/**
 * POST /tong-hop/duyet-khoa
 * VP duyệt tổng hợp cho 1 khoa
 * Body: { namHoc, khoa, ghiChu? }
 * Quyền: Trợ lý VP hoặc Lãnh đạo phòng VP
 */
const approveKhoa = async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Kiểm tra quyền: Trợ lý hoặc Lãnh đạo phòng VP
    const role = req.session.role || req.session.Quyen;
    const maPhongBan = req.session.MaPhongBan;
    const allowedRoles = ["Lãnh đạo phòng", "Trợ lý"];
    if (!allowedRoles.includes(role) || maPhongBan !== "VP") {
        return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện thao tác này" });
    }

    const { namHoc, khoa, ghiChu } = req.body;
    if (!namHoc || !khoa) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học hoặc khoa" });
    }

    try {
        const result = await duyetTongHopService.approveKhoa(namHoc, khoa, req.session.userId, ghiChu || null);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error("[duyetTongHop.approveKhoa] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    }
};

/**
 * POST /tong-hop/huy-duyet-khoa
 * VP hủy duyệt 1 khoa
 * Body: { namHoc, khoa }
 * Quyền: Trợ lý VP hoặc Lãnh đạo phòng VP
 */
const revokeKhoa = async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Kiểm tra quyền: Trợ lý hoặc Lãnh đạo phòng VP
    const role = req.session.role || req.session.Quyen;
    const maPhongBan = req.session.MaPhongBan;
    const allowedRoles = ["Lãnh đạo phòng", "Trợ lý"];
    if (!allowedRoles.includes(role) || maPhongBan !== "VP") {
        return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện thao tác này" });
    }

    const { namHoc, khoa } = req.body;
    if (!namHoc || !khoa) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học hoặc khoa" });
    }

    try {
        const result = await duyetTongHopService.revokeKhoa(namHoc, khoa);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error("[duyetTongHop.revokeKhoa] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    }
};

module.exports = {
    getApprovalStatus,
    checkPrerequisites,
    approveKhoa,
    revokeKhoa,
};
````

## File: src/mappers/vuotgio_v2/lnqc.mapper.js
````javascript
/**
 * VUOT GIO V2 - LNQC Mapper
 * Chuyển đổi dữ liệu cho module Lớp Ngoài Quy Chuẩn
 */

const base = require("./base.mapper");

/**
 * Map từ Request Body sang Database Entity (v2 schema)
 */
const toEntity = (body) => {
    return {
        course_name: base.pick(body, "course_name", "TenLop", "LopHocPhan") || "",
        course_code: base.pick(body, "course_code", "MaHocPhan") || "",
        credit_hours: base.toInt(base.pick(body, "credit_hours", "SoTinChi"), 0),
        student_quantity: base.toInt(base.pick(body, "student_quantity", "SoSV"), 0),
        student_bonus: base.toDecimal(base.pick(body, "student_bonus", "HeSoLopDong"), 1),
        bonus_time: base.toDecimal(base.pick(body, "bonus_time", "HeSoT7CN"), 1),
        ll_code: base.toDecimal(base.pick(body, "ll_code", "SoTietCTDT"), 0),
        ll_total: base.toDecimal(base.pick(body, "ll_total", "LL"), 0),
        qc: base.toDecimal(base.pick(body, "qc", "QuyChuan", "quy_chuan"), 0),
        lecturer: base.pick(body, "lecturer", "GiangVien", "GiaoVienGiangDay") || "",
        major: base.pick(body, "major", "Khoa", "khoa") || "",
        he_dao_tao: base.pick(body, "he_dao_tao", "he_dao_tao_id", "HeDaoTaoId", "HeDaoTao") || "",
        dot: base.toInt(base.pick(body, "dot", "Dot"), 1),
        ki_hoc: base.toInt(base.pick(body, "ki_hoc", "KiHoc", "hoc_ky"), 1),
        nam_hoc: base.pick(body, "nam_hoc", "NamHoc", "nam_hoc") || "",
        note: base.pick(body, "note", "GhiChu", "ghi_chu") || "",
        course_id: base.pick(body, "course_id", "MaBoMon", "ma_bo_mon") || "",
        class_type: "ngoai_quy_chuan",
        da_luu: 0,
        start_date: base.pick(body, "start_date", "NgayBatDau") || null,
        end_date: base.pick(body, "end_date", "NgayKetThuc") || null,
    };
};

/**
 * Map từ Database Row sang DTO cho UI
 */
const toDTO = (row) => {
    if (!row) return null;
    return {
        id: row.id || row.ID,
        tenLop: row.course_name,
        maLop: row.course_code,
        soTinChi: row.credit_hours,
        soSV: row.student_quantity,
        heSoLopDong: row.student_bonus,
        heSoT7CN: row.bonus_time,
        soTietCTDT: row.ll_code,
        ll: row.ll_total,
        quyChuan: row.qc,
        giangVien: row.lecturer,
        khoa: row.major,
        heDaoTao: row.he_dao_tao,
        dot: row.dot,
        ki: row.ki_hoc,
        namHoc: row.nam_hoc,
        ghiChu: row.note,
        maBoMon: row.course_id,
        ngayBatDau: row.start_date,
        ngayKetThuc: row.end_date,
        khoaDuyet: row.khoa_duyet,
        daoTaoDuyet: row.dao_tao_duyet
    };
};

module.exports = {
    toEntity,
    toDTO
};
````

## File: src/public/js/vuotgio_v2/huongDanDATN/index.js
````javascript
/**
 * VUOT GIO V2 - Hướng Dẫn Đồ Án Tốt Nghiệp
 * JavaScript cho trang view hướng dẫn ĐATN
 * Hiển thị dữ liệu nhóm theo giảng viên với số tiết
 * Date: 2026-02-03
 */

document.addEventListener("DOMContentLoaded", function () {
    // =====================================================
    // KHỞI TẠO
    // =====================================================
    
    // Khởi tạo và tự động tải dữ liệu
    initDropdowns().then(() => {
        loadData();
    });
    
    // Event listeners
    document.getElementById("loadDataBtn").addEventListener("click", loadData);
    document.getElementById("filterGiangVien").addEventListener("input", filterTable);
    
    // =====================================================
    // LOAD DROPDOWNS
    // =====================================================
    
    async function initDropdowns() {
        await Promise.all([
            loadNamHoc(),
            loadKhoa(),
            loadHeDaoTao()
        ]);
    }
    
    async function loadNamHoc() {
        try {
            const response = await fetch("/api/namhoc");
            const data = await response.json();
            
            const select = document.getElementById("namHocFilter");
            select.innerHTML = "";
            
            data.forEach((item, index) => {
                const option = document.createElement("option");
                option.value = item.NamHoc;
                option.textContent = item.NamHoc;
                // Select năm học có trạng thái = 1 hoặc năm đầu tiên
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading NamHoc:", error);
        }
    }
    
    async function loadKhoa() {
        try {
            const response = await fetch("/api/khoa");
            const data = await response.json();
            
            const select = document.getElementById("khoaFilter");
            // Giữ option "Tất cả" đã có sẵn
            
            data.forEach(item => {
                const option = document.createElement("option");
                option.value = item.MaPhongBan;
                option.textContent = item.TenPhongBan || item.MaPhongBan;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading Khoa:", error);
        }
    }
    
    async function loadHeDaoTao() {
        try {
            const response = await fetch("/api/gvm/v1/he-do-an");
            const data = await response.json();
            
            if (!data.success) return;
            
            const select = document.getElementById("heDaoTaoFilter");
            select.innerHTML = "";
            
            data.data.forEach((item, index) => {
                const option = document.createElement("option");
                option.value = item.id;
                option.textContent = item.he_dao_tao;
                if (index === 0) option.selected = true;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("Error loading He Dao Tao:", error);
        }
    }
    
    // =====================================================
    // LOAD DATA
    // =====================================================
    
    async function loadData() {
        const dot = document.getElementById("dotFilter").value;
        const ki = document.getElementById("kiFilter").value;
        const namHoc = document.getElementById("namHocFilter").value;
        const khoa = document.getElementById("khoaFilter").value;
        const heDaoTao = document.getElementById("heDaoTaoFilter").value;
        
        if (!namHoc) {
            Swal.fire({
                icon: "warning",
                title: "Thông báo",
                text: "Vui lòng chọn năm học",
                confirmButtonText: "OK"
            });
            return;
        }
        
        try {
            // Show loading (Đã bỏ)
            
            const params = new URLSearchParams({
                NamHoc: namHoc,
                Dot: dot,
                Ki: ki,
                Khoa: khoa,
                HeDaoTao: heDaoTao
            });
            
            const response = await fetch(`/v2/vuotgio/huong-dan-datn/table?${params}`);
            const result = await response.json();
            
            Swal.close();
            
            if (result.success) {
                renderTable(result.data);
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Lỗi",
                    text: result.message || "Không thể tải dữ liệu"
                });
            }
        } catch (error) {
            Swal.close();
            console.error("Error loading data:", error);
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: "Lỗi kết nối server"
            });
        }
    }
    
    // =====================================================
    // RENDER TABLE
    // =====================================================
    
    function renderTable(data) {
        const tableBody = document.getElementById("tableBody");
        tableBody.innerHTML = "";
        
        if (!data || data.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="fas fa-inbox fa-2x mb-2"></i><br>
                        Không có dữ liệu
                    </td>
                </tr>
            `;
            return;
        }
        
        let currentGVKey = "";
        let stt = 0;

        data.forEach((row, index) => {
            const tr = document.createElement("tr");
            // Sử dụng key kết hợp Khoa + Tên giảng viên để tránh trùng lặp
            const gvKey = `${row.Khoa}_${row.GiangVien}`;
            tr.setAttribute("data-giangvien", row.GiangVien || "");
            tr.setAttribute("data-sotiet", row.SoTiet || 0);
            
            // Kiểm tra xem giảng viên này có phải là giảng viên mới không (để gộp dòng)
            const isNewGV = gvKey !== currentGVKey;
            
            if (isNewGV) {
                currentGVKey = gvKey;
                stt++;
                
                // Đếm số lượng bản ghi liên tiếp của giảng viên này để đặt rowspan
                let gvCount = 0;
                for (let i = index; i < data.length; i++) {
                    const nextKey = `${data[i].Khoa}_${data[i].GiangVien}`;
                    if (nextKey === gvKey) {
                        gvCount++;
                    } else {
                        break;
                    }
                }
                
                tr.innerHTML = `
                    <td rowspan="${gvCount}">${stt}</td>
                    <td rowspan="${gvCount}">${row.GiangVien || ""}</td>
                    <td rowspan="${gvCount}">${row.Khoa || ""}</td>
                    <td>${row.SinhVien || ""}</td>
                    <td>${row.KhoaSV || ""}</td>
                    <td>${row.TenDeTai || ""}</td>
                    <td>${row.SoTiet || 0}</td>
                    <td rowspan="${gvCount}">
                        <button class="btn btn-info btn-view" onclick="viewChiTiet('${encodeURIComponent(row.GiangVien || "")}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
            } else {
                // Đối với các dòng tiếp theo của cùng một giảng viên, chỉ hiển thị thông tin sinh viên
                tr.innerHTML = `
                    <td>${row.SinhVien || ""}</td>
                    <td>${row.KhoaSV || ""}</td>
                    <td>${row.TenDeTai || ""}</td>
                    <td>${row.SoTiet || 0}</td>
                `;
            }
            
            tableBody.appendChild(tr);
        });

        updateSummary();
    }

    // =====================================================
    // UPDATE SUMMARY
    // =====================================================
    
    function updateSummary() {
        const rows = document.querySelectorAll("#tableBody tr");
        const uniqueGVs = new Set();
        let totalStudents = 0;
        let totalHours = 0;

        rows.forEach(row => {
            if (row.style.display !== "none") {
                const gv = row.getAttribute("data-giangvien");
                if (gv) uniqueGVs.add(gv);
                
                // Mỗi dòng dữ liệu ứng với 1 sinh viên
                totalStudents++;
                totalHours += parseFloat(row.getAttribute("data-sotiet")) || 0;
            }
        });

        document.getElementById("totalTeachers").textContent = uniqueGVs.size;
        document.getElementById("totalStudents").textContent = totalStudents;
        document.getElementById("totalHours").textContent = totalHours.toFixed(2);
        
        // Cập nhật cả phần footer cũ nếu còn tồn tại
        const footerTotal = document.getElementById("tongSoTiet");
        if (footerTotal) {
            footerTotal.innerHTML = `<strong>${totalHours.toFixed(2)}</strong>`;
        }
    }

    // =====================================================
    // FILTER TABLE
    // =====================================================
    
    function filterTable() {
        const filterValue = document.getElementById("filterGiangVien").value.toLowerCase();
        const rows = document.querySelectorAll("#tableBody tr");
        
        rows.forEach(row => {
            const giangVien = row.getAttribute("data-giangvien") || "";
            if (giangVien.toLowerCase().includes(filterValue)) {
                row.style.display = "";
            } else {
                row.style.display = "none";
            }
        });

        updateSummary();
    }

    // =====================================================
    // TOGGLE SUMMARY
    // =====================================================
    document.getElementById("btnToggleSummary").addEventListener("click", function() {
        document.getElementById("summaryBox").classList.toggle("collapsed");
        const icon = this.querySelector("i");
        if (document.getElementById("summaryBox").classList.contains("collapsed")) {
            icon.className = "bi bi-chevron-up";
        } else {
            icon.className = "bi bi-chevron-down";
        }
    });
});

// =====================================================
// VIEW CHI TIET (Global function for onclick)
// =====================================================

async function viewChiTiet(giangVienEncoded) {
    const giangVien = decodeURIComponent(giangVienEncoded);
    
    const dot = document.getElementById("dotFilter").value;
    const ki = document.getElementById("kiFilter").value;
    const namHoc = document.getElementById("namHocFilter").value;
    const khoa = document.getElementById("khoaFilter").value;
    const heDaoTao = document.getElementById("heDaoTaoFilter").value;
    
    try {
        // Show loading (Đã bỏ)
        
        const params = new URLSearchParams({
            NamHoc: namHoc,
            Dot: dot,
            Ki: ki,
            Khoa: khoa,
            HeDaoTao: heDaoTao
        });
        
        const response = await fetch(`/v2/vuotgio/huong-dan-datn/chi-tiet/${encodeURIComponent(giangVien)}?${params}`);
        const result = await response.json();
        
        Swal.close();
        
        if (result.success) {
            renderChiTietModal(result.data, giangVien, result.tongSoTiet);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById("chiTietModal"));
            modal.show();
        } else {
            Swal.fire({
                icon: "error",
                title: "Lỗi",
                text: result.message || "Không thể tải chi tiết"
            });
        }
    } catch (error) {
        Swal.close();
        console.error("Error loading chi tiet:", error);
        Swal.fire({
            icon: "error",
            title: "Lỗi",
            text: "Lỗi kết nối server"
        });
    }
}

function renderChiTietModal(data, giangVien, tongSoTiet) {
    document.getElementById("modalGiangVien").textContent = giangVien;
    
    const tableBody = document.getElementById("chiTietTableBody");
    tableBody.innerHTML = "";
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    Không có dữ liệu
                </td>
            </tr>
        `;
        document.getElementById("modalTongSoTiet").innerHTML = "<strong>0</strong>";
        return;
    }
    
    data.forEach((row, index) => {
        const tr = document.createElement("tr");
        
        // Format dates
        const ngayBD = row.NgayBatDau ? formatDate(row.NgayBatDau) : "";
        const ngayKT = row.NgayKetThuc ? formatDate(row.NgayKetThuc) : "";
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td class="text-start">${row.SinhVien || ""}</td>
            <td>${row.MaSV || ""}</td>
            <td>${row.KhoaSV || ""}</td>
            <td class="text-start">${row.Nganh || ""}</td>
            <td class="text-start">${row.TenDeTai || ""}</td>
            <td>${ngayBD}</td>
            <td>${ngayKT}</td>
            <td>${row.SoTiet || 0}</td>
        `;
        
        tableBody.appendChild(tr);
    });
    
    document.getElementById("modalTongSoTiet").innerHTML = `<strong>${tongSoTiet || 0}</strong>`;
}

function formatDate(dateString) {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
}
````

## File: src/public/js/vuotgio_v2/huongDanThamQuan/add.js
````javascript
$(document).ready(function () {
    let allTeachers = []; // Store all teachers for searching

    // Initialization
    initPage();

    // Tab switching
    $('.tab-btn').on('click', function() {
        const targetTab = $(this).data('tab');
        
        // Update active tab button
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        
        // Update active tab content
        $('.tab-content').removeClass('active');
        $(`#${targetTab}`).addClass('active');
    });

    // Form events
    $('#so_ngay').on('input', updateQuyDoi);
    $('#addForm').on('submit', handleFormSubmit);

    // --- Searchable Teacher Select Logic ---
    $('#teacherSearch').on('input', function() {
        const val = $(this).val().trim().toLowerCase();
        const list = $('#teacherList');
        list.empty();
        
        if (val.length > 0) {
            const filtered = allTeachers.filter(t => 
                t.HoTen.toLowerCase().includes(val) || 
                (t.MaNhanVien && t.MaNhanVien.toLowerCase().includes(val))
            );
            
            if (filtered.length > 0) {
                filtered.slice(0, 10).forEach(t => {
                    list.append(`<li><a class="dropdown-item" href="#" data-id="${t.id_User}" data-name="${t.HoTen}" data-khoa="${t.Khoa}">${t.HoTen} - ${t.Khoa}</a></li>`);
                });
                list.addClass('show');
            } else {
                list.removeClass('show');
            }
        } else {
            list.removeClass('show');
            $('#id_User').val('');
        }
    });

    $(document).on('click', '#teacherList .dropdown-item', function(e) {
        e.preventDefault();
        const id = $(this).data('id');
        const name = $(this).data('name');
        const khoa = $(this).data('khoa');
        
        $('#id_User').val(id);
        $('#teacherSearch').val(name);
        $('#khoa').val(khoa);
        $('#teacherList').removeClass('show');
    });

    // Close dropdown when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.searchable-select').length) {
            $('#teacherList').removeClass('show');
        }
    });

    // File upload functionality (disabled for now)
    $('#uploadArea').on('click', function() {
        if (!$('#fileInput').prop('disabled')) {
            $('#fileInput').click();
        }
    });

    $('#fileInput').on('change', function() {
        const file = this.files[0];
        if (file) {
            displayFileInfo(file);
        }
    });

    $('#removeFile').on('click', function() {
        $('#fileInput').val('');
        $('#fileInfo').hide();
    });

    // Drag and drop (disabled for now)
    $('#uploadArea').on('dragover', function(e) {
        e.preventDefault();
        if (!$('#fileInput').prop('disabled')) {
            $(this).addClass('dragover');
        }
    });

    $('#uploadArea').on('dragleave', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
    });

    $('#uploadArea').on('drop', function(e) {
        e.preventDefault();
        $(this).removeClass('dragover');
        
        if (!$('#fileInput').prop('disabled')) {
            const files = e.originalEvent.dataTransfer.files;
            if (files.length > 0) {
                $('#fileInput')[0].files = files;
                displayFileInfo(files[0]);
            }
        }
    });

    /**
     * Initialize Page
     */
    async function initPage() {
        try {
            await loadFilters();
        } catch (e) {
            console.error("Error initializing page", e);
        }
    }

    /**
     * Load filters from API
     */
    async function loadFilters() {
        try {
            const res = await fetch('/v2/vuotgio/huong-dan-tham-quan/filters');
            const result = await res.json();

            if (result.success) {
                const d = result.data;
                allTeachers = d.teachers || [];

                // Years
                setSelectOptions($('#nam_hoc'), d.namHoc, "-- Chọn năm học --");

                // Departments (Khoa)
                setSelectOptions($('#khoa'), d.khoa, "-- Chọn khoa --");

                // He Dao Tao
                setSelectOptions($('#he_dao_tao_id'), d.heDaoTao.map(h => h.id), "-- Chọn hệ đào tạo --", d.heDaoTao);

                // Set default year if activeNamHoc exists
                if (d.activeNamHoc) {
                    $('#nam_hoc').val(d.activeNamHoc);
                } else if ($('#nam_hoc option').length > 1) {
                    $('#nam_hoc').prop('selectedIndex', 1);
                }

                // Enforce khoa filter: nếu user thuộc khoa, lock dropdown
                if (typeof KhoaFilterUtils !== 'undefined') {
                    KhoaFilterUtils.applyKhoaFilter('khoa');
                }
            }
        } catch (e) {
            console.error("Error loading filters", e);
            Swal.fire('Lỗi', 'Không thể tải dữ liệu bộ lọc', 'error');
        }
    }

    /**
     * Helper to set select options
     */
    function setSelectOptions(selectElement, values, defaultLabel, originalData = null) {
        selectElement.empty();
        if (defaultLabel) {
            selectElement.append(`<option value="">${defaultLabel}</option>`);
        }

        values.forEach((val, idx) => {
            let label = val;
            if (originalData && originalData[idx]) {
                const item = originalData.find(i => i.id == val);
                label = item ? (item.he_dao_tao || item.ten_khoa || val) : val;
            }
            selectElement.append(`<option value="${val}">${label}</option>`);
        });
    }

    /**
     * Handle Form Submission
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        // Validate teacher selection
        if (!$('#id_User').val()) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn giảng viên từ danh sách gợi ý!', 'warning');
            return false;
        }

        // Validate required fields
        if (!$('#khoa').val()) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn khoa!', 'warning');
            return false;
        }

        if (!$('#nam_hoc').val()) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn năm học!', 'warning');
            return false;
        }

        if (!$('#he_dao_tao_id').val()) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn hệ đào tạo!', 'warning');
            return false;
        }

        if (!$('#so_ngay').val() || parseFloat($('#so_ngay').val()) <= 0) {
            Swal.fire('Cảnh báo', 'Vui lòng nhập số ngày hợp lệ!', 'warning');
            return false;
        }

        // Prepare form data
        const formData = {};
        $(this).serializeArray().forEach(item => {
            formData[item.name] = item.value;
        });

        // Show loading
        Swal.fire({
            title: 'Đang xử lý...',
            text: 'Vui lòng đợi',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const res = await fetch('/v2/vuotgio/huong-dan-tham-quan/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await res.json();

            if (result.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    text: result.message || 'Đã thêm dữ liệu thành công',
                    confirmButtonText: 'OK'
                });
                
                // Redirect to list page
                window.location.href = '/v2/vuotgio/huong-dan-tham-quan';
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi!',
                    text: result.message || 'Có lỗi xảy ra khi lưu dữ liệu'
                });
            }
        } catch (e) {
            console.error('Error submitting form:', e);
            Swal.fire({
                icon: 'error',
                title: 'Lỗi!',
                text: 'Không thể kết nối đến máy chủ'
            });
        }
    }

    /**
     * Update quy doi value (1 day = 3 periods)
     */
    function updateQuyDoi() {
        const soNgay = parseFloat($(this).val()) || 0;
        const soTietQuyDoi = soNgay * 3;
        $('#so_tiet_quy_doi').val(soTietQuyDoi);
    }

    /**
     * Display file information
     */
    function displayFileInfo(file) {
        const fileName = file.name;
        const fileSize = (file.size / 1024).toFixed(2) + ' KB';
        
        $('#fileName').text(fileName);
        $('#fileSize').text(`(${fileSize})`);
        $('#fileInfo').show();
    }

    /**
     * Handle file upload form submission (to be implemented)
     */
    $('#uploadForm').on('submit', function(e) {
        e.preventDefault();
        
        Swal.fire({
            icon: 'info',
            title: 'Chức năng đang phát triển',
            text: 'Tính năng tải lên file sẽ được triển khai trong phiên bản tiếp theo.'
        });
    });
});
````

## File: src/repositories/vuotgio_v2/duyetTongHop.repo.js
````javascript
/**
 * VUOT GIO V2 - Duyệt Tổng Hợp Repository
 * Thao tác DB cho bảng vg_duyet_tong_hop
 */

const TABLE = "vg_duyet_tong_hop";
const LNQC_TABLE = "vg_lop_ngoai_quy_chuan";
const KTHP_TABLE = "vg_coi_cham_ra_de";
const HDTQ_TABLE = "vg_huong_dan_tham_quan_thuc_te";

/**
 * Lấy trạng thái duyệt tổng hợp cho tất cả khoa trong 1 năm học
 */
const getApprovalStatus = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT d.id, d.nam_hoc, d.khoa, d.van_phong_duyet, 
                d.van_phong_nguoi_duyet_id, d.van_phong_ngay_duyet, d.ghi_chu,
                nv.TenNhanVien AS van_phong_nguoi_duyet_ten
         FROM ${TABLE} d
         LEFT JOIN nhanvien nv ON nv.id_User = d.van_phong_nguoi_duyet_id
         WHERE d.nam_hoc = ?
         ORDER BY d.khoa`,
        [namHoc]
    );
    return rows;
};

/**
 * Lấy trạng thái duyệt cho 1 khoa cụ thể
 */
const getApprovalByKhoa = async (connection, namHoc, khoa) => {
    const [rows] = await connection.execute(
        `SELECT id, nam_hoc, khoa, van_phong_duyet, van_phong_nguoi_duyet_id, van_phong_ngay_duyet, ghi_chu
         FROM ${TABLE}
         WHERE nam_hoc = ? AND khoa = ?`,
        [namHoc, khoa]
    );
    return rows[0] || null;
};

/**
 * Kiểm tra bản ghi chưa duyệt 2 cấp cho 1 khoa cụ thể trên 3 bảng
 * @returns {Array<{table: string, total: number, unapproved: number}>}
 */
const getUnapprovedCountsByKhoa = async (connection, namHoc, khoa) => {
    const queries = [
        {
            table: "Lớp ngoài quy chuẩn",
            tableName: LNQC_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND dao_tao_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${LNQC_TABLE}
                     WHERE nam_hoc = ? AND khoa = ?`,
        },
        {
            table: "Coi chấm ra đề",
            tableName: KTHP_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND khao_thi_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${KTHP_TABLE}
                     WHERE nam_hoc = ? AND khoa = ?`,
        },
        {
            table: "Hướng dẫn tham quan thực tế",
            tableName: HDTQ_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND dao_tao_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${HDTQ_TABLE}
                     WHERE nam_hoc = ? AND khoa = ?`,
        },
    ];

    const results = await Promise.all(
        queries.map(async ({ table, tableName, query }) => {
            const [rows] = await connection.execute(query, [namHoc, khoa]);
            const { total, unapproved } = rows[0];
            return {
                table,
                tableName,
                total: Number(total) || 0,
                unapproved: Number(unapproved) || 0,
            };
        })
    );

    return results;
};

/**
 * Thêm hoặc cập nhật bản ghi duyệt (UPSERT)
 */
const upsertApproval = async (connection, { namHoc, khoa, userId, ghiChu }) => {
    const [result] = await connection.execute(
        `INSERT INTO ${TABLE} (nam_hoc, khoa, van_phong_duyet, van_phong_nguoi_duyet_id, van_phong_ngay_duyet, ghi_chu)
         VALUES (?, ?, 1, ?, NOW(), ?)
         ON DUPLICATE KEY UPDATE
            van_phong_duyet = 1,
            van_phong_nguoi_duyet_id = VALUES(van_phong_nguoi_duyet_id),
            van_phong_ngay_duyet = NOW(),
            ghi_chu = VALUES(ghi_chu)`,
        [namHoc, khoa, userId, ghiChu || null]
    );
    return result;
};

/**
 * Hủy duyệt 1 khoa (set van_phong_duyet = 0)
 */
const revokeApproval = async (connection, namHoc, khoa) => {
    const [result] = await connection.execute(
        `UPDATE ${TABLE}
         SET van_phong_duyet = 0, van_phong_nguoi_duyet_id = NULL, van_phong_ngay_duyet = NULL
         WHERE nam_hoc = ? AND khoa = ?`,
        [namHoc, khoa]
    );
    return result;
};

/**
 * Đếm số khoa đã duyệt / tổng số khoa cho 1 năm học
 */
const getApprovalSummary = async (connection, namHoc) => {
    // Lấy tổng số khoa trong hệ thống
    const [khoaRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM phongban WHERE isKhoa = 1`
    );
    const totalKhoa = khoaRows[0].total;

    // Lấy số khoa đã duyệt
    const [approvedRows] = await connection.execute(
        `SELECT COUNT(*) AS approved FROM ${TABLE} WHERE nam_hoc = ? AND van_phong_duyet = 1`,
        [namHoc]
    );
    const approvedKhoa = approvedRows[0].approved;

    return { totalKhoa, approvedKhoa };
};

/**
 * Kiểm tra tất cả khoa đã duyệt chưa (điều kiện để khóa)
 */
const isAllKhoaApproved = async (connection, namHoc) => {
    const { totalKhoa, approvedKhoa } = await getApprovalSummary(connection, namHoc);
    return totalKhoa > 0 && approvedKhoa >= totalKhoa;
};

module.exports = {
    getApprovalStatus,
    getApprovalByKhoa,
    getUnapprovedCountsByKhoa,
    upsertApproval,
    revokeApproval,
    getApprovalSummary,
    isAllKhoaApproved,
};
````

## File: src/repositories/vuotgio_v2/huongDanThamQuan.repo.js
````javascript
/**
 * VUOT GIO V2 - Hướng dẫn tham quan Repository
 */

const buildKhoaFilter = (khoa, field, params) => {
    if (khoa && khoa !== "ALL") {
        params.push(khoa);
        return ` AND ${field} = ?`;
    }
    return "";
};

const getTable = async (connection, { namHoc, dot, kiHoc, khoa, heDaoTao }) => {
    let query = `
        SELECT 
            t.*,
            nv.TenNhanVien AS HoTen,
            hdt.he_dao_tao AS HeDaoTaoTen
        FROM vg_huong_dan_tham_quan_thuc_te t
        LEFT JOIN nhanvien nv ON t.id_User = nv.id_User
        LEFT JOIN he_dao_tao hdt ON t.he_dao_tao_id = hdt.id
        WHERE 1=1
    `;
    const params = [];

    if (namHoc) {
        query += ` AND t.nam_hoc = ?`;
        params.push(namHoc);
    }
    if (dot) {
        query += ` AND t.dot = ?`;
        params.push(dot);
    }
    if (kiHoc) {
        query += ` AND t.hoc_ky = ?`;
        params.push(kiHoc);
    }
    query += buildKhoaFilter(khoa, "t.khoa", params);
    if (heDaoTao) {
        query += ` AND t.he_dao_tao_id = ?`;
        params.push(heDaoTao);
    }

    query += ` ORDER BY t.created_at DESC`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const getById = async (connection, id) => {
    const [rows] = await connection.execute(
        `SELECT * FROM vg_huong_dan_tham_quan_thuc_te WHERE id = ?`,
        [id]
    );
    return rows[0] || null;
};

const save = async (connection, data) => {
    const [result] = await connection.execute(
        `INSERT INTO vg_huong_dan_tham_quan_thuc_te (
            id_User, he_dao_tao_id, nganh_hoc,
            khoa, nam_hoc, hoc_ky, dot, mo_ta_hoat_dong,
            theo_qd, so_ngay, so_tiet_quy_doi, ghi_chu
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.id_User, data.he_dao_tao_id, data.nganh_hoc,
            data.khoa, data.nam_hoc, data.hoc_ky, data.dot, data.mo_ta_hoat_dong,
            data.theo_qd, data.so_ngay, data.so_tiet_quy_doi, data.ghi_chu
        ]
    );
    return result.insertId;
};

const update = async (connection, id, data) => {
    await connection.execute(
        `UPDATE vg_huong_dan_tham_quan_thuc_te SET
            id_User = ?, he_dao_tao_id = ?, nganh_hoc = ?,
            khoa = ?, nam_hoc = ?, hoc_ky = ?, dot = ?, mo_ta_hoat_dong = ?,
            theo_qd = ?, so_ngay = ?, so_tiet_quy_doi = ?, ghi_chu = ?
        WHERE id = ?`,
        [
            data.id_User, data.he_dao_tao_id, data.nganh_hoc,
            data.khoa, data.nam_hoc, data.hoc_ky, data.dot, data.mo_ta_hoat_dong,
            data.theo_qd, data.so_ngay, data.so_tiet_quy_doi, data.ghi_chu,
            id
        ]
    );
};

const deleteRecord = async (connection, id) => {
    await connection.execute(`DELETE FROM vg_huong_dan_tham_quan_thuc_te WHERE id = ?`, [id]);
};

const updateApproval = async (connection, id, khoaDuyet, daoTaoDuyet) => {
    await connection.execute(
        `UPDATE vg_huong_dan_tham_quan_thuc_te SET khoa_duyet = ?, dao_tao_duyet = ? WHERE id = ?`,
        [khoaDuyet, daoTaoDuyet, id]
    );
};

module.exports = {
    getTable,
    getById,
    save,
    update,
    updateApproval,
    delete: deleteRecord
};
````

## File: src/repositories/vuotgio_v2/kthp.repo.js
````javascript
const COI_CHAM_RA_DE_TABLE = "vg_coi_cham_ra_de";

const buildSelect = () => `
    id,
    id_user,
    giang_vien AS giangvien,
    giang_vien,
    khoa,
    hoc_ky AS ki,
    hoc_ky,
    nam_hoc AS namhoc,
    nam_hoc,
    hinh_thuc AS hinhthuc,
    hinh_thuc,
    ten_hoc_phan AS tenhocphan,
    ten_hoc_phan,
    lop_hoc_phan AS lophocphan,
    lop_hoc_phan,
    doi_tuong AS doituong,
    doi_tuong,
    bai_cham_1 AS baicham1,
    bai_cham_1,
    bai_cham_2 AS baicham2,
    bai_cham_2,
    tong_so AS tongso,
    tong_so,
    quy_chuan AS sotietqc,
    quy_chuan,
    ghi_chu AS ghichu,
    ghi_chu,
    khoa_duyet AS khoaduyet,
    khoa_duyet,
    khao_thi_duyet AS khaothiduyet,
    khao_thi_duyet,
    so_tc,
    so_sv
`;

const getTable = async (connection, { namHoc, khoa }) => {
    let query = `
        SELECT 
          t.id,
          t.id_user,
          t.giang_vien AS giangvien,
          t.giang_vien,
          t.khoa,
          t.hoc_ky AS ki,
          t.hoc_ky,
          t.nam_hoc AS namhoc,
          t.nam_hoc,
          t.hinh_thuc AS hinhthuc,
          t.hinh_thuc,
          t.ten_hoc_phan AS tenhocphan,
          t.ten_hoc_phan,
          t.lop_hoc_phan AS lophocphan,
          t.lop_hoc_phan,
          h.he_dao_tao AS doituong,
          h.he_dao_tao AS doi_tuong,
          t.bai_cham_1 AS baicham1,
          t.bai_cham_1,
          t.bai_cham_2 AS baicham2,
          t.bai_cham_2,
          t.tong_so AS tongso,
          t.tong_so,
          t.quy_chuan AS sotietqc,
          t.quy_chuan,
          t.ghi_chu AS ghichu,
          t.ghi_chu,
          t.khoa_duyet AS khoaduyet,
          t.khoa_duyet,
          t.khao_thi_duyet AS khaothiduyet,
          t.khao_thi_duyet,
          t.so_tc,
          t.so_sv
        FROM ${COI_CHAM_RA_DE_TABLE} t
        LEFT JOIN he_dao_tao h ON t.he_dao_tao_id = h.id
        WHERE t.nam_hoc = ?
    `;
    const params = [namHoc];

    if (khoa && khoa !== "ALL") {
        query += ` AND t.khoa = ?`;
        params.push(khoa);
    }

    query += ` ORDER BY t.giang_vien, t.ten_hoc_phan, t.hinh_thuc`;
    const [rows] = await connection.execute(query, params);
    return rows;
};

const insert = async (connection, values) => {
    const query = `
        INSERT INTO ${COI_CHAM_RA_DE_TABLE}
        (id_user, giang_vien, khoa, hoc_ky, nam_hoc, hinh_thuc, ten_hoc_phan, lop_hoc_phan, doi_tuong, he_dao_tao_id, bai_cham_1, bai_cham_2, tong_so, quy_chuan, ghi_chu, khoa_duyet, khao_thi_duyet, so_tc, so_sv)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `;
    return connection.execute(query, values);
};

const getById = async (connection, id) => {
    const [rows] = await connection.execute(
        `SELECT id, khoa_duyet, khao_thi_duyet, hinh_thuc, ten_hoc_phan, giang_vien FROM ${COI_CHAM_RA_DE_TABLE} WHERE id = ?`,
        [id]
    );
    return rows[0] || null;
};

const update = async (connection, id, values) => {
    const query = `
        UPDATE ${COI_CHAM_RA_DE_TABLE} SET
            id_user = ?,
            giang_vien = ?,
            khoa = ?,
            hoc_ky = ?,
            nam_hoc = ?,
            hinh_thuc = ?,
            ten_hoc_phan = ?,
            lop_hoc_phan = ?,
            doi_tuong = ?,
            he_dao_tao_id = ?,
            bai_cham_1 = ?,
            bai_cham_2 = ?,
            tong_so = ?,
            quy_chuan = ?,
            ghi_chu = ?,
            so_tc = ?,
            so_sv = ?
        WHERE id = ?
    `;
    return connection.execute(query, [...values, id]);
};

const remove = async (connection, id) => connection.execute(`DELETE FROM ${COI_CHAM_RA_DE_TABLE} WHERE id = ?`, [id]);

const updateBatchApproval = async (connection, records) => {
    let updatedCount = 0;
    for (const record of records) {
        const [result] = await connection.execute(
            `UPDATE ${COI_CHAM_RA_DE_TABLE} SET khoa_duyet = ?, khao_thi_duyet = ? WHERE id = ?`,
            [record.khoa_duyet, record.khao_thi_duyet, record.id]
        );
        if (result.affectedRows > 0) updatedCount++;
    }
    return updatedCount;
};

const updateApproval = async (connection, id, value) =>
    connection.execute(`UPDATE ${COI_CHAM_RA_DE_TABLE} SET khoa_duyet = ? WHERE id = ?`, [value, id]);

const deleteByYearAndSemester = async (connection, { namHoc, hocKy }) =>
    connection.execute(`DELETE FROM ${COI_CHAM_RA_DE_TABLE} WHERE nam_hoc = ? AND hoc_ky = ?`, [namHoc, hocKy]);

const countByYearAndSemester = async (connection, { namHoc, hocKy }) => {
    const [rows] = await connection.execute(
        `SELECT COUNT(*) AS count FROM ${COI_CHAM_RA_DE_TABLE} WHERE nam_hoc = ? AND hoc_ky = ?`,
        [namHoc, hocKy]
    );
    return rows[0].count;
};

const getByLecturerName = async (connection, { name, namHoc, hocKy }) => {
    const query = `
        SELECT 
          t.id,
          t.id_user,
          t.giang_vien AS giangvien,
          t.giang_vien,
          t.khoa,
          t.hoc_ky AS ki,
          t.hoc_ky,
          t.nam_hoc AS namhoc,
          t.nam_hoc,
          t.hinh_thuc AS hinhthuc,
          t.hinh_thuc,
          t.ten_hoc_phan AS tenhocphan,
          t.ten_hoc_phan,
          t.lop_hoc_phan AS lophocphan,
          t.lop_hoc_phan,
          h.he_dao_tao AS doituong,
          h.he_dao_tao AS doi_tuong,
          t.bai_cham_1 AS baicham1,
          t.bai_cham_1,
          t.bai_cham_2 AS baicham2,
          t.bai_cham_2,
          t.tong_so AS tongso,
          t.tong_so,
          t.quy_chuan AS sotietqc,
          t.quy_chuan,
          t.ghi_chu AS ghichu,
          t.ghi_chu,
          t.khoa_duyet AS khoaduyet,
          t.khoa_duyet,
          t.khao_thi_duyet AS khaothiduyet,
          t.khao_thi_duyet,
          t.so_tc,
          t.so_sv
        FROM ${COI_CHAM_RA_DE_TABLE} t
        LEFT JOIN he_dao_tao h ON t.he_dao_tao_id = h.id
        WHERE t.giang_vien LIKE ? AND t.hoc_ky = ? AND t.nam_hoc = ?
    `;
    const [rows] = await connection.execute(query, [`%${name}%`, hocKy, namHoc]);
    return rows;
};

const insertMany = async (connection, values) => {
    if (!values || values.length === 0) return { affectedRows: 0 };
    const query = `
        INSERT INTO ${COI_CHAM_RA_DE_TABLE}
        (giang_vien, khoa, hoc_ky, nam_hoc, hinh_thuc, ten_hoc_phan, lop_hoc_phan, doi_tuong, bai_cham_1, bai_cham_2, tong_so, quy_chuan, khoa_duyet, khao_thi_duyet, id_user, he_dao_tao_id)
        VALUES ?
    `;
    return connection.query(query, [values]);
};

module.exports = {
    COI_CHAM_RA_DE_TABLE,
    buildSelect,
    getTable,
    insert,
    getById,
    update,
    remove,
    updateBatchApproval,
    updateApproval,
    deleteByYearAndSemester,
    countByYearAndSemester,
    getByLecturerName,
    insertMany
};
````

## File: src/services/vuotgio_v2/dataLock.service.js
````javascript
/**
 * VUOT GIO V2 - Data Lock Service
 * Service kiểm tra trạng thái khóa và thực thi logic khóa dữ liệu
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/dataLock.repo");

// ============================================================
// Helper
// ============================================================
const withConnection = async (connection, callback) => {
    let shouldRelease = false;
    if (!connection) {
        connection = await createPoolConnection();
        shouldRelease = true;
    }
    try {
        return await callback(connection);
    } finally {
        if (shouldRelease && connection) {
            connection.release();
        }
    }
};

/**
 * Format datetime sang dd/MM/yyyy HH:mm
 * @param {Date|string} date
 * @returns {string}
 */
const formatDateTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ============================================================
// Public API
// ============================================================

/**
 * Validate định dạng năm học
 * @param {string} namHoc
 * @returns {boolean} true nếu khớp pattern "YYYY - YYYY"
 */
const validateNamHocFormat = (namHoc) => {
    if (!namHoc || typeof namHoc !== "string") return false;
    return /^\d{4}\s-\s\d{4}$/.test(namHoc);
};

/**
 * Kiểm tra năm học đã bị khóa chưa
 * @param {string} namHoc - Năm học cần kiểm tra (e.g. "2025 - 2026")
 * @returns {Promise<boolean>} true nếu đã khóa
 */
const isLocked = async (namHoc) => {
    return await withConnection(null, async (connection) => {
        const record = await repo.getLockRecord(connection, namHoc);
        return record !== null;
    });
};

/**
 * Lấy trạng thái khóa chi tiết
 * @param {string} namHoc
 * @returns {Promise<{locked: boolean, lockInfo: object|null}>}
 */
const getLockStatus = async (namHoc) => {
    return await withConnection(null, async (connection) => {
        const record = await repo.getLockRecordWithUserName(connection, namHoc);

        if (!record) {
            return { locked: false, lockInfo: null };
        }

        const lockInfo = {
            ngay_khoa: formatDateTime(record.ngay_khoa),
            nguoi_khoa: record.nguoi_khoa || "Không xác định",
            ghi_chu: record.ghi_chu || null,
        };

        return { locked: true, lockInfo };
    });
};

/**
 * Kiểm tra điều kiện tiên quyết (duyệt 2 cấp trên 3 bảng)
 * @param {string} namHoc
 * @returns {Promise<{passed: boolean, errors?: Array}>}
 */
const checkPrerequisites = async (namHoc) => {
    return await withConnection(null, async (connection) => {
        const results = await repo.getUnapprovedCounts(connection, namHoc);

        const errors = [];
        for (const item of results) {
            // Bảng có 0 bản ghi → coi là đạt
            if (item.total === 0) continue;
            // Có bản ghi chưa duyệt → lỗi
            if (item.unapproved > 0) {
                errors.push({
                    table: item.table,
                    tableName: item.tableName,
                    total: item.total,
                    unapproved: item.unapproved,
                });
            }
        }

        if (errors.length > 0) {
            return { passed: false, errors };
        }
        return { passed: true };
    });
};

/**
 * Thực hiện khóa dữ liệu
 * @param {string} namHoc - Năm học cần khóa
 * @param {number} userId - ID người thực hiện khóa
 * @param {string|null} ghiChu - Ghi chú tùy chọn
 * @returns {Promise<{success: boolean, message?: string, errors?: Array}>}
 */
const lockData = async (namHoc, userId, ghiChu) => {
    // 1. Validate format năm học
    if (!validateNamHocFormat(namHoc)) {
        return {
            success: false,
            message: "Định dạng năm học không hợp lệ. Yêu cầu: YYYY - YYYY",
        };
    }

    return await withConnection(null, async (connection) => {
        // 2. Kiểm tra năm học tồn tại trong DB
        const exists = await repo.checkNamHocExists(connection, namHoc);
        if (!exists) {
            return {
                success: false,
                message: `Năm học ${namHoc} không tồn tại trong hệ thống`,
            };
        }

        // 3. Kiểm tra chưa bị khóa
        const existingLock = await repo.getLockRecord(connection, namHoc);
        if (existingLock) {
            return {
                success: false,
                message: "Dữ liệu năm học này đã được khóa",
            };
        }

        // 4. Kiểm tra prerequisites (duyệt 2 cấp)
        const prerequisiteResult = await repo.getUnapprovedCounts(connection, namHoc);
        const errors = [];
        for (const item of prerequisiteResult) {
            if (item.total === 0) continue;
            if (item.unapproved > 0) {
                errors.push({
                    table: item.table,
                    tableName: item.tableName,
                    total: item.total,
                    unapproved: item.unapproved,
                });
            }
        }

        if (errors.length > 0) {
            return {
                success: false,
                message: "Chưa đủ điều kiện khóa",
                errors,
            };
        }

        // 4b. Kiểm tra tất cả khoa đã duyệt tổng hợp
        const duyetTongHopRepo = require("../../repositories/vuotgio_v2/duyetTongHop.repo");
        const allApproved = await duyetTongHopRepo.isAllKhoaApproved(connection, namHoc);
        if (!allApproved) {
            const { totalKhoa, approvedKhoa } = await duyetTongHopRepo.getApprovalSummary(connection, namHoc);
            return {
                success: false,
                message: `Chưa đủ điều kiện khóa: mới ${approvedKhoa}/${totalKhoa} khoa được duyệt tổng hợp`,
            };
        }

        // 5. Insert bản ghi khóa
        try {
            await repo.insertLockRecord(connection, { namHoc, userId, ghiChu });
        } catch (error) {
            // Xử lý race condition: MySQL error code 1062 (duplicate key)
            if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
                return {
                    success: false,
                    message: "Dữ liệu năm học này đã được khóa",
                };
            }
            throw error;
        }

        return { success: true, message: "Khóa dữ liệu thành công" };
    });
};

module.exports = {
    validateNamHocFormat,
    isLocked,
    getLockStatus,
    checkPrerequisites,
    lockData,
};
````

## File: src/services/vuotgio_v2/department_excel/components/summary.component.js
````javascript
/**
 * Summary Component - Handles summary table creation for department sheets (36 columns)
 *
 * Hybrid mode:
 *   isExport=false (default) → static pre-calculated values (used by preview/PDF)
 *   isExport=true            → Excel formulas for derived columns (used by file export)
 */

const CellFormatter = require("../../shared_excel/core/cell.formatter");
const PaymentCalculator = require("../data/calculator");
const FormulaGenerator = require("../generators/formula.generator");

class SummaryComponent {
  /**
   * Create department summary table with 36 columns
   */
  /**
   * @param {ExcelJS.Worksheet} worksheet
   * @param {Array}  summaries - Array of SDO objects
   * @param {number} startRow  - First data row index
   * @param {object} [options]
   * @param {boolean} [options.isExport=false] - When true, writes Excel formulas for derived columns
   */
  static createDepartmentSummaryTable(worksheet, summaries, startRow, options = {}) {
    const isExport = options.isExport === true;
    let currentRow = startRow;
    const totals = {
      dinhMucChuan: 0,
      mienGiam: 0,
      thieuNCKH: 0,
      dinhMucSauMienGiam: 0,
      hk1_vn: 0, hk1_lao: 0, hk1_cuba: 0, hk1_cpc: 0, hk1_dongHP: 0,
      hk2_vn: 0, hk2_lao: 0, hk2_cuba: 0, hk2_cpc: 0, hk2_dongHP: 0,
      year_vn: 0, year_lao: 0, year_cuba: 0, year_cpc: 0, year_dongHP: 0,
      vuot_vn: 0, vuot_lao: 0, vuot_cuba: 0, vuot_cpc: 0, vuot_dongHP: 0,
      vuot_tong: 0,
      tien_vn: 0, tien_lao: 0, tien_cuba: 0, tien_cpc: 0, tien_dongHP: 0,
      tien_tong: 0,
      thucNhan: 0,
      luong: 0,
    };

    (summaries || []).forEach((summary, index) => {
      // Ưu tiên dùng breakdown đã tính sẵn từ Backend (single source of truth).
      // Nếu chưa có (dữ liệu cũ / snapshot), mới fallback tính lại tại chỗ.
      const bd = summary.breakdown
        ? summary.breakdown
        : PaymentCalculator.computeSdoBreakdown(summary.tableF, summary.thanhToan, summary.luong);

      const tien_vn    = bd.money.vn;
      const tien_lao   = bd.money.lao;
      const tien_cuba  = bd.money.cuba;
      const tien_cpc   = bd.money.cpc;
      const tien_dongHP = bd.money.dongHP;
      const tien_tong  = bd.money.total;

      const overtime = bd.vuot.total;

      const row = worksheet.getRow(currentRow);
      
      // 36 column values (A-AJ)
      const rowValues = {
        1: index + 1,                                                                    // A - STT
        2: summary?.giangVien || "",                                                     // B - Họ tên
        3: PaymentCalculator.excelNumber(summary?.luong || 0),                          // C - Thu nhập
        4: PaymentCalculator.excelNumber(summary?.dinhMucChuan || 0),                   // D - Định mức
        5: PaymentCalculator.excelNumber(summary?.mienGiam || 0),                       // E - Được giảm
        6: PaymentCalculator.excelNumber(summary?.thieuNCKH || 0),                      // F - Thiếu NCKH
        7: PaymentCalculator.excelNumber(summary?.dinhMucSauMienGiam || 0),             // G - Định mức sau miễn giảm
        8: bd.hk1.vn,                                                                   // H - HK1 VN
        9: bd.hk1.lao,                                                                  // I - HK1 Lào
        10: bd.hk1.cuba,                                                                // J - HK1 Cuba
        11: bd.hk1.cpc,                                                                 // K - HK1 CPC
        12: bd.hk1.dongHP,                                                              // L - HK1 Đóng HP
        13: bd.hk2.vn,                                                                  // M - HK2 VN
        14: bd.hk2.lao,                                                                 // N - HK2 Lào
        15: bd.hk2.cuba,                                                                // O - HK2 Cuba
        16: bd.hk2.cpc,                                                                 // P - HK2 CPC
        17: bd.hk2.dongHP,                                                              // Q - HK2 Đóng HP
        18: bd.year.vn,                                                                 // R - Năm VN
        19: bd.year.lao,                                                                // S - Năm Lào
        20: bd.year.cuba,                                                               // T - Năm Cuba
        21: bd.year.cpc,                                                                // U - Năm CPC
        22: bd.year.dongHP,                                                             // V - Năm Đóng HP
        23: bd.vuot.vn,                                                                 // W - Vượt VN
        24: bd.vuot.lao,                                                                // X - Vượt Lào
        25: bd.vuot.cuba,                                                               // Y - Vượt Cuba
        26: bd.vuot.cpc,                                                                // Z - Vượt CPC
        27: bd.vuot.dongHP,                                                             // AA - Vượt Đóng HP
        28: overtime,                                                                   // AB - Tổng vượt
        29: bd.mucTT,                                                                   // AC - Mức TT chuẩn
        30: tien_vn,                                                                    // AD - Tiền VN
        31: tien_lao,                                                                   // AE - Tiền Lào
        32: tien_cuba,                                                                  // AF - Tiền Cuba
        33: tien_cpc,                                                                   // AG - Tiền CPC
        34: tien_dongHP,                                                                // AH - Tiền Đóng HP
        35: tien_tong,                                                                  // AI - Tổng tiền
        36: bd.thucNhan,                                                                // AJ - Thực nhận
      };

      // ── Write static input columns (always written as values) ────────────
      const staticCols = {
        1: rowValues[1], 2: rowValues[2],                  // STT, Name
        3: rowValues[3], 4: rowValues[4],  5: rowValues[5],  // luong, dinhMuc, mienGiam
        6: rowValues[6], 7: rowValues[7],                  // thieuNCKH, dinhMucSauMienGiam
        8: rowValues[8], 9: rowValues[9], 10: rowValues[10], 11: rowValues[11], 12: rowValues[12], // HK1
       13: rowValues[13],14: rowValues[14],15: rowValues[15],16: rowValues[16],17: rowValues[17], // HK2
       28: rowValues[28], // vuot_total (thanhToan — SDO engine source of truth)
       29: rowValues[29], // mucTT (được tính linh hoạt theo lương)
      };
      Object.entries(staticCols).forEach(([colKey, value]) => {
        row.getCell(Number(colKey)).value = value;
      });

      if (isExport) {
        // ── EXPORT MODE: write Excel formulas for derived columns ────────────
        FormulaGenerator.writeDataRowFormulas(worksheet, currentRow, bd);
      } else {
        // ── PREVIEW MODE: write pre-calculated static values ────────────────
        const derivedCols = {
          18: rowValues[18], 19: rowValues[19], 20: rowValues[20],
          21: rowValues[21], 22: rowValues[22], // year
          23: rowValues[23], 24: rowValues[24], 25: rowValues[25],
          26: rowValues[26], 27: rowValues[27], // vuot per group
          30: rowValues[30], 31: rowValues[31], 32: rowValues[32],
          33: rowValues[33], 34: rowValues[34], 35: rowValues[35], // money
          36: rowValues[36], // thucNhan
        };
        Object.entries(derivedCols).forEach(([colKey, value]) => {
          row.getCell(Number(colKey)).value = value;
        });
      }

      // Apply formatting to all 36 columns
      for (let col = 1; col <= 36; col += 1) {
        const cell = row.getCell(col);
        CellFormatter.applyBorder(cell);
        
        const fmtOpts = {
          hAlign: col === 2 ? "left" : "center",
          vAlign: "middle",
          wrapText: true,
          fontSize: 11.5
        };
        
        if (col >= 3) {
          fmtOpts.numFmt = "#,##0.00";
        }
        
        CellFormatter.applyDataStyle(cell, fmtOpts);
      }

      // Update totals (dùng bd đã tính sẵn)
      totals.dinhMucChuan += PaymentCalculator.excelNumber(summary?.dinhMucChuan || 0);
      totals.mienGiam += PaymentCalculator.excelNumber(summary?.mienGiam || 0);
      totals.thieuNCKH += PaymentCalculator.excelNumber(summary?.thieuNCKH || 0);
      totals.dinhMucSauMienGiam += PaymentCalculator.excelNumber(summary?.dinhMucSauMienGiam || 0);
      totals.hk1_vn    += bd.hk1.vn;
      totals.hk1_lao   += bd.hk1.lao;
      totals.hk1_cuba  += bd.hk1.cuba;
      totals.hk1_cpc   += bd.hk1.cpc;
      totals.hk1_dongHP += bd.hk1.dongHP;
      totals.hk2_vn    += bd.hk2.vn;
      totals.hk2_lao   += bd.hk2.lao;
      totals.hk2_cuba  += bd.hk2.cuba;
      totals.hk2_cpc   += bd.hk2.cpc;
      totals.hk2_dongHP += bd.hk2.dongHP;
      totals.year_vn    += bd.year.vn;
      totals.year_lao   += bd.year.lao;
      totals.year_cuba  += bd.year.cuba;
      totals.year_cpc   += bd.year.cpc;
      totals.year_dongHP += bd.year.dongHP;
      totals.vuot_vn    += bd.vuot.vn;
      totals.vuot_lao   += bd.vuot.lao;
      totals.vuot_cuba  += bd.vuot.cuba;
      totals.vuot_cpc   += bd.vuot.cpc;
      totals.vuot_dongHP += bd.vuot.dongHP;
      totals.vuot_tong  += overtime;
      totals.tien_vn    += tien_vn;
      totals.tien_lao   += tien_lao;
      totals.tien_cuba  += tien_cuba;
      totals.tien_cpc   += tien_cpc;
      totals.tien_dongHP += tien_dongHP;
      totals.tien_tong  += tien_tong;
      totals.thucNhan   += (bd.thucNhan || tien_tong || 0);
      totals.luong      += PaymentCalculator.excelNumber(summary?.luong || 0);

      row.height = 22;
      currentRow += 1;
    });

    // ── Footer / TỔNG CỘNG row ──────────────────────────────────────────────
    const totalRow = worksheet.getRow(currentRow);
    const dataEndRow = currentRow - 1; // last data row
    CellFormatter.mergeAndStyle(worksheet, currentRow, 1, currentRow, 2,
      "TỔNG CỘNG",
      { total: true, bold: true }
    );

    if (isExport) {
      // ── EXPORT MODE: SUM range formulas for every numeric column ───────────
      FormulaGenerator.writeFooterFormulas(worksheet, currentRow, startRow, dataEndRow, totals);
    } else {
      // ── PREVIEW MODE: static totals ────────────────────────────────────────
      const totalValues = {
        3: PaymentCalculator.excelNumber(totals.luong),
        4: PaymentCalculator.excelNumber(totals.dinhMucChuan),
        5: PaymentCalculator.excelNumber(totals.mienGiam),
        6: PaymentCalculator.excelNumber(totals.thieuNCKH),
        7: PaymentCalculator.excelNumber(totals.dinhMucSauMienGiam),
        8: PaymentCalculator.excelNumber(totals.hk1_vn),
        9: PaymentCalculator.excelNumber(totals.hk1_lao),
        10: PaymentCalculator.excelNumber(totals.hk1_cuba),
        11: PaymentCalculator.excelNumber(totals.hk1_cpc),
        12: PaymentCalculator.excelNumber(totals.hk1_dongHP),
        13: PaymentCalculator.excelNumber(totals.hk2_vn),
        14: PaymentCalculator.excelNumber(totals.hk2_lao),
        15: PaymentCalculator.excelNumber(totals.hk2_cuba),
        16: PaymentCalculator.excelNumber(totals.hk2_cpc),
        17: PaymentCalculator.excelNumber(totals.hk2_dongHP),
        18: PaymentCalculator.excelNumber(totals.year_vn),
        19: PaymentCalculator.excelNumber(totals.year_lao),
        20: PaymentCalculator.excelNumber(totals.year_cuba),
        21: PaymentCalculator.excelNumber(totals.year_cpc),
        22: PaymentCalculator.excelNumber(totals.year_dongHP),
        23: PaymentCalculator.excelNumber(totals.vuot_vn),
        24: PaymentCalculator.excelNumber(totals.vuot_lao),
        25: PaymentCalculator.excelNumber(totals.vuot_cuba),
        26: PaymentCalculator.excelNumber(totals.vuot_cpc),
        27: PaymentCalculator.excelNumber(totals.vuot_dongHP),
        28: PaymentCalculator.excelNumber(totals.vuot_tong),
        30: PaymentCalculator.excelNumber(totals.tien_vn),
        31: PaymentCalculator.excelNumber(totals.tien_lao),
        32: PaymentCalculator.excelNumber(totals.tien_cuba),
        33: PaymentCalculator.excelNumber(totals.tien_cpc),
        34: PaymentCalculator.excelNumber(totals.tien_dongHP),
        35: PaymentCalculator.excelNumber(totals.tien_tong),
        36: PaymentCalculator.excelNumber(totals.thucNhan),
      };
      Object.entries(totalValues).forEach(([colKey, value]) => {
        totalRow.getCell(Number(colKey)).value = value;
      });
    }

    // Apply total styling to all 36 columns (shared for both modes)
    for (let col = 1; col <= 36; col += 1) {
      const cell = totalRow.getCell(col);
      CellFormatter.applyBorder(cell);
      const styleOpts = {
        bold: true,
        hAlign: col === 2 ? "left" : "center",
        vAlign: "middle"
      };
      if (col >= 3 && col !== 29) {
        styleOpts.numFmt = "#,##0.00";
      }
      CellFormatter.applyTotalStyle(cell, styleOpts);
    }

    totalRow.height = 22;

    return {
      nextRow: currentRow + 1,
      totalThanhToan: totals.tien_tong,
      totalVuot: totals.vuot_tong,
      dataRowCount: (summaries || []).length
    };
  }

  /**
   * Create master summary table (simplified version)
   */
  static createMasterSummaryTable(worksheet, departmentList, startRow) {
    let currentRow = startRow;
    let totalPayment = 0;

    departmentList.forEach((dept, index) => {
      const row = worksheet.getRow(currentRow);

      row.getCell(1).value = index + 1;
      row.getCell(2).value = dept.khoa || dept.maKhoa || "Khác";
      row.getCell(3).value = dept.dataRowCount || 0;
      row.getCell(4).value = PaymentCalculator.truncDecimals(dept.tongThucHien || 0, 2);
      row.getCell(5).value = PaymentCalculator.truncDecimals(dept.totalVuot || 0, 2);
      row.getCell(6).value = PaymentCalculator.truncDecimals(dept.totalThanhToan || 0, 2);
      row.getCell(7).value = "";

      // Format cells
      for (let col = 1; col <= 7; col += 1) {
        const cell = row.getCell(col);
        const options = {
          hAlign: col === 2 ? "left" : "center",
          vAlign: "middle"
        };
        
        if (col >= 4) {
          options.numFmt = "#,##0.00";
        }
        
        CellFormatter.applyDataStyle(cell, options);
      }

      totalPayment += (dept.totalThanhToan || 0);
      currentRow += 1;
    });

    // Total row
    const totalRow = worksheet.getRow(currentRow);
    CellFormatter.mergeAndStyle(worksheet, currentRow, 1, currentRow, 3, 
      "TỔNG CỘNG", 
      { total: true, bold: true, bgColor: "D9E1F2" }
    );

    const totalCell = totalRow.getCell(6);
    totalCell.value = PaymentCalculator.truncDecimals(totalPayment, 2);
    CellFormatter.applyTotalStyle(totalCell, { bgColor: "D9E1F2" });

    // Apply total style to remaining cells
    for (let col = 4; col <= 7; col += 1) {
      if (col !== 6) {
        CellFormatter.applyTotalStyle(totalRow.getCell(col), { bgColor: "D9E1F2" });
      }
    }

    return {
      nextRow: currentRow + 1,
      totalPayment
    };
  }

  /**
   * Create payment summary table
   */
  static createPaymentSummaryTable(worksheet, summaries, startRow) {
    let currentRow = startRow;
    let totalTien = 0;
    const PAYMENT_RATE = PaymentCalculator.PAYMENT_RATE;

    (summaries || []).forEach((summary, index) => {
      const soTien = PaymentCalculator.excelNumber((summary.thanhToan || 0) * PAYMENT_RATE);
      totalTien += soTien;

      const row = worksheet.getRow(currentRow);
      const values = [
        index + 1,
        summary.giangVien || "",
        summary.maKhoa || summary.khoa || "",
        summary.soTaiKhoan || "",
        summary.nganHang || "",
        soTien,
        "Thanh toán vượt giờ",
      ];

      values.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        
        const options = {
          hAlign: colIndex === 1 || colIndex === 6 ? "left" : "center",
          vAlign: "middle",
          wrapText: true
        };
        
        if (colIndex === 5) {
          options.numFmt = "#,##0.00";
        }
        
        CellFormatter.applyDataStyle(cell, options);
      });

      row.height = 22;
      currentRow += 1;
    });

    // Total row
    const totalRow = worksheet.getRow(currentRow);
    CellFormatter.mergeAndStyle(worksheet, currentRow, 1, currentRow, 5, 
      "TỔNG CỘNG", 
      { total: true, bold: true, bgColor: "EEF3FF" }
    );

    const totalCell = totalRow.getCell(6);
    totalCell.value = totalTien;
    CellFormatter.applyTotalStyle(totalCell, { 
      numFmt: "#,##0.00", 
      bgColor: "EEF3FF" 
    });

    const noteCell = totalRow.getCell(7);
    noteCell.value = "";
    CellFormatter.applyTotalStyle(noteCell, { bgColor: "EEF3FF" });

    return {
      nextRow: currentRow + 1,
      totalPayment: totalTien
    };
  }

  /**
   * Create department payment summary table (for consolidated reports)
   */
  static createDepartmentPaymentSummaryTable(worksheet, departmentList, startRow) {
    let currentRow = startRow;
    let totalPayment = 0;

    departmentList.forEach((dept, index) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = index + 1;
      row.getCell(2).value = dept.khoa || dept.maKhoa || "Khác";
      row.getCell(3).value = PaymentCalculator.truncDecimals(dept.totalThanhToan || 0, 2);

      for (let col = 1; col <= 7; col += 1) {
        const cell = row.getCell(col);
        const options = {
          hAlign: col === 2 ? "left" : "center",
          vAlign: "middle"
        };
        
        if (col === 3) {
          options.numFmt = "#,##0.00";
        }
        
        CellFormatter.applyDataStyle(cell, options);
      }

      totalPayment += (dept.totalThanhToan || 0);
      currentRow += 1;
    });

    // Total row
    const totalRow = worksheet.getRow(currentRow);
    CellFormatter.mergeAndStyle(worksheet, currentRow, 1, currentRow, 2, 
      "TỔNG CỘNG", 
      { total: true, bold: true }
    );

    const totalCell = totalRow.getCell(3);
    totalCell.value = PaymentCalculator.truncDecimals(totalPayment, 2);
    CellFormatter.applyTotalStyle(totalCell);

    // Apply total style to remaining cells
    for (let col = 4; col <= 7; col += 1) {
      CellFormatter.applyTotalStyle(totalRow.getCell(col));
    }

    return {
      nextRow: currentRow + 1,
      totalPayment
    };
  }
}

module.exports = SummaryComponent;
````

## File: src/services/vuotgio_v2/department_excel/data/aggregator.js
````javascript
/**
 * Data Aggregator — Groups and aggregates department-level data from SDO list.
 *
 * Grouping rules:
 *   - isKhoa = 1 (or truthy)  → individual khoa group (e.g. "Khoa CNTT")
 *   - isKhoa = 0              → all merged into "Ban giám đốc & các phòng"
 *
 * Sort order: Khoa groups first (alpha), "Ban giám đốc & các phòng" last.
 */

const { NON_KHOA_GROUP_CODE } = require('../../../../repositories/vuotgio_v2/tongHop.repo.js');
const PaymentCalculator = require('./calculator');

const NON_KHOA_DISPLAY = 'Ban giám đốc & các phòng';

class DataAggregator {
    /**
     * Group flat SDO list by department.
     *
     * @param {Array} summaries - flat list of SDO objects (each must have .isKhoa, .khoa, .maKhoa)
     * @returns {Array<DepartmentGroup>}  sorted: Khoa first, non-Khoa last
     */
    static groupByDepartment(summaries) {
        const groupMap = new Map();

        summaries.forEach(sdo => {
            const isNonKhoa = Number(sdo.isKhoa) === 0;
            const displayName = isNonKhoa
                ? NON_KHOA_DISPLAY
                : (sdo.khoa || sdo.maKhoa || 'Khác');
            const groupKey = displayName;

            if (!groupMap.has(groupKey)) {
                groupMap.set(groupKey, {
                    khoa         : displayName,
                    maKhoa       : isNonKhoa ? NON_KHOA_GROUP_CODE : sdo.maKhoa,
                    isNonKhoa,
                    summaries    : [],
                    tongThucHien : 0,
                    totalVuot    : 0,
                    totalThanhToan: 0,
                    dataRowCount : 0,
                });
            }

            const group = groupMap.get(groupKey);
            group.summaries.push(sdo);
            group.tongThucHien  += (sdo.tongThucHien || 0);
            group.totalVuot     += (sdo.thanhToan     || 0);
            const bd = sdo.breakdown || PaymentCalculator.computeSdoBreakdown(sdo.tableF, sdo.thanhToan, sdo.luong);
            const tien = bd.thucNhan ?? bd.money?.total ?? PaymentCalculator.calculatePaymentAmount(sdo.thanhToan || 0, sdo.luong || 0);
            group.totalThanhToan += tien;
            group.dataRowCount  += 1;
        });

        // Sort: Khoa groups alphabetically first, non-Khoa last
        return Array.from(groupMap.values()).sort((a, b) => {
            if (a.isNonKhoa !== b.isNonKhoa) return a.isNonKhoa ? 1 : -1;
            return (a.khoa || '').localeCompare(b.khoa || '', 'vi');
        });
    }

    /**
     * Calculate grand totals across all departments.
     */
    static calculateGrandTotals(departmentList, allSummaries) {
        return {
            totalDepartments : departmentList.length,
            totalTeachers    : allSummaries.length,
            totalVuotGio     : departmentList.reduce((s, d) => s + (d.totalVuot     || 0), 0),
            totalThanhToan   : departmentList.reduce((s, d) => s + (d.totalThanhToan || 0), 0),
            totalThucHien    : departmentList.reduce((s, d) => s + (d.tongThucHien   || 0), 0),
        };
    }

    /**
     * Create full consolidated data structure (for preview API and export).
     */
    static createConsolidatedData(namHoc, allSummaries) {
        const departmentList = this.groupByDepartment(allSummaries);
        const grandTotals    = this.calculateGrandTotals(departmentList, allSummaries);

        return {
            namHoc,
            departmentList,
            grandTotals,
            meta: {
                generatedAt    : new Date().toISOString(),
                paymentRate    : PaymentCalculator.PAYMENT_RATE,
                standardHours  : PaymentCalculator.STANDARD_HOURS,
                maxPayableHours: PaymentCalculator.MAX_PAYABLE_HOURS,
            },
        };
    }
}

module.exports = DataAggregator;
````

## File: src/services/vuotgio_v2/department_excel/data/calculator.js
````javascript
const trainingSystemMapper = require("../../../../mappers/vuotgio_v2/trainingSystem.mapper");

class PaymentCalculator {
  static PAYMENT_RATE = 100000;
  static STANDARD_HOURS = 176; // Định mức tiết chuẩn
  static MAX_PAYABLE_HOURS = 300; // Trần tiết thanh toán

  /**
   * Calculate payment amount from overtime hours
   */
  static calculatePaymentAmount(overtimeHours, luong = 0) {
    const rate = this.truncDecimals((luong || 0) / 176, 1);
    return this.truncDecimals((overtimeHours || 0) * rate, 2);
  }

  /**
   * Truncate number to specified decimal places (TRUNC equivalent)
   */
  static truncDecimals(value, digits = 2) {
    const factor = Math.pow(10, digits);
    return Math.trunc(value * factor) / factor;
  }

  /**
   * Format number to Excel number format
   */
  static excelNumber(value) {
    return Number(Number(value || 0).toFixed(2));
  }

  /**
   * Classify training system (hệ đào tạo)
   */
  static classifyHeDaoTao(tenHeDaoTao) {
    return trainingSystemMapper.classify(tenHeDaoTao);
  }

  /**
   * Get standardized category key (vn, lao, cuba, cpc, dongHP)
   */
  static getCategoryKey(tenHeDaoTao) {
    return trainingSystemMapper.getCategoryKey(tenHeDaoTao);
  }

  /**
   * Parse training system breakdown from tableF
   */
  static parseTrainingSystemBreakdown(tableF) {
    const breakdown = {
      hk1_vn: 0, hk1_lao: 0, hk1_cuba: 0, hk1_cpc: 0, hk1_dongHP: 0,
      hk2_vn: 0, hk2_lao: 0, hk2_cuba: 0, hk2_cpc: 0, hk2_dongHP: 0,
      year_vn: 0, year_lao: 0, year_cuba: 0, year_cpc: 0, year_dongHP: 0,
    };

    if (!tableF || !Array.isArray(tableF.rows)) {
      return breakdown;
    }

    tableF.rows.forEach((row) => {
      const category = this.getCategoryKey(
        row.doi_tuong || row.DoiTuong || row.ten_he_dao_tao || row.he_dao_tao
      );

      // Đồ án & tham quan không có thông tin HK → mặc định tính vào HK2
      breakdown[`hk1_${category}`] += Number(row.hk1 || 0);
      breakdown[`hk2_${category}`] += Number(row.hk2 || 0) + Number(row.do_an || 0) + Number(row.tham_quan || 0);
      breakdown[`year_${category}`] += Number(row.tong || 0);
    });

    return breakdown;
  }

  /**
   * Distribute overtime proportionally across training systems
   */
  static distributeOvertimeProportionally(breakdown, totalOvertime) {
    const yearTotal =
      breakdown.year_vn +
      breakdown.year_lao +
      breakdown.year_cuba +
      breakdown.year_cpc +
      breakdown.year_dongHP;

    if (yearTotal === 0) {
      return {
        vuot_vn: 0,
        vuot_lao: 0,
        vuot_cuba: 0,
        vuot_cpc: 0,
        vuot_dongHP: 0,
      };
    }

    return {
      vuot_vn: (breakdown.year_vn / yearTotal) * totalOvertime,
      vuot_lao: (breakdown.year_lao / yearTotal) * totalOvertime,
      vuot_cuba: (breakdown.year_cuba / yearTotal) * totalOvertime,
      vuot_cpc: (breakdown.year_cpc / yearTotal) * totalOvertime,
      vuot_dongHP: (breakdown.year_dongHP / yearTotal) * totalOvertime,
    };
  }

  /**
   * ============================================================
   * computeSdoBreakdown - SINGLE SOURCE OF TRUTH
   * ============================================================
   * Nhận vào tableF và totalOvertime (thanhToan) của 1 SDO,
   * trả về object breakdown đầy đủ, đã tính sẵn HK1 / HK2 /
   * cả năm / vượt giờ / thành tiền cho 5 nhóm + hàng tổng.
   *
   * Dùng chung cho:
   *   - API → Web UI (bảng tổng hợp giảng viên)
   *   - Preview Excel/PDF khoa/phòng (summary.component.js)
   *
   * Trả về cấu trúc:
   * {
   *   hk1:   { vn, lao, cuba, cpc, dongHP, total }
   *   hk2:   { vn, lao, cuba, cpc, dongHP, total }
   *   year:  { vn, lao, cuba, cpc, dongHP, total }
   *   vuot:  { vn, lao, cuba, cpc, dongHP, total }
   *   money: { vn, lao, cuba, cpc, dongHP, total }
   *   thucNhan: number   (= money.total hiện tại)
   *   mucTT: number      (đơn giá mỗi tiết)
   * }
   * ============================================================
   */
  static computeSdoBreakdown(tableF, totalOvertime, luong = 0) {
    const R = (v) => this.excelNumber(v);
    const GROUPS = ["vn", "lao", "cuba", "cpc", "dongHP"];
    const vuotTong = R(totalOvertime || 0);

    // Bước 1: Phân tích tableF
    const raw = this.parseTrainingSystemBreakdown(tableF);

    // Bước 2: Chia tỉ lệ vượt giờ vào từng nhóm
    const vuot = this.distributeOvertimeProportionally(raw, vuotTong);

    // Bước 3: Tính thành tiền từng nhóm
    // Công thức tính Mức TT chuẩn: TRUNC(luong / 176, 1) theo EXCEL_FORMULA_SPEC.md
    // Luôn áp dụng công thức, nếu luong = 0 thì đơn giá là 0 (không fallback)
    const rate = this.truncDecimals((luong || 0) / 176, 1);
    const moneyByGroup = {};
    let moneyTotal = 0;
    GROUPS.forEach(g => {
      moneyByGroup[g] = R(vuot[`vuot_${g}`] * rate);
      moneyTotal += moneyByGroup[g];
    });
    moneyTotal = R(moneyTotal);

    // Bước 4: Tính tổng cột từng hàng
    const sum = (prefix) => R(GROUPS.reduce((s, g) => s + (raw[`${prefix}_${g}`] || 0), 0));

    return {
      hk1: {
        vn: R(raw.hk1_vn), lao: R(raw.hk1_lao), cuba: R(raw.hk1_cuba),
        cpc: R(raw.hk1_cpc), dongHP: R(raw.hk1_dongHP), total: sum("hk1"),
      },
      hk2: {
        vn: R(raw.hk2_vn), lao: R(raw.hk2_lao), cuba: R(raw.hk2_cuba),
        cpc: R(raw.hk2_cpc), dongHP: R(raw.hk2_dongHP), total: sum("hk2"),
      },
      year: {
        vn: R(raw.year_vn), lao: R(raw.year_lao), cuba: R(raw.year_cuba),
        cpc: R(raw.year_cpc), dongHP: R(raw.year_dongHP), total: sum("year"),
      },
      vuot: {
        vn: R(vuot.vuot_vn), lao: R(vuot.vuot_lao), cuba: R(vuot.vuot_cuba),
        cpc: R(vuot.vuot_cpc), dongHP: R(vuot.vuot_dongHP), total: vuotTong,
      },
      money: {
        vn: moneyByGroup.vn, lao: moneyByGroup.lao, cuba: moneyByGroup.cuba,
        cpc: moneyByGroup.cpc, dongHP: moneyByGroup.dongHP, total: moneyTotal,
      },
      thucNhan: moneyTotal,
      mucTT: rate,
    };
  }
}

module.exports = PaymentCalculator;
````

## File: src/services/vuotgio_v2/department_excel/generators/formula.generator.js
````javascript
/**
 * Formula Generator - Hybrid Excel Export (Vượt Giờ V2)
 *
 * Generates Excel formula strings for the 36-column department/master layout.
 *
 * Strategy (based on excel-formula-master-suite / EXCEL_FORMULA_SPEC.md):
 *   - Input columns  (C,D,E,F,G, H–L HK1, M–Q HK2): Static values from SDO.
 *   - Derived columns (R–V year, W–AB vuot, AC mucTT, AD–AI money, AJ thucNhan): Excel formulas.
 *   - Footer row    : SUM range formulas over the data rows.
 *
 * Column index map (1-based, matching summary.component.js):
 *   1=STT  2=Name  3=luong  4=dinhMucChuan  5=mienGiam  6=thieuNCKH  7=dinhMucSauMienGiam
 *   8=hk1_vn  9=hk1_lao  10=hk1_cuba  11=hk1_cpc  12=hk1_dongHP
 *  13=hk2_vn 14=hk2_lao 15=hk2_cuba 16=hk2_cpc 17=hk2_dongHP
 *  18=year_vn 19=year_lao 20=year_cuba 21=year_cpc 22=year_dongHP
 *  23=vuot_vn 24=vuot_lao 25=vuot_cuba 26=vuot_cpc 27=vuot_dongHP  28=vuot_total
 *  29=mucTT
 *  30=money_vn 31=money_lao 32=money_cuba 33=money_cpc 34=money_dongHP 35=money_total
 *  36=thucNhan
 */

const CellFormatter    = require('../../shared_excel/core/cell.formatter');
const PaymentCalculator = require('../data/calculator');

// ── Column letter helpers ─────────────────────────────────────────────────────

const COL = (n) => CellFormatter.columnToLetter(n);

// Pre-compute letters for all used columns (1-indexed)
// C=3  D=4  E=5  F=6  G=7
// H=8  I=9  J=10 K=11 L=12    (HK1 VN/Lao/Cuba/CPC/DHP)
// M=13 N=14 O=15 P=16 Q=17    (HK2 VN/Lao/Cuba/CPC/DHP)
// R=18 S=19 T=20 U=21 V=22    (Year VN/Lao/Cuba/CPC/DHP)
// W=23 X=24 Y=25 Z=26 AA=27 AB=28  (Vuot VN/Lao/Cuba/CPC/DHP/Total)
// AC=29 = mucTT
// AD=30 AE=31 AF=32 AG=33 AH=34 AI=35  (Money VN/Lao/Cuba/CPC/DHP/Total)
// AJ=36 = thucNhan

const COLS = {
  luong:               COL(3),
  dinhMucChuan:        COL(4),
  mienGiam:            COL(5),
  thieuNCKH:           COL(6),
  dinhMucSauMienGiam:  COL(7),
  // HK1
  hk1_vn:   COL(8),  hk1_lao:   COL(9),  hk1_cuba:  COL(10), hk1_cpc: COL(11), hk1_dhp: COL(12),
  // HK2
  hk2_vn:  COL(13), hk2_lao:  COL(14), hk2_cuba: COL(15), hk2_cpc: COL(16), hk2_dhp: COL(17),
  // Year (col 18-22)
  year_vn:  COL(18), year_lao: COL(19), year_cuba:COL(20), year_cpc:COL(21), year_dhp:COL(22),
  // Vuot (col 23-28)
  vuot_vn:  COL(23), vuot_lao: COL(24), vuot_cuba:COL(25), vuot_cpc:COL(26), vuot_dhp:COL(27),
  vuot_total: COL(28),
  // Mức TT (col 29)
  mucTT: COL(29),
  // Money (col 30-35)
  money_vn: COL(30), money_lao:COL(31), money_cuba:COL(32), money_cpc:COL(33), money_dhp:COL(34),
  money_total: COL(35),
  // Thực nhận (col 36)
  thucNhan: COL(36),
};

// ── Formula builders ─────────────────────────────────────────────────────────

/**
 * Formula for "Tổng năm" of a training-system group.
 * Tổng năm = HK1 + HK2  (Đồ án & Tham quan are already summed into HK1 by the mapper).
 *
 * @param {string} hk1Col - Column letter for HK1 of the group
 * @param {string} hk2Col - Column letter for HK2 of the group
 * @param {number} r      - Excel row number
 */
const yearFormula = (hk1Col, hk2Col, r) => `${hk1Col}${r}+${hk2Col}${r}`;

/**
 * Formula for proportional overtime distribution for a single training-system group.
 * Based on EXCEL_FORMULA_SPEC.md Bước 4:
 *   distributed = IF(yearTotal>0, ROUND(year_group / yearTotal * thanhToan, 0), 0)
 *
 * yearTotal = R+S+T+U+V  (cols 18-22)
 * thanhToan = vuot_total  (col 28, which is a static pre-calculated value)
 *
 * NOTE: col 27 (vuot_dhp / last group) uses remainder subtraction to avoid rounding drift.
 *
 * @param {string} yearGroupCol - Column letter for year_group
 * @param {string} yearTotalRange - e.g. "R9:V9"
 * @param {string} thanhToanCol  - column letter for vuot_total (col 28)
 * @param {number} r
 */
const vuotGroupFormula = (yearGroupCol, yearTotalRange, thanhToanCol, r) =>
  `IF(SUM(${yearTotalRange})>0,ROUND(${yearGroupCol}${r}/SUM(${yearTotalRange})*${thanhToanCol}${r},0),0)`;

/**
 * Remainder formula for the LAST group in proportional distribution (dongHP).
 * dongHP_vuot = vuot_total - SUM(other four vuot groups)
 * Ensures exact total without rounding error.
 */
const vuotLastGroupFormula = (thanhToanCol, firstVuotCol, preLastVuotCol, r) =>
  `${thanhToanCol}${r}-SUM(${firstVuotCol}${r}:${preLastVuotCol}${r})`;

/**
 * Formula for money (thành tiền) per group.
 * Based on EXCEL_FORMULA_SPEC.md Bước 5: TRUNC(vuot_group * mucTT, 2)
 */
const moneyGroupFormula = (vuotGroupCol, mucTTCol, r) =>
  `TRUNC(${vuotGroupCol}${r}*${mucTTCol}${r},2)`;

/**
 * Footer SUM formula over a column's data range.
 */
const sumRange = (colLetter, startRow, endRow) => `SUM(${colLetter}${startRow}:${colLetter}${endRow})`;

// ── Public API ────────────────────────────────────────────────────────────────

class FormulaGenerator {
  /**
   * Write formula-based derived cells for a single data row.
   *
   * Columns that remain as static values (already written by caller):
   *   1-7   (STT, Name, luong, dinhMucChuan, mienGiam, thieuNCKH, dinhMucSauMienGiam)
   *   8-17  (HK1 and HK2 breakdown per training system)
   *   28    (vuot_total / thanhToan — pre-calculated by SDO engine, source of truth)
   *
   * Columns written as formulas here:
   *   18-22 (year per group) — sum of HK1+HK2
   *   23-27 (vuot per group) — proportional distribution with last-remainder
   *   29    (mucTT)           — TRUNC(luong / 176, 1)
   *   30-34 (money per group) — TRUNC(vuot * mucTT, 2)
   *   35    (money total)     — SUM(AD:AH)
   *   36    (thucNhan)        — same as money total for now
   *
   * @param {ExcelJS.Worksheet} ws
   * @param {number} r           - Excel row number
   * @param {object} bd          - Pre-calculated breakdown (used as `result` cache)
   */
  static writeDataRowFormulas(ws, r, bd) {
    const C = COLS;
    const numFmt = '#,##0.00';

    // Year totals per group (cols 18-22)
    // yearRange = R:V (cols 18-22)
    const yearGroups = [
      [C.year_vn,   C.hk1_vn,  C.hk2_vn,  bd.year.vn],
      [C.year_lao,  C.hk1_lao, C.hk2_lao, bd.year.lao],
      [C.year_cuba, C.hk1_cuba,C.hk2_cuba, bd.year.cuba],
      [C.year_cpc,  C.hk1_cpc, C.hk2_cpc,  bd.year.cpc],
      [C.year_dhp,  C.hk1_dhp, C.hk2_dhp, bd.year.dongHP],
    ];
    yearGroups.forEach(([col, hk1, hk2, result]) => {
      CellFormatter.applyFormula(
        ws.getCell(`${col}${r}`),
        yearFormula(hk1, hk2, r),
        result,
        { numFmt, hAlign: 'center', vAlign: 'middle' }
      );
    });

    // yearTotalRange for proportional division
    const yearTotalRange = `${C.year_vn}${r}:${C.year_dhp}${r}`;

    // Proportional vuot per group (cols 23-27)
    // First 4 groups use ROUND formula; last group (dongHP col 27) uses remainder subtraction
    const vuotGroups = [
      [C.vuot_vn,   C.year_vn,   bd.vuot.vn],
      [C.vuot_lao,  C.year_lao,  bd.vuot.lao],
      [C.vuot_cuba, C.year_cuba, bd.vuot.cuba],
      [C.vuot_cpc,  C.year_cpc,  bd.vuot.cpc],
    ];
    vuotGroups.forEach(([col, yearCol, result]) => {
      CellFormatter.applyFormula(
        ws.getCell(`${col}${r}`),
        vuotGroupFormula(yearCol, yearTotalRange, C.vuot_total, r),
        result,
        { numFmt, hAlign: 'center', vAlign: 'middle' }
      );
    });

    // Last vuot group: dongHP (col 27) — remainder to avoid rounding drift
    CellFormatter.applyFormula(
      ws.getCell(`${C.vuot_dhp}${r}`),
      vuotLastGroupFormula(C.vuot_total, C.vuot_vn, C.vuot_cpc, r),
      bd.vuot.dongHP,
      { numFmt, hAlign: 'center', vAlign: 'middle' }
    );

    // Mức TT chuẩn (col 29): TRUNC(luong / 176, 1) theo tài liệu đặc tả
    CellFormatter.applyFormula(
      ws.getCell(`${C.mucTT}${r}`),
      `TRUNC(${C.luong}${r}/176,1)`,
      bd.mucTT,
      { numFmt, hAlign: 'center', vAlign: 'middle' }
    );

    // Money per group (cols 30-34): TRUNC(vuot_group * mucTT, 2)
    const moneyGroups = [
      [C.money_vn,   C.vuot_vn,   bd.money.vn],
      [C.money_lao,  C.vuot_lao,  bd.money.lao],
      [C.money_cuba, C.vuot_cuba, bd.money.cuba],
      [C.money_cpc,  C.vuot_cpc,  bd.money.cpc],
      [C.money_dhp,  C.vuot_dhp,  bd.money.dongHP],
    ];
    moneyGroups.forEach(([col, vuotCol, result]) => {
      CellFormatter.applyFormula(
        ws.getCell(`${col}${r}`),
        moneyGroupFormula(vuotCol, C.mucTT, r),
        result,
        { numFmt, hAlign: 'center', vAlign: 'middle' }
      );
    });

    // Total money (col 35): SUM(AD:AH)
    CellFormatter.applyFormula(
      ws.getCell(`${C.money_total}${r}`),
      `SUM(${C.money_vn}${r}:${C.money_dhp}${r})`,
      bd.money.total,
      { numFmt, hAlign: 'center', vAlign: 'middle', fontSize: 11.5 }
    );

    // Thực nhận (col 36): mirrors money_total for now
    CellFormatter.applyFormula(
      ws.getCell(`${C.thucNhan}${r}`),
      `${C.money_total}${r}`,
      bd.thucNhan,
      { numFmt, hAlign: 'center', vAlign: 'middle', fontSize: 11.5 }
    );
  }

  /**
   * Write SUM formula footer row.
   *
   * Columns 1 (STT) and 2 (name) are skipped — caller writes "TỔNG CỘNG" label.
   * Columns with no meaningful sum (col 29 mucTT) are left empty.
   * All other numeric columns (3-36 except 29) get a SUM range formula.
   *
   * @param {ExcelJS.Worksheet} ws
   * @param {number} footerRow  - Row index for the TỔNG CỘNG row
   * @param {number} dataStart  - First data row index
   * @param {number} dataEnd    - Last data row index (inclusive)
   * @param {object} totals     - Pre-calculated totals (used as `result` cache)
   */
  static writeFooterFormulas(ws, footerRow, dataStart, dataEnd, totals) {
    const numFmt = '#,##0.00';
    const boldNumOpts = { numFmt, hAlign: 'center', vAlign: 'middle', fontSize: 11.5 };

    // Map: column index → key in totals object
    const colTotalsMap = {
      3:  ['luong',               totals.luong            ?? totals.tien_tong],
      4:  ['dinhMucChuan',        totals.dinhMucChuan],
      5:  ['mienGiam',            totals.mienGiam],
      6:  ['thieuNCKH',           totals.thieuNCKH],
      7:  ['dinhMucSauMienGiam',  totals.dinhMucSauGiamTru ?? totals.dinhMucSauMienGiam],
      8:  ['hk1_vn',   totals.hk1_vn],   9:  ['hk1_lao',  totals.hk1_lao],
      10: ['hk1_cuba', totals.hk1_cuba], 11: ['hk1_cpc',  totals.hk1_cpc],
      12: ['hk1_dhp',  totals.hk1_dongHP],
      13: ['hk2_vn',   totals.hk2_vn],  14: ['hk2_lao',  totals.hk2_lao],
      15: ['hk2_cuba', totals.hk2_cuba],16: ['hk2_cpc',  totals.hk2_cpc],
      17: ['hk2_dhp',  totals.hk2_dongHP],
      18: ['year_vn',  totals.year_vn], 19: ['year_lao', totals.year_lao],
      20: ['year_cuba',totals.year_cuba],21: ['year_cpc', totals.year_cpc],
      22: ['year_dhp', totals.year_dongHP ?? totals.year_dhp],
      23: ['vuot_vn',  totals.vuot_vn],  24: ['vuot_lao', totals.vuot_lao],
      25: ['vuot_cuba',totals.vuot_cuba],26: ['vuot_cpc', totals.vuot_cpc],
      27: ['vuot_dhp', totals.vuot_dongHP ?? totals.vuot_dhp],
      28: ['vuot_tong',totals.vuot_tong ?? totals.vuot_total],
      // 29 = mucTT — skip (not summed)
      30: ['tien_vn',  totals.tien_vn  ?? totals.money_vn],
      31: ['tien_lao', totals.tien_lao ?? totals.money_lao],
      32: ['tien_cuba',totals.tien_cuba?? totals.money_cuba],
      33: ['tien_cpc', totals.tien_cpc ?? totals.money_cpc],
      34: ['tien_dhp', totals.tien_dongHP?? totals.money_dhp],
      35: ['tien_tong',totals.tien_tong ?? totals.money_total],
      36: ['thucNhan', totals.thucNhan],
    };

    for (let col = 3; col <= 36; col++) {
      if (col === 29) continue; // mucTT — leave blank
      const cell     = ws.getCell(footerRow, col);
      const colLetter = COL(col);
      const [, result] = colTotalsMap[col] || [null, 0];
      CellFormatter.applyFormula(
        cell,
        sumRange(colLetter, dataStart, dataEnd),
        result ?? 0,
        boldNumOpts
      );
      cell.font = { bold: true, size: 11.5 };
    }
  }

  /**
   * Expose COLS map for use in generators that need column letters directly.
   */
  static get COLS() { return COLS; }
}

module.exports = FormulaGenerator;
````

## File: src/services/vuotgio_v2/department_excel/generators/master.generator.js
````javascript
/**
 * Master Sheet Generator — Renders the "TỔNG HỢP" sheet.
 *
 * Layout mirrors vuotgio.tongHopGV.ejs:
 *   - 36 columns (same as DepartmentLayout)
 *   - One row per lecturer (not per department)
 *   - Groups are separated by a group header row
 *   - isKhoa=0 units are merged into "Ban giám đốc & các phòng"
 *   - Sub-totals per group + grand total footer
 */

const WorkbookFactory  = require('../../shared_excel/core/workbook.factory');
const CellFormatter    = require('../../shared_excel/core/cell.formatter');
const DepartmentLayout = require('../layouts/department.layout');
const PaymentCalculator = require('../data/calculator');
const FormulaGenerator  = require('./formula.generator');

// ── Color palette (synchronized with tongHopGV.ejs) ─────────────────────────
const COLORS = {
    base:          'FF64748B',
    teaching:      'FF1D4ED8',
    teachingHK:    'FF3B82F6',
    teachingSub:   'FF60A5FA',
    over:          'FF059669',
    overSub:       'FF10B981',
    rate:          'FF7C3AED',
    money:         'FFB45309',
    moneySub:      'FFD97706',
    net:           'FF4338CA',
    groupHeader:   'FFE2E8F0',   // light slate — group separator rows
    groupTotal:    'FFDBEAFE',   // light blue — group sub-total
    grandTotal:    'FFCFCFCF',   // grey — grand total
    white:         'FFFFFFFF',
};

const TOTAL_COLS = 36;

/** Helper: style a cell as a coloured header */
const _hdr = (cell, argb, fontSize = 11, wrapText = true) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    cell.font   = { bold: true, size: fontSize, color: { argb: COLORS.white } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText };
    CellFormatter.applyBorder(cell);
};

/** Helper: style a group separator row */
const _groupRow = (ws, row, label, argb = COLORS.groupHeader) => {
    ws.mergeCells(`A${row}:AJ${row}`);
    const cell = ws.getCell(row, 1);
    cell.value = label;
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    cell.font  = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    CellFormatter.applyBorder(cell);
    ws.getRow(row).height = 22;
};

/** Helper: write numeric value to a cell with #,##0.00 format */
const _num = (cell, value, bold = false) => {
    cell.value  = PaymentCalculator.excelNumber(value);
    cell.numFmt = '#,##0.00';
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font   = { bold, size: 11.5 };
    CellFormatter.applyBorder(cell);
};

// ── Build 3-row header (rows 3–5) ─────────────────────────────────────────
const _renderHeaders = (ws, startRow) => {
    const r1 = startRow;
    const r2 = startRow + 1;
    const r3 = startRow + 2;

    // Row 1 — main groups
    const merge = (c1, c2, label, argb, fs = 12) => {
        ws.mergeCells(r1, c1, r1, c2);
        _hdr(ws.getCell(r1, c1), argb, fs);
        ws.getCell(r1, c1).value = label;
    };

    // STT, Họ tên, Thu nhập, ĐM, Giảm, NCKH, ĐM-giảng  (cols 1-7 rowspan 3)
    [
        [1,  1,  'STT'],
        [2,  2,  'Họ tên Giảng viên'],
        [3,  3,  'Thu nhập'],
        [4,  4,  'Định mức giờ giảng'],
        [5,  5,  'Được giảm'],
        [6,  6,  'Số tiết chưa hoàn thành NCKH'],
        [7,  7,  'Định mức phải giảng'],
    ].forEach(([c1, c2, label]) => {
        ws.mergeCells(r1, c1, r3, c2);
        _hdr(ws.getCell(r1, c1), COLORS.base, 11.5);
        ws.getCell(r1, c1).value = label;
    });

    merge(8,  22, 'Thực tế giảng dạy + coi, ra đề, chấm thi + ĐATN + HDTQ', COLORS.teaching);
    merge(23, 28, 'Số tiết vượt định mức',    COLORS.over);
    ws.mergeCells(r1, 29, r3, 29);
    _hdr(ws.getCell(r1, 29), COLORS.rate, 11.5);
    ws.getCell(r1, 29).value = 'Mức TT chuẩn';
    merge(30, 35, 'Thành tiền', COLORS.money);
    ws.mergeCells(r1, 36, r3, 36);
    _hdr(ws.getCell(r1, 36), COLORS.net, 11.5);
    ws.getCell(r1, 36).value = 'Thực nhận';

    // Row 2 — sub groups
    [[8, 12, 'Học kỳ I (gồm ĐA & TQ)', COLORS.teachingHK],
     [13, 17, 'Học kỳ II', COLORS.teachingHK],
     [18, 22, 'Cả năm', COLORS.teachingHK],
     [23, 28, '', COLORS.overSub],
     [30, 35, '', COLORS.moneySub],
    ].forEach(([c1, c2, label, argb]) => {
        ws.mergeCells(r2, c1, r2, c2);
        _hdr(ws.getCell(r2, c1), argb, 11);
        ws.getCell(r2, c1).value = label;
    });

    // Row 3 — sub columns (VN/Lào/Cuba/CPC/ĐHP per section)
    const subCols = [
        ...([8,9,10,11,12].map((c, i) => [c, ['VN','Lào','Cuba','CPC','Đóng HP'][i], COLORS.teachingSub])),
        ...([13,14,15,16,17].map((c, i) => [c, ['VN','Lào','Cuba','CPC','Đóng HP'][i], COLORS.teachingSub])),
        ...([18,19,20,21,22].map((c, i) => [c, ['VN','Lào','Cuba','CPC','Đóng HP'][i], COLORS.teachingSub])),
        ...([23,24,25,26,27,28].map((c, i) => [c, ['VN','Lào','Cuba','CPC','Đóng HP','Tổng'][i], COLORS.overSub])),
        ...([30,31,32,33,34,35].map((c, i) => [c, ['VN','Lào','Cuba','CPC','Đóng HP','Tổng'][i], COLORS.moneySub])),
    ];
    subCols.forEach(([c, label, argb]) => {
        _hdr(ws.getCell(r3, c), argb, 11, false);
        ws.getCell(r3, c).value = label;
    });

    [r1, r2, r3].forEach(r => { ws.getRow(r).height = 25; });

    return r3 + 1;
};

// ── Write one lecturer data row ───────────────────────────────────────────
const _renderDataRow = (ws, row, sdo, index, isExport = false) => {
    const bd = sdo.breakdown
        ? sdo.breakdown
        : PaymentCalculator.computeSdoBreakdown(sdo.tableF, sdo.thanhToan, sdo.luong);

    // Static input columns (always values)
    const staticValues = {
        1:  index,
        2:  sdo.giangVien || '',
        3:  PaymentCalculator.excelNumber(sdo.luong || 0),
        4:  PaymentCalculator.excelNumber(sdo.dinhMucChuan  || 0),
        5:  PaymentCalculator.excelNumber(sdo.mienGiam      || 0),
        6:  PaymentCalculator.excelNumber(sdo.thieuNCKH     || 0),
        7:  PaymentCalculator.excelNumber(sdo.dinhMucSauMienGiam || 0),
        8:  bd.hk1.vn,  9: bd.hk1.lao, 10: bd.hk1.cuba, 11: bd.hk1.cpc, 12: bd.hk1.dongHP,
        13: bd.hk2.vn, 14: bd.hk2.lao, 15: bd.hk2.cuba, 16: bd.hk2.cpc, 17: bd.hk2.dongHP,
        28: bd.vuot.total,   // vuot_total — SDO engine source of truth
        29: bd.mucTT,        // Mức TT chuẩn được tính linh hoạt
    };

    const excelRow = ws.getRow(row);
    Object.entries(staticValues).forEach(([col, val]) => {
        const c = excelRow.getCell(Number(col));
        c.value = val;
        if (Number(col) === 2) {
            c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        } else if (Number(col) >= 3) {
            c.numFmt    = '#,##0.00';
            c.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
            c.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        c.font = { size: 11.5 };
        CellFormatter.applyBorder(c);
    });

    if (isExport) {
        // Derived columns: Excel formulas (year totals, vuot distribution, money)
        FormulaGenerator.writeDataRowFormulas(ws, row, bd);
    } else {
        // Derived columns: static pre-calculated values (preview / PDF)
        const derivedValues = {
            18: bd.year.vn, 19: bd.year.lao, 20: bd.year.cuba, 21: bd.year.cpc, 22: bd.year.dongHP,
            23: bd.vuot.vn, 24: bd.vuot.lao, 25: bd.vuot.cuba, 26: bd.vuot.cpc, 27: bd.vuot.dongHP,
            30: bd.money.vn,31: bd.money.lao,32: bd.money.cuba,33: bd.money.cpc,34: bd.money.dongHP,
            35: bd.money.total,
            36: bd.thucNhan,   // Thực nhận
        };
        Object.entries(derivedValues).forEach(([col, val]) => {
            const c = excelRow.getCell(Number(col));
            c.value = val;
            c.numFmt    = '#,##0.00';
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            c.font = { size: 11.5 };
            CellFormatter.applyBorder(c);
        });
    }

    excelRow.height = 22;
    return bd;
};

// ── Write a sub-total row ─────────────────────────────────────────────────
const _renderSubTotal = (ws, row, label, totals, bgColor = COLORS.groupTotal, isExport = false, dataStart = null, dataEnd = null) => {
    ws.mergeCells(row, 1, row, 2);
    const labelCell = ws.getCell(row, 1);
    labelCell.value = label;
    labelCell.font  = { bold: true, size: 11.5 };
    labelCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    CellFormatter.applyBorder(labelCell);

    if (isExport && dataStart && dataEnd) {
        // SUM range formulas for each numeric column
        FormulaGenerator.writeFooterFormulas(ws, row, dataStart, dataEnd, totals);
        // Override font/fill since writeFooterFormulas applies applyDataStyle
        for (let c = 3; c <= 36; c++) {
            const cell = ws.getCell(row, c);
            cell.font = { bold: true, size: 11.5 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            CellFormatter.applyBorder(cell);
        }
    } else {
        // Static pre-calculated values
        const keyMap = {
            3:'luong',4:'dinhMucChuan',5:'mienGiam',6:'thieuNCKH',7:'dinhMucSauMienGiam',
            8:'hk1_vn',9:'hk1_lao',10:'hk1_cuba',11:'hk1_cpc',12:'hk1_dongHP',
            13:'hk2_vn',14:'hk2_lao',15:'hk2_cuba',16:'hk2_cpc',17:'hk2_dongHP',
            18:'year_vn',19:'year_lao',20:'year_cuba',21:'year_cpc',22:'year_dongHP',
            23:'vuot_vn',24:'vuot_lao',25:'vuot_cuba',26:'vuot_cpc',27:'vuot_dongHP',
            28:'vuot_total',
            30:'money_vn',31:'money_lao',32:'money_cuba',33:'money_cpc',34:'money_dongHP',
            35:'money_total',
            36:'thucNhan',
        };

        for (let c = 3; c <= 36; c++) {
            const cell = ws.getCell(row, c);
            const key = keyMap[c];
            cell.value = key ? (PaymentCalculator.excelNumber(totals[key] || 0)) : '';
            if (key) cell.numFmt = '#,##0.00';
            cell.font  = { bold: true, size: 11.5 };
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            CellFormatter.applyBorder(cell);
        }
    }

    ws.getRow(row).height = 24;
};

/** Accumulate SDO breakdown into running totals object */
const _accumulateTotals = (totals, sdo, bd) => {
    totals.dinhMucChuan       += PaymentCalculator.excelNumber(sdo.dinhMucChuan  || 0);
    totals.luong              += PaymentCalculator.excelNumber(sdo.luong          || 0);
    totals.mienGiam           += PaymentCalculator.excelNumber(sdo.mienGiam      || 0);
    totals.thieuNCKH          += PaymentCalculator.excelNumber(sdo.thieuNCKH     || 0);
    totals.dinhMucSauMienGiam += PaymentCalculator.excelNumber(sdo.dinhMucSauMienGiam || 0);
    ['vn','lao','cuba','cpc','dongHP'].forEach(g => {
        totals[`hk1_${g}`]  += bd.hk1[g];
        totals[`hk2_${g}`]  += bd.hk2[g];
        totals[`year_${g}`] += bd.year[g];
        totals[`vuot_${g}`] += bd.vuot[g];
        totals[`money_${g}`]+= bd.money[g];
    });
    totals.vuot_total  += bd.vuot.total;
    totals.money_total += bd.money.total;
    totals.thucNhan    += (bd.thucNhan || bd.money.total || 0);
};

const _emptyTotals = () => ({
    luong: 0,
    dinhMucChuan:0, mienGiam:0, thieuNCKH:0, dinhMucSauMienGiam:0,
    hk1_vn:0, hk1_lao:0, hk1_cuba:0, hk1_cpc:0, hk1_dongHP:0,
    hk2_vn:0, hk2_lao:0, hk2_cuba:0, hk2_cpc:0, hk2_dongHP:0,
    year_vn:0, year_lao:0, year_cuba:0, year_cpc:0, year_dongHP:0,
    vuot_vn:0, vuot_lao:0, vuot_cuba:0, vuot_cpc:0, vuot_dongHP:0,
    vuot_total:0,
    money_vn:0, money_lao:0, money_cuba:0, money_cpc:0, money_dongHP:0,
    money_total:0,
    thucNhan:0,
});

// ── Public API ─────────────────────────────────────────────────────────────

class MasterSheetGenerator {
    /**
     * Create the TỔNG HỢP sheet in an existing workbook.
     *
     * @param {ExcelJS.Workbook} workbook
     * @param {Object}  opts
     * @param {Array}   opts.departmentList  — output of DataAggregator.groupByDepartment()
     * @param {string}  opts.namHoc
     * @param {boolean} [opts.isExport=false] - true → write Excel formulas; false → static values
     */
    static createMasterSheet(workbook, { departmentList, namHoc, isExport = false }) {
        const ws = WorkbookFactory.createWorksheet(workbook, 'TỔNG HỢP', {
            frozenRows: 5,
            pageSetup : { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 },
        });

        // Apply same column widths as DepartmentLayout
        DepartmentLayout.applyLayout(ws);

        // ── Title rows ──
        CellFormatter.mergeAndStyle(ws, 1, 1, 1, TOTAL_COLS,
            'BẢNG TỔNG HỢP VƯỢT GIỜ', { title: true, bgColor: '203864', fontSize: 14 });
        CellFormatter.mergeAndStyle(ws, 2, 1, 2, TOTAL_COLS,
            `Năm học: ${namHoc || ''}`, { title: true, bgColor: '2E4D7B', fontSize: 12 });
        ws.getRow(1).height = 28;
        ws.getRow(2).height = 22;

        // ── 3-row column headers ──
        let currentRow = _renderHeaders(ws, 3);

        // ── Data rows grouped by department ──
        const grandTotals = _emptyTotals();
        let globalIndex = 1;

        for (const dept of departmentList) {
            // Group separator
            _groupRow(ws, currentRow, `📂  ${dept.khoa}`);
            currentRow++;

            const groupTotals = _emptyTotals();
            const groupDataStart = currentRow;
            let groupIndex = 1;

            for (const sdo of dept.summaries) {
                const bd = _renderDataRow(ws, currentRow, sdo, groupIndex++, isExport);
                _accumulateTotals(groupTotals, sdo, bd);
                _accumulateTotals(grandTotals, sdo, bd);
                globalIndex++;
                currentRow++;
            }

            const groupDataEnd = currentRow - 1;
            // Sub-total per group
            _renderSubTotal(ws, currentRow, `Tổng cộng — ${dept.khoa}`, groupTotals, COLORS.groupTotal, isExport, groupDataStart, groupDataEnd);
            currentRow++;
        }

        // ── Grand total ──
        _renderSubTotal(ws, currentRow, 'TỔNG CỘNG TOÀN TRƯỜNG', grandTotals, COLORS.grandTotal, false, null, null);

        return ws;
    }
}

module.exports = MasterSheetGenerator;
````

## File: src/services/vuotgio_v2/duyetTongHop.service.js
````javascript
/**
 * VUOT GIO V2 - Duyệt Tổng Hợp Service
 * Logic duyệt tổng hợp vượt giờ theo khoa (Văn phòng thực hiện)
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/duyetTongHop.repo");

const withConnection = async (callback) => {
    const connection = await createPoolConnection();
    try {
        return await callback(connection);
    } finally {
        connection.release();
    }
};

/**
 * Lấy trạng thái duyệt tổng hợp cho tất cả khoa trong 1 năm học
 * Kết hợp danh sách khoa từ phongban với trạng thái duyệt
 */
const getApprovalStatus = async (namHoc) => {
    return await withConnection(async (connection) => {
        // Lấy danh sách tất cả khoa
        const [khoaRows] = await connection.query(
            `SELECT MaPhongBan AS khoa, TenPhongBan AS tenKhoa 
             FROM phongban WHERE isKhoa = 1 ORDER BY MaPhongBan`
        );

        // Lấy trạng thái duyệt đã có
        const approvalRows = await repo.getApprovalStatus(connection, namHoc);
        const approvalMap = new Map(approvalRows.map(r => [r.khoa, r]));

        // Merge: tất cả khoa + trạng thái duyệt
        const result = khoaRows.map(k => {
            const approval = approvalMap.get(k.khoa);
            return {
                khoa: k.khoa,
                tenKhoa: k.tenKhoa,
                van_phong_duyet: approval?.van_phong_duyet || 0,
                van_phong_ngay_duyet: approval?.van_phong_ngay_duyet || null,
                van_phong_nguoi_duyet_id: approval?.van_phong_nguoi_duyet_id || null,
                van_phong_nguoi_duyet_ten: approval?.van_phong_nguoi_duyet_ten || null,
            };
        });

        // Tổng kết
        const totalKhoa = result.length;
        const approvedKhoa = result.filter(r => r.van_phong_duyet === 1).length;

        return { data: result, totalKhoa, approvedKhoa };
    });
};

/**
 * Kiểm tra điều kiện tiên quyết cho 1 khoa
 * Tất cả bản ghi của khoa đó trong 3 bảng phải đã duyệt 2 cấp
 */
const checkPrerequisites = async (namHoc, khoa) => {
    return await withConnection(async (connection) => {
        const results = await repo.getUnapprovedCountsByKhoa(connection, namHoc, khoa);

        const errors = [];
        for (const item of results) {
            if (item.total === 0) continue; // Bảng trống → đạt
            if (item.unapproved > 0) {
                errors.push({
                    table: item.table,
                    tableName: item.tableName,
                    total: item.total,
                    unapproved: item.unapproved,
                });
            }
        }

        return {
            passed: errors.length === 0,
            errors,
        };
    });
};

/**
 * VP duyệt tổng hợp cho 1 khoa
 */
const approveKhoa = async (namHoc, khoa, userId, ghiChu) => {
    return await withConnection(async (connection) => {
        // 1. Kiểm tra điều kiện tiên quyết
        const prerequisiteResults = await repo.getUnapprovedCountsByKhoa(connection, namHoc, khoa);
        const errors = [];
        for (const item of prerequisiteResults) {
            if (item.total === 0) continue;
            if (item.unapproved > 0) {
                errors.push({
                    table: item.table,
                    tableName: item.tableName,
                    total: item.total,
                    unapproved: item.unapproved,
                });
            }
        }

        if (errors.length > 0) {
            return {
                success: false,
                message: "Chưa đủ điều kiện duyệt",
                errors,
            };
        }

        // 2. Upsert bản ghi duyệt
        await repo.upsertApproval(connection, { namHoc, khoa, userId, ghiChu });

        return { success: true, message: `Đã duyệt tổng hợp khoa ${khoa}` };
    });
};

/**
 * VP hủy duyệt 1 khoa (chỉ khi chưa khóa toàn năm)
 */
const revokeKhoa = async (namHoc, khoa) => {
    return await withConnection(async (connection) => {
        // Kiểm tra năm học đã khóa chưa
        const dataLockRepo = require("../../repositories/vuotgio_v2/dataLock.repo");
        const lockRecord = await dataLockRepo.getLockRecord(connection, namHoc);
        if (lockRecord) {
            return { success: false, message: "Dữ liệu đã khóa, không thể hủy duyệt" };
        }

        await repo.revokeApproval(connection, namHoc, khoa);
        return { success: true, message: `Đã hủy duyệt khoa ${khoa}` };
    });
};

/**
 * Kiểm tra tất cả khoa đã duyệt chưa (dùng cho điều kiện khóa)
 */
const isAllKhoaApproved = async (namHoc) => {
    return await withConnection(async (connection) => {
        return await repo.isAllKhoaApproved(connection, namHoc);
    });
};

/**
 * Lấy tổng kết duyệt (dùng cho UI badge)
 */
const getApprovalSummary = async (namHoc) => {
    return await withConnection(async (connection) => {
        return await repo.getApprovalSummary(connection, namHoc);
    });
};

module.exports = {
    getApprovalStatus,
    checkPrerequisites,
    approveKhoa,
    revokeKhoa,
    isAllKhoaApproved,
    getApprovalSummary,
};
````

## File: src/services/vuotgio_v2/kthpImport.service.js
````javascript
/**
 * VUOT GIO V2 - Kế Thúc Học Phần (Coi chấm ra đề) Import Service
 */

const XLSX = require('xlsx');
const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/kthp.repo");
const LogService = require("../logService");

/**
 * Xử lý đọc file Excel và phân loại dữ liệu
 */
const parseExcelFile = async (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;
    const data = {
        raDe: [],
        coiThi: [],
        chamThi: []
    };

    // Tải bảng cấu hình ký tự bắt đầu để tự động map hệ đào tạo
    let connection;
    const mappingMap = new Map();
    try {
        connection = await createPoolConnection();
        const prefixQuery = `
            SELECT 
              k.viet_tat,
              h.he_dao_tao
            FROM kitubatdau k
            LEFT JOIN he_dao_tao h ON CAST(k.gia_tri_so_sanh AS UNSIGNED) = h.id;
        `;
        const [configs] = await connection.query(prefixQuery);
        for (const config of configs) {
            if (config.viet_tat) {
                mappingMap.set(config.viet_tat.toUpperCase().trim(), config.he_dao_tao);
            }
        }
    } catch (err) {
        console.error("Lỗi khi tải bảng cấu hình trong parseExcelFile:", err);
    } finally {
        if (connection) connection.release();
    }

    const getFirstParenthesesContent = (str) => {
        const match = String(str || "").match(/\(([^)]+)\)/);
        return match ? match[1] : str;
    };

    const extractPrefix = (classCode) => {
        const match = String(classCode || "").trim().match(/^[A-Za-z]+/);
        return match ? match[0] : "";
    };

    sheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

        // Tìm dòng tiêu đề
        let headerRowIndex = -1;
        for (let i = 0; i < rawData.length; i++) {
            if (rawData[i].includes('STT') && rawData[i].includes('Họ và tên')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) return;

        const headers = rawData[headerRowIndex];
        const hoVaTenIndex = headers.indexOf('Họ và tên');
        const khoaIndex = headers.indexOf('Khoa');
        const tenHocPhanIndex = headers.indexOf('Tên học phần');
        const lopHocPhanIndex = headers.indexOf('Lớp học phần');
        const doiTuongIndex = headers.indexOf('Đối tượng');
        const soDeIndex = headers.indexOf('Số đề');
        const soCaIndex = headers.indexOf('Số ca');
        const soBaiCham1Index = headers.indexOf('Số bài chấm 1');
        const soBaiCham2Index = headers.indexOf('Số bài chấm 2');
        const tongSoBaiIndex = headers.indexOf('Tổng số bài');
        const soTietQCIndex = headers.indexOf('Số tiết QC');

        let consecutiveEmptyRows = 0;

        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
                consecutiveEmptyRows++;
                if (consecutiveEmptyRows >= 2) break;
                continue;
            }
            consecutiveEmptyRows = 0;

            const hoVaTen = hoVaTenIndex >= 0 ? row[hoVaTenIndex] : '';
            const khoa = khoaIndex >= 0 ? row[khoaIndex] : '';
            const tenHocPhan = tenHocPhanIndex >= 0 ? row[tenHocPhanIndex] : '';
            const lopHocPhan = lopHocPhanIndex >= 0 ? row[lopHocPhanIndex] : '';
            let doiTuong = doiTuongIndex >= 0 ? row[doiTuongIndex] : '';
            const soTietQC = soTietQCIndex >= 0 ? row[soTietQCIndex] : 0;

            // Tự động map đối tượng (hệ đào tạo) từ lớp học phần
            const classCode = getFirstParenthesesContent(lopHocPhan) || "";
            const prefix = extractPrefix(classCode).toUpperCase().trim();
            if (mappingMap.has(prefix)) {
                doiTuong = mappingMap.get(prefix) || doiTuong;
            }
            if (!doiTuong) {
                doiTuong = 'ĐH Đóng học phí';
            }

            const base = { hoVaTen, khoa, tenHocPhan, lopHocPhan, doiTuong, soTietQC };

            if (sheetName === 'Ra đề' && soDeIndex >= 0 && row[soDeIndex] !== null) {
                data.raDe.push({ ...base, soDe: row[soDeIndex], Type: "Ra Đề" });
            } else if (sheetName === 'Coi thi' && soCaIndex >= 0 && row[soCaIndex] !== null) {
                data.coiThi.push({ ...base, soCa: row[soCaIndex], Type: "Coi Thi" });
            } else if (sheetName === 'Chấm thi' && (soBaiCham1Index >= 0 || soBaiCham2Index >= 0)) {
                data.chamThi.push({
                    ...base,
                    soBaiCham1: soBaiCham1Index >= 0 ? row[soBaiCham1Index] : 0,
                    soBaiCham2: soBaiCham2Index >= 0 ? row[soBaiCham2Index] : 0,
                    tongSoBai: tongSoBaiIndex >= 0 ? row[tongSoBaiIndex] : 0,
                    Type: "Chấm Thi"
                });
            }
        }
    });

    return data;
};

/**
 * Import dữ liệu đã parse vào DB
 */
const importToDB = async (workloadData, { ki, nam, user }) => {
    let connection;
    try {
        connection = await createPoolConnection();
        await connection.beginTransaction();

        const insertValues = [];

        // 1. Lấy toàn bộ cấu hình kitubatdau để đối chiếu nhanh
        const prefixQuery = `
            SELECT 
              k.viet_tat,
              k.doi_tuong,
              h.id AS he_dao_tao_id,
              h.he_dao_tao
            FROM kitubatdau k
            LEFT JOIN he_dao_tao h ON CAST(k.gia_tri_so_sanh AS UNSIGNED) = h.id;
        `;
        const [configs] = await connection.query(prefixQuery);

        const mappingMap = new Map();
        const nameMappingMap = new Map();
        for (const config of configs) {
            if (config.viet_tat) {
                mappingMap.set(config.viet_tat.toUpperCase().trim(), {
                    doi_tuong: config.doi_tuong,
                    he_dao_tao_id: config.he_dao_tao_id
                });
            }
            if (config.he_dao_tao) {
                nameMappingMap.set(config.he_dao_tao.toUpperCase().trim(), {
                    doi_tuong: config.doi_tuong,
                    he_dao_tao_id: config.he_dao_tao_id
                });
            }
        }

        const getFirstParenthesesContent = (str) => {
            const match = String(str || "").match(/\(([^)]+)\)/);
            return match ? match[1] : str;
        };

        const extractPrefix = (classCode) => {
            const match = String(classCode || "").trim().match(/^[A-Za-z]+/);
            return match ? match[0] : "";
        };
        
        const processGroup = (items, type) => {
            for (const item of items) {
                let baicham1 = 0, baicham2 = 0, tongso = 0;
                if (type === "Ra đề") tongso = item.soDe || 0;
                else if (type === "Coi thi") tongso = item.soCa || 0;
                else if (type === "Chấm thi") {
                    baicham1 = item.soBaiCham1 || 0;
                    baicham2 = item.soBaiCham2 || 0;
                    tongso = item.tongSoBai || 0;
                }

                // Đối chiếu ký tự bắt đầu của lớp học phần
                const classCode = getFirstParenthesesContent(item.lopHocPhan) || "";
                const prefix = extractPrefix(classCode).toUpperCase().trim();
                let mappedDoiTuong = "Đóng HP";
                let mappedHeDaoTaoId = 1;

                if (mappingMap.has(prefix)) {
                    const matchConfig = mappingMap.get(prefix);
                    mappedDoiTuong = matchConfig.doi_tuong;
                    mappedHeDaoTaoId = matchConfig.he_dao_tao_id;
                } else if (item.doiTuong) {
                    const normalizedDoiTuong = String(item.doiTuong).toUpperCase().trim();
                    if (nameMappingMap.has(normalizedDoiTuong)) {
                        const matchConfig = nameMappingMap.get(normalizedDoiTuong);
                        mappedDoiTuong = matchConfig.doi_tuong;
                        mappedHeDaoTaoId = matchConfig.he_dao_tao_id;
                    } else {
                        mappedDoiTuong = item.doiTuong;
                    }
                }

                insertValues.push([
                    item.hoVaTen,
                    item.khoa,
                    ki,
                    nam,
                    type,
                    item.tenHocPhan,
                    item.lopHocPhan,
                    mappedDoiTuong,
                    baicham1,
                    baicham2,
                    tongso,
                    item.soTietQC || 0,
                    0, // khoa_duyet
                    0, // khao_thi_duyet
                    user.id,
                    mappedHeDaoTaoId
                ]);
            }
        };

        processGroup(workloadData.raDe, "Ra đề");
        processGroup(workloadData.coiThi, "Coi thi");
        processGroup(workloadData.chamThi, "Chấm thi");

        if (insertValues.length > 0) {
            await repo.insertMany(connection, insertValues);
        }

        await connection.commit();
        await LogService.logChange(user.id, user.userName, "Import KTHP từ Excel", `Import thành công ${insertValues.length} bản ghi - Học kỳ ${ki}, Năm học ${nam}`);
        
        return insertValues.length;
    } catch (error) {
        if (connection) await connection.rollback();
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    parseExcelFile,
    importToDB
};
````

## File: src/services/vuotgio_v2/shared_excel/core/pdf.converter.js
````javascript
/**
 * PDF Converter - LibreOffice PDF conversion utilities
 */

const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

class PDFConverter {
  static SOFFICE_CANDIDATES = [
    process.env.LIBREOFFICE_PATH,
    // Linux
    "/usr/bin/soffice",
    "/usr/local/bin/soffice",
    // Windows
    "D:\\Libre\\program\\soffice.exe",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ].filter(Boolean);

  /**
   * Get available LibreOffice path
   */
  static getAvailableSofficePath() {
    for (const candidate of this.SOFFICE_CANDIDATES) {
      try {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      } catch (_error) {
        // Ignore invalid candidate path
      }
    }
    return null;
  }

  /**
   * Convert Excel buffer to PDF buffer
   */
  static async convertXlsxBufferToPdf(xlsxBuffer) {
    const sofficePath = this.getAvailableSofficePath();
    if (!sofficePath) {
      throw new Error("Không tìm thấy LibreOffice (soffice.exe) để render preview PDF");
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vg-preview-"));
    const xlsxPath = path.join(tempDir, "preview.xlsx");
    const pdfPath = path.join(tempDir, "preview.pdf");

    try {
      fs.writeFileSync(xlsxPath, xlsxBuffer);

      await execFileAsync(
        sofficePath,
        ["--headless", "--convert-to", "pdf", "--outdir", tempDir, xlsxPath],
        { timeout: 60000 }
      );

      if (!fs.existsSync(pdfPath)) {
        throw new Error("LibreOffice không sinh ra file PDF");
      }

      return fs.readFileSync(pdfPath);
    } finally {
      try {
        if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
        if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (_cleanupError) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Wrap stage error for better debugging
   */
  static wrapStageError(stage, error) {
    const originalMessage = error?.message || String(error);
    const wrapped = new Error(`[pdf-converter:${stage}] ${originalMessage}`);
    wrapped.stage = stage;
    wrapped.cause = error;
    return wrapped;
  }
}

module.exports = PDFConverter;
````

## File: src/views/vuotgio_v2/vuotgio.huongDanDATN.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hướng Dẫn Đồ Án Tốt Nghiệp - Vượt Giờ V2</title>

    <!-- Bootstrap 5 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />

    <!-- SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

    <!-- Custom Styles -->
    <link rel="stylesheet" href="/css/admin.css" />
    <link rel="stylesheet" href="/css/styles.css" />
    <link rel="stylesheet" href="/css/table.css" />
    
    <style>
        .vuotgio-v2-container {
            padding: 20px;
        }
        .page-header {
            margin-bottom: 20px;
        }
        .page-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #333;
        }
        .grid-container {
            background: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .grid-toolbar {
            display: flex;
            gap: 15px;
            align-items: flex-end;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        .search {
            width: 250px;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            height: 50px;
        }
        /* Bỏ CSS cũ */
        .total-row {
            background-color: #e9ecef;
            font-weight: bold;
        }
        .total-label {
            margin-left: auto;
            margin-right: 0;
            font-family: Arial, sans-serif;
            font-size: 16px;
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 8px;
            width: fit-content;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            display: block;
            margin-top: 15px;
        }
        .total-label label {
            font-weight: bold;
            color: #fff;
            margin-right: 8px;
            padding: 5px 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: #28a745;
        }
        .btn-view {
            padding: 4px 10px;
            font-size: 0.85rem;
            cursor: pointer;
        }
        .table th, .table td {
            vertical-align: middle;
            text-align: center;
        }

        /* Summary Popup Styles */
        .summary {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.9);
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .summary.collapsed {
            transform: translateY(calc(100% + 10px));
        }

        .summary-toggle {
            position: absolute;
            top: -35px;
            right: 0;
            width: 35px;
            height: 35px;
            background: #198754;
            color: white;
            border: none;
            border-radius: 10px 0 0 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }

        .summary.collapsed .summary-toggle {
            transform: translateY(5px);
            border-radius: 10px 10px 0 0;
            right: 10px;
            top: -40px;
        }

        .summary-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            min-width: 200px;
            padding: 4px 0;
        }

        .summary-box .label {
            color: #516078;
            font-size: 0.85rem;
            font-weight: 500;
        }

        .summary-box .value {
            color: #198754;
            font-weight: 700;
            font-size: 1rem;
        }
    </style>
</head>

<body>
    <%- include('../header') %>

    <div class="vuotgio-v2-container">
        <!-- Page Header -->
        <div class="summary" id="summaryBox">
            <button class="summary-toggle" id="btnToggleSummary" title="Ẩn/Hiện tổng kết">
                <i class="bi bi-chevron-down"></i>
            </button>
            <div class="summary-box">
                <div class="label">Tổng giảng viên</div>
                <div class="value" id="totalTeachers">0</div>
            </div>
            <div class="summary-box">
                <div class="label">Tổng sinh viên</div>
                <div class="value" id="totalStudents">0</div>
            </div>
            <div class="summary-box">
                <div class="label">Tổng số tiết</div>
                <div class="value" id="totalHours">0</div>
            </div>
        </div>

        <!-- Grid Section -->
        <div class="grid-container">
            <!-- Toolbar: Dropdowns + Buttons -->
            <div class="grid-toolbar">
                <select class="selectop" id="dotFilter" style="width: 100px; margin: 0; box-shadow: none;">
                    <!-- <option value="">Chọn đợt</option> -->
                    <option value="1">Đợt 1</option>
                    <option value="2">Đợt 2</option>
                </select>
                <select class="selectop" id="kiFilter" style="width: 100px; margin: 0; box-shadow: none;">
                    <!-- <option value="">Chọn kì</option> -->
                    <option value="1">Kì 1</option>
                    <option value="2">Kì 2</option>
                </select>
                <select class="selectop" id="namHocFilter" style="width: 130px; margin: 0; box-shadow: none;">
                    <option value="">Chọn năm học</option>
                </select>
                <select class="selectop" id="khoaFilter" style="width: 150px; margin: 0; box-shadow: none;">
                    <option value="ALL">Tất cả khoa</option>
                </select>
                <select class="selectop" id="heDaoTaoFilter" style="width: 150px; margin: 0; box-shadow: none;">
                    <option value="">Chọn hệ ĐT</option>
                </select>
                <button id="loadDataBtn" class="btn btn-primary" style="height: 45px; width: 130px; margin: 0;">
                    Hiển thị
                </button>
            </div>

            <!-- Filter Row -->
            <div class="d-flex my-3" style="height: 70px">
                <input type="text" id="filterGiangVien" placeholder="Tìm theo tên giảng viên" class="form-control m-2 search" />
            </div>

            <!-- Table Section -->
            <div id="renderInfo">
                <table class="table table-bordered table-hover text-center" style="width: 100%">
                    <thead class="table-light">
                        <tr>
                            <th style="width: 50px;">STT</th>
                            <th style="width: 180px;">Giảng viên</th>
                            <th style="width: 100px;">Khoa</th>
                            <th style="width: 180px;">Sinh viên</th>
                            <th style="width: 80px;">Khóa</th>
                            <th style="width: 250px;">Tên đề tài</th>
                            <th style="width: 70px;">Số tiết</th>
                            <th style="width: 70px;">Chi tiết</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        <!-- Dữ liệu sẽ được chèn vào đây -->
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="6" class="text-end"><strong>Tổng số tiết:</strong></td>
                            <td id="tongSoTiet"><strong>0</strong></td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    </div>

    <!-- Modal Chi Tiết -->
    <div class="modal fade" id="chiTietModal" tabindex="-1">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        <i class="fas fa-list me-2"></i>
                        Chi tiết hướng dẫn ĐATN - <span id="modalGiangVien"></span>
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="table-responsive">
                        <table class="table table-bordered table-striped text-center">
                            <thead class="table-light">
                                <tr>
                                    <th style="width: 40px;">TT</th>
                                    <th style="width: 150px;">Sinh viên</th>
                                    <th style="width: 80px;">Mã SV</th>
                                    <th style="width: 60px;">Khóa</th>
                                    <th style="width: 120px;">Ngành</th>
                                    <th style="width: 280px;">Tên đề tài</th>
                                    <th style="width: 90px;">Ngày BĐ</th>
                                    <th style="width: 90px;">Ngày KT</th>
                                    <th style="width: 70px;">Số tiết</th>
                                </tr>
                            </thead>
                            <tbody id="chiTietTableBody">
                                <!-- Dữ liệu chi tiết sẽ được chèn vào đây -->
                            </tbody>
                            <tfoot>
                                <tr class="total-row">
                                    <td colspan="8" class="text-end"><strong>Tổng số tiết:</strong></td>
                                    <td id="modalTongSoTiet"><strong>0</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>

    <script src="/js/vuotgio_v2/huongDanDATN/index.js"></script>
</body>

</html>
````

## File: src/controllers/vuotgio_v2/duyetKTHP.controller.js
````javascript
module.exports = require("../../services/vuotgio_v2/kthp.service");
````

## File: src/controllers/vuotgio_v2/huongDanDATN.controller.js
````javascript
/**
 * VUOT GIO V2 - Hướng Dẫn Đồ Án Tốt Nghiệp Controller
 * Date: 2026-02-03
 */

const service = require("../../services/vuotgio_v2/datn.service");

/**
 * Lấy danh sách đồ án tốt nghiệp
 */
const getTable = async (req, res) => {
    try {
        const filters = {
            NamHoc: req.query.NamHoc,
            dot: req.query.Dot,
            ki: req.query.Ki,
            khoa: req.query.Khoa,
            heDaoTao: req.query.HeDaoTao
        };

        const result = await service.getTable(filters);
        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Error in getTable huongDanDATN:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy dữ liệu" });
    }
};

/**
 * Lấy chi tiết đồ án của một giảng viên
 */
const getChiTiet = async (req, res) => {
    try {
        const giangVien = decodeURIComponent(req.params.GiangVien);
        const params = {
            giangVien,
            namHoc: req.query.NamHoc,
            dot: req.query.Dot,
            ki: req.query.Ki,
            khoa: req.query.Khoa,
            heDaoTao: req.query.HeDaoTao
        };

        const result = await service.getChiTiet(params);
        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Error in getChiTiet huongDanDATN:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy chi tiết" });
    }
};

module.exports = {
    getTable,
    getChiTiet
};
````

## File: src/controllers/vuotgio_v2/lopNgoaiQCImport.controller.js
````javascript
module.exports = require("../../services/vuotgio_v2/lnqcImport.service");
````

## File: src/controllers/vuotgio_v2/preview.controller.js
````javascript
/**
 * VUOT GIO V2 - Preview Controller
 * Date: 2026-04-28
 */

const tongHopService = require("../../services/vuotgio_v2/tongHop.service");
const templatePreviewService = require("../../services/vuotgio_v2/templatePreview.service");

/**
 * Lấy dữ liệu Preview (PDF/Excel view)
 */
const getPreviewData = async (req, res) => {
    const { MaGV } = req.params;
    const { namHoc } = req.query;

    if (!namHoc || !MaGV) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học hoặc Giảng viên" });
    }

    try {
        const { format = 'pdf' } = req.query;

        // 1. Lấy SDO gốc từ bộ lõi Tổng hợp
        const sdo = await tongHopService.getAtomicSDO(namHoc, decodeURIComponent(MaGV));
        if (!sdo) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu giảng viên" });

        // Log chi tiết số lượng bản ghi để debug
        console.info(`[Preview] GV: ${sdo.giangVien} (${MaGV}), Năm học: ${namHoc}`);
        console.info(` - Giảng dạy: ${sdo.raw.giangDay.length}`);
        console.info(` - Lớp ngoài QC: ${sdo.raw.lopNgoaiQC.length}`);
        console.info(` - KTHP: ${sdo.raw.kthp.length}`);
        console.info(` - Đồ án: ${sdo.raw.doAn.length}`);
        console.info(` - Hướng dẫn TQ: ${sdo.raw.huongDanThamQuan?.length || sdo.raw.hdtq?.length || 0}`);
        console.info(` - NCKH: ${sdo.raw.nckhRecords.length}`);

        // 2. Chuyển đổi SDO thành file preview (PDF)
        const previewResult = await templatePreviewService.buildTemplatePreviewPdf({ 
            summary: sdo, 
            namHoc: sdo.nam_hoc 
        });

        res.json({
            success: true,
            data: {
                ...sdo,
                intermediateJson: previewResult.intermediateJson,
                pdfBase64: previewResult.pdfBase64,
                warnings: previewResult.warnings || []
            }
        });
    } catch (error) {
        console.error("Error in getPreviewData:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Lấy preview theo khoa (một sheet tổng hợp cho cả khoa)
 */
const getPreviewKhoaData = async (req, res) => {
    const { khoa } = req.params;
    const { namHoc } = req.query;

    if (!namHoc || !khoa) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học hoặc Khoa" });
    }

    try {
        const khoaDecoded = decodeURIComponent(khoa);
        const summaries = await tongHopService.getCollectionSDODetail(namHoc, khoaDecoded);

        if (!summaries || summaries.length === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu cho khoa này" });
        }

        const previewResult = await templatePreviewService.buildDepartmentPreviewPdf({
            summaries,
            khoa: khoaDecoded,
            namHoc,
        });

        res.json({
            success: true,
            data: {
                pdfBase64: previewResult.pdfBase64,
                warnings: previewResult.warnings || [],
                meta: previewResult.meta,
            },
        });
    } catch (error) {
        console.error("Error in getPreviewKhoaData:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Lấy preview tổng hợp theo khoa (consolidated export với nhiều sheet)
 */
const getConsolidatedPreviewData = async (req, res) => {
    const { namHoc } = req.query;

    if (!namHoc) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });
    }

    try {
        console.info(`[ConsolidatedPreview] Năm học: ${namHoc}`);

        const previewResult = await templatePreviewService.buildConsolidatedPreviewPdf({
            namHoc,
        });

        res.json({
            success: true,
            data: {
                pdfBase64: previewResult.pdfBase64,
                warnings: previewResult.warnings || [],
                meta: previewResult.meta,
            },
        });
    } catch (error) {
        console.error("Error in getConsolidatedPreviewData:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Lấy dữ liệu tổng hợp theo khoa (structured data, không phải PDF)
 */
const getConsolidatedData = async (req, res) => {
    const { namHoc } = req.query;

    if (!namHoc) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });
    }

    try {
        const consolidatedService = require("../../services/vuotgio_v2/consolidatedExport.service");
        const data = await consolidatedService.getConsolidatedPreviewData(namHoc);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error("Error in getConsolidatedData:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getPreviewData,
    getPreviewKhoaData,
    getConsolidatedPreviewData,
    getConsolidatedData
};
````

## File: src/controllers/vuotgio_v2/themKTHP.controller.js
````javascript
module.exports = require("../../services/vuotgio_v2/kthp.service");
````

## File: src/services/vuotgio_v2/huongDanThamQuan.service.js
````javascript
/**
 * VUOT GIO V2 - Hướng dẫn tham quan Service
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/huongDanThamQuan.repo");
const LogService = require("../../services/logService");

const withConnection = async (connection, callback) => {
    let shouldRelease = false;
    if (!connection) {
        connection = await createPoolConnection();
        shouldRelease = true;
    }
    try {
        return await callback(connection);
    } finally {
        if (shouldRelease && connection) {
            connection.release();
        }
    }
};

const getFilters = async () => withConnection(null, async (connection) => {
    const [namRows] = await connection.query('SELECT NamHoc, trangthai FROM namhoc ORDER BY NamHoc DESC');
    const activeNamHoc = namRows.find(r => r.trangthai === 1)?.NamHoc || null;
    const [khoaRows] = await connection.query('SELECT DISTINCT MaPhongBan FROM phongban WHERE isKhoa = 1 ORDER BY MaPhongBan');
    const [heDaoTaoRows] = await connection.query('SELECT id, he_dao_tao FROM he_dao_tao ORDER BY he_dao_tao');
    const [gvRows] = await connection.query('SELECT id_User, TenNhanVien AS HoTen, MaPhongBan AS Khoa FROM nhanvien ORDER BY TenNhanVien');

    return {
        namHoc: namRows.map(r => r.NamHoc),
        activeNamHoc,
        khoa: khoaRows.map(r => r.MaPhongBan),
        heDaoTao: heDaoTaoRows,
        teachers: gvRows,
        dot: [1, 2],
        ki: [1, 2]
    };
});

const getTable = async (filters) => withConnection(null, async (connection) => {
    return await repo.getTable(connection, filters);
});

const save = async (data, user) => withConnection(null, async (connection) => {
    const so_ngay = parseInt(data.so_ngay) || 0;
    const so_tiet_quy_doi = so_ngay * 3;
    
    const insertData = { ...data, so_ngay, so_tiet_quy_doi };
    const insertId = await repo.save(connection, insertData);
    
    try {
        await LogService.logChange(user.id, user.name, 'Thêm hướng dẫn tham quan', `ID: ${insertId}`);
    } catch (e) {}
    
    return insertId;
});

const edit = async (id, data, user) => withConnection(null, async (connection) => {
    const so_ngay = parseInt(data.so_ngay) || 0;
    const so_tiet_quy_doi = so_ngay * 3;
    
    const updateData = { ...data, so_ngay, so_tiet_quy_doi };
    await repo.update(connection, id, updateData);
    
    try {
        await LogService.logChange(user.id, user.name, 'Sửa hướng dẫn tham quan', `ID: ${id}`);
    } catch (e) {}
});

const deleteRecord = async (id, user) => withConnection(null, async (connection) => {
    await repo.delete(connection, id);
    try {
        await LogService.logChange(user.id, user.name, 'Xóa hướng dẫn tham quan', `ID: ${id}`);
    } catch (e) {}
});

const batchApprove = async (records, user) => withConnection(null, async (connection) => {
    let count = 0;
    await connection.beginTransaction();
    try {
        for (const record of records) {
            const khoaDuyet = parseInt(record.khoa_duyet) || 0;
            const daoTaoDuyet = parseInt(record.dao_tao_duyet) || 0;
            await repo.updateApproval(connection, record.id, khoaDuyet, daoTaoDuyet);
            count++;
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    }
    try {
        await LogService.logChange(user.id, user.name, 'Batch duyệt hướng dẫn tham quan', `Cập nhật ${count} bản ghi`);
    } catch (e) {}
    return count;
});

module.exports = {
    getFilters,
    getTable,
    save,
    edit,
    batchApprove,
    delete: deleteRecord
};
````

## File: src/services/vuotgio_v2/thongKe.service.js
````javascript
/**
 * VUOT GIO V2 - Thống Kê Service
 * Projection mỏng từ Collection SDO của TongHopService
 */

const tongHopService = require("./tongHop.service");
const { NON_KHOA_GROUP_CODE } = require("../../repositories/vuotgio_v2/tongHop.repo");

const NON_KHOA_GROUP_NAME = "Ban giám đốc & các phòng";

const getThongKeKhoa = async (namHoc, khoaId) => {
    // Nếu khoaId là ALL hoặc không có, chúng ta sẽ lấy toàn trường và nhóm theo Khoa
    const isAll = !khoaId || khoaId === "ALL";
    
    // Gọi SDO gốc từ TongHopService
    const sdoList = await tongHopService.getCollectionSDO(namHoc, isAll ? "ALL" : khoaId);
    
    if (isAll) {
        // Nhóm theo Khoa/Phòng
        const groupMap = new Map();
        
        sdoList.forEach(r => {
            // Kiểm tra cả maKhoa (alias) và MaPhongBan (tên gốc trong DB)
            const isNonKhoa = Number(r.isKhoa) === 0;
            const unitCode = isNonKhoa
                ? NON_KHOA_GROUP_CODE
                : (r.maKhoa || r.MaPhongBan || "KHAC");
            const key = unitCode;
            
            if (!groupMap.has(key)) {
                groupMap.set(key, {
                    maKhoa: unitCode,
                    tenKhoa: isNonKhoa ? NON_KHOA_GROUP_NAME : (r.khoa || "Khác/Chưa xác định"),
                    tongSoGV: 0,
                    soTietGiangDay: 0,
                    soTietNgoaiQC: 0,
                    soTietKTHP: 0,
                    soTietDoAn: 0,
                    soTietHDTQ: 0,
                    soTietNCKH: 0,
                    tongThucHien: 0,
                    tongVuot: 0,
                    thanhToan: 0,
                    thieuTietGiangDay: 0,
                    thieuNCKH: 0
                });
            }
            
            const g = groupMap.get(key);
            g.tongSoGV++;
            g.soTietGiangDay += (r.soTietGiangDay || 0);
            g.soTietNgoaiQC += (r.soTietNgoaiQC || 0);
            g.soTietKTHP += (r.soTietKTHP || 0);
            g.soTietDoAn += (r.soTietDoAn || 0);
            g.soTietHDTQ += (r.soTietHDTQ || 0);
            g.soTietNCKH += (r.soTietNCKH || 0);
            g.tongThucHien += (r.tongThucHien || 0);
            g.tongVuot += (r.tongVuot || 0);
            g.thanhToan += (r.thanhToan || 0);
            g.thieuTietGiangDay += (r.thieuTietGiangDay || 0);
            g.thieuNCKH += (r.thieuNCKH || 0);
        });

        const dataByKhoa = Array.from(groupMap.values()).sort((a, b) => b.tongThucHien - a.tongThucHien);
        
        const summary = {
            tongSoGV: sdoList.length,
            tongSoKhoa: dataByKhoa.length,
            tongThucHien: sdoList.reduce((s, r) => s + (r.tongThucHien || 0), 0),
            tongVuot: sdoList.reduce((s, r) => s + (r.tongVuot || 0), 0),
            tongThanhToan: sdoList.reduce((s, r) => s + (r.thanhToan || 0), 0)
        };

        return {
            data: dataByKhoa,
            summary
        };
    } else {
        // Nếu đã chọn 1 khoa cụ thể, trả về danh sách GV của khoa đó (giữ logic cũ)
        const summary = {
            tongSoGV: sdoList.length,
            tongThucHien: sdoList.reduce((s, r) => s + (r.tongThucHien || 0), 0),
            tongVuot: sdoList.reduce((s, r) => s + (r.tongVuot || 0), 0),
            tongThanhToan: sdoList.reduce((s, r) => s + (r.thanhToan || 0), 0)
        };

        return {
            data: sdoList,
            summary
        };
    }
};

module.exports = {
    getThongKeKhoa
};
````

## File: src/views/vuotgio_v2/vuotgio.file.coiChamRaDe.ejs
````ejs
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Học Viện Kỹ Thuật Mật Mã</title>
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/themFileCuoiKi.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
  <link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css" />
</head>
<body>
  <%- include('../header') %>

  <div class="main-content" style="max-width: 1400px; margin: 0 auto; padding: 0 2rem;">
    <!-- Data Lock Banner -->
    <div id="dataLockBanner" class="alert alert-warning align-items-center mb-3 d-none" role="alert">
      <i class="bi bi-info-circle-fill me-2 fs-5"></i>
      <span id="dataLockMessage"></span>
    </div>

    <h1 class="page-title">
      <i class="fas fa-upload"></i>
      Thêm thông tin coi thi, chấm thi, ra đề của giảng viên các khoa
    </h1>

    <!-- Control Panel -->
    <div class="control-panel">
      <div class="control-row">
        <button class="modern-btn btn-primary-custom" id="chooseFile">
          <i class="fas fa-file-excel"></i>
          Chọn file Excel
        </button>

        <select class="modern-select" id="comboboxki">
          <option value="">Chọn kỳ</option>
        </select>

        <select class="modern-select" id="NamHoc">
          <option value="">Chọn năm học</option>
        </select>

        <button class="modern-btn btn-info-custom" id="import">
          <i class="fas fa-save"></i>
          Lưu file
        </button>

        <button class="modern-btn btn-success-custom" onclick="window.location.href='/v2/vuotgio/them-kthp'">
          <i class="fas fa-pen"></i>
          Thêm thủ công
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <ul class="nav nav-tabs custom-nav-tabs" id="workloadTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="rade-tab" data-bs-toggle="tab" data-bs-target="#rade" type="button" role="tab">
          <i class="fas fa-edit"></i> Ra Đề
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="coithi-tab" data-bs-toggle="tab" data-bs-target="#coithi" type="button" role="tab">
          <i class="fas fa-eye"></i> Coi Thi
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="chamthi-tab" data-bs-toggle="tab" data-bs-target="#chamthi" type="button" role="tab">
          <i class="fas fa-check-circle"></i> Chấm Thi
        </button>
      </li>
    </ul>

    <!-- Tab Content -->
    <div class="tab-content" id="workloadTabContent">
      <div class="tab-pane fade show active" id="rade" role="tabpanel">
        <div id="raDeTableContainer" class="data-table-wrapper">
          <div class="empty-state">
            <i class="fas fa-table"></i>
            <h3>Chưa có dữ liệu</h3>
            <p>Vui lòng tải lên file Excel</p>
          </div>
        </div>
      </div>
      <div class="tab-pane fade" id="coithi" role="tabpanel">
        <div id="coiThiTableContainer" class="data-table-wrapper">
          <div class="empty-state">
            <i class="fas fa-table"></i>
            <h3>Chưa có dữ liệu</h3>
            <p>Vui lòng tải lên file Excel</p>
          </div>
        </div>
      </div>
      <div class="tab-pane fade" id="chamthi" role="tabpanel">
        <div id="chamThiTableContainer" class="data-table-wrapper">
          <div class="empty-state">
            <i class="fas fa-table"></i>
            <h3>Chưa có dữ liệu</h3>
            <p>Vui lòng tải lên file Excel</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal xác nhận -->
  <div id="action-modal" style="display: none">
    <div class="modal-overlay">
      <div class="modal-content-custom">
        <div style="font-size: 4rem; margin-bottom: 1.5rem;">
          <i class="fas fa-exclamation-triangle" style="background: var(--warning-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"></i>
        </div>
        <h3 style="color: var(--text-primary); margin-bottom: 1rem; font-weight: 700;">Xác nhận thao tác</h3>
        <p id="modal-message" style="font-size: 1.1rem; color: var(--text-secondary); margin-bottom: 2rem; line-height: 1.6;">
          Đây là nội dung của modal.
        </p>
        <div class="modal-buttons">
          <button id="btn-delete" class="modal-btn btn-delete-modal">
            <i class="fas fa-trash"></i> Xóa
          </button>
          <button id="btn-append" class="modal-btn btn-append-modal">
            <i class="fas fa-plus"></i> Chèn
          </button>
          <button id="btn-cancel" class="modal-btn btn-cancel-modal">
            <i class="fas fa-times"></i> Hủy
          </button>
        </div>
      </div>
    </div>
  </div>

  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>
  <script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
  <script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>
  <script src="/js/ketthuchocphan/themfilecuoiki.js"></script>
  <script src="/js/moigiang/href.js"></script>
  <script src="/js/moigiang/getdata.js"></script>
  <script src="/js/moigiang/hideBtn.js"></script>

  <!-- Data Lock Check -->
  <script>
  (function() {
      const namHocSelect = document.getElementById('NamHoc');
      const banner = document.getElementById('dataLockBanner');
      const bannerMsg = document.getElementById('dataLockMessage');

      function checkLockStatus() {
          const namHoc = namHocSelect ? namHocSelect.value : '';
          if (!namHoc) {
              banner.classList.add('d-none');
              banner.classList.remove('d-flex');
              enableButtons();
              return;
          }
          fetch('/v2/vuotgio/trang-thai-khoa?namHoc=' + encodeURIComponent(namHoc))
              .then(function(res) { return res.json(); })
              .then(function(data) {
                  if (data.success && data.locked) {
                      var info = data.lockInfo;
                      bannerMsg.textContent = 'Dữ liệu năm học ' + namHoc + ' đã được lưu bởi ' + info.nguoi_khoa + ' vào ' + info.ngay_khoa + '. Không thể chỉnh sửa.';
                      banner.classList.remove('d-none');
                      banner.classList.add('d-flex');
                      disableButtons();
                  } else {
                      banner.classList.add('d-none');
                      banner.classList.remove('d-flex');
                      enableButtons();
                  }
              })
              .catch(function() {
                  banner.classList.add('d-none');
                  banner.classList.remove('d-flex');
                  enableButtons();
              });
      }

      function disableButtons() {
          var btns = document.querySelectorAll('#chooseFile, #import, #btn-delete, #btn-append');
          btns.forEach(function(btn) {
              btn.disabled = true;
              btn.style.opacity = '0.5';
              btn.style.pointerEvents = 'none';
          });
      }

      function enableButtons() {
          var btns = document.querySelectorAll('#chooseFile, #import, #btn-delete, #btn-append');
          btns.forEach(function(btn) {
              btn.disabled = false;
              btn.style.opacity = '';
              btn.style.pointerEvents = '';
          });
      }

      if (namHocSelect) {
          namHocSelect.addEventListener('change', checkLockStatus);
      }
      setTimeout(checkLockStatus, 500);
  })();
  </script>
</body>
</html>
````

## File: src/views/vuotgio_v2/vuotgio.huongDanThamQuan.add.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thêm Hướng Dẫn Tham Quan - Vượt Giờ V2</title>

    <!-- Bootstrap 5 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />

    <!-- SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

    <!-- Custom Styles -->
    <link rel="stylesheet" href="/css/admin.css" />
    <link rel="stylesheet" href="/css/styles.css" />
    
    <style>
        .page-wrap {
            padding: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }
        .panel {
            background: #fff;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            margin-bottom: 20px;
        }
        .page-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 24px;
            color: #1f4ea8;
        }
        .section-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 24px;
            border-bottom: 2px solid #e9ecef;
        }
        .tab-btn {
            padding: 12px 24px;
            background: transparent;
            border: none;
            border-bottom: 3px solid transparent;
            font-weight: 500;
            color: #6c757d;
            cursor: pointer;
            transition: all 0.3s;
        }
        .tab-btn:hover {
            color: #1f4ea8;
        }
        .tab-btn.active {
            color: #1f4ea8;
            border-bottom-color: #1f4ea8;
        }
        .tab-content {
            display: none;
        }
        .tab-content.active {
            display: block;
        }
        .form-section {
            margin-bottom: 24px;
        }
        .section-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 16px;
            color: #495057;
            padding-bottom: 8px;
            border-bottom: 2px solid #e9ecef;
        }
        .searchable-select {
            position: relative;
        }
        .searchable-select .dropdown-menu {
            max-height: 200px;
            overflow-y: auto;
            display: none;
            width: 100%;
            position: absolute;
            z-index: 1000;
        }
        .searchable-select .dropdown-menu.show {
            display: block;
        }
        .dropdown-menu .dropdown-item {
            cursor: pointer;
            padding: 8px 12px;
        }
        .dropdown-menu .dropdown-item:hover {
            background-color: #f8f9fa;
        }
        .btn-action {
            height: 45px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 1.5rem;
            gap: 8px;
        }
        .upload-area {
            border: 2px dashed #dee2e6;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            background: #f8f9fa;
            cursor: pointer;
            transition: all 0.3s;
        }
        .upload-area:hover {
            border-color: #1f4ea8;
            background: #e7f1ff;
        }
        .upload-area.dragover {
            border-color: #1f4ea8;
            background: #e7f1ff;
        }
        .upload-icon {
            font-size: 3rem;
            color: #6c757d;
            margin-bottom: 16px;
        }
        .file-info {
            margin-top: 16px;
            padding: 12px;
            background: #fff;
            border-radius: 6px;
            border: 1px solid #dee2e6;
        }
        .coming-soon-badge {
            display: inline-block;
            background: #ffc107;
            color: #000;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-left: 8px;
        }
        .action-buttons {
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            margin-top: 24px;
            padding-top: 24px;
            border-top: 2px solid #e9ecef;
        }

        /* --- Overrides for global CSS interference --- */
        .tab-content.active {
            display: block !important;
            background-color: transparent !important;
            color: inherit !important;
        }

        .tab-btn.active {
            background-color: #1f4ea8 !important;
            color: #fff !important;
            border-bottom-color: #1f4ea8;
            border-radius: 6px 6px 0 0;
        }

        .row {
            flex-wrap: wrap !important;
            align-items: flex-start !important;
        }

        .form-section {
            background: #fff;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e9ecef;
            margin-bottom: 30px;
        }

        .form-select, .form-control {
            margin-top: 0 !important;
            background-color: #fff !important;
            color: #212529 !important;
        }

        .form-label {
            font-weight: 500;
            margin-bottom: 8px;
            color: #495057 !important;
        }
        
        /* Ensure textarea remains readable */
        textarea.form-control {
            background-color: #fff !important;
            color: #212529 !important;
        }
        
        /* Ensure all input types remain readable */
        input.form-control, select.form-select {
            background-color: #fff !important;
            color: #212529 !important;
        }
    </style>
</head>

<body>
    <%- include('../header') %>

    <div class="page-wrap">
        <div class="panel">
            <!-- Data Lock Banner -->
            <div id="dataLockBanner" class="alert alert-warning align-items-center mb-3 d-none" role="alert">
                <i class="bi bi-info-circle-fill me-2 fs-5"></i>
                <span id="dataLockMessage"></span>
            </div>

            <h1 class="page-title">
                <i class="bi bi-plus-circle"></i> Thêm Hướng Dẫn Tham Quan Thực Tế
            </h1>

            <!-- Section Tabs -->
            <div class="section-tabs">
                <button class="tab-btn active" data-tab="form-section">
                    <i class="bi bi-pencil-square"></i> Thêm bằng Form
                </button>
                <button class="tab-btn" data-tab="file-section">
                    <i class="bi bi-file-earmark-arrow-up"></i> Thêm bằng File
                    <span class="coming-soon-badge">Sắp ra mắt</span>
                </button>
            </div>

            <!-- Tab Content: Form Section -->
            <div id="form-section" class="tab-content active">
                <form id="addForm">
                    <!-- Thông tin giảng viên -->
                    <div class="form-section">
                        <div class="section-title">
                            <i class="bi bi-person-badge"></i> Thông tin giảng viên
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Giảng viên <span class="text-danger">*</span></label>
                                <div class="searchable-select">
                                    <input type="text" class="form-control" id="teacherSearch" 
                                           placeholder="Nhập tên giảng viên để tìm kiếm..." 
                                           autocomplete="off" required>
                                    <input type="hidden" id="id_User" name="id_User">
                                    <ul class="dropdown-menu" id="teacherList"></ul>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Khoa <span class="text-danger">*</span></label>
                                <select class="form-select" id="khoa" name="khoa" required>
                                    <option value="">-- Chọn khoa --</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Thông tin thời gian -->
                    <div class="form-section">
                        <div class="section-title">
                            <i class="bi bi-calendar-event"></i> Thông tin thời gian
                        </div>
                        <div class="row g-3">
                            <div class="col-md-4">
                                <label class="form-label">Năm học <span class="text-danger">*</span></label>
                                <select class="form-select" id="nam_hoc" name="nam_hoc" required>
                                    <option value="">-- Chọn năm học --</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Kỳ học <span class="text-danger">*</span></label>
                                <select class="form-select" id="hoc_ky" name="hoc_ky" required>
                                    <option value="1">Kỳ 1</option>
                                    <option value="2">Kỳ 2</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Đợt <span class="text-danger">*</span></label>
                                <select class="form-select" id="dot" name="dot" required>
                                    <option value="1">Đợt 1</option>
                                    <option value="2">Đợt 2</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Thông tin đào tạo -->
                    <div class="form-section">
                        <div class="section-title">
                            <i class="bi bi-book"></i> Thông tin đào tạo
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Hệ đào tạo <span class="text-danger">*</span></label>
                                <select class="form-select" id="he_dao_tao_id" name="he_dao_tao_id" required>
                                    <option value="">-- Chọn hệ đào tạo --</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Ngành học</label>
                                <input type="text" class="form-control" id="nganh_hoc" name="nganh_hoc" 
                                       placeholder="Nhập tên ngành học">
                            </div>
                        </div>
                    </div>

                    <!-- Chi tiết hoạt động -->
                    <div class="form-section">
                        <div class="section-title">
                            <i class="bi bi-clipboard-check"></i> Chi tiết hoạt động
                        </div>
                        <div class="row g-3">
                            <div class="col-md-12">
                                <label class="form-label">Mô tả hoạt động</label>
                                <textarea class="form-control" id="mo_ta_hoat_dong" name="mo_ta_hoat_dong" 
                                          rows="3" placeholder="Mô tả chi tiết về hoạt động tham quan thực tế"></textarea>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Theo quyết định</label>
                                <input type="text" class="form-control" id="theo_qd" name="theo_qd" 
                                       placeholder="Số quyết định">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Số ngày <span class="text-danger">*</span></label>
                                <input type="number" class="form-control" id="so_ngay" name="so_ngay" 
                                       required min="0" step="0.5" placeholder="Nhập số ngày">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Số tiết quy đổi</label>
                                <input type="text" class="form-control bg-light" id="so_tiet_quy_doi" 
                                       name="so_tiet_quy_doi" readonly value="0">
                                <small class="text-muted">
                                    <i class="bi bi-info-circle"></i> Tự động tính: 1 ngày = 3 tiết
                                </small>
                            </div>
                            <div class="col-md-12">
                                <label class="form-label">Ghi chú</label>
                                <textarea class="form-control" id="ghi_chu" name="ghi_chu" 
                                          rows="2" placeholder="Ghi chú thêm (nếu có)"></textarea>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="action-buttons">
                        <a href="/v2/vuotgio/huong-dan-tham-quan" class="btn btn-secondary btn-action">
                            <i class="bi bi-x-circle"></i> Hủy bỏ
                        </a>
                        <button type="reset" class="btn btn-warning btn-action">
                            <i class="bi bi-arrow-counterclockwise"></i> Làm mới
                        </button>
                        <button type="submit" class="btn btn-primary btn-action">
                            <i class="bi bi-save"></i> Lưu dữ liệu
                        </button>
                    </div>
                </form>
            </div>

            <!-- Tab Content: File Section -->
            <div id="file-section" class="tab-content">
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    <strong>Chức năng đang phát triển:</strong> Tính năng thêm dữ liệu bằng file Excel sẽ được triển khai trong phiên bản tiếp theo.
                </div>

                <form id="uploadForm">
                    <div class="form-section">
                        <div class="section-title">
                            <i class="bi bi-cloud-upload"></i> Tải lên file dữ liệu
                        </div>
                        
                        <div class="upload-area" id="uploadArea">
                            <div class="upload-icon">
                                <i class="bi bi-cloud-arrow-up"></i>
                            </div>
                            <h5>Kéo thả file vào đây hoặc click để chọn file</h5>
                            <p class="text-muted">Hỗ trợ: .xlsx, .xls (Tối đa 10MB)</p>
                            <input type="file" id="fileInput" accept=".xlsx,.xls" style="display: none;" disabled>
                        </div>

                        <div id="fileInfo" class="file-info" style="display: none;">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <i class="bi bi-file-earmark-excel text-success"></i>
                                    <strong id="fileName"></strong>
                                    <span class="text-muted" id="fileSize"></span>
                                </div>
                                <button type="button" class="btn btn-sm btn-danger" id="removeFile" disabled>
                                    <i class="bi bi-trash"></i> Xóa
                                </button>
                            </div>
                        </div>

                        <div class="mt-3">
                            <a href="#" class="btn btn-outline-primary btn-action" disabled>
                                <i class="bi bi-download"></i> Tải file mẫu
                            </a>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="action-buttons">
                        <a href="/v2/vuotgio/huong-dan-tham-quan" class="btn btn-secondary btn-action">
                            <i class="bi bi-x-circle"></i> Hủy bỏ
                        </a>
                        <button type="submit" class="btn btn-primary btn-action" disabled>
                            <i class="bi bi-upload"></i> Tải lên và xử lý
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>

    <script src="/js/vuotgio_v2/khoaFilter.utils.js"></script>
    <script src="/js/vuotgio_v2/huongDanThamQuan/add.js"></script>

    <!-- Data Lock Check -->
    <script>
    (function() {
        const namHocSelect = document.getElementById('nam_hoc');
        const banner = document.getElementById('dataLockBanner');
        const bannerMsg = document.getElementById('dataLockMessage');

        function checkLockStatus() {
            const namHoc = namHocSelect ? namHocSelect.value : '';
            if (!namHoc) {
                banner.classList.add('d-none');
                banner.classList.remove('d-flex');
                enableButtons();
                return;
            }
            fetch('/v2/vuotgio/trang-thai-khoa?namHoc=' + encodeURIComponent(namHoc))
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data.success && data.locked) {
                        var info = data.lockInfo;
                        bannerMsg.textContent = 'Dữ liệu năm học ' + namHoc + ' đã được lưu bởi ' + info.nguoi_khoa + ' vào ' + info.ngay_khoa + '. Không thể chỉnh sửa.';
                        banner.classList.remove('d-none');
                        banner.classList.add('d-flex');
                        disableButtons();
                    } else {
                        banner.classList.add('d-none');
                        banner.classList.remove('d-flex');
                        enableButtons();
                    }
                })
                .catch(function() {
                    banner.classList.add('d-none');
                    banner.classList.remove('d-flex');
                    enableButtons();
                });
        }

        function disableButtons() {
            // Disable save button
            var btns = document.querySelectorAll('#addForm button[type="submit"], #uploadForm button[type="submit"]');
            btns.forEach(function(btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            });
        }

        function enableButtons() {
            var btns = document.querySelectorAll('#addForm button[type="submit"], #uploadForm button[type="submit"]');
            btns.forEach(function(btn) {
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            });
        }

        if (namHocSelect) {
            namHocSelect.addEventListener('change', checkLockStatus);
        }
        setTimeout(checkLockStatus, 500);
    })();
    </script>
</body>

</html>
````

## File: src/views/vuotgio_v2/vuotgio.themLopNgoaiQC.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thêm Lớp Ngoài Quy Chuẩn - Vượt Giờ V2</title>

    <!-- Bootstrap 5 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />

    <!-- SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

    <!-- Custom Styles -->
    <link rel="stylesheet" href="/css/admin.css" />
    <link rel="stylesheet" href="/css/styles.css" />

    <!-- AG Grid Styles -->
    <link rel="stylesheet" href="https://unpkg.com/ag-grid-community/styles/ag-grid.css" />
    <link rel="stylesheet" href="https://unpkg.com/ag-grid-community/styles/ag-theme-alpine.css" />

    <style>
        /* CSS cho bảng */
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .table th,
        .table td {
            padding: 10px;
            text-align: left;
            border: 1px solid #dee2e6;
            white-space: normal;
            word-wrap: break-word;
        }

        .table th {
            background-color: #007bff;
            color: white;
            font-weight: bold;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .table tbody tr:nth-child(even) {
            background-color: #f8f9fa;
        }

        .table tbody tr:hover {
            background-color: #e2e6ea;
        }

        .table td {
            vertical-align: middle;
        }

        .bg-custom {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }

        .header-actions {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 10px;
            justify-content: space-between;
        }

        .right {
            margin-top: 20px;
        }

        .btn {
            height: 45px;
            margin-left: 5px;
        }

        .search-input {
            width: 263px;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        .search-container {
            margin-left: 5px;
            margin-bottom: 10px;
        }

        .custom-header {
            display: flex;
            justify-content: center;
            align-items: center;
            text-align: center !important;
        }

        .file-input-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .file-input-wrapper input[type="file"] {
            border: 1px solid #ccc;
            border-radius: 4px;
            padding: 6px;
        }

        .input-full {
            width: 100%;
            margin-top: 5px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }
    </style>
</head>

<body>
    <%- include('../header') %>

        <div class="container-fluid my-4" style="padding-left: 0px">
            <div class="flex-grow-1">
                <!-- Data Lock Banner -->
                <div id="dataLockBanner" class="alert alert-warning align-items-center mb-3 d-none" role="alert">
                    <i class="bi bi-info-circle-fill me-2 fs-5"></i>
                    <span id="dataLockMessage"></span>
                </div>

                <!-- Toolbar -->
                <div class="header-actions">
                    <div class="left">
                        <!-- File import -->
                        <div class="file-input-wrapper">
                            <input type="file" id="fileInput" accept=".xlsx,.xls" style="display: none" />
                            <button class="btn btn-success text-nowrap" id="btn-import" onclick="document.getElementById('fileInput').click()">
                                <i class="bi bi-upload"></i> Import file
                            </button>
                        </div>
                    </div>

                    <div class="right" style="margin-top: 0px">
                        <div class="loc d-flex align-items-center">
                            <!-- Combo box Đợt -->
                            <select class="selectop" id="dotFilter" style="width: 100px;">
                                <option value="1" selected>Đợt 1</option>
                                <option value="2">Đợt 2</option>
                            </select>

                            <!-- Combo box Kì -->
                            <select class="selectop" id="hocKyFilter" style="width: 100px;">
                                <option value="">Kì</option>
                                <option value="1">Kì 1</option>
                                <option value="2">Kì 2</option>
                            </select>

                            <!-- Combo box Năm học -->
                            <select class="selectop" id="namHocFilter" style="width: 130px;">
                                <option value="">Chọn năm học</option>
                            </select>

                            <!-- Combo box Khoa -->
                            <select class="selectop" id="khoaFilter" style="width: 150px;">
                                <option value="ALL" selected>Tất cả khoa</option>
                            </select>

                            <button onclick="getDataTable()" class="btn text-nowrap" id="render"
                                style="margin-top: 17px">
                                Hiển thị
                            </button>
                            <button class="btn text-nowrap btn-warning" id="btn-chot" onclick="handleConfirmToMain()"
                                style="margin-top: 17px">
                                <i class="bi bi-check2-circle"></i> Ban Hành
                            </button>
                            <button class="btn text-nowrap" id="btn-xoa" onclick="handleDeleteAll()"
                                style="margin-top: 17px">
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Search -->
                <div class="search-container">
                    <input type="text" placeholder="Tìm kiếm theo Tên..." class="search search-input"
                        id="find-by-name" />
                </div>

                <!-- AG Grid Table -->
                <div id="table-container" class="ag-theme-alpine" style="height: 500px; width: 100%">
                    <table style="width: 100%; border-collapse: collapse" class="table table-bordered">
                        <thead>
                            <tr id="table-header"></tr>
                        </thead>
                        <tbody id="data-table-body"></tbody>
                    </table>
                </div>

                <!-- Action buttons -->
                <div style="margin-top: 20px">
                    <button class="btn text-nowrap" id="add-row-btn" onclick="addNewRow()">
                        Thêm dòng mới
                    </button>
                </div>

                <div id="no-data-message" class="text-center my-3" style="display: none">
                    Không có dữ liệu để hiển thị.
                </div>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>
        <script src="/js/TKB/ag-grid-community.min.js"></script>

        <!-- Toastify -->
        <script src="https://cdn.jsdelivr.net/npm/toastify-js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css" />

        <!-- Main JS -->
        <script src="/js/vuotgio_v2/khoaFilter.utils.js"></script>
        <script src="/js/vuotgio_v2/lopNgoaiQC/themLopNgoaiQC.js"></script>

        <!-- Data Lock Check -->
        <script>
        (function() {
            const namHocSelect = document.getElementById('namHocFilter');
            const banner = document.getElementById('dataLockBanner');
            const bannerMsg = document.getElementById('dataLockMessage');

            function checkLockStatus() {
                const namHoc = namHocSelect ? namHocSelect.value : '';
                if (!namHoc) {
                    banner.classList.add('d-none');
                    banner.classList.remove('d-flex');
                    enableButtons();
                    return;
                }
                fetch('/v2/vuotgio/trang-thai-khoa?namHoc=' + encodeURIComponent(namHoc))
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.success && data.locked) {
                            var info = data.lockInfo;
                            bannerMsg.textContent = 'Dữ liệu năm học ' + namHoc + ' đã được lưu bởi ' + info.nguoi_khoa + ' vào ' + info.ngay_khoa + '. Không thể chỉnh sửa.';
                            banner.classList.remove('d-none');
                            banner.classList.add('d-flex');
                            disableButtons();
                        } else {
                            banner.classList.add('d-none');
                            banner.classList.remove('d-flex');
                            enableButtons();
                        }
                    })
                    .catch(function() {
                        banner.classList.add('d-none');
                        banner.classList.remove('d-flex');
                        enableButtons();
                    });
            }

            function disableButtons() {
                var btns = document.querySelectorAll('#btn-import, #btn-chot, #btn-xoa, #add-row-btn');
                btns.forEach(function(btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                });
            }

            function enableButtons() {
                var btns = document.querySelectorAll('#btn-import, #btn-chot, #btn-xoa, #add-row-btn');
                btns.forEach(function(btn) {
                    btn.disabled = false;
                    btn.style.opacity = '';
                    btn.style.pointerEvents = '';
                });
            }

            if (namHocSelect) {
                namHocSelect.addEventListener('change', checkLockStatus);
            }
            // Check on page load after a short delay to allow year select to populate
            setTimeout(checkLockStatus, 500);
        })();
        </script>
</body>

</html>
````

## File: src/views/vuotgio_v2/vuotgio.xuatFile.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Xuất File Vượt Giờ V2</title>
    <meta name="description" content="Xuất báo cáo vượt giờ dạng file Excel — kê khai cá nhân hoặc tổng hợp theo khoa/phòng." />

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

    <link rel="stylesheet" href="/css/admin.css" />
    <link rel="stylesheet" href="/css/styles.css" />

    <style>
        :root {
            --color-primary: #1a56db;
            --color-primary-light: #e8f0fe;
            --color-success: #059669;
            --color-success-light: #d1fae5;
            --color-warning: #b45309;
            --color-warning-light: #fef3c7;
            --color-surface: #ffffff;
            --color-bg: #f0f4f8;
            --color-text: #1e293b;
            --color-muted: #64748b;
            --color-border: #e2e8f0;
            --color-typeA: #1a56db;
            --color-typeA-light: #dbeafe;
            --color-typeB: #7c3aed;
            --color-typeB-light: #ede9fe;
            --radius-card: 16px;
            --radius-sm: 8px;
            --shadow-card: 0 4px 24px rgba(0,0,0,.08);
            --transition: all .22s ease;
        }

        * { font-family: 'Inter', sans-serif; }
        body { background: var(--color-bg); color: var(--color-text); }

        /* ── Page layout ── */
        .xf-page {
            padding: 32px 24px;
            max-width: 860px;
            margin: 0 auto;
        }

        /* ── Page header ── */
        .xf-page-header {
            display: flex;
            align-items: center;
            gap: 16px;
            margin-bottom: 28px;
        }
        .xf-page-icon {
            width: 52px;
            height: 52px;
            border-radius: 14px;
            background: linear-gradient(135deg, #1a56db, #6366f1);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(26,86,219,.3);
        }
        .xf-page-icon i { font-size: 1.4rem; color: #fff; }
        .xf-page-header h1 {
            font-size: 1.55rem;
            font-weight: 700;
            margin: 0;
            line-height: 1.2;
        }
        .xf-page-header p { color: var(--color-muted); font-size: .9rem; margin: 4px 0 0; }
        .xf-v2-badge {
            display: inline-block;
            background: linear-gradient(135deg, #6366f1, #7c3aed);
            color: #fff;
            padding: 2px 10px;
            border-radius: 20px;
            font-size: .72rem;
            font-weight: 700;
            letter-spacing: .03em;
            margin-left: 8px;
            vertical-align: middle;
        }

        /* ── Info strip ── */
        .xf-info-strip {
            background: var(--color-primary-light);
            border-left: 4px solid var(--color-primary);
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
            padding: 12px 16px;
            font-size: .87rem;
            color: var(--color-primary);
            margin-bottom: 24px;
            display: flex;
            gap: 10px;
            align-items: flex-start;
        }
        .xf-info-strip i { flex-shrink: 0; margin-top: 2px; }

        /* ── Type toggle ── */
        .xf-type-toggle {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
        }
        .xf-type-btn {
            position: relative;
            border: 2px solid var(--color-border);
            border-radius: var(--radius-card);
            padding: 18px 20px;
            cursor: pointer;
            background: var(--color-surface);
            text-align: left;
            transition: var(--transition);
            outline: none;
        }
        .xf-type-btn:hover {
            border-color: #94a3b8;
            box-shadow: var(--shadow-card);
        }
        .xf-type-btn.active-typeA {
            border-color: var(--color-typeA);
            background: var(--color-typeA-light);
        }
        .xf-type-btn.active-typeB {
            border-color: var(--color-typeB);
            background: var(--color-typeB-light);
        }
        .xf-type-icon {
            width: 40px;
            height: 40px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            margin-bottom: 10px;
        }
        .type-icon-A { background: linear-gradient(135deg, #1a56db, #3b82f6); color: #fff; }
        .type-icon-B { background: linear-gradient(135deg, #7c3aed, #a78bfa); color: #fff; }
        .xf-type-btn .type-label { font-weight: 700; font-size: .98rem; }
        .xf-type-btn .type-desc { font-size: .82rem; color: var(--color-muted); margin-top: 4px; line-height: 1.4; }
        .xf-type-btn .check-badge {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: .75rem;
            color: #fff;
        }
        .xf-type-btn.active-typeA .check-badge { display: flex; background: var(--color-typeA); }
        .xf-type-btn.active-typeB .check-badge { display: flex; background: var(--color-typeB); }

        /* ── Card ── */
        .xf-card {
            background: var(--color-surface);
            border-radius: var(--radius-card);
            box-shadow: var(--shadow-card);
            padding: 28px;
            margin-bottom: 20px;
        }
        .xf-section-title {
            font-size: .85rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .06em;
            color: var(--color-muted);
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .xf-section-title i { font-size: 1rem; }

        /* ── Scope radio group for type A ── */
        .xf-scope-group {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }
        .xf-scope-item {
            border: 2px solid var(--color-border);
            border-radius: var(--radius-sm);
            padding: 12px 10px;
            cursor: pointer;
            text-align: center;
            transition: var(--transition);
        }
        .xf-scope-item:hover { border-color: var(--color-primary); }
        .xf-scope-item.selected {
            border-color: var(--color-typeA);
            background: var(--color-typeA-light);
        }
        .xf-scope-item i { font-size: 1.3rem; display: block; margin-bottom: 6px; color: var(--color-muted); }
        .xf-scope-item.selected i { color: var(--color-typeA); }
        .xf-scope-item .scope-label { font-weight: 600; font-size: .84rem; }
        .xf-scope-item .scope-desc { font-size: .74rem; color: var(--color-muted); margin-top: 3px; }

        /* ── Filters ── */
        .xf-filter-row { display: grid; gap: 14px; }
        .xf-filter-row.cols-2 { grid-template-columns: 1fr 1fr; }
        .xf-filter-row.cols-1 { grid-template-columns: 1fr; }
        .xf-label {
            font-size: .84rem;
            font-weight: 600;
            color: var(--color-text);
            margin-bottom: 6px;
        }
        .xf-label .req { color: #ef4444; }
        .xf-select {
            width: 100%;
            padding: 10px 14px;
            border: 2px solid var(--color-border);
            border-radius: var(--radius-sm);
            font-size: .9rem;
            font-family: 'Inter', sans-serif;
            background: var(--color-surface);
            color: var(--color-text);
            transition: var(--transition);
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%2364748b' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 14px center;
            padding-right: 36px;
            cursor: pointer;
        }
        .xf-select:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(26,86,219,.12);
        }
        .xf-form-hint { font-size: .78rem; color: var(--color-muted); margin-top: 5px; }

        /* ── Type B description ── */
        .xf-typeB-note {
            background: var(--color-typeB-light);
            border-left: 4px solid var(--color-typeB);
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
            padding: 12px 16px;
            font-size: .87rem;
            color: #5b21b6;
        }
        .xf-typeB-note strong { font-weight: 700; display: block; margin-bottom: 6px; }
        .xf-typeB-note ul { margin: 0; padding-left: 18px; line-height: 1.8; }

        /* ── Export button ── */
        .xf-btn-export {
            width: 100%;
            padding: 16px;
            font-size: 1rem;
            font-weight: 700;
            border: none;
            border-radius: var(--radius-sm);
            color: #fff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            transition: var(--transition);
            letter-spacing: .02em;
        }
        .xf-btn-export.btn-typeA {
            background: linear-gradient(135deg, #1a56db, #3b82f6);
            box-shadow: 0 4px 14px rgba(26,86,219,.35);
        }
        .xf-btn-export.btn-typeB {
            background: linear-gradient(135deg, #7c3aed, #a78bfa);
            box-shadow: 0 4px 14px rgba(124,58,237,.35);
        }
        .xf-btn-export:hover { transform: translateY(-2px); filter: brightness(1.07); }
        .xf-btn-export:active { transform: none; }

        /* ── Hidden classes ── */
        .hidden { display: none !important; }
    </style>
</head>

<body>
    <%- include('../header') %>

    <div class="xf-page">
        <!-- Page header -->
        <div class="xf-page-header">
            <div class="xf-page-icon">
                <i class="fas fa-file-export"></i>
            </div>
            <div>
                <h1>
                    Xuất File Vượt Giờ
                    <span class="xf-v2-badge">V2</span>
                </h1>
                <p>Xuất báo cáo Excel — kê khai cá nhân hoặc tổng hợp Khoa/Phòng</p>
            </div>
        </div>

        <!-- Info strip -->
        <!-- <div class="xf-info-strip">
            <i class="fas fa-circle-info"></i>
            <span>
                <strong>Vượt Giờ V2:</strong> Không tính tiết giữa kỳ, không bảo lưu NCKH sang năm sau.
                Đơn giá thanh toán: <strong>100,000 VND/tiết</strong>.
            </span>
        </div> -->

        <!-- Report type toggle -->
        <div class="xf-type-toggle">
            <button class="xf-type-btn active-typeA" id="btnTypeA" type="button" onclick="setType('A')">
                <span class="check-badge"><i class="fas fa-check"></i></span>
                <div class="xf-type-icon type-icon-A"><i class="fas fa-user-graduate"></i></div>
                <div class="type-label">Kê khai cá nhân</div>
                <div class="type-desc">Xuất file chi tiết cho từng giảng viên — theo tên, theo khoa hoặc toàn bộ</div>
            </button>
            <button class="xf-type-btn" id="btnTypeB" type="button" onclick="setType('B')">
                <span class="check-badge"><i class="fas fa-check"></i></span>
                <div class="xf-type-icon type-icon-B"><i class="fas fa-layer-group"></i></div>
                <div class="type-label">Tổng hợp Khoa/Phòng</div>
                <div class="type-desc">Workbook đa-sheet: Tổng hợp + Tiền thanh toán + Chi tiết từng Khoa</div>
            </button>
        </div>

        <!-- ╔══════════════════════════════════════╗ -->
        <!--   Type A: Kê khai cá nhân              -->
        <!-- ╚══════════════════════════════════════╝ -->
        <div id="panelTypeA">
            <div class="xf-card">
                <!-- Scope selector -->
                <div class="xf-section-title">
                    <i class="fas fa-sliders"></i> Phạm vi xuất
                </div>
                <div class="xf-scope-group">
                    <div class="xf-scope-item selected" id="scopeAll" onclick="setScope('all')">
                        <i class="fas fa-users"></i>
                        <div class="scope-label">Toàn bộ</div>
                        <div class="scope-desc">Tất cả giảng viên</div>
                    </div>
                    <div class="xf-scope-item" id="scopeKhoa" onclick="setScope('khoa')">
                        <i class="fas fa-building"></i>
                        <div class="scope-label">Theo Khoa</div>
                        <div class="scope-desc">Chọn 1 khoa/phòng</div>
                    </div>
                    <div class="xf-scope-item" id="scopeGV" onclick="setScope('gv')">
                        <i class="fas fa-user"></i>
                        <div class="scope-label">Theo Giảng viên</div>
                        <div class="scope-desc">Chọn 1 người cụ thể</div>
                    </div>
                </div>

                <!-- Năm học -->
                <div class="xf-filter-row cols-1 mb-3">
                    <div>
                        <div class="xf-label">Năm học <span class="req">*</span></div>
                        <select id="namHocA" class="xf-select namHoc"></select>
                    </div>
                </div>

                <!-- Khoa filter (ẩn khi scope = 'all') -->
                <div class="xf-filter-row cols-1 mb-3" id="khoaFilterRow">
                    <div>
                        <div class="xf-label">Khoa / Phòng ban</div>
                        <select id="khoaA" class="xf-select khoa">
                            <option value="ALL">Tất cả các Khoa</option>
                        </select>
                        <div class="xf-form-hint">Chọn khoa để lọc danh sách giảng viên bên dưới</div>
                    </div>
                </div>

                <!-- GV filter (chỉ hiện khi scope = 'gv') -->
                <div class="xf-filter-row cols-1 mb-3 hidden" id="gvFilterRow">
                    <div>
                        <div class="xf-label">Giảng viên <span class="req">*</span></div>
                        <select id="giangVienA" class="xf-select">
                            <option value="">— Chọn giảng viên —</option>
                        </select>
                        <div class="xf-form-hint">Danh sách được lọc theo Khoa đã chọn ở trên</div>
                    </div>
                </div>

                <button class="xf-btn-export btn-typeA" id="btnExportA" onclick="exportTypeA()">
                    <i class="fas fa-download"></i>
                    XUẤT FILE KÊ KHAI
                </button>
            </div>
        </div>

        <!-- ╔══════════════════════════════════════╗ -->
        <!--   Type B: Tổng hợp Khoa/Phòng          -->
        <!-- ╚══════════════════════════════════════╝ -->
        <div id="panelTypeB" class="hidden">
            <div class="xf-card">
                <!-- Note about sheets -->
                <div class="xf-typeB-note mb-4">
                    <strong><i class="fas fa-table me-2"></i>File Excel xuất ra gồm các sheet:</strong>
                    <ul>
                        <li><strong>Sheet TỔNG HỢP</strong> — Danh sách tổng quan tất cả khoa/phòng</li>
                        <li><strong>Sheet TIỀN THANH TOÁN</strong> — Bảng kê tiền chuyển khoản toàn trường</li>
                        <li><strong>Các Sheet Khoa/Phòng</strong> — Chi tiết từng đơn vị</li>
                    </ul>
                </div>

                <!-- Năm học -->
                <div class="xf-section-title">
                    <i class="fas fa-calendar-alt"></i> Thông tin báo cáo
                </div>
                <div class="xf-filter-row cols-1 mb-3">
                    <div>
                        <div class="xf-label">Năm học <span class="req">*</span></div>
                        <select id="namHocB" class="xf-select namHoc"></select>
                        <div class="xf-form-hint">File sẽ bao gồm toàn bộ khoa/phòng có dữ liệu vượt giờ</div>
                    </div>
                </div>

                <button class="xf-btn-export btn-typeB" id="btnExportB" onclick="exportTypeB()">
                    <i class="fas fa-layer-group me-1"></i>
                    XUẤT FILE TỔNG HỢP
                </button>
            </div>
        </div>
    </div>

    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>
    <script src="/js/vuotgio_v2/xuatFile/index.js"></script>
</body>

</html>
````

## File: src/controllers/vuotgio_v2/huongDanThamQuan.controller.js
````javascript
/**
 * VUOT GIO V2 - Hướng Dẫn Tham Quan Thực Tế Controller
 * Date: 2026-04-28
 */

const service = require("../../services/vuotgio_v2/huongDanThamQuan.service");

/**
 * Lấy danh sách bộ lọc cho trang
 */
const getFilters = async (req, res) => {
    try {
        const filters = await service.getFilters();

        // Nếu user thuộc khoa, chỉ trả về khoa của họ trong danh sách filter
        if (req.khoaFilter?.isKhoa && req.khoaFilter.MaPhongBan) {
            filters.khoa = [req.khoaFilter.MaPhongBan];
        }

        res.json({ success: true, data: filters });
    } catch (error) {
        console.error("Error in getFilters huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy bộ lọc" });
    }
};

/**
 * Lấy danh sách dữ liệu với bộ lọc
 */
const getTable = async (req, res) => {
    try {
        const filters = {
            NamHoc: req.query.NamHoc,
            Dot: req.query.Dot,
            KiHoc: req.query.KiHoc,
            Khoa: req.query.Khoa,
            HeDaoTao: req.query.HeDaoTao
        };

        // Enforce khoa filter: nếu user thuộc khoa, ép filter theo MaPhongBan
        if (req.khoaFilter?.isKhoa && req.khoaFilter.MaPhongBan) {
            filters.Khoa = req.khoaFilter.MaPhongBan;
        }

        const data = await service.getTable(filters);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Error in getTable huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy dữ liệu" });
    }
};

/**
 * Lưu bản ghi mới
 */
const save = async (req, res) => {
    const user = {
        id: req.session?.userId || 1,
        name: req.session?.TenNhanVien || 'ADMIN'
    };

    // Enforce khoa filter: nếu user thuộc khoa, ép khoa trong body
    if (req.khoaFilter?.isKhoa && req.khoaFilter.MaPhongBan) {
        req.body.khoa = req.khoaFilter.MaPhongBan;
    }

    try {
        const insertId = await service.save(req.body, user);
        res.status(200).json({ success: true, message: "Thêm thành công!", id: insertId });
    } catch (error) {
        console.error("Error in save huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Cập nhật bản ghi
 */
const edit = async (req, res) => {
    const user = {
        id: req.session?.userId || 1,
        name: req.session?.TenNhanVien || 'ADMIN'
    };
    const { id } = req.params;

    try {
        await service.edit(id, req.body, user);
        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (error) {
        console.error("Error in edit huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Batch approve/unapprove
 */
const batchApprove = async (req, res) => {
    const user = {
        id: req.session?.userId || 1,
        name: req.session?.TenNhanVien || 'ADMIN'
    };
    const records = req.body.updates || req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: "Thiếu dữ liệu cần cập nhật." });
    }

    try {
        const count = await service.batchApprove(records, user);
        res.status(200).json({ success: true, message: `Đã cập nhật ${count} bản ghi!` });
    } catch (error) {
        console.error("Error in batchApprove huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Xóa bản ghi
 */
const deleteRecord = async (req, res) => {
    const user = {
        id: req.session?.userId || 1,
        name: req.session?.TenNhanVien || 'ADMIN'
    };
    const { id } = req.params;

    try {
        await service.delete(id, user);
        res.status(200).json({ success: true, message: "Xóa thành công!" });
    } catch (error) {
        console.error("Error in delete huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getFilters,
    getTable,
    save,
    edit,
    batchApprove,
    delete: deleteRecord
};
````

## File: src/public/js/vuotgio_v2/lopNgoaiQC/themLopNgoaiQC.js
````javascript
/**
 * Thêm Lớp Ngoài Quy Chuẩn - Frontend JS
 * VuotGio V2 - Refactored 2026-03-04
 * 
 * Luồng 2 giai đoạn:
 *   1. Nháp: CRUD trên course_schedule_details (class_type='ngoai_quy_chuan')
 *   2. Chốt: Chuyển sang lopngoaiquychuan (chính thức)
 * 
 * Field names sử dụng convention của course_schedule_details:
 *   course_name, course_code, credit_hours, ll_total, student_quantity,
 *   student_bonus, bonus_time, qc, lecturer, major, he_dao_tao, note, ll_code
 */

// =====================================================
// GLOBAL VARIABLES
// =====================================================

var renderData = [];
var khoaArray = [];
let gridApi;
let gridOptions;
let pendingImportData = null;
let heDaoTaoList = [];
let heDaoTaoMap = {};

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('[LopNgoaiQC] Init - 2-phase draft flow');
    loadNamHocOptions();
    loadKhoaOptions();
    await preloadHeDaoTao();

    const searchInput = document.getElementById('find-by-name');
    if (searchInput) {
        searchInput.addEventListener('input', function () {
            if (gridApi) {
                gridApi.setQuickFilter(this.value);
            }
        });
    }
});

// =====================================================
// HELPER - Lấy filter values
// =====================================================

function getFilterValues() {
    return {
        dot: document.getElementById('dotFilter').value || '1',
        ki_hoc: document.getElementById('hocKyFilter').value || '1',
        nam_hoc: document.getElementById('namHocFilter').value,
        major: document.getElementById('khoaFilter').value || 'ALL'
    };
}

// =====================================================
// LOAD DROPDOWN OPTIONS
// =====================================================

async function loadNamHocOptions() {
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();
        const select = document.getElementById('namHocFilter');
        select.innerHTML = '<option value="">Chọn năm học</option>';

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.NamHoc;
            option.textContent = item.NamHoc;
            if (item.trangthai === 1) option.selected = true;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading nam hoc:', error);
    }
}

async function loadKhoaOptions() {
    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        const select = document.getElementById('khoaFilter');
        select.innerHTML = '<option value="ALL" selected>ALL</option>';

        khoaArray = data.map(d => d.MaPhongBan);

        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
            select.appendChild(option);
        });

        // Enforce khoa filter: nếu user thuộc khoa, lock dropdown
        if (typeof KhoaFilterUtils !== 'undefined') {
            KhoaFilterUtils.applyKhoaFilter(select);
        }
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

async function preloadHeDaoTao() {
    const CACHE_KEY = 'HE_DAO_TAO_CACHE';
    heDaoTaoList = JSON.parse(localStorage.getItem(CACHE_KEY)) || [];
    heDaoTaoMap = {};

    try {
        const res = await fetch('/api/gvm/v1/he-dao-tao');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
            heDaoTaoList = json.data.map(item => ({
                id: item.id,
                tenHe: item.he_dao_tao
            }));
            localStorage.setItem(CACHE_KEY, JSON.stringify(heDaoTaoList));
        }
    } catch (err) {
        console.warn('API lỗi, fallback cache', err);
    }

    heDaoTaoList.forEach(item => {
        heDaoTaoMap[item.id] = item.tenHe;
    });
}

// =====================================================
// AG GRID - LOAD & RENDER TABLE
// =====================================================

async function getDataTable() {
    const { dot, ki_hoc, nam_hoc, major } = getFilterValues();

    if (!nam_hoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        return;
    }

    try {
        if (gridApi) gridApi.showLoadingOverlay();

        // Gọi API nháp mới: /nhap/:Dot/:KiHoc/:NamHoc/:Khoa
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/nhap/${dot}/${ki_hoc}/${nam_hoc}/${major}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Lỗi khi lấy dữ liệu');
        }

        renderData = Array.isArray(data) ? data : (data.data || []);

        if (gridApi) {
            gridApi.setRowData(renderData);
            renderData.length === 0 ? gridApi.showNoRowsOverlay() : gridApi.hideOverlay();
            console.log('♻️ Data updated:', renderData.length, 'rows');
        } else {
            renderTable();
        }
    } catch (error) {
        console.error('Error fetching data:', error);
        if (gridApi) gridApi.hideOverlay();
        Swal.fire('Lỗi', 'Có lỗi xảy ra: ' + error.message, 'error');
    }
}

function renderTable() {
    const rowHeight = 50;

    // Nếu grid đã tồn tại → chỉ cập nhật data (giống TKB)
    if (gridApi) {
        gridApi.setRowData(renderData);
        renderData.length === 0 ? gridApi.showNoRowsOverlay() : gridApi.hideOverlay();
        return;
    }

    // Không có data → hiển thị thông báo
    if (renderData.length === 0) {
        document.getElementById('table-container').innerHTML = "<p class='text-center mt-3'>Không có dữ liệu</p>";
        return;
    }

    // headersMap giống TKB + thêm các cột riêng của lớp ngoài QC
    const headersMap = {
        id: { name: "ID", width: 70 },
        major: { name: "Khoa", width: 100 },
        ll_total: { name: "LL", width: 50 },
        student_quantity: { name: "Số SV", width: 70 },
        student_bonus: { name: "HS lớp đông", width: 100 },
        bonus_time: { name: "HS ngoài giờ", width: 90 },
        course_id: { name: "Mã học phần", width: 100 },
        lecturer: { name: "Giảng viên theo TKB", width: 150 },
        credit_hours: { name: "Số TC", width: 80 },
        course_name: { name: "Lớp học phần", width: 250 },
        course_code: { name: "Mã học phần", width: 100 },
        start_date: { name: "Ngày bắt đầu", width: 110 },
        end_date: { name: "Ngày kết thúc", width: 110 },
        ll_code: { name: "Tiết CTĐT", width: 90 },
        qc: { name: "QC", width: 70 },
        he_dao_tao: { name: "Hệ đào tạo", width: 150 },
    };

    // Dynamic column generation từ data (giống TKB)
    const columnDefs = [
        {
            headerName: 'STT',
            field: 'stt',
            valueGetter: (params) => params.node.rowIndex + 1,
            width: 80, editable: false,
            cellStyle: { fontWeight: 'bold', textAlign: 'center' }
        },
        ...Object.keys(renderData[0])
            .filter(key => key !== "GhiChu" && key !== "description")
            .map(key => ({
                field: key,
                headerName: headersMap[key]?.name || key,
                width: headersMap[key]?.width || 100,
                editable: key !== "student_bonus" && key !== "id",
                hide: key === "id" || key === "tt" || key === "course_id"
                    || key === 'dot' || key === 'ki_hoc' || key === 'nam_hoc' || key === 'note',
                headerClass: 'custom-header',
                filter: false,

                valueGetter: (params) => {
                    const field = params.colDef.field;
                    if (field === "start_date" || field === "end_date") {
                        const value = params.data[field];
                        if (!value) return "";
                        const date = new Date(value);
                        if (isNaN(date.getTime())) return value;
                        return reFormatDateFromDB(value);
                    }
                    return params.data[field];
                },

                valueSetter: (params) => {
                    const field = params.colDef.field;
                    const oldValue = params.data[field];
                    const rawValue = params.newValue;
                    const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

                    // Xử lý riêng cho cột ngày (giống TKB)
                    if (field === "start_date" || field === "end_date") {
                        if (!value) return false;
                        const parts = value.split("/");
                        if (parts.length === 3) {
                            const day = parts[0].padStart(2, "0");
                            const month = parts[1].padStart(2, "0");
                            const year = parts[2];
                            const formattedIsoDate = `${year}-${month}-${day}`;
                            const date = new Date(formattedIsoDate);
                            if (!isNaN(date.getTime())) {
                                params.data[field] = formattedIsoDate;
                                return true;
                            }
                        }
                        Toastify({
                            text: "Ngày không hợp lệ! Vui lòng kiểm tra lại (dd/mm/yyyy)",
                            duration: 3000,
                            gravity: "top",
                            position: "right",
                            stopOnFocus: true,
                            backgroundColor: "#FF5252",
                        }).showToast();
                        params.data[field] = oldValue;
                        return false;
                    }

                    // Xử lý các cột khác
                    if (value !== oldValue) {
                        params.data[field] = value;
                        return true;
                    }
                    return false;
                },

                cellEditor: "agTextCellEditor",
                cellEditorParams: { useFormatter: true },
            })),
    ];

    // Gắn combobox cho cột Khoa
    const khoaCol = columnDefs.find(col => col.field === "major");
    if (khoaCol) {
        khoaCol.cellEditor = "agSelectCellEditor";
        khoaCol.cellEditorParams = { values: khoaArray };
    }

    // Gắn combobox cho cột Hệ đào tạo
    const heDaoTaoCol = columnDefs.find(col => col.field === "he_dao_tao");
    if (heDaoTaoCol) {
        heDaoTaoCol.cellEditor = "agSelectCellEditor";
        heDaoTaoCol.cellEditorParams = {
            values: heDaoTaoList.map(item => item.id),
        };
        heDaoTaoCol.valueFormatter = (params) => heDaoTaoMap[params.value] || "";
    }

    // Format QC 2 chữ số thập phân
    const qcCol = columnDefs.find(col => col.field === "qc");
    if (qcCol) {
        qcCol.valueFormatter = params => {
            const val = parseFloat(params.value);
            return isNaN(val) ? '' : val.toFixed(2);
        };
    }

    // Push cột Ghi chú (giống TKB)
    columnDefs.push({
        headerName: 'Ghi chú',
        field: 'note',
        width: 150, editable: true,
        headerClass: 'custom-header',
        cellEditor: 'agLargeTextCellEditor',
        cellEditorPopup: true,
        cellEditorParams: {
            maxLength: 400,
            rows: 6,
            cols: 40,
        }
    });

    // Push cột Xóa
    columnDefs.push({
        headerName: 'Xóa',
        field: 'actions',
        width: 60, editable: false,
        cellRenderer: function (params) {
            if (!params.data || !params.data.id) return '';
            const btn = document.createElement('button');
            btn.textContent = 'Xóa';
            btn.addEventListener('click', () => deleteRow(params.data));
            return btn;
        }
    });

    gridOptions = {
        columnDefs: columnDefs,
        rowData: renderData,
        getRowId: params => params.data.id,
        rowHeight: rowHeight,
        defaultColDef: {
            sortable: true,
            filter: false,
            resizable: true,
            suppressMenu: true,
            editable: false,
            cellStyle: {
                fontSize: "14px",
                whiteSpace: "normal",
                wordWrap: "break-word",
                textAlign: "center",
            },
        },
        animateRows: true,
        singleClickEdit: true,
        enterMovesDownAfterEdit: true,
        suppressClickEdit: false,
        stopEditingWhenCellsLoseFocus: true,
        overlayNoRowsTemplate: '<span style="padding: 10px;">Không có dữ liệu. Hãy chọn bộ lọc và nhấn "Hiển thị"</span>',
        onCellValueChanged: onCellValueChanged,
        onGridReady: (params) => {
            gridApi = params.api;
            params.api.sizeColumnsToFit();
        }
    };

    const container = document.getElementById('table-container');
    container.innerHTML = '';
    new agGrid.Grid(container, gridOptions);
    gridApi = gridOptions.api;

    if (renderData.length === 0) {
        gridApi.showNoRowsOverlay();
    }

    console.log('✅ AG Grid initialized with', renderData.length, 'rows');
}

// Helper format ngày từ DB (giống TKB)
function reFormatDateFromDB(input) {
    if (!input) return "";
    const date = new Date(input);
    if (isNaN(date.getTime())) return input;
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// =====================================================
// INLINE EDIT → SAVE TO DB
// =====================================================

async function onCellValueChanged(event) {
    const data = event.data;

    // Cần có id để xác định dòng
    if (!data.id) return;

    try {
        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/edit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            Toastify({
                text: "Đã cập nhật",
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "#28a745",
            }).showToast();
        } else {
            Swal.fire('Lỗi', result.message || 'Cập nhật thất bại', 'error');
        }
    } catch (error) {
        console.error('Error saving edit:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi lưu', 'error');
    }
}

// =====================================================
// DELETE ROW (theo tt, giống TKB)
// =====================================================

async function deleteRow(rowData) {
    const confirmResult = await Swal.fire({
        title: 'Xác nhận xóa?',
        text: `Xóa dòng: ${rowData.course_name || ''} - ${rowData.lecturer || ''}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        const params = new URLSearchParams({
            id: rowData.id,
            dot: rowData.dot,
            ki_hoc: rowData.ki_hoc,
            nam_hoc: rowData.nam_hoc
        });

        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/row?${params}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (result.success) {
            Toastify({
                text: "Đã xóa",
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "#28a745",
            }).showToast();
            gridApi.applyTransaction({ remove: [{ id: rowData.id }] });
            renderData = renderData.filter(r => r.id !== rowData.id);
            // Refresh để cập nhật lại STT sau khi xóa dòng
            gridApi.refreshCells({ force: true });
        } else {
            Swal.fire('Lỗi', result.message || 'Xóa thất bại', 'error');
        }
    } catch (error) {
        console.error('Error deleting:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa', 'error');
    }
}

// =====================================================
// DELETE ALL (nháp)
// =====================================================

async function handleDeleteAll() {
    const { dot, ki_hoc, nam_hoc, major } = getFilterValues();

    if (!nam_hoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        return;
    }

    const confirmResult = await Swal.fire({
        title: 'Xác nhận xóa toàn bộ?',
        html: `Xóa tất cả dữ liệu lớp ngoài QC:<br>
               <b>Đợt:</b> ${dot}<br>
               <b>Kì:</b> ${ki_hoc}<br>
               <b>Năm học:</b> ${nam_hoc}<br>
               <b>Khoa:</b> ${major || 'Tất cả'}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Xóa toàn bộ',
        cancelButtonText: 'Hủy'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/all', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nam_hoc, ki_hoc, dot, major })
        });
        const result = await response.json();

        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            getDataTable();
        } else {
            Swal.fire('Lỗi', result.message || 'Xóa thất bại', 'error');
        }
    } catch (error) {
        console.error('Error deleting all:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa', 'error');
    }
}

// =====================================================
// ADD NEW ROW
// =====================================================

async function addNewRow() {
    const { dot, ki_hoc, nam_hoc, major } = getFilterValues();

    if (!nam_hoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học trước khi thêm dòng', 'error');
        return;
    }

    const newRow = {
        nam_hoc: nam_hoc,
        ki_hoc: ki_hoc || '1',
        dot: dot || '1',
        course_name: '',
        course_code: '',
        credit_hours: 0,
        ll_total: 0,
        student_quantity: 0,
        ll_code: 0,
        bonus_time: 1,
        student_bonus: 1,
        qc: 0,
        note: '',
        lecturer: '',
        major: major !== 'ALL' ? major : '',
        he_dao_tao: '',
        course_id: ''
    };

    try {
        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRow)
        });

        const result = await response.json();

        if (result.success) {
            Toastify({
                text: "Đã thêm dòng mới",
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "#28a745",
            }).showToast();
            getDataTable();
        } else {
            Swal.fire('Lỗi', result.message || 'Thêm dòng thất bại', 'error');
        }
    } catch (error) {
        console.error('Error adding row:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi thêm dòng', 'error');
    }
}

// =====================================================
// FILE IMPORT
// =====================================================

// Gắn sự kiện chọn file -> tự động import luôn
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleImportFile);
    }
});

async function handleImportFile() {
    const fileInput = document.getElementById('fileInput');
    const { dot, ki_hoc, nam_hoc } = getFilterValues();

    if (!fileInput.files || fileInput.files.length === 0) {
        return;
    }

    if (!nam_hoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        fileInput.value = '';
        return;
    }

    const file = fileInput.files[0];

    const formData = new FormData();
    formData.append('file', file);
    formData.append('NamHoc', nam_hoc);
    formData.append('HocKy', ki_hoc || '1');
    formData.append('Dot', dot || '1');

    try {
        Swal.fire({
            title: 'Đang xử lý...',
            text: 'Đang đọc và import file Excel',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch('/v2/vuotgio/lop-ngoai-qc/parse-excel', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (!result.success) {
            Swal.close();
            Swal.fire('Lỗi', result.message, 'error');
            fileInput.value = '';
            return;
        }

        pendingImportData = result.data;
        console.log(`[LopNgoaiQC] Parsed ${pendingImportData.length} rows from file`);

        // Import trực tiếp không cần xác nhận
        await confirmImport(false);
        fileInput.value = '';
    } catch (error) {
        Swal.close();
        console.error('Error importing:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi đọc file: ' + error.message, 'error');
        fileInput.value = '';
    }
}

// =====================================================
// IMPORT MODAL
// =====================================================

function showImportModal(message) {
    const modal = document.getElementById('import-modal');
    document.getElementById('import-modal-message').textContent = message;
    modal.style.display = 'block';

    document.getElementById('btn-import-delete').onclick = async () => {
        modal.style.display = 'none';
        await confirmImport(true);
    };

    document.getElementById('btn-import-append').onclick = async () => {
        modal.style.display = 'none';
        await confirmImport(false);
    };

    document.getElementById('btn-import-cancel').onclick = () => {
        modal.style.display = 'none';
        pendingImportData = null;
        getDataTable();
    };
}

async function confirmImport(deleteOld) {
    if (!pendingImportData || pendingImportData.length === 0) {
        Swal.fire('Lỗi', 'Không có dữ liệu để import', 'error');
        return;
    }

    const { dot, ki_hoc, nam_hoc, major } = getFilterValues();

    try {
        Swal.fire({
            title: 'Đang import...',
            text: 'Vui lòng chờ',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        // Xóa nháp cũ nếu cần
        if (deleteOld) {
            const deleteResponse = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/all', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nam_hoc, ki_hoc: ki_hoc || '1', dot: dot || '1', major })
            });
            const deleteResult = await deleteResponse.json();
            console.log('[LopNgoaiQC] Deleted old draft:', deleteResult.message);
        }

        // Lấy data hiện tại từ Grid (user có thể đã edit inline)
        const currentData = [];
        if (gridApi) {
            gridApi.forEachNode(node => {
                if (node.data) currentData.push(node.data);
            });
        }
        const dataToImport = currentData.length > 0 ? currentData : pendingImportData;

        // Insert vào course_schedule_details (nháp)
        const response = await fetch('/v2/vuotgio/lop-ngoai-qc/confirm-import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                records: dataToImport,
                dot: dot || '1',
                ki_hoc: ki_hoc || '1',
                nam_hoc: nam_hoc
            })
        });

        const result = await response.json();
        Swal.close();

        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            pendingImportData = null;
            document.getElementById('fileInput').value = '';
            getDataTable();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        Swal.close();
        console.error('Error confirming import:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra: ' + error.message, 'error');
    }
}

// =====================================================
// CONFIRM TO MAIN (Chốt Danh Sách)
// =====================================================

async function handleConfirmToMain() {
    const { dot, ki_hoc, nam_hoc, major } = getFilterValues();

    if (!nam_hoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'error');
        return;
    }

    const confirmResult = await Swal.fire({
        title: 'Ban hành?',
        html: `
               <b>Đợt:</b> ${dot}<br>
               <b>Kì:</b> ${ki_hoc}<br>
               <b>Năm học:</b> ${nam_hoc}<br>
               <b>Khoa:</b> ${major || 'Tất cả'}<br><br>
               <em>Sau khi ban hành, dữ liệu sẽ chuyển sang "Danh sách lớp ngoài QC" để duyệt.</em>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#f0ad4e',
        confirmButtonText: 'Xác nhận',
        cancelButtonText: 'Hủy'
    });

    if (!confirmResult.isConfirmed) return;

    try {
        Swal.fire({
            title: 'Đang chốt...',
            text: 'Vui lòng chờ',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading()
        });

        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dot, ki_hoc, nam_hoc, major })
        });

        const result = await response.json();
        Swal.close();

        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            getDataTable(); // Reload → nháp sẽ trống (da_luu = 1)
        } else {
            Swal.fire('Lỗi', result.message || 'Chốt thất bại', 'error');
        }
    } catch (error) {
        Swal.close();
        console.error('Error confirming to main:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra: ' + error.message, 'error');
    }
}
````

## File: src/public/js/vuotgio_v2/themKTHP/index.js
````javascript
/**
 * Thêm Kết Thúc Học Phần - Frontend JS
 * VuotGio V2 - Calculator form theo mẫu bảng vượt giờ
 */

const sections = [
    {
        id: 1,
        title: "Ra đề thi",
        saveType: "Ra đề",
        items: [
            { id: "1a", label: "Đề thi trắc nghiệm kèm theo đáp án", dvt: "01 đề thi", gio: 2.0 },
            { id: "1b", label: "Đề thi tự luận kèm theo đáp án", dvt: "01 đề thi", gio: 1.5 },
            { id: "1c", label: "Đề thi thực hành kèm theo đáp án", dvt: "01 đề thi", gio: 1.0 },
            { id: "1d", label: "Đề thi vấn đáp kèm theo đáp án", dvt: "01 đề thi", gio: 0.75 },
            { id: "1e", label: "Đề hỗn hợp kèm đáp án (trắc nghiệm >= 50%)", dvt: "01 đề thi", gio: 2.0 },
            { id: "1f", label: "Đề hỗn hợp TN + tự luận kèm đáp án (TN < 50%)", dvt: "01 đề thi", gio: 1.5 },
            { id: "1g", label: "Đề hỗn hợp TN + thực hành kèm đáp án (TN < 50%)", dvt: "01 đề thi", gio: 1.0 },
            { id: "1h", label: "Đề hỗn hợp TN + vấn đáp kèm đáp án (TN < 50%)", dvt: "01 đề thi", gio: 0.75 }
        ],
        notes: [],
        info: []
    },
    {
        id: 2,
        title: "Coi thi, giám sát",
        saveType: "Coi thi",
        items: [
            { id: "2a", label: "Ca thi thời lượng <= 45 phút", dvt: "01 ca thi", gio: 0.3 },
            { id: "2b", label: "Ca thi thời lượng 46 - 90 phút", dvt: "01 ca thi", gio: 0.6 },
            { id: "2c", label: "Ca thi thời lượng 91 - 135 phút", dvt: "01 ca thi", gio: 0.9 },
            { id: "2d", label: "Ca thi thời lượng > 135 phút", dvt: "01 ca thi", gio: 1.2 }
        ],
        notes: [
            { id: "coeff2", label: "Coi thi, giám sát ngoài giờ hành chính -> nhân hệ số 1,2", coeff: 1.2, affects: ["2a", "2b", "2c", "2d"] }
        ],
        info: []
    },
    {
        id: 3,
        title: "Chấm thi",
        saveType: "Chấm thi",
        items: [
            { id: "3a", label: "Bài thi tự luận", dvt: "01 bài thi", gio: 0.1 },
            { id: "3b", label: "Bài thi vấn đáp", dvt: "01 bài thi", gio: 0.1 },
            { id: "3c", label: "Đồ án môn học", dvt: "01 ĐAMH", gio: 0.15 },
            { id: "3d", label: "Bài thực hành tại giảng đường, phòng máy, phòng thí nghiệm", dvt: "01 bài thi", gio: 0.05 },
            { id: "3e", label: "Bài thực hành tại thao trường, bãi tập", dvt: "01 bài thi", gio: 0.075 },
            { id: "3f", label: "Bài hỗn hợp - tỉ trọng TN >= 50% (tính 50% định mức tương ứng)", dvt: "01 bài thi", gio: null, mixPct: 0.5, mixLabel: "50% định mức" },
            { id: "3g", label: "Bài hỗn hợp - tỉ trọng TN < 50% (tính 75% định mức tương ứng)", dvt: "01 bài thi", gio: null, mixPct: 0.75, mixLabel: "75% định mức" }
        ],
        notes: [
            { id: "coeff3", label: "Chấm thực hành / vấn đáp / đồ án ngoài giờ hành chính -> nhân hệ số 1,2", coeff: 1.2, affects: ["3b", "3c", "3d", "3e"] }
        ],
        info: []
    },
    {
        id: 4,
        title: "Xây dựng ngân hàng câu hỏi thi",
        saveType: "Ngân hàng câu hỏi",
        items: [
            { id: "4a", label: "Biên soạn cấu trúc nhóm câu hỏi (tự luận / thực hành / vấn đáp)", dvt: "lần", gio: 2.0 },
            { id: "4b", label: "Biên soạn cấu trúc nhóm câu hỏi (trắc nghiệm / hỗn hợp có TN)", dvt: "lần", gio: 5.0 },
            { id: "4c", label: "Biên soạn 01 ma trận đề thi (tự luận / thực hành / vấn đáp)", dvt: "ma trận", gio: 1.0 },
            { id: "4d", label: "Biên soạn 01 ma trận đề thi (trắc nghiệm / hỗn hợp có TN)", dvt: "ma trận", gio: 2.5 },
            { id: "4e", label: "Biên soạn 01 câu hỏi tự luận / thực hành / vấn đáp kèm đáp án", dvt: "câu hỏi", gio: 1.5 },
            { id: "4f", label: "Biên soạn 01 câu hỏi trắc nghiệm kèm đáp án", dvt: "câu hỏi", gio: 0.6 },
            { id: "4g", label: "Câu hỏi dẫn xuất từ TL/TH/VĐ (tính 1/3 định mức câu gốc = 0,5 giờ)", dvt: "câu hỏi", gio: 0.5 },
            { id: "4h", label: "Câu hỏi dẫn xuất từ trắc nghiệm (tính 1/3 định mức câu gốc = 0,2 giờ)", dvt: "câu hỏi", gio: 0.2 },
            { id: "4i", label: "Cập nhật câu hỏi TL/TH/VĐ (30% định mức biên soạn mới = 0,45 giờ)", dvt: "câu hỏi", gio: 0.45 },
            { id: "4j", label: "Cập nhật câu hỏi trắc nghiệm (30% định mức biên soạn mới = 0,18 giờ)", dvt: "câu hỏi", gio: 0.18 }
        ],
        notes: [],
        info: [
            "Thẩm định cấu trúc nhóm câu hỏi, ma trận đề thi, câu hỏi thi -> áp dụng 80% định mức biên soạn tương ứng.",
            "Biên soạn câu hỏi môn ngoại ngữ -> áp dụng 2/3 định mức biên soạn môn khác."
        ]
    }
];

const state = {
    inputs: {},
    coeffs: {},
    open: { 1: true, 2: true, 3: true, 4: true }
};

// Danh sách giảng viên cho autocomplete
let giangVienList = [];
let heDaoTaoList = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadNamHocOptions();
    loadKhoaOptions();
    loadGiangVienList();
    loadHeDaoTaoOptions();

    document.getElementById('themKTHPForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('themKTHPForm').addEventListener('reset', () => {
        setTimeout(() => {
            resetCalculator();
        }, 0);
    });
    document.getElementById('resetCalculatorBtn').addEventListener('click', resetAll);
    const khoaForm = document.getElementById('khoaForm');
    if (khoaForm) {
        khoaForm.addEventListener('change', async () => {
            await loadGiangVienList(khoaForm.value);
        });
    }

    setupAutocomplete('giangVienForm', 'suggestionContainer');
    render();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-container')) {
            document.querySelectorAll('.suggestion-list').forEach(list => list.classList.remove('show'));
        }
    });
});

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();
        const namHocSelects = document.querySelectorAll('.namHoc');
        namHocSelects.forEach(select => {
            select.innerHTML = '';
            data.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = item.NamHoc;
                option.textContent = item.NamHoc;
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading nam hoc:', error);
    }
}

// Load khoa từ API có sẵn
async function loadKhoaOptions() {
    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        const khoaSelects = document.querySelectorAll('.khoa');
        khoaSelects.forEach(select => {
            if (!select.id.includes('Xem')) {
                select.innerHTML = '<option value="">-- Chọn Khoa --</option>';
                data.forEach(dept => {
                    const option = document.createElement('option');
                    option.value = dept.MaPhongBan;
                    option.textContent = dept.TenPhongBan || dept.MaPhongBan;
                    select.appendChild(option);
                });
            }
        });

        // Enforce khoa filter: nếu user thuộc khoa, lock dropdown
        if (typeof KhoaFilterUtils !== 'undefined' && KhoaFilterUtils.isKhoaUser()) {
            khoaSelects.forEach(select => {
                KhoaFilterUtils.applyKhoaFilter(select);
            });
        }

        const khoaForm = document.getElementById('khoaForm');
        if (khoaForm && khoaForm.value) {
            await loadGiangVienList(khoaForm.value);
        }
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// Load danh sách giảng viên (dùng cho autocomplete)
async function loadGiangVienList(khoa = '') {
    try {
        const query = khoa ? `?Khoa=${encodeURIComponent(khoa)}` : '';
        const response = await fetch(`/v2/vuotgio/api/teachers${query}`);
        if (!response.ok) {
            throw new Error(`Load teachers failed with status ${response.status}`);
        }

        const rawData = await response.json();
        if (!Array.isArray(rawData)) {
            giangVienList = [];
            return;
        }

        // Chuẩn hóa cấu trúc dữ liệu để autocomplete xử lý ổn định
        giangVienList = rawData.map((row) => ({
            HoTen: row.HoTen || row.TenNhanVien || '',
            Khoa: row.Khoa || row.MaPhongBan || ''
        })).filter((row) => row.HoTen);
    } catch (error) {
        console.error('Error loading giang vien:', error);
        giangVienList = [];
    }
}

// Load danh sách hệ đào tạo cho trường đối tượng
async function loadHeDaoTaoOptions() {
    try {
        const response = await fetch('/api/gvm/v1/he-moi-giang');
        if (!response.ok) {
            throw new Error(`Load he dao tao failed with status ${response.status}`);
        }

        const rawData = await response.json();
        const list = Array.isArray(rawData)
            ? rawData
            : (rawData && Array.isArray(rawData.data) ? rawData.data : []);

        heDaoTaoList = list
            .map((item) => ({
                id: item.id,
                value: item.he_dao_tao || item.HeDaoTao || item.value || ''
            }))
            .filter((item) => item.value);

        const doiTuongSelect = document.getElementById('doiTuongForm');
        if (doiTuongSelect) {
            doiTuongSelect.innerHTML = '<option value="">-- Chọn hệ đào tạo --</option>';
            heDaoTaoList.forEach((item) => {
                const option = document.createElement('option');
                option.value = String(item.value);
                option.textContent = String(item.value);
                doiTuongSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading he dao tao:', error);
        heDaoTaoList = [];

        const doiTuongSelect = document.getElementById('doiTuongForm');
        if (doiTuongSelect) {
            doiTuongSelect.innerHTML = '<option value="">Không tải được hệ đào tạo</option>';
        }
    }
}

// Hàm setup autocomplete dùng chung
function setupAutocomplete(inputId, containerId) {
    const input = document.getElementById(inputId);
    const container = document.getElementById(containerId);
    
    input.addEventListener('input', () => {
        const query = input.value.toLowerCase().trim();
        if (query.length < 2) {
            container.classList.remove('show');
            return;
        }
        
        const suggestions = giangVienList.filter(gv => {
            const name = gv.HoTen || gv.TenNhanVien || '';
            return name.toLowerCase().includes(query);
        }).slice(0, 10);
        
        if (suggestions.length === 0) {
            container.classList.remove('show');
            return;
        }
        
        container.innerHTML = suggestions.map(gv => {
            const name = gv.HoTen || gv.TenNhanVien || '';
            const mon = gv.MonGiangDayChinh ? ` (${gv.MonGiangDayChinh})` : '';
            return `<div class="suggestion-item" data-name="${name}">${name}${mon}</div>`;
        }).join('');
        
        container.classList.add('show');
        
        container.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                input.value = item.dataset.name;
                container.classList.remove('show');
            });
        });
    });

    // Close on blur (with delay)
    input.addEventListener('blur', () => {
        setTimeout(() => {
            container.classList.remove('show');
        }, 200);
    });
}

// Tiêu chuẩn hóa chuỗi (Xử lý khoảng trắng và dấu Tiếng Việt NFC/NFD)
function normalizeString(str) {
    if (!str) return '';
    return str.toString().normalize('NFC').trim();
}

// Kiểm tra xem tên giảng viên có trong danh sách không
function isValidTeacher(name) {
    const normalizedInput = normalizeString(name);
    if (!normalizedInput) return false;

    return giangVienList.some(gv => {
        const listName = normalizeString(gv.HoTen || gv.TenNhanVien || '');
        return listName === normalizedInput;
    });
}

function calcResult(item, sec) {
    const qty = parseFloat(state.inputs[item.id] || 0);
    if (!qty) return 0;

    let base = 0;
    if (item.gio !== null && item.gio !== undefined) {
        base = qty * item.gio;
    } else if (item.mixPct !== undefined) {
        base = qty * 0.05 * item.mixPct;
    } else {
        return 0;
    }

    for (const note of (sec.notes || [])) {
        if (note.coeff && note.affects && note.affects.includes(item.id) && state.coeffs[note.id]) {
            base *= note.coeff;
        }
    }

    return base;
}

function gioLabel(item) {
    if (item.gio !== null && item.gio !== undefined) {
        return item.gio.toString().replace('.', ',');
    }
    if (item.mixLabel) return item.mixLabel;
    return '–';
}

function fmt(n) {
    return Number(n || 0).toFixed(2).replace('.', ',');
}

function getSectionTotal(sectionId) {
    const sec = sections.find(s => s.id === sectionId);
    if (!sec) return 0;
    return sec.items.reduce((sum, item) => sum + calcResult(item, sec), 0);
}

function buildDetailsForSave() {
    return sections
        .map((sec) => ({
            hinhthuc: sec.saveType,
            sotietqc: parseFloat(getSectionTotal(sec.id).toFixed(2))
        }))
        .filter((d) => d.sotietqc > 0);
}

function render() {
    const app = document.getElementById('app');
    if (!app) return;

    let html = '';

    sections.forEach(sec => {
        const secTotal = getSectionTotal(sec.id);
        const isOpen = state.open[sec.id];

        html += `<div class="section">
      <div class="section-header" onclick="toggleSec(${sec.id})">
        <div class="sec-left">
          <div class="sec-badge">${sec.id}</div>
          <span class="sec-title">${sec.title}</span>
        </div>
        <div class="sec-right">
          <span class="sec-total-pill" id="pill${sec.id}">${fmt(secTotal)} giờ</span>
          <span class="sec-arrow${isOpen ? ' open' : ''}">▼</span>
        </div>
      </div>`;

        if (isOpen) {
            html += `<div class="col-headers">
        <span>Nội dung</span>
        <span>ĐVT</span>
        <span>Giờ chuẩn</span>
        <span>Số lượng</span>
        <span>Thành giờ</span>
      </div>`;

            sec.items.forEach(item => {
                const result = calcResult(item, sec);
                const qty = state.inputs[item.id] || '';
                const hasVal = qty && parseFloat(qty) > 0;

                html += `<div class="item-row">
          <div class="i-label">${item.label}</div>
          <div class="i-dvt">${item.dvt}</div>
          <div class="i-gio">${gioLabel(item)}</div>
          <div class="i-input">
            <input type="number" min="0" step="1" value="${qty}" placeholder="0"
              class="${hasVal ? 'has-val' : ''}"
              onchange="setInput('${item.id}', this.value, ${sec.id})"
              oninput="setInput('${item.id}', this.value, ${sec.id})" />
          </div>
          <div class="i-result${result === 0 ? ' zero' : ''}">${result > 0 ? fmt(result) : '–'}</div>
        </div>`;
            });

            sec.notes.forEach(note => {
                const checked = !!state.coeffs[note.id];
                html += `<div class="coeff-row">
          <span class="coeff-text">${note.label}</span>
          <label class="coeff-label">
            <input type="checkbox" ${checked ? 'checked' : ''} onchange="setCoeff('${note.id}', this.checked)" />
            Áp dụng hệ số
          </label>
        </div>`;
            });

            sec.info.forEach(text => {
                html += `<div class="info-row"><div class="info-dot"></div><span class="info-text">${text}</span></div>`;
            });
        }

        html += `</div>`;
    });

    app.innerHTML = html;
    updateSummary();
}

function updateSummary() {
    const totals = sections.map(sec => getSectionTotal(sec.id));
    const sum1 = document.getElementById('sum1');
    const sum2 = document.getElementById('sum2');
    const sum3 = document.getElementById('sum3');
    const sum4 = document.getElementById('sum4');
    const grandTotal = document.getElementById('grandTotal');

    if (sum1) sum1.textContent = fmt(totals[0]);
    if (sum2) sum2.textContent = fmt(totals[1]);
    if (sum3) sum3.textContent = fmt(totals[2]);
    if (sum4) sum4.textContent = fmt(totals[3]);

    const total = totals.reduce((a, b) => a + b, 0);
    if (grandTotal) grandTotal.textContent = `${fmt(total)} giờ`;
}

window.toggleSec = function toggleSec(id) {
    state.open[id] = !state.open[id];
    render();
};

window.setInput = function setInput(id, val, secId) {
    state.inputs[id] = val;
    const sec = sections.find(s => s.id === secId);
    if (!sec) {
        updateSummary();
        return;
    }

    const secTotal = sec.items.reduce((s, item) => s + calcResult(item, sec), 0);
    const pill = document.getElementById(`pill${secId}`);
    if (pill) pill.textContent = `${fmt(secTotal)} giờ`;

    const inputEl = document.querySelector(`input[onchange*="'${id}'"]`);
    if (inputEl) {
        const hasVal = val && parseFloat(val) > 0;
        inputEl.className = hasVal ? 'has-val' : '';
    }

    const rows = document.querySelectorAll('.item-row');
    rows.forEach(row => {
        const inp = row.querySelector('input');
        const resEl = row.querySelector('.i-result');
        if (!inp || !resEl) return;

        const onch = inp.getAttribute('onchange') || '';
        const match = onch.match(/'([^']+)'/);
        if (!match) return;

        const itemId = match[1];
        const item = sec.items.find(it => it.id === itemId);
        if (!item) return;

        const r = calcResult(item, sec);
        resEl.textContent = r > 0 ? fmt(r) : '–';
        resEl.className = r === 0 ? 'i-result zero' : 'i-result';
    });

    updateSummary();
};

window.setCoeff = function setCoeff(id, val) {
    state.coeffs[id] = val;
    render();
};

function resetCalculator() {
    Object.keys(state.inputs).forEach(k => delete state.inputs[k]);
    Object.keys(state.coeffs).forEach(k => delete state.coeffs[k]);
    render();
}

window.resetAll = function resetAll() {
    if (!confirm('Xóa toàn bộ số liệu đã nhập?')) return;
    document.getElementById('themKTHPForm').reset();
    resetCalculator();
};

// Form submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const giangVien = document.getElementById('giangVienForm').value.trim();
    if (!isValidTeacher(giangVien)) {
        Swal.fire('Lỗi', 'Vui lòng chọn giảng viên từ danh sách gợi ý!', 'error');
        return;
    }
    
    const details = buildDetailsForSave();

    if (details.length === 0) {
        Swal.fire('Lỗi', 'Vui lòng nhập số tiết cho ít nhất 1 hình thức.', 'error');
        return;
    }

    const doiTuong = (document.getElementById('doiTuongForm')?.value || '').trim();
    if (!doiTuong) {
        Swal.fire('Lỗi', 'Vui lòng chọn Đối tượng cho lớp học phần.', 'error');
        return;
    }

    const formData = {
        namhoc: document.getElementById('namHocForm').value,
        ki: document.getElementById('hocKyForm').value,
        khoa: document.getElementById('khoaForm').value,
        tenhocphan: document.getElementById('tenHPForm').value,
        lophocphan: document.getElementById('lopForm').value,
        sotc: document.getElementById('soTCForm').value || 0,
        sosv: document.getElementById('siSoForm').value || 0,
        doituong: doiTuong,
        ghichu: document.getElementById('ghiChuForm').value,
        giangvien: giangVien,
        details
    };

    try {
        const response = await fetch('/v2/vuotgio/them-kthp/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            document.getElementById('themKTHPForm').reset();
            resetCalculator();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi lưu', 'error');
    }
}
````

## File: src/services/vuotgio_v2/lnqc.service.js
````javascript
const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");
const repo = require("../../repositories/vuotgio_v2/lnqc.repo");

const mapper = require("../../mappers/vuotgio_v2/lnqc.mapper");
const baseMapper = require("../../mappers/vuotgio_v2/base.mapper");

const getUserContext = (req) => {
    if (!req.session?.userId) {
        console.warn("[LNQC] getUserContext: session.userId is missing — request may be unauthenticated");
    }
    return {
        userId: req.session?.userId || null,
        userName: req.session?.TenNhanVien || req.session?.username || "Unknown",
    };
};

const save = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    let connection;
    try {
        connection = await createPoolConnection();
        const data = mapper.toEntity(req.body);

        if (!data.nam_hoc) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin năm học" });
        }

        const [result] = await repo.insertDraft(connection, [[
            data.course_name,
            data.course_code,
            data.credit_hours,
            data.student_quantity,
            data.student_bonus,
            data.bonus_time,
            data.ll_code,
            data.ll_total,
            data.qc,
            data.lecturer,
            data.major,
            data.he_dao_tao,
            data.dot,
            data.ki_hoc,
            data.nam_hoc,
            data.note,
            data.course_id,
            "ngoai_quy_chuan",
            0,
        ]]);

        try {
            await LogService.logChange(userId, userName, "Thêm lớp ngoài QC (nháp)", `Thêm "${data.course_name}" - GV: "${data.lecturer}"`);
        } catch (error) {
            console.error("Log error:", error);
        }

        res.status(200).json({ success: true, message: "Thêm dòng mới thành công!", data: { id: result.insertId, ...data } });
    } catch (error) {
        console.error("Lỗi khi thêm lớp ngoài QC:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    } finally {
        if (connection) connection.release();
    }
};

const getTable = async (req, res) => {
    const { Dot, KiHoc, NamHoc } = req.params;
    // enforceKhoaFilter middleware đã override req.params.Khoa nếu user là khoa
    const Khoa = req.params.Khoa;
    let connection;
    try {
        connection = await createPoolConnection();
        const results = await repo.getDraftTable(connection, { dot: Dot, kiHoc: KiHoc, namHoc: NamHoc, khoa: Khoa });
        res.json(results);
    } catch (error) {
        console.error("Lỗi getTable nháp:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

const edit = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const raw = req.body;
    const { id, dot, ki_hoc, nam_hoc } = raw;
    if (!id || !dot || !ki_hoc || !nam_hoc) {
        return res.status(400).json({ success: false, message: "Thiếu id, dot, ki_hoc, nam_hoc" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        const mapped = mapper.toEntity(req.body);
        
        const allowedFields = ["course_name", "course_code", "credit_hours", "student_quantity", "student_bonus", "bonus_time", "ll_code", "ll_total", "qc", "lecturer", "major", "he_dao_tao", "note", "course_id"];
        const values = allowedFields.map((field) => mapped[field]);
        const setClause = allowedFields.map((field) => `${field} = ?`).join(", ");

        const [result] = await connection.execute(
            `UPDATE course_schedule_details SET ${setClause} WHERE id = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ? AND class_type = ?`,
            [...values, id, dot, ki_hoc, nam_hoc, "ngoai_quy_chuan"]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        }

        try {
            await LogService.logChange(userId, userName, "Sửa lớp ngoài QC (nháp)", `Sửa id: ${id}`);
        } catch (error) {
            console.error("Log error:", error);
        }

        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (error) {
        console.error("Lỗi edit nháp:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    } finally {
        if (connection) connection.release();
    }
};

const deleteRecord = async (req, res) => {
    const { id, dot, ki_hoc, nam_hoc } = req.query;
    const { userId, userName } = getUserContext(req);

    if (!id) return res.status(400).json({ success: false, message: "Thiếu id." });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await connection.query(
            `DELETE FROM course_schedule_details WHERE id = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ? AND class_type = ?`,
            [id, dot, ki_hoc, nam_hoc, "ngoai_quy_chuan"]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        }

        try {
            await LogService.logChange(userId, userName, "Xóa lớp ngoài QC (nháp)", `Xóa id: ${id}`);
        } catch (error) {
            console.error("Log error:", error);
        }

        res.json({ success: true, message: "Xóa thành công!" });
    } catch (error) {
        console.error("Lỗi delete nháp:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

const deleteByFilter = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const { nam_hoc, ki_hoc, dot, major } = req.body;

    if (!nam_hoc) {
        return res.status(400).json({ success: false, message: "Cần chọn năm học" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.deleteDraftByFilter(connection, { namHoc: nam_hoc, kiHoc: ki_hoc, dot, major });

        try {
            await LogService.logChange(userId, userName, "Xóa hàng loạt nháp ngoài QC", `Xóa ${result.affectedRows} dòng - Năm: ${nam_hoc}`);
        } catch (error) {
            console.error("Log error:", error);
        }

        res.json({ success: true, message: `Đã xóa ${result.affectedRows} dòng` });
    } catch (error) {
        console.error("Lỗi deleteByFilter:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra khi xóa" });
    } finally {
        if (connection) connection.release();
    }
};

const confirmToMain = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const { major, dot, ki_hoc, nam_hoc } = req.body;

    let connection;
    try {
        connection = await createPoolConnection();

        let getDataQuery = `
            SELECT
                id AS ID,
                major AS Khoa, ll_code AS SoTietCTDT, ll_total AS LL,
                student_quantity AS SoSV, student_bonus AS HeSoLopDong,
                bonus_time AS HeSoT7CN, course_id AS MaBoMon,
                lecturer AS GiangVien, lecturer AS GiaoVienGiangDay,
                credit_hours AS SoTinChi,
                course_name AS LopHocPhan, course_code AS MaHocPhan,
                start_date AS NgayBatDau, end_date AS NgayKetThuc,
                qc AS QuyChuan, he_dao_tao AS he_dao_tao
            FROM course_schedule_details
            WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? AND da_luu = 0 AND class_type = ?
        `;
        const params = [dot, ki_hoc, nam_hoc, "ngoai_quy_chuan"];
        if (major !== "ALL") {
            getDataQuery += ` AND major = ?`;
            params.push(major);
        }

        const [draftData] = await connection.query(getDataQuery, params);
        if (draftData.length === 0) {
            return res.status(200).json({ success: true, message: "Không có dữ liệu nháp để chuyển" });
        }

        const lecturerNames = [...new Set(draftData.map((row) => row.GiangVien || row.GiaoVienGiangDay).filter(Boolean))];
        const lecturerMap = await repo.getLecturerIdsByNames(connection, lecturerNames);

        const mapOfficialRow = (row) => {
            const giangVien = row.GiangVien || row.GiaoVienGiangDay || null;
            const idUser = lecturerMap.get(giangVien) || null;
            return [
                row.tt || null,
                row.SoTinChi || 0,
                row.LopHocPhan || "",
                row.MaBoMon || row.MaHocPhan || "",
                idUser,
                row.LL || 0,
                row.SoTietCTDT || 0,
                row.HeSoT7CN || 1,
                row.SoSV || 0,
                row.HeSoLopDong || 1,
                row.QuyChuan || 0,
                ki_hoc,
                nam_hoc,
                row.MaHocPhan || "",
                giangVien,
                row.GiaoVienGiangDay || giangVien,
                row.MoiGiang || 0,
                row.he_dao_tao || null,
                row.TenLop || row.LopHocPhan || "",
                0,
                0,
                0,
                row.NgayBatDau || null,
                row.NgayKetThuc || null,
                row.Khoa || null,
                dot,
                row.GhiChu || null,
                row.HoanThanh || 0,
            ];
        };

        let insertValues = [];
        let excludedIds = [];
        if (major === "ALL") {
            const validSet = new Set(await repo.getKhoaList(connection));
            draftData.forEach((row) => {
                if (validSet.has(row.Khoa)) {
                    insertValues.push(mapOfficialRow(row));
                } else {
                    excludedIds.push(row.ID);
                }
            });
        } else {
            insertValues = draftData.map(mapOfficialRow);
        }

        if (insertValues.length === 0) {
            return res.status(200).json({ success: true, message: "Không có dữ liệu hợp lệ (Khoa không trùng)" });
        }

        // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
        await connection.beginTransaction();
        try {
            await repo.insertOfficialBatch(connection, insertValues);
            await repo.updateDraftSaved(connection, { dot, kiHoc: ki_hoc, namHoc: nam_hoc, major, excludedIds });
            await connection.commit();
        } catch (txError) {
            await connection.rollback();
            throw txError;
        }

        try {
            await LogService.logChange(userId, userName, "Chốt lớp ngoài QC", `Chuyển ${insertValues.length} dòng - Đợt: ${dot}, Kì: ${ki_hoc}, Năm: ${nam_hoc}`);
        } catch (error) {
            console.error("Log error:", error);
        }

        const message = excludedIds.length > 0
            ? `Đã chuyển ${insertValues.length} dòng. ${excludedIds.length} dòng không trùng khoa.`
            : `Đã chuyển ${insertValues.length} dòng thành công!`;

        res.status(200).json({ success: true, message });
    } catch (error) {
        console.error("Lỗi confirmToMain:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    } finally {
        if (connection) connection.release();
    }
};

const getChinhThuc = async (req, res) => {
    const { NamHoc } = req.params;
    // enforceKhoaFilter middleware đã override req.params.Khoa nếu user là khoa
    const Khoa = req.params.Khoa;
    let connection;
    try {
        connection = await createPoolConnection();
        const results = await repo.getOfficialTable(connection, { namHoc: NamHoc, khoa: Khoa });
        res.json(results);
    } catch (error) {
        console.error("Lỗi getChinhThuc:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

const approve = async (req, res) => {
    const { ID } = req.params;
    const { type } = req.body;
    const { userId, userName } = getUserContext(req);
    const columnMap = { khoa: "khoa_duyet", daotao: "dao_tao_duyet" };
    const column = columnMap[type];
    if (!column) return res.status(400).json({ success: false, message: "Loại duyệt không hợp lệ" });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.updateApproval(connection, ID, column, 1);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy" });
        try { await LogService.logChange(userId, userName, "Duyệt lớp ngoài QC", `Duyệt ${type} ID: ${ID}`); } catch (error) { console.error(error); }
        res.json({ success: true, message: "Duyệt thành công" });
    } catch (error) {
        console.error("Lỗi approve:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

const unapprove = async (req, res) => {
    const { ID } = req.params;
    const { type } = req.body;
    const { userId, userName } = getUserContext(req);
    const columnMap = { khoa: "khoa_duyet", daotao: "dao_tao_duyet" };
    const column = columnMap[type];
    if (!column) return res.status(400).json({ success: false, message: "Loại duyệt không hợp lệ" });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.updateApproval(connection, ID, column, 0);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy" });
        try { await LogService.logChange(userId, userName, "Bỏ duyệt lớp ngoài QC", `Bỏ ${type} ID: ${ID}`); } catch (error) { console.error(error); }
        res.json({ success: true, message: "Bỏ duyệt thành công" });
    } catch (error) {
        console.error("Lỗi unapprove:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

const batchApprove = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        await connection.beginTransaction();

        const updateGroups = {};
        records.forEach((record) => {
            const recordId = record.ID || record.id;
            if (!recordId) return;
            const khoa = baseMapper.toInt(baseMapper.pick(record, "khoa_duyet", "KhoaDuyet", "khoaduyet"), 0);
            const daoTao = baseMapper.toInt(baseMapper.pick(record, "dao_tao_duyet", "DaoTaoDuyet", "daotaoduyet"), 0);
            const key = `${khoa}_${daoTao}`;
            if (!updateGroups[key]) updateGroups[key] = [];
            updateGroups[key].push(recordId);
        });

        const updatedCount = await repo.batchUpdateApproval(connection, updateGroups);
        await connection.commit();

        try { await LogService.logChange(userId, userName, "Batch duyệt ngoài QC (Bulk)", `${updatedCount} bản ghi`); } catch (error) { console.error(error); }
        res.json({ success: true, message: `Cập nhật ${updatedCount} bản ghi thành công` });
    } catch (error) {
        console.error("Lỗi batchApprove:", error);
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

const editChinhThuc = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ success: false, message: "Thiếu ID" });

    let connection;
    try {
        console.log("[LNQC][editChinhThuc] params:", { ID });
        console.log("[LNQC][editChinhThuc] body:", {
            he_dao_tao_id: req.body?.he_dao_tao_id,
            HeDaoTaoId: req.body?.HeDaoTaoId,
            he_dao_tao: req.body?.he_dao_tao,
            HeDaoTao: req.body?.HeDaoTao
        });

        connection = await createPoolConnection();
        const data = mapper.toEntity(req.body);
        console.log("[LNQC][editChinhThuc] mapped he_dao_tao:", data.he_dao_tao);
        const values = [
            data.nam_hoc,
            data.ki_hoc,
            data.course_name,
            data.course_code,
            data.credit_hours,
            data.course_name, // TenLop
            data.ll_total,
            data.student_quantity,
            data.ll_code,
            data.bonus_time,
            data.student_bonus,
            data.qc,
            data.lecturer,
            data.major,
            data.he_dao_tao,
            data.note,
            data.start_date,
            data.end_date,
            baseMapper.toInt(req.body.tt, 0), // TT is usually passed directly or from body
            data.course_id,
            data.lecturer, // GiaoVienGiangDay
            baseMapper.toInt(req.body.moi_giang, 0),
            data.dot,
            baseMapper.toInt(req.body.hoan_thanh, 0),
        ];
        console.log("[LNQC][editChinhThuc] update values he_dao_tao:", values[14]);

        const [result] = await repo.updateOfficial(connection, ID, values);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi" });

        try { await LogService.logChange(userId, userName, "Sửa lớp ngoài QC (chính thức)", `ID: ${ID}`); } catch (error) { console.error(error); }
        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (error) {
        console.error("Lỗi editChinhThuc:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

const deleteChinhThuc = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ success: false, message: "Thiếu ID" });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.deleteOfficial(connection, ID);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi" });
        try { await LogService.logChange(userId, userName, "Xóa lớp ngoài QC (chính thức)", `ID: ${ID}`); } catch (error) { console.error(error); }
        res.json({ success: true, message: "Xóa thành công!" });
    } catch (error) {
        console.error("Lỗi deleteChinhThuc:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    save,
    getTable,
    edit,
    delete: deleteRecord,
    deleteByFilter,
    confirmToMain,
    getChinhThuc,
    editChinhThuc,
    deleteChinhThuc,
    approve,
    unapprove,
    batchApprove,
};
````

## File: src/views/vuotgio_v2/vuotgio.duyet.coiChamRaDe.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Coi chấm ra đề thi - Vượt Giờ V2</title>

    <!-- Bootstrap 5 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />

    <!-- SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

    <!-- Custom Styles -->
    <link rel="stylesheet" href="/css/admin.css" />
    <link rel="stylesheet" href="/css/styles.css" />
    <link rel="stylesheet" href="/css/table.css" />
    <link rel="stylesheet" href="/css/teachingInfo.css" />

    <style>
        .vuotgio-v2-container {
            padding: 20px;
        }

        .page-header {
            margin-bottom: 20px;
        }

        .page-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #333;
        }

        .grid-container {
            background: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .grid-toolbar {
            display: flex;
            gap: 15px;
            align-items: flex-end;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }

        .search {
            width: 200px;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            height: 50px;
        }

        .btn-action {
            padding: 4px 8px;
            font-size: 0.85rem;
        }

        .fixed-section {
            height: 500px;
            overflow-y: auto;
        }

        /* Summary Popup Styles */
        .summary {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.9);
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .summary.collapsed {
            transform: translateY(calc(100% + 10px));
        }

        .summary-toggle {
            position: absolute;
            top: -35px;
            right: 0;
            width: 35px;
            height: 35px;
            background: #0d6efd;
            color: white;
            border: none;
            border-radius: 10px 0 0 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }

        .summary.collapsed .summary-toggle {
            transform: translateY(5px);
            border-radius: 10px 10px 0 0;
            right: 10px;
            top: -40px;
        }

        .summary-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            min-width: 200px;
            padding: 4px 0;
        }

        .summary-box .label {
            color: #516078;
            font-size: 0.85rem;
            font-weight: 500;
        }

        .summary-box .value {
            color: #0d6efd;
            font-weight: 700;
            font-size: 1rem;
        }
    </style>
</head>

<body>
    <%- include('../header') %>

        <div class="vuotgio-v2-container">
            <div class="summary" id="summaryBox">
                <button class="summary-toggle" id="btnToggleSummary" title="Ẩn/Hiện tổng kết">
                    <i class="bi bi-chevron-down"></i>
                </button>
                <div class="summary-box">
                    <div class="label">Tổng giảng viên</div>
                    <div class="value" id="totalTeachers">0</div>
                </div>
                <div class="summary-box">
                    <div class="label">Tổng số tiết QC</div>
                    <div class="value" id="totalQC">0</div>
                </div>
            </div>

            <!-- Data Lock Banner -->
            <div id="dataLockBanner" class="alert alert-warning align-items-center mb-3 d-none" role="alert">
                <i class="bi bi-info-circle-fill me-2 fs-5"></i>
                <span id="dataLockMessage"></span>
            </div>

            <!-- Page Header -->
            <!-- <div class="page-header">
                <h2 class="page-title">Duyệt Thông Tin Coi, Chấm, Ra Đề Thi</h2>
            </div> -->

            <!-- Grid Section -->
            <div class="grid-container">
                <!-- Toolbar: Dropdowns + Buttons -->
                <div class="grid-toolbar">
                   <select class="selectop" id="namHocXem" style="width: 130px; margin: 0; box-shadow: none;">
                        <option value="">Chọn năm học</option>
                    </select>
                    <select class="selectop" id="khoaXem" style="width: 150px; margin: 0; box-shadow: none;">
                        <option value="ALL" selected>Tất cả khoa</option>
                    </select>
                    <button id="loadDataBtn" class="btn btn-primary" style="height: 45px; width: 130px; margin: 0;">
                        Hiển thị
                    </button>
                    <button id="updateApprovalBtn" class="btn btn-success"
                        style="height: 45px; width: 130px; margin: 0; display: none;">
                        CẬP NHẬT
                    </button>
                </div>

                <!-- Filter Row -->
                <div class="d-flex my-3" style="height: 70px">
                    <input type="text" id="filterGiangVien" placeholder="Tìm theo tên giảng viên"
                        class="form-control m-2 search" />
                    <input type="text" id="filterHocPhan" placeholder="Tìm theo tên học phần"
                        class="form-control m-2 search" />
                </div>

                <!-- Table Section -->
                <div id="renderInfo" class="fixed-section">
                    <table class="text-center" style="width: 100%">
                        <thead>
                            <tr>
                                <th style="width: 40px;">STT</th>
                                <th style="width: 180px;">Giảng viên</th>
                                <th style="width: 70px;">Khoa</th>
                                <th style="width: 140px;">Hệ đào tạo</th>
                                <th style="width: 50px;">Kì</th>
                                <th style="width: 200px;">Tên học phần</th>
                                <th style="width: 100px;">Lớp HP</th>
                                <th style="width: 100px;">Loại KTHP</th>
                                <th style="width: 80px;">Số tiết QC</th>
                                <th style="width: 160px;">Ghi chú</th>
                                <th style="width: 80px;" id="khoaColumn">
                                    <div class="form-check d-flex justify-content-center align-items-center">
                                        <input class="check me-1" type="checkbox" id="checkAllKhoa"
                                            onclick="checkAll('khoa')" />
                                        <label class="form-check-label" for="checkAllKhoa">Khoa</label>
                                    </div>
                                </th>
                                <th style="width: 80px;" id="khaoThiColumn">
                                    <div class="form-check d-flex justify-content-center align-items-center">
                                        <input class="check me-1" type="checkbox" id="checkAllKhaoThi"
                                            onclick="checkAll('khaoThi')" />
                                        <label class="form-check-label text-nowrap" for="checkAllKhaoThi">K.Thí</label>
                                    </div>
                                </th>
                                <th style="width: 100px;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            <!-- Dữ liệu sẽ được chèn vào đây -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Edit Modal -->
        <div class="modal fade" id="editModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Sửa Kết Thúc Học Phần</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editForm">
                            <input type="hidden" id="editID" />
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <label class="form-label">Năm học</label>
                                    <select id="editNamHoc" class="form-select"></select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Học kỳ</label>
                                    <select id="editHocKy" class="form-select">
                                        <option value="1">Học kỳ 1</option>
                                        <option value="2">Học kỳ 2</option>
                                        <option value="3">Học kỳ hè</option>
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Khoa</label>
                                    <select id="editKhoa" class="form-select"></select>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Tên học phần</label>
                                    <input type="text" id="editTenHP" class="form-control" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Mã HP</label>
                                    <input type="text" id="editMaHP" class="form-control" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Số TC</label>
                                    <input type="number" id="editSoTC" class="form-control" />
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <label class="form-label">Giảng viên</label>
                                    <input type="text" id="editGiangVien" class="form-control" />
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Lớp HP</label>
                                    <input type="text" id="editLopHP" class="form-control" />
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Sĩ số</label>
                                    <input type="number" id="editSiSo" class="form-control" />
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <label class="form-label">Hệ đào tạo</label>
                                    <select id="editHeDaoTao" class="form-select"></select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Loại KTHP</label>
                                    <select id="editLoaiKTHP" class="form-select">
                                        <option value="Ra đề">Ra đề</option>
                                        <option value="Coi thi">Coi thi</option>
                                        <option value="Chấm thi">Chấm thi</option>
                                        <option value="Ngân hàng câu hỏi">Ngân hàng câu hỏi</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Số tiết QC</label>
                                    <input type="number" id="editSoTietQC" class="form-control" step="0.5" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Ghi chú</label>
                                    <input type="text" id="editGhiChu" class="form-control" />
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-primary" id="saveEditBtn">Lưu thay đổi</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>

        <script src="/js/vuotgio_v2/khoaFilter.utils.js"></script>
        <script src="/js/vuotgio_v2/duyetKTHP/index.js"></script>

        <!-- Data Lock Check -->
        <script>
        (function() {
            const namHocSelect = document.getElementById('namHocXem');
            const banner = document.getElementById('dataLockBanner');
            const bannerMsg = document.getElementById('dataLockMessage');

            function checkLockStatus() {
                const namHoc = namHocSelect ? namHocSelect.value : '';
                if (!namHoc) {
                    banner.classList.add('d-none');
                    banner.classList.remove('d-flex');
                    enableButtons();
                    return;
                }
                fetch('/v2/vuotgio/trang-thai-khoa?namHoc=' + encodeURIComponent(namHoc))
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.success && data.locked) {
                            var info = data.lockInfo;
                            bannerMsg.textContent = 'Dữ liệu năm học ' + namHoc + ' đã được lưu bởi ' + info.nguoi_khoa + ' vào ' + info.ngay_khoa + '. Không thể chỉnh sửa.';
                            banner.classList.remove('d-none');
                            banner.classList.add('d-flex');
                            disableButtons();
                        } else {
                            banner.classList.add('d-none');
                            banner.classList.remove('d-flex');
                            enableButtons();
                        }
                    })
                    .catch(function() {
                        banner.classList.add('d-none');
                        banner.classList.remove('d-flex');
                        enableButtons();
                    });
            }

            function disableButtons() {
                var actionBtns = document.querySelectorAll('#updateApprovalBtn, #checkAllKhoa, #checkAllKhaoThi');
                actionBtns.forEach(function(btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                });
                document.querySelectorAll('#tableBody .btn-action, #tableBody .btn').forEach(function(btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                });
                document.body.dataset.locked = 'true';
            }

            function enableButtons() {
                var actionBtns = document.querySelectorAll('#updateApprovalBtn, #checkAllKhoa, #checkAllKhaoThi');
                actionBtns.forEach(function(btn) {
                    btn.disabled = false;
                    btn.style.opacity = '';
                    btn.style.pointerEvents = '';
                });
                document.querySelectorAll('#tableBody .btn-action, #tableBody .btn').forEach(function(btn) {
                    btn.disabled = false;
                    btn.style.opacity = '';
                    btn.style.pointerEvents = '';
                });
                document.body.dataset.locked = 'false';
            }

            if (namHocSelect) {
                namHocSelect.addEventListener('change', checkLockStatus);
            }
            setTimeout(checkLockStatus, 500);

            // Re-check after data loads
            var observer = new MutationObserver(function() {
                if (document.body.dataset.locked === 'true') {
                    disableButtons();
                }
            });
            var tableBody = document.getElementById('tableBody');
            if (tableBody) {
                observer.observe(tableBody, { childList: true });
            }
        })();
        </script>
</body>

</html>
````

## File: src/views/vuotgio_v2/vuotgio.tongHopKhoa.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thống Kê Khoa/Phòng - Vượt Giờ V2</title>

  <!-- Bootstrap 5 -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />

  <!-- Font Awesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />

  <!-- SweetAlert2 -->
  <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&display=swap" rel="stylesheet" />

  <!-- Custom Styles -->
  <link rel="stylesheet" href="/css/admin.css" />
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="stylesheet" href="/css/table.css" />

  <style>
    :root {
      --primary:       #1A56DB;
      --primary-light: #EBF1FF;
      --primary-dark:  #0C3BAD;
      --accent-amber:  #D97706;
      --accent-amber-bg: #FEF3C7;
      --accent-green:  #059669;
      --accent-green-bg: #D1FAE5;
      --accent-red:    #DC2626;
      --accent-red-bg: #FEE2E2;
      --surface:       #F8FAFC;
      --card-bg:       #FFFFFF;
      --border:        #E2E8F0;
      --text-main:     #1E293B;
      --text-muted:    #64748B;
      --text-light:    #94A3B8;
      --radius-sm:     6px;
      --radius-md:     10px;
      --radius-lg:     14px;
      --shadow-sm:     0 1px 3px rgba(0,0,0,.07);
      --shadow-md:     0 4px 12px rgba(0,0,0,.08);
    }

    *, *::before, *::after { box-sizing: border-box; }

    body {
      font-family: 'Be Vietnam Pro', sans-serif;
      background: var(--surface);
      color: var(--text-main);
      font-size: 14px;
    }

    /* ── Page wrapper ── */
    .vg-page {
      max-width: 1440px;
      margin: 0 auto;
      padding: 20px 24px 40px;
    }

    /* ── Page header ── */
    .vg-page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }

    .vg-page-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .vg-page-title .icon-wrap {
      width: 36px; height: 36px;
      background: var(--primary-light);
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      color: var(--primary);
      font-size: 16px;
    }

    .vg-breadcrumb {
      font-size: 12px;
      color: var(--text-muted);
    }

    .vg-breadcrumb a { color: var(--primary); text-decoration: none; }
    .vg-breadcrumb a:hover { text-decoration: underline; }

    /* ── KPI Cards ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 14px 16px;
      box-shadow: var(--shadow-sm);
      transition: box-shadow .2s;
    }

    .kpi-card:hover { box-shadow: var(--shadow-md); }

    .kpi-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .04em;
      margin-bottom: 6px;
    }

    .kpi-value {
      font-size: 22px;
      font-weight: 600;
      line-height: 1.1;
    }

    .kpi-sub {
      font-size: 11px;
      color: var(--text-light);
      margin-top: 3px;
    }

    .kpi-card.blue  .kpi-value { color: var(--primary); }
    .kpi-card.amber .kpi-value { color: var(--accent-amber); }
    .kpi-card.green .kpi-value { color: var(--accent-green); }

    .kpi-card .kpi-badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 11px;
      font-weight: 500;
      margin-top: 4px;
      padding: 2px 7px;
      border-radius: 20px;
    }

    /* ── Toolbar ── */
    .vg-toolbar {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-bottom: none;
      border-radius: var(--radius-md) var(--radius-md) 0 0;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .vg-toolbar select {
      height: 36px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 13px;
      color: var(--text-main);
      background: var(--surface);
      cursor: pointer;
    }

    .vg-toolbar select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(26,86,219,.12);
    }

    .btn-primary-vg {
      height: 36px;
      padding: 0 18px;
      background: var(--primary);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      font-family: inherit;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background .15s, transform .1s;
    }

    .btn-primary-vg:hover  { background: var(--primary-dark); }
    .btn-primary-vg:active { transform: scale(.98); }

    .toolbar-divider {
      width: 1px; height: 24px;
      background: var(--border);
      margin: 0 4px;
    }

    .tab-toggle {
      display: flex;
      gap: 4px;
    }

    .tab-toggle button {
      height: 32px;
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      background: transparent;
      font-family: inherit;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-muted);
      cursor: pointer;
      transition: all .15s;
    }

    .tab-toggle button.active {
      background: var(--primary-light);
      color: var(--primary);
      border-color: var(--primary);
    }

    .toolbar-spacer { flex: 1; }

    .toolbar-info {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* ── Chart section ── */
    .chart-section {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-bottom: none;
      padding: 16px;
    }

    .chart-section-inner {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }

    .chart-card {
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 14px;
    }

    .chart-card-wide {
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 14px;
    }

    .chart-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    .chart-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-main);
    }

    .chart-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 10px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      color: var(--text-muted);
    }

    .legend-dot {
      width: 9px; height: 9px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    /* ── Table section ── */
    .table-wrapper {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 0 0 var(--radius-md) var(--radius-md);
      overflow-x: auto;
      box-shadow: var(--shadow-sm);
    }

    #mainTable {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }

    #mainTable thead th {
      background: var(--primary);
      color: #fff;
      padding: 9px 8px;
      font-weight: 500;
      font-size: 11.5px;
      text-align: center;
      vertical-align: middle;
      border-right: 1px solid rgba(255,255,255,.15);
      white-space: nowrap;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    #mainTable thead th:last-child { border-right: none; }

    #mainTable tbody tr {
      border-bottom: 1px solid var(--border);
      transition: background .1s;
    }

    #mainTable tbody tr:hover { background: var(--primary-light); }
    #mainTable tbody tr:nth-child(even) { background: #F8FAFC; }
    #mainTable tbody tr:nth-child(even):hover { background: var(--primary-light); }

    #mainTable td {
      padding: 8px 8px;
      text-align: center;
      color: var(--text-main);
      vertical-align: middle;
    }

    td.name-col {
      text-align: left;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 180px;
    }

    td.num { font-variant-numeric: tabular-nums; }
    td.total { font-weight: 600; color: var(--primary); }
    td.vuot  { font-weight: 600; color: var(--accent-amber); }
    td.paid  { font-weight: 600; color: var(--accent-green); }

    .dept-dot {
      display: inline-block;
      width: 7px; height: 7px;
      border-radius: 50%;
      margin-right: 6px;
      flex-shrink: 0;
    }

    .btn-eye {
      width: 26px; height: 26px;
      background: var(--primary-light);
      color: var(--primary);
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      font-size: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background .15s;
    }

    .btn-eye:hover { background: var(--primary); color: #fff; }

    .btn-eye.ms-1 {
      margin-left: 4px;
    }

    /* tfoot */
    #mainTable tfoot tr {
      background: #EEF3FF !important;
    }

    #mainTable tfoot td {
      padding: 9px 8px;
      font-weight: 600;
      font-size: 12.5px;
      border-top: 2px solid #A5B4FC;
      color: var(--text-main);
    }

    #mainTable tfoot td.total { color: var(--primary); }
    #mainTable tfoot td.vuot  { color: var(--accent-amber); }
    #mainTable tfoot td.paid  { color: var(--accent-green); }

    /* ── Loading skeleton ── */
    @keyframes shimmer {
      0%   { background-position: -600px 0; }
      100% { background-position:  600px 0; }
    }

    .skeleton-row td {
      background: linear-gradient(90deg, #f0f4f8 25%, #e2e8f0 50%, #f0f4f8 75%);
      background-size: 600px 100%;
      animation: shimmer 1.2s infinite;
      color: transparent !important;
      border-radius: 4px;
      height: 36px;
    }

    /* ── Responsive ── */
    @media (max-width: 1100px) {
      .kpi-grid { grid-template-columns: repeat(3, 1fr); }
      .chart-section-inner { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .vg-page  { padding: 12px 14px 30px; }
    }
  </style>
</head>

<body>
  <%- include('../header') %>

  <div class="vg-page">

    <!-- Page Header -->
    <div class="vg-page-header">
      <div>
        <div class="vg-page-title">
          <span class="icon-wrap"><i class="fas fa-building"></i></span>
          Thống kê vượt giờ khoa / phòng
        </div>
        <div class="vg-breadcrumb mt-1">
          <a href="#">Trang chủ</a> / <a href="#">Vượt giờ</a> / Thống kê khoa/phòng
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card blue">
        <div class="kpi-label">Số giảng viên</div>
        <div class="kpi-value" id="sumGV">—</div>
        <div class="kpi-sub">Tổng toàn học viện</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-label">Số đơn vị</div>
        <div class="kpi-value" id="sumKhoa">—</div>
        <div class="kpi-sub">Khoa / phòng</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tổng thực hiện</div>
        <div class="kpi-value" id="sumTH" style="color:var(--text-main);">—</div>
        <div class="kpi-sub">Tiết giảng</div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-label">Tổng vượt giờ</div>
        <div class="kpi-value" id="sumVuot">—</div>
        <div class="kpi-sub">Tổng tiết vượt giờ</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-label">Được thanh toán</div>
        <div class="kpi-value" id="sumThanhToan">—</div>
        <div class="kpi-sub">Tổng tiết vượt giờ được thanh toán</div>
      </div>
    </div>

    <!-- Charts -->
    <div class="chart-section">
      <div class="chart-section-inner">
        <!-- Bar chart -->
        <div class="chart-card">
          <div class="chart-head">
            <span class="chart-title">Vượt giờ theo khoa / phòng</span>
          </div>
          <div class="chart-legend" id="legendBar">
            <span class="legend-item"><span class="legend-dot" style="background:#1A56DB;"></span>Thực hiện</span>
            <span class="legend-item"><span class="legend-dot" style="background:#D97706;"></span>Vượt giờ</span>
            <span class="legend-item"><span class="legend-dot" style="background:#059669;"></span>Thanh toán</span>
          </div>
          <div style="position:relative;height:220px;">
            <canvas id="barChart" role="img" aria-label="Biểu đồ cột so sánh thực hiện, vượt giờ, thanh toán theo khoa">Dữ liệu đang tải...</canvas>
          </div>
        </div>

        <!-- Donut chart -->
        <div class="chart-card">
          <div class="chart-head">
            <span class="chart-title">Tỷ lệ vượt giờ được thanh toán</span>
          </div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot" style="background:#059669;"></span>Được thanh toán</span>
            <span class="legend-item"><span class="legend-dot" style="background:#F87171;"></span>Vượt giờ ngoài thanh toán</span>
          </div>
          <div style="position:relative;height:220px;">
            <canvas id="donutChart" role="img" aria-label="Biểu đồ tròn tỷ lệ được thanh toán">Dữ liệu đang tải...</canvas>
          </div>
        </div>
      </div>

      <!-- Stacked bar -->
      <div class="chart-card-wide">
        <div class="chart-head">
          <span class="chart-title">Phân tích chi tiết giờ theo khoa (stacked)</span>
        </div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-dot" style="background:#1A56DB;"></span>Giảng dạy</span>
          <span class="legend-item"><span class="legend-dot" style="background:#059669;"></span>Ngoài QC</span>
          <span class="legend-item"><span class="legend-dot" style="background:#D97706;"></span>KTHP</span>
          <span class="legend-item"><span class="legend-dot" style="background:#7C3AED;"></span>Đồ án</span>
          <span class="legend-item"><span class="legend-dot" style="background:#DB2777;"></span>TQTT</span>
        </div>
        <div style="position:relative;height:200px;">
          <canvas id="stackedChart" role="img" aria-label="Biểu đồ cột chồng phân tích chi tiết giờ theo từng khoa">Dữ liệu đang tải...</canvas>
        </div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="vg-toolbar">
      <select id="namHocXem"></select>
      <button id="loadDataBtn" class="btn-primary-vg">
        <i class="fas fa-sync-alt"></i> Hiển thị
      </button>

      <div class="toolbar-divider"></div>

      <div class="tab-toggle">
        <button id="tabAll" class="active" onclick="switchTab('all')">
          <i class="fas fa-table me-1"></i>Đầy đủ
        </button>
        <button id="tabCompact" onclick="switchTab('compact')">
          <i class="fas fa-compress me-1"></i>Gọn
        </button>
      </div>

      <div class="toolbar-spacer"></div>
      <span class="toolbar-info" id="toolbarInfo">Chọn năm học để tải dữ liệu</span>
    </div>

    <!-- Table -->
    <div class="table-wrapper">
      <table id="mainTable">
        <thead>
          <tr>
            <th rowspan="2" style="width:40px;">STT</th>
            <th rowspan="2" style="width:70px;">Mã phòng ban</th>
            <th rowspan="2" style="min-width:160px;">Khoa / Phòng</th>
            <th rowspan="2" style="width:50px;">Số GV</th>
            <th colspan="5" id="detailHeadSpan">Chi Tiết</th>
            <th rowspan="2" style="width:90px;">Thực Hiện</th>
            <th rowspan="2" style="width:80px;">Vượt Giờ</th>
            <th rowspan="2" style="width:90px;">VG Được Thanh Toán</th>
            <th rowspan="2" style="width:48px;"></th>
          </tr>
          <tr id="subHeadRow">
            <th style="width:80px;">Giảng Dạy</th>
            <th style="width:80px;">Ngoài QC</th>
            <th style="width:70px;">KTHP</th>
            <th style="width:70px;">Đồ Án</th>
            <th style="width:80px;">TQ TT</th>
          </tr>
        </thead>
        <tbody id="tableBody">
          <!-- skeleton rows -->
          <tr class="skeleton-row"><td colspan="13">&nbsp;</td></tr>
          <tr class="skeleton-row"><td colspan="13">&nbsp;</td></tr>
          <tr class="skeleton-row"><td colspan="13">&nbsp;</td></tr>
        </tbody>
        <tfoot id="tableFoot"></tfoot>
      </table>
    </div>

  </div><!-- /vg-page -->

  <!-- Scripts -->
  <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>

  <script src="/js/vuotgio_v2/tongHop/khoa.js"></script>
</body>

</html>
````

## File: src/controllers/vuotgio_v2/coiChamRaDe.file.controller.js
````javascript
/**
 * VUOT GIO V2 - Coi Chấm Ra Đề (KTHP) File Controller
 * Date: 2026-04-28
 */

const service = require("../../services/vuotgio_v2/kthp.service");
const importService = require("../../services/vuotgio_v2/kthpImport.service");

/**
 * Phân loại dữ liệu từ file Excel
 */
const readFileExcel = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'Không có file được tải lên' });
        const data = await importService.parseExcelFile(req.file.buffer);
        res.json(data);
    } catch (error) {
        console.error("[readFileExcel] Error:", error);
        res.status(500).json({ error: 'Lỗi khi xử lý file' });
    }
};

/**
 * Import dữ liệu từ bộ nhớ/client vào DB
 */
const importWorkloadToDB = async (req, res) => {
    try {
        const { ki, nam, hocKy, namHoc, workloadData } = req.body;
        const kiVal = hocKy || ki;
        const namVal = namHoc || nam;
        if (!req.session?.userId) {
            return res.status(401).json({ success: false, message: "Vui lòng đăng nhập để tiếp tục" });
        }
        const user = {
            id: req.session.userId,
            userName: req.session.TenNhanVien || req.session.username || 'Unknown'
        };

        const count = await importService.importToDB(workloadData, { ki: kiVal, nam: namVal, user });
        res.json({ success: true, message: `Đã import ${count} bản ghi thành công!` });
    } catch (error) {
        console.error("[importWorkloadToDB] Error:", error);
        res.status(500).json({ error: "Lỗi khi import dữ liệu vào database!" });
    }
};

/**
 * Lưu dữ liệu từ file Excel (bao gồm thêm mới và chỉnh sửa)
 */
const saveWorkloadData = async (req, res) => {
    try {
        const { Ki, Nam, hocKy, namHoc, data } = req.body;
        const kiVal = hocKy || Ki;
        const namVal = namHoc || Nam;

        const workloadData = {
            raDe: [],
            coiThi: [],
            chamThi: []
        };

        const updates = [];

        if (Array.isArray(data)) {
            data.forEach(item => {
                const type = item.Type || item.type;
                if (item.id || item.ID) {
                    updates.push(item);
                } else {
                    if (type === "Ra Đề" || type === "Ra đề") {
                        workloadData.raDe.push(item);
                    } else if (type === "Coi Thi" || type === "Coi thi") {
                        workloadData.coiThi.push(item);
                    } else if (type === "Chấm Thi" || type === "Chấm thi") {
                        workloadData.chamThi.push(item);
                    }
                }
            });
        }

        const user = {
            id: req.session?.userId || 1,
            userName: req.session?.TenNhanVien || req.session?.username || 'Unknown'
        };

        let insertedCount = 0;
        if (workloadData.raDe.length > 0 || workloadData.coiThi.length > 0 || workloadData.chamThi.length > 0) {
            insertedCount = await importService.importToDB(workloadData, { ki: kiVal, nam: namVal, user });
        }

        if (updates.length > 0) {
            req.body.data = updates;
            return service.updateBatch(req, res);
        }

        return res.json({ success: true, message: `Đã lưu ${insertedCount} bản ghi thành công!` });
    } catch (error) {
        console.error("[saveWorkloadData] Error:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lưu dữ liệu!" });
    }
};

/**
 * Gợi ý học phần
 */
const getSuggestions = async (req, res) => {
    let connection;
    try {
        const pool = require("../../config/databasePool");
        connection = await pool();
        const [rows] = await connection.execute("SELECT DISTINCT TenHP AS value FROM quychuan ORDER BY TenHP");
        res.json(rows);
    } catch (error) {
        res.status(500).json([]);
    } finally {
        if (connection) connection.release();
    }
};


// --- Export các hàm từ service để giữ tương thích Route ---
module.exports = {
    getWorkload: (req, res) => res.json({ raDe: [], coiThi: [], chamThi: [] }), // Placeholder cho client cũ
    readFileExcel,
    importWorkloadToDB,
    deleteWorkloadData: service.deleteByFilter,
    saveWorkloadData,
    checkDataExistence: service.checkExistence,
    getSuggestions,
};
````

## File: src/controllers/vuotgio_v2/lopNgoaiQC.controller.js
````javascript
module.exports = require("../../services/vuotgio_v2/lnqc.service");
````

## File: src/mappers/vuotgio_v2/summary.mapper.js
````javascript
/**
 * VUOT GIO V2 - Summary Mapper
 * Xử lý ánh xạ và tính toán số tiết tổng hợp cho SDO (Standardized Data Object)
 */

const base = require("./base.mapper");
const PaymentCalculator = require("../../services/vuotgio_v2/department_excel/data/calculator");

/**
 * Công thức tính toán các chỉ số vượt giờ cốt lõi
 * @param {Object} params - Các thông số đầu vào
 */
const calculateOvertime = (params) => {
    const {
        soTietGiangDay = 0,
        soTietNgoaiQC = 0,
        soTietKTHP = 0,
        soTietDoAn = 0,
        soTietHDTQ = 0,
        soTietNCKH = 0,
        phanTramMienGiam = 0,
        dinhMucChuan = 280,
        dinhMucNCKH = 280
    } = params;

    // 1. Tổng số tiết thực hiện
    const tongThucHien = soTietGiangDay + soTietNgoaiQC + soTietKTHP + soTietDoAn + soTietHDTQ;
    
    // 4. Số tiết được giảm trừ
    const mienGiam = dinhMucChuan * (base.toDecimal(phanTramMienGiam) / 100);
    
    // 6. Số tiết sau giảm trừ (Mục 2 - Mục 4)
    const dinhMucSauMienGiam = dinhMucChuan - mienGiam;

    // 3. Số tiết chưa hoàn thành NCKH
    // Định mức NCKH cũng phải được hưởng giảm trừ tương ứng như định mức giảng dạy
    const mienGiamNCKH = dinhMucNCKH * (base.toDecimal(phanTramMienGiam) / 100);
    const dinhMucNCKHSauGiam = dinhMucNCKH - mienGiamNCKH;
    const thieuNCKH = Math.max(0, dinhMucNCKHSauGiam - soTietNCKH);
    
    // 5. Tổng số tiết vượt giờ được thanh toán
    // Công thức: (Mục 1 - Mục 3) - Mục 6
    let tongVuot = (tongThucHien - thieuNCKH) - dinhMucSauMienGiam;
    tongVuot = Math.max(0, tongVuot);
    
    // Giới hạn thanh toán chỉ được phép <= Mục 6
    const thanhToan = Math.min(tongVuot, dinhMucSauMienGiam);

    return {
        tongThucHien: base.toDecimal(tongThucHien.toFixed(2)),
        mienGiam: base.toDecimal(mienGiam.toFixed(2)),
        dinhMucSauMienGiam: base.toDecimal(dinhMucSauMienGiam.toFixed(2)),
        thieuTietGiangDay: base.toDecimal(Math.max(0, dinhMucSauMienGiam - tongThucHien).toFixed(2)),
        thieuNCKH: base.toDecimal(thieuNCKH.toFixed(2)),
        tongVuot: base.toDecimal(tongVuot.toFixed(2)),
        thanhToan: base.toDecimal(thanhToan.toFixed(2)),
        dinhMucChuan
    };
};

const trainingSystemMapper = require("./trainingSystem.mapper");

/**
 * Xây dựng bảng tổng hợp theo hệ đào tạo (Mục F)
 */
const buildTableF = (rawData) => {
    const { giangDay = [], lopNgoaiQC = [], kthp = [], doAn = [], hdtq = [] } = rawData;

    // Dùng normalized category key thay vì raw tên hệ đào tạo
    // → doAn "Hệ Mật mã" và giangDay "Hệ Mật mã VN (ĐTKTKM)" đều map về "vn"
    const CATEGORY_ORDER = ["vn", "lao", "cuba", "cpc", "dongHP"];
    const groups = new Map();

    const getGroup = (tenHeDaoTao) => {
        const key = trainingSystemMapper.getCategoryKey(tenHeDaoTao);
        if (!groups.has(key)) {
            groups.set(key, {
                doi_tuong: trainingSystemMapper.getLabel(key),
                hk1: 0,
                hk2: 0,
                do_an: 0,
                tham_quan: 0,
                tong: 0
            });
        }
        return groups.get(key);
    };

    // 1. Giảng dạy
    giangDay.forEach(r => {
        const g = getGroup(r.ten_he_dao_tao);
        const val = base.toDecimal(r.QuyChuan);
        if (Number(r.HocKy) === 2) g.hk2 += val;
        else g.hk1 += val;
    });

    // 2. Lớp ngoài QC
    lopNgoaiQC.forEach(r => {
        const g = getGroup(r.ten_he_dao_tao);
        const val = base.toDecimal(r.quy_chuan);
        if (Number(r.hoc_ky) === 2) g.hk2 += val;
        else g.hk1 += val;
    });

    // 3. KTHP (Coi chấm thi)
    kthp.forEach(r => {
        const g = getGroup(r.ten_he_dao_tao);
        const val = base.toDecimal(r.quy_chuan);
        if (Number(r.hoc_ky) === 2) g.hk2 += val;
        else g.hk1 += val;
    });

    // 4. Đồ án (không có HK → quy ước vào HK2)
    doAn.forEach(r => {
        const g = getGroup(r.ten_he_dao_tao || r.he_dao_tao);
        g.do_an += base.toDecimal(r.SoTiet);
    });

    // 5. Tham quan (không có HK → quy ước vào HK2)
    hdtq.forEach(r => {
        const g = getGroup(r.ten_he_dao_tao || r.he_dao_tao);
        g.tham_quan += base.toDecimal(r.so_tiet_quy_doi);
    });

    // Chuyển Map sang Array, làm tròn, tính tong
    // Chuẩn hóa 5 dòng theo thứ tự cố định
    CATEGORY_ORDER.forEach((key) => {
        if (!groups.has(key)) {
            groups.set(key, {
                doi_tuong: trainingSystemMapper.getLabel(key),
                hk1: 0,
                hk2: 0,
                do_an: 0,
                tham_quan: 0,
                tong: 0
            });
        }
    });

    const rows = CATEGORY_ORDER.map((key, idx) => {
        const row = groups.get(key);
        const hk1 = base.toDecimal(row.hk1.toFixed(2));
        const hk2 = base.toDecimal(row.hk2.toFixed(2));
        const do_an = base.toDecimal(row.do_an.toFixed(2));
        const tham_quan = base.toDecimal(row.tham_quan.toFixed(2));
        const tong = base.toDecimal((hk1 + hk2 + do_an + tham_quan).toFixed(2));
        return {
            tt: idx + 1,
            doi_tuong: row.doi_tuong,
            hk1,
            hk2,
            do_an,
            tham_quan,
            tong
        };
    });

    // Tính tổng cộng footer
    const totals = {
        hk1: base.toDecimal(rows.reduce((s, r) => s + r.hk1, 0).toFixed(2)),
        hk2: base.toDecimal(rows.reduce((s, r) => s + r.hk2, 0).toFixed(2)),
        do_an: base.toDecimal(rows.reduce((s, r) => s + r.do_an, 0).toFixed(2)),
        tham_quan: base.toDecimal(rows.reduce((s, r) => s + r.tham_quan, 0).toFixed(2)),
        tong: base.toDecimal(rows.reduce((s, r) => s + r.tong, 0).toFixed(2))
    };

    return { rows, totals };
};

/**
 * Ánh xạ dữ liệu thô từ DB thành Atomic SDO cho 1 giảng viên
 */
const toAtomicSDO = (nv, rawData, namHoc, globalDinhMuc, extraInfo = {}) => {
    if (!nv) return null;

    const dmChuan = base.toDecimal(globalDinhMuc?.GiangDay) || 280;
    const dmNCKH = base.toDecimal(globalDinhMuc?.NCKH) || 280;

    const stats = calculateOvertime({
        soTietGiangDay: rawData.giangDay.reduce((s, r) => s + (base.toDecimal(r.QuyChuan) || 0), 0),
        soTietNgoaiQC: rawData.lopNgoaiQC.reduce((s, r) => s + (base.toDecimal(r.quy_chuan) || 0), 0),
        soTietKTHP: rawData.kthp.reduce((s, r) => s + (base.toDecimal(r.quy_chuan) || 0), 0),
        soTietDoAn: rawData.doAn.reduce((s, r) => s + (base.toDecimal(r.SoTiet) || 0), 0),
        soTietHDTQ: rawData.hdtq.reduce((s, r) => s + (base.toDecimal(r.so_tiet_quy_doi) || 0), 0),
        soTietNCKH: rawData.nckhRecords.reduce((s, r) => s + (base.toDecimal(r.soTietGiangVien) || 0), 0),
        phanTramMienGiam: nv.phanTramMienGiam,
        dinhMucChuan: dmChuan,
        dinhMucNCKH: dmNCKH
    });

    const tableF = buildTableF(rawData);
    const breakdown = PaymentCalculator.computeSdoBreakdown(tableF, stats.thanhToan, nv.luong);

    return {
        id_User: nv.id_User,
        giangVien: nv.giangVien,
        ngaySinh: nv.ngaySinh,
        hocVi: nv.hocVi,
        hsl: nv.hsl,
        luong: nv.luong,
        soTaiKhoan: nv.soTaiKhoan,
        nganHang: nv.nganHang,
        maKhoa: nv.maKhoa,
        khoa: nv.khoa,
        isKhoa: nv.isKhoa ?? 1,   // 0 = phòng/ban, 1 = khoa — drives sheet grouping
        chucVu: nv.chucVu,
        chuNhiemKhoa: extraInfo.chuNhiemKhoa || "",
        phanTramMienGiam: nv.phanTramMienGiam,
        lyDoMienGiam: nv.lyDoMienGiam,
        ...stats,
        soTietNCKH: rawData.nckhRecords.reduce((s, r) => s + (base.toDecimal(r.soTietGiangVien) || 0), 0),
        soTietGiangDay: rawData.giangDay.reduce((s, r) => s + (base.toDecimal(r.QuyChuan) || 0), 0),
        soTietNgoaiQC: rawData.lopNgoaiQC.reduce((s, r) => s + (base.toDecimal(r.quy_chuan) || 0), 0),
        soTietKTHP: rawData.kthp.reduce((s, r) => s + (base.toDecimal(r.quy_chuan) || 0), 0),
        soTietDoAn: rawData.doAn.reduce((s, r) => s + (base.toDecimal(r.SoTiet) || 0), 0),
        soTietHDTQ: rawData.hdtq.reduce((s, r) => s + (base.toDecimal(r.so_tiet_quy_doi) || 0), 0),
        nam_hoc: namHoc,
        tableE: {
            i: stats.tongThucHien,
            ii: stats.dinhMucChuan,
            iii: stats.thieuNCKH,
            iv: stats.mienGiam,
            v: stats.tongVuot,
            vi: stats.thanhToan,
            ly_do: nv.lyDoMienGiam
        },
        tableF,
        breakdown,
        raw: rawData
    };
};

/**
 * Ánh xạ dữ liệu thô từ DB thành Collection SDO cho danh sách giảng viên (tổng hợp Khoa)
 */
const toCollectionSDO = (rawDataList, nckhMap, namHoc, globalDinhMuc) => {
    const dmChuan = base.toDecimal(globalDinhMuc?.GiangDay) || 280;
    const dmNCKH = base.toDecimal(globalDinhMuc?.NCKH) || 280;

    return rawDataList.map(r => {
        const soTietNCKH = base.toDecimal(nckhMap.get(Number(r.id_User))) || 0;
        
        const stats = calculateOvertime({
            soTietGiangDay: r.soTietGiangDay,
            soTietNgoaiQC: r.soTietNgoaiQC,
            soTietKTHP: r.soTietKTHP,
            soTietDoAn: r.soTietDoAn,
            soTietHDTQ: r.soTietHDTQ,
            soTietNCKH,
            phanTramMienGiam: r.phanTramMienGiam,
            dinhMucChuan: dmChuan,
            dinhMucNCKH: dmNCKH
        });

        // Với collectionSDO (không có tableF chi tiết), breakdown sẽ trống —
        // được bổ sung đầy đủ ở getCollectionSDODetail qua toAtomicSDO.
        return {
            ...r,
            soTaiKhoan: r.soTaiKhoan,
            nganHang: r.nganHang,
            luong: r.luong,
            ...stats,
            soTietNCKH,
            nam_hoc: namHoc
        };
    });
};

module.exports = {
    calculateOvertime,
    toAtomicSDO,
    toCollectionSDO
};
````

## File: src/public/js/vuotgio_v2/huongDanThamQuan/index.js
````javascript
/**
 * Hướng Dẫn Tham Quan Thực Tế - Frontend JS
 * VuotGio V2 - With Approval Logic
 */

$(document).ready(function () {
    let allTeachers = []; // Store all teachers for searching

    // Initialization
    initPage();

    // Event Handlers
    $('#loadDataBtn').on('click', loadTable);
    $('#so_ngay').on('input', updateQuyDoi);
    $('#dataForm').on('submit', handleFormSubmit);
    $('#updateApprovalBtn').on('click', submitApprovals);

    // --- Searchable Teacher Select Logic ---
    $('#teacherSearch').on('input', function() {
        const val = $(this).val().trim().toLowerCase();
        const list = $('#teacherList');
        list.empty();
        
        if (val.length > 0) {
            const filtered = allTeachers.filter(t => 
                t.HoTen.toLowerCase().includes(val) || 
                (t.MaNhanVien && t.MaNhanVien.toLowerCase().includes(val))
            );
            
            if (filtered.length > 0) {
                filtered.slice(0, 10).forEach(t => {
                    list.append(`<li><a class="dropdown-item" href="#" data-id="${t.id_User}" data-name="${t.HoTen}" data-khoa="${t.Khoa}">${t.HoTen} - ${t.Khoa}</a></li>`);
                });
                list.addClass('show');
            } else {
                list.removeClass('show');
            }
        } else {
            list.removeClass('show');
            $('#id_User').val('');
        }
    });

    $(document).on('click', '#teacherList .dropdown-item', function(e) {
        e.preventDefault();
        const id = $(this).data('id');
        const name = $(this).data('name');
        const khoa = $(this).data('khoa');
        
        $('#id_User').val(id);
        $('#teacherSearch').val(name);
        $('#khoa').val(khoa);
        $('#teacherList').removeClass('show');
    });

    // Close dropdown when clicking outside
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.searchable-select').length) {
            $('#teacherList').removeClass('show');
        }
    });

    // Handle form validation for teacher
    $('#dataForm').on('submit', function(e) {
        if (!$('#id_User').val()) {
            e.preventDefault();
            Swal.fire('Cảnh báo', 'Vui lòng chọn giảng viên từ danh sách gợi ý!', 'warning');
            return false;
        }
    });

    // ==================== PERMISSION HELPERS ====================

    function setupUpdateButtonVisibility() {
        const role = localStorage.getItem('userRole');
        const MaPhongBan = localStorage.getItem('MaPhongBan');
        const updateBtn = document.getElementById('updateApprovalBtn');

        const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
        const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
        const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
        const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
        const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DAOTAO';
        const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
        const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

        // Khoa: GV_CNBM duyệt, Lãnh đạo khoa bỏ duyệt
        if (role === gvCnbm || role === lanhDaoKhoa) {
            updateBtn.style.display = 'inline-flex';
        }
        // Phòng (ĐT/VP): Trợ lý duyệt, Lãnh đạo phòng bỏ duyệt
        else if ((MaPhongBan === daoTao || MaPhongBan === vanPhong) && (role === troLyPhong || role === lanhDaoPhong)) {
            updateBtn.style.display = 'inline-flex';
        }
        // Ban Giám đốc: toàn quyền
        else if (MaPhongBan === banGiamDoc) {
            updateBtn.style.display = 'inline-flex';
        }
    }

    function setupColumnVisibility() {
        const role = localStorage.getItem('userRole');
        const MaPhongBan = localStorage.getItem('MaPhongBan');

        const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
        const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
        const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
        const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
        const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DAOTAO';
        const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';

        const checkAllKhoa = document.getElementById('checkAllKhoa');
        const checkAllDaoTao = document.getElementById('checkAllDaoTao');

        // Mặc định disable tất cả
        if (checkAllKhoa) checkAllKhoa.disabled = true;
        if (checkAllDaoTao) checkAllDaoTao.disabled = true;

        // Khoa: GV_CNBM duyệt (check), Lãnh đạo khoa bỏ duyệt (uncheck)
        if (role === gvCnbm || role === lanhDaoKhoa) {
            if (checkAllKhoa) checkAllKhoa.disabled = false;
        }

        // Phòng ĐT/VP: Trợ lý duyệt (check), Lãnh đạo phòng bỏ duyệt (uncheck)
        if ((MaPhongBan === daoTao || MaPhongBan === vanPhong) && (role === troLyPhong || role === lanhDaoPhong)) {
            if (checkAllDaoTao) checkAllDaoTao.disabled = false;
        }
    }

    /**
     * Kiểm tra quyền duyệt cho từng cột
     * @param {'khoa'|'daoTao'} type - Loại duyệt
     * @param {'check'|'uncheck'} action - Hành động
     */
    function canApprove(type, action) {
        const role = localStorage.getItem('userRole');
        const MaPhongBan = localStorage.getItem('MaPhongBan');

        const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
        const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
        const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
        const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
        const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DAOTAO';
        const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
        const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

        // Ban Giám đốc có toàn quyền
        if (MaPhongBan === banGiamDoc) return true;

        if (type === 'khoa') {
            if (role === gvCnbm && action === 'check') return true;
            if (role === lanhDaoKhoa && action === 'uncheck') return true;
            return false;
        }

        if (type === 'daoTao') {
            if (MaPhongBan !== daoTao && MaPhongBan !== vanPhong) return false;
            if (role === troLyPhong && action === 'check') return true;
            if (role === lanhDaoPhong && action === 'uncheck') return true;
            return false;
        }

        return false;
    }

    function canInteract(type) {
        return canApprove(type, 'check') || canApprove(type, 'uncheck');
    }

    function canEditDelete(data) {
        const role = localStorage.getItem('userRole');
        const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
        const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';

        // Chỉ GV_CNBM và Lãnh đạo khoa có quyền sửa/xóa
        if (role !== gvCnbm && role !== lanhDaoKhoa) return false;

        // Chỉ sửa/xóa khi chưa duyệt
        return (data.khoa_duyet || 0) === 0 && (data.dao_tao_duyet || 0) === 0;
    }

    // ==================== INITIALIZATION ====================

    async function initPage() {
        try {
            await loadFilters();
            setupUpdateButtonVisibility();
            setupColumnVisibility();
            await loadTable();
        } catch (e) {
            console.error("Error initializing page", e);
        }
    }

    async function loadFilters() {
        try {
            const res = await fetch('/v2/vuotgio/huong-dan-tham-quan/filters');
            const result = await res.json();

            if (result.success) {
                const d = result.data;
                allTeachers = d.teachers || [];

                setSelectOptions($('#namHocFilter, #nam_hoc'), d.namHoc, "Chọn năm học");
                setSelectOptions($('#khoaFilter'), d.khoa, "Tất cả khoa");
                setSelectOptions($('#khoa'), d.khoa, "Chọn khoa");
                setSelectOptions($('#he_dao_tao_id'), d.heDaoTao.map(h => h.id), "Chọn hệ đào tạo", d.heDaoTao);

                if (d.activeNamHoc) {
                    $('#namHocFilter, #nam_hoc').val(d.activeNamHoc);
                } else if ($('#namHocFilter option').length > 1) {
                    $('#namHocFilter').prop('selectedIndex', 1);
                }

                // Enforce khoa filter: nếu user thuộc khoa, lock dropdown
                if (typeof KhoaFilterUtils !== 'undefined') {
                    KhoaFilterUtils.applyKhoaFilter('khoaFilter');
                    KhoaFilterUtils.applyKhoaFilter('khoa');
                }
            }
        } catch (e) {
            console.error("Error loading filters", e);
        }
    }

    function setSelectOptions(selectElement, values, defaultLabel, originalData = null) {
        selectElement.empty();
        if (defaultLabel) {
            const isAll = defaultLabel.includes('Tất cả');
            selectElement.append(`<option value="${isAll ? 'ALL' : ''}">${defaultLabel}</option>`);
        }

        values.forEach((val, idx) => {
            let label = val;
            if (originalData && originalData[idx]) {
                const item = originalData.find(i => i.id == val);
                label = item ? (item.he_dao_tao || item.ten_khoa || val) : val;
            }
            selectElement.append(`<option value="${val}">${label}</option>`);
        });
    }

    // ==================== DATA LOADING ====================

    async function loadTable() {
        const filters = {
            NamHoc: $('#namHocFilter').val(),
            Dot: $('#dotFilter').val(),
            KiHoc: $('#kiFilter').val(),
            Khoa: $('#khoaFilter').val()
        };

        try {
            const res = await fetch('/v2/vuotgio/huong-dan-tham-quan/table?' + $.param(filters));
            const result = await res.json();

            if (result.success) {
                renderTable(result.data);
            } else {
                Swal.fire('Lỗi', result.message, 'error');
            }
        } catch (e) {
            console.error("Error loading table", e);
            Swal.fire('Lỗi', 'Không thể kết nối máy chủ', 'error');
        }
    }

    // ==================== TABLE RENDERING ====================

    function renderTable(data) {
        const tbody = $('#tableBody');
        tbody.empty();

        if (!data || data.length === 0) {
            tbody.append('<tr><td colspan="11" class="text-center">Không có dữ liệu</td></tr>');
            return;
        }

        data.forEach((row, index) => {
            const khoaDuyet = row.khoa_duyet || 0;
            const daoTaoDuyet = row.dao_tao_duyet || 0;

            // Checkbox Khoa logic
            let khoaAttrs = '';
            if (daoTaoDuyet === 1) {
                khoaAttrs = 'disabled checked';
            } else if (khoaDuyet === 1) {
                khoaAttrs = canApprove('khoa', 'uncheck') ? 'checked' : 'disabled checked';
            } else {
                khoaAttrs = canApprove('khoa', 'check') ? '' : 'disabled';
            }

            // Checkbox Đào tạo logic
            let daoTaoAttrs = '';
            if (daoTaoDuyet === 1) {
                daoTaoAttrs = canApprove('daoTao', 'uncheck') ? 'checked' : 'disabled checked';
            } else if (khoaDuyet !== 1) {
                daoTaoAttrs = 'disabled';
            } else {
                daoTaoAttrs = canApprove('daoTao', 'check') ? '' : 'disabled';
            }

            // Action buttons
            let actionHtml = '';
            if (canEditDelete(row)) {
                actionHtml = `
                    <button class="btn btn-sm btn-outline-primary btn-action me-1 edit-btn" title="Sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action delete-btn" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
            }

            tbody.append(`
                <tr data-row='${JSON.stringify(row)}' data-id="${row.id}" data-index="${index}">
                    <td>${index + 1}</td>
                    <td>${row.HoTen || 'N/A'}</td>
                    <td>${row.khoa || ''}</td>
                    <td>${row.HeDaoTaoTen || ''}</td>
                    <td>${row.nganh_hoc || ''}</td>
                    <td>${row.mo_ta_hoat_dong || ''}</td>
                    <td>${row.so_ngay}</td>
                    <td>${row.so_tiet_quy_doi}</td>
                    <td><input type="checkbox" name="khoa" ${khoaAttrs} onchange="updateCheckAll('khoa'); updateDaoTaoCheckboxes();"></td>
                    <td><input type="checkbox" name="daoTao" ${daoTaoAttrs} onchange="updateCheckAll('daoTao')"></td>
                    <td>${actionHtml}</td>
                </tr>
            `);
        });

        // Bind buttons
        $('.edit-btn').on('click', function() {
            const rowData = $(this).closest('tr').data('row');
            openEditModal(rowData);
        });

        $('.delete-btn').on('click', function() {
            const rowData = $(this).closest('tr').data('row');
            handleDelete(rowData.id);
        });

        updateCheckAll('khoa');
        updateCheckAll('daoTao');
    }

    // ==================== MODAL ====================

    function openEditModal(data) {
        $('#modalTitle').text('Chỉnh sửa hướng dẫn tham quan');
        $('#recordId').val(data.id);
        
        for (const key in data) {
            const input = $(`#dataForm [name="${key}"]`);
            if (input.length) {
                input.val(data[key]);
            }
        }
        
        $('#id_User').val(data.id_User);
        $('#teacherSearch').val(data.HoTen);
        $('#khoa').val(data.khoa);
        $('#nam_hoc').val(data.nam_hoc);
        $('#hoc_ky').val(data.hoc_ky);
        $('#dot').val(data.dot);
        $('#he_dao_tao_id').val(data.he_dao_tao_id);
        $('#so_tiet_quy_doi').val(data.so_tiet_quy_doi);

        $('#formModal').modal('show');
    }

    // ==================== FORM SUBMIT ====================

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        if (!$('#id_User').val()) {
            Swal.fire('Cảnh báo', 'Vui lòng chọn giảng viên từ danh sách gợi ý!', 'warning');
            return false;
        }

        const id = $('#recordId').val();
        const url = id ? `/v2/vuotgio/huong-dan-tham-quan/edit/${id}` : '/v2/vuotgio/huong-dan-tham-quan/save';
        
        const formData = {};
        $(this).serializeArray().forEach(item => {
            formData[item.name] = item.value;
        });
        // Ensure NamHoc is always present for data lock middleware
        formData.NamHoc = document.getElementById('namHocFilter').value;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await res.json();

            if (result.success) {
                Swal.fire('Thành công', result.message, 'success');
                $('#formModal').modal('hide');
                loadTable();
            } else {
                Swal.fire('Lỗi', result.message, 'error');
            }
        } catch (e) {
            Swal.fire('Lỗi', 'Có lỗi xảy ra', 'error');
        }
    }

    // ==================== DELETE ====================

    async function handleDelete(id) {
        const confirm = await Swal.fire({
            title: 'Bạn có chắc chắn?',
            text: "Dữ liệu sẽ bị xóa vĩnh viễn!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Có, xóa nó!',
            cancelButtonText: 'Hủy'
        });

        if (confirm.isConfirmed) {
            try {
                const namHoc = document.getElementById('namHocFilter').value;
                const res = await fetch(`/v2/vuotgio/huong-dan-tham-quan/${id}?NamHoc=${encodeURIComponent(namHoc)}`, { method: 'DELETE' });
                const result = await res.json();
                if (result.success) {
                    Swal.fire('Đã xóa!', result.message, 'success');
                    loadTable();
                } else {
                    Swal.fire('Lỗi', result.message, 'error');
                }
            } catch (e) {
                Swal.fire('Lỗi', 'Có lỗi xảy ra', 'error');
            }
        }
    }

    // ==================== BATCH APPROVAL ====================

    async function submitApprovals() {
        const rows = document.querySelectorAll('#tableBody tr[data-id]');
        const updates = [];

        rows.forEach(row => {
            const id = parseInt(row.getAttribute('data-id'));
            const khoaCheckbox = row.querySelector('input[name="khoa"]');
            const daoTaoCheckbox = row.querySelector('input[name="daoTao"]');

            const daoTaoValue = daoTaoCheckbox?.checked ? 1 : 0;
            // Nếu đào tạo đã duyệt thì khoa cũng phải duyệt
            const khoaValue = daoTaoValue === 1 ? 1 : (khoaCheckbox?.checked ? 1 : 0);

            updates.push({
                id: id,
                khoa_duyet: khoaValue,
                dao_tao_duyet: daoTaoValue
            });
        });

        if (updates.length === 0) {
            Swal.fire('Thông báo', 'Không có dữ liệu để cập nhật', 'info');
            return;
        }

        try {
            const namHoc = document.getElementById('namHocFilter').value;
            const res = await fetch('/v2/vuotgio/huong-dan-tham-quan/batch-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ NamHoc: namHoc, updates: updates })
            });
            const result = await res.json();

            if (result.success) {
                Swal.fire('Thành công', result.message || 'Cập nhật thành công', 'success');
                loadTable();
            } else {
                Swal.fire('Lỗi', result.message, 'error');
            }
        } catch (e) {
            console.error('Error submitting approvals:', e);
            Swal.fire('Lỗi', 'Có lỗi xảy ra khi cập nhật', 'error');
        }
    }

    /**
     * Update quy doi value
     */
    function updateQuyDoi() {
        const soNgay = parseInt($(this).val()) || 0;
        $('#so_tiet_quy_doi').val(soNgay * 3);
    }
});

// ==================== GLOBAL FUNCTIONS (called from inline handlers) ====================

function checkAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    const checkAllIdMap = { 'khoa': 'checkAllKhoa', 'daoTao': 'checkAllDaoTao' };
    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;

    const isChecking = checkAllCheckbox.checked;

    checkboxes.forEach(cb => {
        if (cb.disabled) return;
        cb.checked = isChecking;
    });

    if (type === 'khoa') {
        updateDaoTaoCheckboxes();
    }
}

function updateCheckAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    const checkAllIdMap = { 'khoa': 'checkAllKhoa', 'daoTao': 'checkAllDaoTao' };
    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;
    const enabled = Array.from(checkboxes).filter(cb => !cb.disabled);
    checkAllCheckbox.checked = enabled.length > 0 && enabled.every(cb => cb.checked);
}

function updateDaoTaoCheckboxes() {
    const rows = document.querySelectorAll('#tableBody tr[data-id]');
    rows.forEach(row => {
        const khoaCheckbox = row.querySelector('input[name="khoa"]');
        const daoTaoCheckbox = row.querySelector('input[name="daoTao"]');
        if (khoaCheckbox && daoTaoCheckbox) {
            if (!khoaCheckbox.checked) {
                daoTaoCheckbox.disabled = true;
                daoTaoCheckbox.checked = false;
            } else {
                // Re-enable only if not already approved at daoTao level
                const rowData = $(row).data('row');
                if (rowData && rowData.dao_tao_duyet === 1) {
                    // Already approved - keep state
                } else {
                    daoTaoCheckbox.disabled = false;
                }
            }
        }
    });
    updateCheckAll('daoTao');
}
````

## File: src/public/js/vuotgio_v2/tongHop/khoa.js
````javascript
/**
 * Thống kê theo Khoa/Phòng/Ban - Frontend JS
 * VuotGio V2 — Redesign với Charts
 */

/* ════════════════════════════════════════════
   Màu sắc đặc trưng cho từng đơn vị
   (hash theo index hoặc mã khoa)
════════════════════════════════════════════ */
const DEPT_COLORS = [
  '#1A56DB', '#059669', '#D97706', '#7C3AED',
  '#DB2777', '#0891B2', '#65A30D', '#EA580C',
  '#9333EA', '#0F766E', '#B45309', '#1D4ED8',
];

function getDeptColor(index) {
  return DEPT_COLORS[index % DEPT_COLORS.length];
}

/* ════════════════════════════════════════════
   Biến trạng thái
════════════════════════════════════════════ */
let chartBar     = null;
let chartDonut   = null;
let chartStacked = null;
let currentTab   = 'all';
let cachedData   = [];
let previewPdfObjectUrl = null;

/* ════════════════════════════════════════════
   Khởi tạo
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  loadNamHocOptions();

  const loadBtn = document.getElementById('loadDataBtn');
  if (loadBtn) loadBtn.addEventListener('click', loadData);
});

/* ════════════════════════════════════════════
   Load danh sách năm học
════════════════════════════════════════════ */
async function loadNamHocOptions() {
  const urlNamHoc = new URLSearchParams(window.location.search).get('namHoc');

  try {
    const response = await fetch('/api/namhoc');
    const data = await response.json();

    const select = document.getElementById('namHocXem');
    if (!select) return;

    select.innerHTML = '';
    data.forEach((item, index) => {
      const option = document.createElement('option');
      option.value = item.NamHoc;
      option.textContent = item.NamHoc;

      if (urlNamHoc && item.NamHoc === urlNamHoc) {
        option.selected = true;
      } else if (
        !urlNamHoc &&
        (item.trangthai === 1 || (index === 0 && !data.some((i) => i.trangthai === 1)))
      ) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    setTimeout(loadData, 100);
  } catch (error) {
    console.error('Error loading nam hoc:', error);
  }
}

/* ════════════════════════════════════════════
   Format số
════════════════════════════════════════════ */
function fmt(val) {
  if (val === null || val === undefined) return '0';
  return Number(val).toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ════════════════════════════════════════════
   Load dữ liệu từ API
════════════════════════════════════════════ */
async function loadData() {
  const namHoc = document.getElementById('namHocXem')?.value;

  if (!namHoc) {
    Swal.fire('Thông báo', 'Vui lòng chọn năm học', 'warning');
    return;
  }

  showSkeletonRows();

  try {
    Swal.showLoading();

    const response = await fetch(
      `/v2/vuotgio/tong-hop/khoa?namHoc=${encodeURIComponent(namHoc)}`
    );
    const result = await response.json();
    Swal.close();

    if (!result.success) {
      throw new Error(result.message || 'Không thể tải dữ liệu');
    }

    cachedData = result.data || [];

    renderTable(currentTab, cachedData);
    renderFooter(cachedData, result.summary || {});
    renderCharts(cachedData);
    updateKpiCards(cachedData, result.summary || {});

    const info = document.getElementById('toolbarInfo');
    if (info) {
      info.textContent = `${cachedData.length} đơn vị · Năm học ${namHoc}`;
    }
  } catch (error) {
    Swal.close();
    console.error('Error loading data:', error);
    Swal.fire('Lỗi', error.message || 'Không thể tải dữ liệu', 'error');
    clearSkeletonRows();
  }
}

/* ════════════════════════════════════════════
   Skeleton loading rows
════════════════════════════════════════════ */
function showSkeletonRows() {
  const body = document.getElementById('tableBody');
  if (!body) return;
  body.innerHTML = Array.from({ length: 5 })
    .map(() => `<tr class="skeleton-row"><td colspan="13">&nbsp;</td></tr>`)
    .join('');
}

function clearSkeletonRows() {
  const body = document.getElementById('tableBody');
  if (body) {
    body.innerHTML =
      '<tr><td colspan="13" class="text-center text-muted py-4">Không có dữ liệu</td></tr>';
  }
}

/* ════════════════════════════════════════════
   Cập nhật KPI cards
════════════════════════════════════════════ */
function updateKpiCards(data, summary) {
  const totGV  = summary.tongSoGV    || data.reduce((s, r) => s + (r.tongSoGV    || 0), 0);
  const totTH  = summary.tongThucHien|| data.reduce((s, r) => s + (r.tongThucHien|| 0), 0);
  const totVuot= summary.tongVuot    || data.reduce((s, r) => s + (r.tongVuot    || 0), 0);
  const totTT  = summary.tongThanhToan|| data.reduce((s, r) => s + (r.thanhToan  || 0), 0);

  setEl('sumGV',        totGV);
  setEl('sumKhoa',      data.length);
  setEl('sumTH',        fmt(totTH));
  setEl('sumVuot',      fmt(totVuot));
  setEl('sumThanhToan', fmt(totTT));
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ════════════════════════════════════════════
   Render bảng
════════════════════════════════════════════ */
function renderTable(mode, data) {
  const body       = document.getElementById('tableBody');
  const subRow     = document.getElementById('subHeadRow');
  const detailSpan = document.getElementById('detailHeadSpan');

  if (!body) return;

  const compact = mode === 'compact';

  if (subRow)     subRow.style.display = compact ? 'none' : '';
  if (detailSpan) detailSpan.colSpan   = compact ? 1 : 5;

  if (data.length === 0) {
    body.innerHTML =
      '<tr><td colspan="13" class="text-center text-muted py-4">Không có dữ liệu cho năm học này</td></tr>';
    return;
  }

  const rows = data.map((row, index) => {
    const code          = row.maKhoa || row.MaPhongBan || '';
    const maKhoaEncoded = encodeURIComponent(code);
    const color         = getDeptColor(index);

    const detailCells = compact
      ? `<td class="num">${fmt(row.tongThucHien)}</td>`
      : `
          <td class="num">${fmt(row.soTietGiangDay)}</td>
          <td class="num">${fmt(row.soTietNgoaiQC)}</td>
          <td class="num">${fmt(row.soTietKTHP)}</td>
          <td class="num">${fmt(row.soTietDoAn)}</td>
          <td class="num">${fmt(row.soTietHDTQ)}</td>
        `;

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${code}</td>
        <td class="name-col">
          <span class="dept-dot" style="background:${color};"></span>
          ${row.tenKhoa || row.maKhoa || ''}
        </td>
        <td>${row.tongSoGV || 0}</td>
        ${detailCells}
        <td class="total">${fmt(row.tongThucHien)}</td>
        <td class="vuot">${fmt(row.tongVuot)}</td>
        <td class="paid">${fmt(row.thanhToan)}</td>
        <td>
          <button
            class="btn-eye"
            onclick="viewDepartmentDetail('${maKhoaEncoded}')"
            title="Xem chi tiết giảng viên"
          >
            <i class="fas fa-eye"></i>
          </button>
          <button
            class="btn-eye ms-1"
            onclick="previewDepartment('${maKhoaEncoded}', '${escapeHtml(row.tenKhoa || row.maKhoa || code || '')}')"
            title="Xem preview khoa"
          >
            <i class="fas fa-file-pdf"></i>
          </button>
        </td>
      </tr>
    `;
  });

  body.innerHTML = rows.join('');
}

/* ════════════════════════════════════════════
   Render footer (tổng cộng)
════════════════════════════════════════════ */
function renderFooter(data, summary) {
  const foot = document.getElementById('tableFoot');
  if (!foot) return;

  const totals = {
    tongSoGV:      summary.tongSoGV     || data.reduce((s, r) => s + (r.tongSoGV      || 0), 0),
    soTietGiangDay: data.reduce((s, r) => s + (r.soTietGiangDay  || 0), 0),
    soTietNgoaiQC:  data.reduce((s, r) => s + (r.soTietNgoaiQC   || 0), 0),
    soTietKTHP:     data.reduce((s, r) => s + (r.soTietKTHP      || 0), 0),
    soTietDoAn:     data.reduce((s, r) => s + (r.soTietDoAn      || 0), 0),
    soTietHDTQ:     data.reduce((s, r) => s + (r.soTietHDTQ      || 0), 0),
    tongThucHien:  summary.tongThucHien || data.reduce((s, r) => s + (r.tongThucHien  || 0), 0),
    tongVuot:      summary.tongVuot     || data.reduce((s, r) => s + (r.tongVuot      || 0), 0),
    thanhToan:     summary.tongThanhToan|| data.reduce((s, r) => s + (r.thanhToan     || 0), 0),
  };

  const detailCells =
    currentTab === 'compact'
      ? `<td>${fmt(totals.tongThucHien)}</td>`
      : `
          <td>${fmt(totals.soTietGiangDay)}</td>
          <td>${fmt(totals.soTietNgoaiQC)}</td>
          <td>${fmt(totals.soTietKTHP)}</td>
          <td>${fmt(totals.soTietDoAn)}</td>
          <td>${fmt(totals.soTietHDTQ)}</td>
        `;

  foot.innerHTML = `
    <tr>
      <td colspan="3" style="text-align:center;font-size:12px;letter-spacing:.04em;">
        TỔNG HỌC VIỆN
      </td>
      <td>${totals.tongSoGV}</td>
      ${detailCells}
      <td class="total">${fmt(totals.tongThucHien)}</td>
      <td class="vuot">${fmt(totals.tongVuot)}</td>
      <td class="paid">${fmt(totals.thanhToan)}</td>
      <td></td>
    </tr>
  `;
}

/* ════════════════════════════════════════════
   Switch tab Đầy đủ / Gọn
════════════════════════════════════════════ */
function switchTab(mode) {
  currentTab = mode;
  document.getElementById('tabAll').classList.toggle('active',     mode === 'all');
  document.getElementById('tabCompact').classList.toggle('active', mode === 'compact');
  renderTable(mode, cachedData);
  renderFooter(cachedData, {});
}

window.switchTab = switchTab;

/* ════════════════════════════════════════════
   Render / Update Charts
════════════════════════════════════════════ */
function renderCharts(data) {
  const labels     = data.map((r) => r.maKhoa || r.MaPhongBan || '');
  const thucHien   = data.map((r) => r.tongThucHien || 0);
  const vuotGio    = data.map((r) => r.tongVuot     || 0);
  const thanhToan  = data.map((r) => r.thanhToan    || 0);
  const gdData     = data.map((r) => r.soTietGiangDay || 0);
  const nqcData    = data.map((r) => r.soTietNgoaiQC  || 0);
  const kthpData   = data.map((r) => r.soTietKTHP     || 0);
  const daData     = data.map((r) => r.soTietDoAn     || 0);
  const tqttData   = data.map((r) => r.soTietHDTQ     || 0);

  const totVuot = vuotGio.reduce((a, b) => a + b, 0);
  const totTT   = thanhToan.reduce((a, b) => a + b, 0);
  const chuaTT  = Math.max(0, totVuot - totTT);

  const ticksCfg = {
    font: { size: 11, family: "'Be Vietnam Pro', sans-serif" },
    color: '#64748B',
  };

  const gridCfg = { color: 'rgba(0,0,0,.05)' };

  const yCallback = (v) =>
    v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v;

  /* ── Bar chart ── */
  if (chartBar) chartBar.destroy();
  chartBar = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Thực hiện', data: thucHien,  backgroundColor: '#1A56DB', borderRadius: 3 },
        { label: 'Vượt giờ',  data: vuotGio,   backgroundColor: '#D97706', borderRadius: 3 },
        { label: 'Thanh toán',data: thanhToan,  backgroundColor: '#059669', borderRadius: 3 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { ticks: { ...ticksCfg, autoSkip: false }, grid: { display: false } },
        y: { ticks: { ...ticksCfg, callback: yCallback }, grid: gridCfg },
      },
    },
  });

  /* ── Donut chart ── */
  if (chartDonut) chartDonut.destroy();
  const pct = totVuot > 0 ? Math.round((totTT / totVuot) * 100) : 0;
  chartDonut = new Chart(document.getElementById('donutChart'), {
    type: 'doughnut',
    data: {
      labels: ['Được thanh toán', 'Chưa thanh toán'],
      datasets: [
        {
          data: [totTT, chuaTT],
          backgroundColor: ['#059669', '#F87171'],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const p = totVuot > 0 ? Math.round((ctx.parsed / totVuot) * 100) : 0;
              return `${ctx.label}: ${fmt(ctx.parsed)} (${p}%)`;
            },
          },
        },
      },
    },
    plugins: [
      {
        id: 'centerText',
        afterDraw(chart) {
          const { ctx, chartArea: { width, height, left, top } } = chart;
          ctx.save();
          ctx.font = `600 20px 'Be Vietnam Pro', sans-serif`;
          ctx.fillStyle = '#1E293B';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${pct}%`, left + width / 2, top + height / 2 - 8);
          ctx.font = `400 11px 'Be Vietnam Pro', sans-serif`;
          ctx.fillStyle = '#64748B';
          ctx.fillText('được TT', left + width / 2, top + height / 2 + 14);
          ctx.restore();
        },
      },
    ],
  });

  /* ── Stacked bar ── */
  if (chartStacked) chartStacked.destroy();
  chartStacked = new Chart(document.getElementById('stackedChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Giảng dạy', data: gdData,   backgroundColor: '#1A56DB', borderRadius: 0 },
        { label: 'Ngoài QC',  data: nqcData,  backgroundColor: '#059669', borderRadius: 0 },
        { label: 'KTHP',      data: kthpData, backgroundColor: '#D97706', borderRadius: 0 },
        { label: 'Đồ án',     data: daData,   backgroundColor: '#7C3AED', borderRadius: 0 },
        { label: 'TQTT',      data: tqttData, backgroundColor: '#DB2777', borderRadius: 0 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { stacked: true, ticks: { ...ticksCfg, autoSkip: false }, grid: { display: false } },
        y: { stacked: true, ticks: { ...ticksCfg, callback: yCallback }, grid: gridCfg },
      },
    },
  });
}

/* ════════════════════════════════════════════
   Điều hướng xem chi tiết giảng viên
════════════════════════════════════════════ */
function viewDepartmentDetail(maKhoa) {
  const namHoc = document.getElementById('namHocXem')?.value || '';
  window.location.href = `/v2/vuotgio/tong-hop-giang-vien?namHoc=${encodeURIComponent(namHoc)}&khoa=${maKhoa}`;
}

function previewDepartment(maKhoa, tenKhoa) {
  const namHoc = document.getElementById('namHocXem')?.value;
  if (!namHoc) {
    Swal.fire('Thông báo', 'Vui lòng chọn năm học', 'warning');
    return;
  }

  const previewLabel = tenKhoa || decodeURIComponent(maKhoa || '');
  Swal.showLoading();

  fetch(`/v2/vuotgio/tong-hop/preview-khoa/${maKhoa}?namHoc=${encodeURIComponent(namHoc)}`)
    .then((response) => response.json())
    .then((result) => {
      if (!result.success) {
        throw new Error(result.message || 'Không thể tải preview khoa');
      }

      if (!result.data?.pdfBase64) {
        throw new Error('Không tạo được bản PDF preview');
      }

      openPdfPreviewWindow(result.data.pdfBase64, previewLabel, namHoc, maKhoa);
    })
    .catch((error) => {
      console.error('Error loading khoa preview:', error);
      Swal.fire('Lỗi', error.message || 'Không thể tải preview khoa', 'error');
    })
    .finally(() => Swal.close());
}

function openPdfPreviewWindow(pdfBase64, title, namHoc, maKhoa) {
  if (previewPdfObjectUrl) {
    URL.revokeObjectURL(previewPdfObjectUrl);
    previewPdfObjectUrl = null;
  }

  const pdfBytes = atob(pdfBase64);
  const byteNumbers = new Array(pdfBytes.length);
  for (let i = 0; i < pdfBytes.length; i += 1) {
    byteNumbers[i] = pdfBytes.charCodeAt(i);
  }
  const pdfBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
  previewPdfObjectUrl = URL.createObjectURL(pdfBlob);

  const previewWindow = window.open('', '_blank');
  if (!previewWindow) {
    Swal.fire('Lỗi', 'Trình duyệt đã chặn cửa sổ preview mới. Vui lòng cho phép popup.', 'error');
    return;
  }

  const escapeHtml = (text) => String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const escapedTitle = escapeHtml(`Xem trước khoa: ${title || ''}`);
  const escapedNamHoc = escapeHtml(namHoc || '');
  const escapedKhoa = escapeHtml(title || decodeURIComponent(maKhoa || ''));

  previewWindow.document.open();
  previewWindow.document.write(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapedTitle}</title>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
      <style>
        html, body {
          margin: 0;
          width: 100%;
          height: 100%;
          background: #fff;
          overflow: hidden;
          font-family: Arial, sans-serif;
        }
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 56px;
          background: #f1f5f9;
          color: #1e293b;
          display: flex;
          align-items: center;
          padding: 0 20px;
          gap: 20px;
          z-index: 1000;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          border-bottom: 1px solid #e2e8f0;
        }
        .header .info-group {
          display: flex;
          align-items: center;
          gap: 15px;
          font-size: 14px;
        }
        .header .info-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          white-space: nowrap;
        }
        .header .info-item strong {
          color: #64748b;
        }
        .header button {
          height: 36px;
          width: 36px;
          border: 1px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          transition: all 0.2s ease;
        }
        .header button:hover {
          background: #f8fafc;
          color: #1e293b;
        }
        .header button.close-btn {
          margin-left: auto;
        }
        .header button.close-btn:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fecaca;
        }
        .header .title {
          font-weight: 600;
          font-size: 16px;
          color: #0f172a;
        }
        .layout {
          display: flex;
          width: 100%;
          height: 100%;
          padding-top: 56px;
        }
        .sidebar {
          width: 260px;
          min-width: 260px;
          border-right: 1px solid #e5e7eb;
          background: #f8fafc;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .sidebar.hidden {
          display: none;
        }
        .sidebar .meta {
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 14px;
          color: #334155;
        }
        .meta-item {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 10px 12px;
          line-height: 1.4;
        }
        .viewer {
          flex: 1;
          height: 100%;
          border: 0;
        }
      </style>
      <script>
        // Sidebar toggle removed as sidebar is gone
      </script>
    </head>
    <body>
      <div class="header">
        <div class="title">${escapedTitle}</div>
        <div class="info-group">
          <div class="info-item">
            <strong>Năm học:</strong> ${escapedNamHoc}
          </div>
          <div class="info-item">
            <strong>Khoa:</strong> ${escapedKhoa}
          </div>
        </div>
        <button class="close-btn" onclick="window.close()" title="Đóng">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="layout">
        <iframe class="viewer" src="${previewPdfObjectUrl}#toolbar=0&navpanes=0" title="Khoa Preview PDF"></iframe>
      </div>
    </body>
    </html>
  `);
  previewWindow.document.close();
}

window.viewDepartmentDetail = viewDepartmentDetail;
window.previewDepartment = previewDepartment;
````

## File: src/repositories/vuotgio_v2/tongHop.repo.js
````javascript
const buildKhoaFilter = (khoa, field, params) => {
    if (khoa && khoa !== "ALL") {
        params.push(khoa);
        return ` AND ${field} = ?`;
    }
    return "";
};

const getDinhMuc = async (connection) => {
    const [rows] = await connection.execute(
        "SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1"
    );
    return rows[0] || null;
};

const getNhanVienById = async (connection, idUser) => {
    const [rows] = await connection.execute(
        `SELECT
            nv.id_User,
            nv.TenNhanVien AS giangVien,
            nv.NgaySinh AS ngaySinh,
            nv.HocVi AS hocVi,
            nv.HSL AS hsl,
            nv.MaPhongBan AS maKhoa,
            nv.ChucVu AS chucVu,
            nv.PhanTramMienGiam AS phanTramMienGiam,
            nv.LyDoMienGiam AS lyDoMienGiam,
            nv.SoTaiKhoan AS soTaiKhoan,
            nv.NganHang AS nganHang,
            nv.Luong AS luong,
            pb.TenPhongBan AS khoa,
            COALESCE(pb.isKhoa, 0) AS isKhoa
        FROM nhanvien nv
        LEFT JOIN phongban pb ON pb.id = nv.phongban_id
        WHERE nv.id_User = ?`,
        [idUser]
    );
    return rows[0] || null;
};

const getGiangDayByIdUser = async (connection, { namHoc, idUser }) => {
    const [rows] = await connection.execute(
        `SELECT gd.*, 
                COALESCE(hdt.he_dao_tao, gd.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM giangday gd
         LEFT JOIN he_dao_tao hdt ON hdt.id = gd.he_dao_tao
         WHERE gd.NamHoc = ? AND gd.id_User = ?
         ORDER BY gd.HocKy, gd.TenHocPhan`,
        [namHoc, idUser]
    );
    return rows;
};

const getLopNgoaiQCByIdUser = async (connection, { namHoc, idUser }) => {
    const [rows] = await connection.execute(
        `SELECT lnqc.*, 
                COALESCE(hdt.he_dao_tao, lnqc.he_dao_tao_id, 'Không xác định') AS ten_he_dao_tao
         FROM vg_lop_ngoai_quy_chuan lnqc
         LEFT JOIN he_dao_tao hdt ON hdt.id = lnqc.he_dao_tao_id
         WHERE lnqc.nam_hoc = ? AND lnqc.id_User = ? AND lnqc.khoa_duyet = 1
         ORDER BY lnqc.hoc_ky, lnqc.ma_hoc_phan`,
        [namHoc, idUser]
    );
    return rows;
};

const getKthpByIdUser = async (connection, { namHoc, idUser }) => {
    const [rows] = await connection.execute(
        `SELECT kthp.*, 
                COALESCE(hdt.he_dao_tao, kthp.doi_tuong, 'Không xác định') AS ten_he_dao_tao
         FROM vg_coi_cham_ra_de kthp
         LEFT JOIN he_dao_tao hdt ON hdt.id = kthp.he_dao_tao_id
         WHERE kthp.nam_hoc = ? AND kthp.id_User = ? AND kthp.khoa_duyet = 1
         ORDER BY kthp.hoc_ky, kthp.hinh_thuc`,
        [namHoc, idUser]
    );
    return rows;
};

const getDoAnByIdUser = async (connection, { namHoc, idUser }) => {
    const [rows] = await connection.execute(
        `SELECT da.*, 
                COALESCE(hdt.he_dao_tao, da.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM exportdoantotnghiep da
         LEFT JOIN he_dao_tao hdt ON hdt.id = da.he_dao_tao
         WHERE da.NamHoc = ? AND da.id_User = ? AND da.isMoiGiang = 0`,
        [namHoc, idUser]
    );
    return rows;
};

const getHuongDanThamQuanByIdUser = async (connection, { namHoc, idUser }) => {
    const [rows] = await connection.execute(
        `SELECT t.*, 
                COALESCE(hdt.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM vg_huong_dan_tham_quan_thuc_te t
         LEFT JOIN he_dao_tao hdt ON hdt.id = t.he_dao_tao_id
         WHERE t.nam_hoc = ? AND t.id_User = ? AND t.khoa_duyet = 1`,
        [namHoc, idUser]
    );
    return rows;
};

/**
 * SQL lấy dữ liệu thô để tổng hợp cho tất cả GV trong khoa
 */
const NON_KHOA_GROUP_CODE = "BGĐ&PHONG";

const getDuLieuThoTongHop = async (connection, { namHoc, khoa }) => {
    const isAllKhoa = !khoa || khoa === "ALL";
    const isNonKhoaGroup = khoa === NON_KHOA_GROUP_CODE;
    const params = [];
    
    let lecturersQuery = `
        SELECT 
            nv.id_User, 
            nv.TenNhanVien AS giangVien, 
            nv.MaPhongBan AS maKhoa,
            pb.TenPhongBan AS khoa,
            pb.isKhoa AS isKhoa,
            nv.ChucVu AS chucVu,
            nv.LyDoMienGiam AS lyDoMienGiam,
            nv.PhanTramMienGiam AS phanTramMienGiam,
            nv.SoTaiKhoan AS soTaiKhoan,
            nv.NganHang AS nganHang,
            nv.Luong AS luong
        FROM nhanvien nv
        LEFT JOIN phongban pb ON pb.id = nv.phongban_id
        WHERE nv.id_User IN (
            SELECT id_User FROM giangday WHERE NamHoc = ?
            UNION SELECT id_User FROM vg_lop_ngoai_quy_chuan WHERE nam_hoc = ?
            UNION SELECT id_User FROM vg_coi_cham_ra_de WHERE nam_hoc = ?
            UNION SELECT id_User FROM exportdoantotnghiep WHERE NamHoc = ? AND isMoiGiang = 0
            UNION SELECT id_User FROM vg_huong_dan_tham_quan_thuc_te WHERE nam_hoc = ?
        )
        AND nv.id_User <> 1
    `;
    params.push(namHoc, namHoc, namHoc, namHoc, namHoc);

    if (isNonKhoaGroup) {
        lecturersQuery += " AND COALESCE(pb.isKhoa, 0) = 0";
    } else if (!isAllKhoa) {
        lecturersQuery += " AND nv.MaPhongBan = ?";
        params.push(khoa);
    }

    lecturersQuery += " ORDER BY pb.isKhoa DESC, pb.TenPhongBan, nv.TenNhanVien";

    const [lecturers] = await connection.execute(lecturersQuery, params);
    if (lecturers.length === 0) return [];

    const lecturerIds = lecturers.map(l => l.id_User);
    const placeholders = lecturerIds.map(() => '?').join(',');

    // Query gộp dữ liệu từ các nguồn
    const queryDetails = (table, yearCol, approvedCond = "") => {
        let col = "quy_chuan"; 
        if (table === 'giangday') col = "QuyChuan";
        if (table === 'exportdoantotnghiep') col = "SoTiet";
        if (table === 'vg_huong_dan_tham_quan_thuc_te') col = "so_tiet_quy_doi";
        
        return `
            SELECT id_User, SUM(${col}) as total
            FROM ${table}
            WHERE ${yearCol} = ? AND id_User IN (${placeholders}) ${approvedCond}
            GROUP BY id_User
        `;
    };

    const [gd] = await connection.execute(queryDetails('giangday', 'NamHoc'), [namHoc, ...lecturerIds]);
    const [lnqc] = await connection.execute(queryDetails('vg_lop_ngoai_quy_chuan', 'nam_hoc', 'AND khoa_duyet = 1'), [namHoc, ...lecturerIds]);
    const [kthp] = await connection.execute(queryDetails('vg_coi_cham_ra_de', 'nam_hoc', 'AND khoa_duyet = 1'), [namHoc, ...lecturerIds]);
    const [da] = await connection.execute(queryDetails('exportdoantotnghiep', 'NamHoc', 'AND isMoiGiang = 0'), [namHoc, ...lecturerIds]);
    const [hdtq] = await connection.execute(queryDetails('vg_huong_dan_tham_quan_thuc_te', 'nam_hoc', 'AND khoa_duyet = 1'), [namHoc, ...lecturerIds]);

    const gdMap = new Map(gd.map(r => [r.id_User, r.total]));
    const lnqcMap = new Map(lnqc.map(r => [r.id_User, r.total]));
    const kthpMap = new Map(kthp.map(r => [r.id_User, r.total]));
    const daMap = new Map(da.map(r => [r.id_User, r.total]));
    const hdtqMap = new Map(hdtq.map(r => [r.id_User, r.total]));

    return lecturers.map(l => ({
        ...l,
        soTietGiangDay: parseFloat(gdMap.get(l.id_User)) || 0,
        soTietNgoaiQC: parseFloat(lnqcMap.get(l.id_User)) || 0,
        soTietKTHP: parseFloat(kthpMap.get(l.id_User)) || 0,
        soTietDoAn: parseFloat(daMap.get(l.id_User)) || 0,
        soTietHDTQ: parseFloat(hdtqMap.get(l.id_User)) || 0
    }));
};

const getChuNhiemKhoaByKhoa = async (connection, maKhoa) => {
    if (!maKhoa) return "";
    const [rows] = await connection.execute(
        `SELECT TenNhanVien FROM nhanvien 
         WHERE MaPhongBan = ? AND (ChucVu = 'Lãnh đạo khoa' OR ChucVu = 'Chủ nhiệm khoa')
         LIMIT 1`,
        [maKhoa]
    );
    return rows[0]?.TenNhanVien || "";
};

// ============================================================
// Batch functions — lấy dữ liệu cho nhiều GV cùng lúc
// Sử dụng parameterized placeholders để chống SQL injection
// ============================================================

/**
 * Tạo chuỗi placeholders an toàn cho mệnh đề IN
 * @param {Array<number>} ids - Mảng ID (đã validate là số nguyên)
 * @returns {string} Chuỗi "?, ?, ?" 
 */
const buildPlaceholders = (ids) => ids.map(() => '?').join(', ');

const getGiangDayByIds = async (connection, { namHoc, ids }) => {
    if (!ids.length) return [];
    const placeholders = buildPlaceholders(ids);
    const [rows] = await connection.execute(
        `SELECT gd.*, 
                COALESCE(hdt.he_dao_tao, gd.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM giangday gd
         LEFT JOIN he_dao_tao hdt ON hdt.id = gd.he_dao_tao
         WHERE gd.NamHoc = ? AND gd.id_User IN (${placeholders})
         ORDER BY gd.id_User, gd.HocKy, gd.TenHocPhan`,
        [namHoc, ...ids]
    );
    return rows;
};

const getLopNgoaiQCByIds = async (connection, { namHoc, ids }) => {
    if (!ids.length) return [];
    const placeholders = buildPlaceholders(ids);
    const [rows] = await connection.execute(
        `SELECT lnqc.*, 
                COALESCE(hdt.he_dao_tao, lnqc.he_dao_tao_id, 'Không xác định') AS ten_he_dao_tao
         FROM vg_lop_ngoai_quy_chuan lnqc
         LEFT JOIN he_dao_tao hdt ON hdt.id = lnqc.he_dao_tao_id
         WHERE lnqc.nam_hoc = ? AND lnqc.id_User IN (${placeholders}) AND lnqc.khoa_duyet = 1
         ORDER BY lnqc.id_User, lnqc.hoc_ky, lnqc.ma_hoc_phan`,
        [namHoc, ...ids]
    );
    return rows;
};

const getKthpByIds = async (connection, { namHoc, ids }) => {
    if (!ids.length) return [];
    const placeholders = buildPlaceholders(ids);
    const [rows] = await connection.execute(
        `SELECT kthp.*, 
                COALESCE(hdt.he_dao_tao, kthp.doi_tuong, 'Không xác định') AS ten_he_dao_tao
         FROM vg_coi_cham_ra_de kthp
         LEFT JOIN he_dao_tao hdt ON hdt.id = kthp.he_dao_tao_id
         WHERE kthp.nam_hoc = ? AND kthp.id_User IN (${placeholders}) AND kthp.khoa_duyet = 1
         ORDER BY kthp.id_User, kthp.hoc_ky, kthp.hinh_thuc`,
        [namHoc, ...ids]
    );
    return rows;
};

const getDoAnByIds = async (connection, { namHoc, ids }) => {
    if (!ids.length) return [];
    const placeholders = buildPlaceholders(ids);
    const [rows] = await connection.execute(
        `SELECT da.*, 
                COALESCE(hdt.he_dao_tao, da.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM exportdoantotnghiep da
         LEFT JOIN he_dao_tao hdt ON hdt.id = da.he_dao_tao
         WHERE da.NamHoc = ? AND da.id_User IN (${placeholders}) AND da.isMoiGiang = 0`,
        [namHoc, ...ids]
    );
    return rows;
};

const getHuongDanThamQuanByIds = async (connection, { namHoc, ids }) => {
    if (!ids.length) return [];
    const placeholders = buildPlaceholders(ids);
    const [rows] = await connection.execute(
        `SELECT t.*, 
                COALESCE(hdt.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM vg_huong_dan_tham_quan_thuc_te t
         LEFT JOIN he_dao_tao hdt ON hdt.id = t.he_dao_tao_id
         WHERE t.nam_hoc = ? AND t.id_User IN (${placeholders}) AND t.khoa_duyet = 1`,
        [namHoc, ...ids]
    );
    return rows;
};

const getNhanVienByIds = async (connection, ids) => {
    if (!ids.length) return [];
    const placeholders = buildPlaceholders(ids);
    const [rows] = await connection.execute(
        `SELECT
            nv.id_User,
            nv.TenNhanVien AS giangVien,
            nv.NgaySinh AS ngaySinh,
            nv.HocVi AS hocVi,
            nv.HSL AS hsl,
            nv.MaPhongBan AS maKhoa,
            nv.ChucVu AS chucVu,
            nv.PhanTramMienGiam AS phanTramMienGiam,
            nv.LyDoMienGiam AS lyDoMienGiam,
            nv.SoTaiKhoan AS soTaiKhoan,
            nv.NganHang AS nganHang,
            nv.Luong AS luong,
            pb.TenPhongBan AS khoa,
            COALESCE(pb.isKhoa, 0) AS isKhoa
        FROM nhanvien nv
        LEFT JOIN phongban pb ON pb.id = nv.phongban_id
        WHERE nv.id_User IN (${placeholders})`,
        [...ids]
    );
    return rows;
};

module.exports = {
    NON_KHOA_GROUP_CODE,
    getDinhMuc,
    getNhanVienById,
    getNhanVienByIds,
    getGiangDayByIdUser,
    getLopNgoaiQCByIdUser,
    getKthpByIdUser,
    getDoAnByIdUser,
    getHuongDanThamQuanByIdUser,
    getGiangDayByIds,
    getLopNgoaiQCByIds,
    getKthpByIds,
    getDoAnByIds,
    getHuongDanThamQuanByIds,
    getDuLieuThoTongHop,
    getChuNhiemKhoaByKhoa
};
````

## File: src/services/vuotgio_v2/kthp.service.js
````javascript
const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");
const repo = require("../../repositories/vuotgio_v2/kthp.repo");

const mapper = require("../../mappers/vuotgio_v2/kthp.mapper");
const baseMapper = require("../../mappers/vuotgio_v2/base.mapper");
const { pick, toInt, toDecimal } = baseMapper;

const getUserContext = (req) => {
    if (!req.session?.userId) {
        console.warn("[KTHP] getUserContext: session.userId is missing — request may be unauthenticated");
    }
    return {
        userId: req.session?.userId || null,
        userName: req.session?.TenNhanVien || req.session?.username || "Unknown",
    };
};

const getLecturerIdByName = async (connection, name) => {
    if (!name) return null;
    const [rows] = await connection.execute(`SELECT id_User FROM nhanvien WHERE TenNhanVien = ? LIMIT 1`, [name]);
    return rows[0]?.id_User || null;
};

const getHeDaoTaoIdByName = async (connection, name) => {
    if (!name) return 1;
    const [rows] = await connection.execute(`SELECT id FROM he_dao_tao WHERE he_dao_tao = ? LIMIT 1`, [name]);
    return rows[0]?.id || 1;
};

const save = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    let connection;
    try {
        connection = await createPoolConnection();
        const data = mapper.toEntity(req.body);

        if (!data.nam_hoc || !data.ten_hoc_phan || !data.giang_vien || !data.khoa || !data.hinh_thuc) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc: Năm học, Tên HP, Giảng viên, Khoa, Hình thức" });
        }

        const lecturerId = await getLecturerIdByName(connection, data.giang_vien);
        const heDaoTaoId = await getHeDaoTaoIdByName(connection, data.doi_tuong);
        const [result] = await repo.insert(connection, [
            lecturerId || userId,
            data.giang_vien,
            data.khoa,
            data.hoc_ky,
            data.nam_hoc,
            data.hinh_thuc,
            data.ten_hoc_phan,
            data.lop_hoc_phan,
            data.doi_tuong,
            heDaoTaoId,
            data.bai_cham_1,
            data.bai_cham_2,
            data.tong_so,
            data.quy_chuan,
            data.ghi_chu,
            data.so_tc,
            data.so_sv,
        ]);

        try { await LogService.logChange(userId, userName, "Thêm KTHP", `Thêm KTHP "${data.hinh_thuc}" - HP: "${data.ten_hoc_phan}" cho GV: "${data.giang_vien}"`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: "Thêm kết thúc học phần thành công!", id: result.insertId });
    } catch (error) {
        console.error("Lỗi khi thêm KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi thêm kết thúc học phần." });
    } finally {
        if (connection) connection.release();
    }
};

const saveBatch = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    let connection;
    try {
        connection = await createPoolConnection();
        const baseData = mapper.toEntity(req.body);
        const details = Array.isArray(req.body?.details) ? req.body.details : [];

        if (!baseData.nam_hoc || !baseData.ten_hoc_phan || !baseData.giang_vien || !baseData.khoa) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc: Năm học, Tên HP, Giảng viên, Khoa" });
        }
        if (details.length === 0) {
            return res.status(400).json({ success: false, message: "Không có dữ liệu hình thức để lưu." });
        }

        const normalizedDetails = details.map((item) => ({
            hinh_thuc: pick(item, "hinh_thuc", "hinhthuc", "HinhThuc") || "",
            quy_chuan: toDecimal(pick(item, "quy_chuan", "sotietqc", "SoTietQC"), 0),
            doi_tuong: pick(item, "doi_tuong", "doituong", "DoiTuong") || baseData.doi_tuong || "",
        })).filter((item) => item.hinh_thuc && item.quy_chuan > 0);

        if (normalizedDetails.length === 0) {
            return res.status(400).json({ success: false, message: "Vui lòng nhập số tiết > 0 cho ít nhất 1 hình thức." });
        }

        const lecturerId = await getLecturerIdByName(connection, baseData.giang_vien);
        const baseHeDaoTaoId = await getHeDaoTaoIdByName(connection, baseData.doi_tuong);
        const query = `
            INSERT INTO vg_coi_cham_ra_de
            (id_user, giang_vien, khoa, hoc_ky, nam_hoc, hinh_thuc, ten_hoc_phan, lop_hoc_phan, doi_tuong, he_dao_tao_id, bai_cham_1, bai_cham_2, tong_so, quy_chuan, ghi_chu, khoa_duyet, khao_thi_duyet, so_tc, so_sv)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        `;

        await connection.beginTransaction();
        const insertedIds = [];
        for (const detail of normalizedDetails) {
            const detailHeDaoTaoId = detail.doi_tuong === baseData.doi_tuong ? baseHeDaoTaoId : await getHeDaoTaoIdByName(connection, detail.doi_tuong);
            const [result] = await connection.execute(query, [
                lecturerId || userId,
                baseData.giang_vien,
                baseData.khoa,
                baseData.hoc_ky,
                baseData.nam_hoc,
                detail.hinh_thuc,
                baseData.ten_hoc_phan,
                baseData.lop_hoc_phan,
                detail.doi_tuong,
                detailHeDaoTaoId,
                baseData.bai_cham_1,
                baseData.bai_cham_2,
                baseData.tong_so,
                detail.quy_chuan,
                baseData.ghi_chu,
                baseData.so_tc,
                baseData.so_sv,
            ]);
            insertedIds.push(result.insertId);
        }
        await connection.commit();

        try { await LogService.logChange(userId, userName, "Thêm KTHP batch", `Thêm batch KTHP gồm ${normalizedDetails.length} hình thức - HP: "${baseData.ten_hoc_phan}" - GV: "${baseData.giang_vien}"`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: `Đã lưu ${normalizedDetails.length} hình thức cho giảng viên ${baseData.giang_vien}.`, ids: insertedIds });
    } catch (error) {
        if (connection) {
            try { await connection.rollback(); } catch (rollbackError) { console.error("Lỗi rollback khi lưu batch KTHP:", rollbackError); }
        }
        console.error("Lỗi khi thêm batch KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi thêm batch kết thúc học phần." });
    } finally {
        if (connection) connection.release();
    }
};

const getTable = async (req, res) => {
    const { NamHoc } = req.params;
    // enforceKhoaFilter middleware đã override req.params.Khoa nếu user là khoa
    const Khoa = req.params.Khoa;
    let connection;
    try {
        connection = await createPoolConnection();
        const results = await repo.getTable(connection, { namHoc: NamHoc, khoa: Khoa });
        res.json(results);
    } catch (error) {
        console.error("Lỗi khi lấy danh sách KTHP:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

const edit = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ message: "Thiếu ID cần cập nhật." });

    let connection;
    try {
        connection = await createPoolConnection();
        const data = mapper.toEntity(req.body);
        const lecturerId = await getLecturerIdByName(connection, data.giang_vien);
        const heDaoTaoId = await getHeDaoTaoIdByName(connection, data.doi_tuong);

        const [result] = await repo.update(connection, ID, [
            lecturerId || userId,
            data.giang_vien,
            data.khoa,
            data.hoc_ky,
            data.nam_hoc,
            data.hinh_thuc,
            data.ten_hoc_phan,
            data.lop_hoc_phan,
            data.doi_tuong,
            heDaoTaoId,
            data.bai_cham_1,
            data.bai_cham_2,
            data.tong_so,
            data.quy_chuan,
            data.ghi_chu,
            data.so_tc,
            data.so_sv,
        ]);

        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi để cập nhật." });
        try { await LogService.logChange(userId, userName, "Sửa KTHP", `Sửa KTHP ID: ${ID} - Hình thức: "${data.hinh_thuc}"`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (error) {
        console.error("Lỗi khi cập nhật KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi cập nhật." });
    } finally {
        if (connection) connection.release();
    }
};

const deleteRecord = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ message: "Thiếu ID cần xóa." });

    let connection;
    try {
        connection = await createPoolConnection();
        const existing = await repo.getById(connection, ID);
        if (!existing) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        if (existing.khoa_duyet === 1 || existing.khao_thi_duyet === 1) {
            return res.status(400).json({ success: false, message: "Không thể xóa bản ghi đã được duyệt." });
        }

        await repo.remove(connection, ID);
        try { await LogService.logChange(userId, userName, "Xóa KTHP", `Xóa KTHP: "${existing.hinh_thuc}" - HP: "${existing.ten_hoc_phan}" - GV: "${existing.giang_vien}"`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: "Xóa thành công!" });
    } catch (error) {
        console.error("Lỗi khi xóa KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi xóa." });
    } finally {
        if (connection) connection.release();
    }
};

const batchApprove = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const records = req.body.updates || req.body;
    if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: "Thiếu dữ liệu cần cập nhật." });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        const updatedCount = await repo.updateBatchApproval(connection, records.map((record) => ({
            id: record.id || record.ID,
            khoa_duyet: toInt(pick(record, "khoaduyet", "khoa_duyet"), 0),
            khao_thi_duyet: toInt(pick(record, "khaothiduyet", "khao_thi_duyet"), 0),
        })));

        try { await LogService.logChange(userId, userName, "Batch Duyệt KTHP", `Cập nhật trạng thái duyệt cho ${updatedCount} bản ghi KTHP`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: `Đã cập nhật ${updatedCount} bản ghi!` });
    } catch (error) {
        console.error("Lỗi khi batch approve KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi cập nhật." });
    } finally {
        if (connection) connection.release();
    }
};

const approve = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ message: "Thiếu ID cần duyệt." });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.updateApproval(connection, ID, 1);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        try { await LogService.logChange(userId, userName, "Duyệt KTHP", `Duyệt KTHP ID: ${ID}`); } catch (error) { console.error("Lỗi khi ghi log:", error); }
        res.status(200).json({ success: true, message: "Duyệt thành công!" });
    } catch (error) {
        console.error("Lỗi khi duyệt KTHP:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra khi duyệt." });
    } finally {
        if (connection) connection.release();
    }
};

const getList = async (req, res) => {
    const { MaPhongBan, Ki, Nam } = req.params;
    let connection;
    try {
        connection = await createPoolConnection();
        const query = `
            SELECT 
              t.id,
              t.id_user,
              t.giang_vien AS giangvien,
              t.giang_vien,
              t.khoa,
              t.hoc_ky AS ki,
              t.hoc_ky,
              t.nam_hoc AS namhoc,
              t.nam_hoc,
              t.hinh_thuc AS hinhthuc,
              t.hinh_thuc,
              t.ten_hoc_phan AS tenhocphan,
              t.ten_hoc_phan,
              t.lop_hoc_phan AS lophocphan,
              t.lop_hoc_phan,
              h.he_dao_tao AS doituong,
              h.he_dao_tao AS doi_tuong,
              t.bai_cham_1 AS baicham1,
              t.bai_cham_1,
              t.bai_cham_2 AS baicham2,
              t.bai_cham_2,
              t.tong_so AS tongso,
              t.tong_so,
              t.quy_chuan AS sotietqc,
              t.quy_chuan,
              t.ghi_chu AS ghichu,
              t.ghi_chu,
              t.khoa_duyet AS khoaduyet,
              t.khoa_duyet,
              t.khao_thi_duyet AS khaothiduyet,
              t.khao_thi_duyet,
              t.so_tc,
              t.so_sv
            FROM ${repo.COI_CHAM_RA_DE_TABLE} t
            LEFT JOIN he_dao_tao h ON t.he_dao_tao_id = h.id
            WHERE t.khoa = ? AND t.hoc_ky = ? AND t.nam_hoc = ?
        `;
        const [rows] = await connection.execute(query, [MaPhongBan, Ki, Nam]);
        res.json({ success: true, list: rows });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách KTHP:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách" });
    } finally {
        if (connection) connection.release();
    }
};

const getMyList = async (req, res) => {
    const { TenNhanVien, Ki, Nam } = req.params;
    const nameClean = TenNhanVien.replace(/-/g, ' ').trim();
    let connection;
    try {
        connection = await createPoolConnection();
        const rows = await repo.getByLecturerName(connection, { name: nameClean, hocKy: Ki, namHoc: Nam });
        res.json({ success: true, list: rows });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách cá nhân KTHP:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy danh sách" });
    } finally {
        if (connection) connection.release();
    }
};

const deleteByFilter = async (req, res) => {
    const { Ki, Nam, hocKy, namHoc } = req.body;
    const kiVal = hocKy || Ki;
    const namVal = namHoc || Nam;
    const { userId, userName } = getUserContext(req);
    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.deleteByYearAndSemester(connection, { hocKy: kiVal, namHoc: namVal });
        await LogService.logChange(userId, userName, "Xóa KTHP theo năm/kỳ", `Xóa ${result.affectedRows} bản ghi - Học kỳ ${kiVal}, Năm ${namVal}`);
        res.json({ success: true, message: "Xóa dữ liệu thành công", affectedRows: result.affectedRows });
    } catch (error) {
        console.error("Lỗi khi xóa dữ liệu KTHP:", error);
        res.status(500).json({ success: false, message: "Lỗi khi xóa dữ liệu" });
    } finally {
        if (connection) connection.release();
    }
};

const checkExistence = async (req, res) => {
    const { Ki, Nam, hocKy, namHoc } = req.body;
    const kiVal = hocKy || Ki;
    const namVal = namHoc || Nam;
    let connection;
    try {
        connection = await createPoolConnection();
        const count = await repo.countByYearAndSemester(connection, { hocKy: kiVal, namHoc: namVal });
        res.json({ exists: count > 0 });
    } catch (error) {
        console.error("Lỗi khi kiểm tra dữ liệu KTHP:", error);
        res.status(500).json({ success: false, message: "Lỗi khi kiểm tra dữ liệu" });
    } finally {
        if (connection) connection.release();
    }
};

const updateBatch = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const dataList = req.body.data;
    if (!Array.isArray(dataList)) return res.status(400).json({ error: "Dữ liệu không hợp lệ" });

    let connection;
    try {
        connection = await createPoolConnection();
        await connection.beginTransaction();

        for (const item of dataList) {
            const id = item.id || item.ID;
            const existing = await repo.getById(connection, id);
            if (!existing) continue;

            const loai = item.loai || item.hinh_thuc || item.Type;
            let baicham1 = 0, baicham2 = 0, tongso = 0;
            if (loai === "Ra Đề" || loai === "Ra đề") tongso = item.soDe || item.tong_so || 0;
            else if (loai === "Coi Thi" || loai === "Coi thi") tongso = item.soCa || item.tong_so || 0;
            else if (loai === "Chấm Thi" || loai === "Chấm thi") {
                baicham1 = item.soBaiCham1 || item.bai_cham_1 || 0;
                baicham2 = item.soBaiCham2 || item.bai_cham_2 || 0;
                tongso = item.tongSoBai || item.tong_so || 0;
            }

            await connection.execute(
                `UPDATE ${repo.COI_CHAM_RA_DE_TABLE} SET 
                    ten_hoc_phan = ?, lop_hoc_phan = ?, hinh_thuc = ?, 
                    bai_cham_1 = ?, bai_cham_2 = ?, tong_so = ?, quy_chuan = ?,
                    khoa_duyet = ?, khao_thi_duyet = ?
                WHERE id = ?`,
                [
                    item.tenHocPhan || item.ten_hoc_phan,
                    item.lopHocPhan || item.lop_hoc_phan,
                    loai,
                    baicham1, baicham2, tongso,
                    item.soTietQC || item.quy_chuan || 0,
                    item.khoaduyet || item.khoa_duyet || 0,
                    item.khaothiduyet || item.khao_thi_duyet || 0,
                    id
                ]
            );
        }

        await connection.commit();
        await LogService.logChange(userId, userName, "Cập nhật KTHP hàng loạt", `Cập nhật ${dataList.length} bản ghi`);
        res.json({ success: true, message: "Cập nhật dữ liệu thành công!" });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Lỗi khi cập nhật KTHP hàng loạt:", error);
        res.status(500).json({ success: false, message: "Lỗi khi cập nhật dữ liệu" });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    save,
    saveBatch,
    getTable,
    edit,
    delete: deleteRecord,
    batchApprove,
    approve,
    getList,
    getMyList,
    deleteByFilter,
    checkExistence,
    updateBatch
};
````

## File: src/services/vuotgio_v2/templatePreview.service.js
````javascript
const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");
const ExcelJS = require("exceljs");
const { buildWorkbook } = require("./excel");
const { ConsolidatedGenerator, DepartmentGenerator } = require("./department_excel");
const { PDFConverter } = require("./shared_excel");

const execFileAsync = promisify(execFile);

const SOFFICE_CANDIDATES = [
  process.env.LIBREOFFICE_PATH,
  "D:\\Libre\\program\\soffice.exe",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
].filter(Boolean);

const wrapStageError = (stage, error) => {
  const originalMessage = error?.message || String(error);
  const wrapped = new Error(`[template-preview:${stage}] ${originalMessage}`);
  wrapped.stage = stage;
  wrapped.cause = error;
  return wrapped;
};

const valueToText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (value instanceof Date) return normalizeDateText(value);
  if (value && typeof value === "object") {
    if (value.richText) {
      return value.richText.map((part) => part.text || "").join("");
    }
    if (Object.prototype.hasOwnProperty.call(value, "result")) {
      return value.result ?? "";
    }
    if (Object.prototype.hasOwnProperty.call(value, "text")) {
      return value.text || "";
    }
  }
  return String(value);
};

const normalizeDateText = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const excelWidthToHotWidth = (excelWidth) => {
  const numericWidth = Number(excelWidth);
  if (!Number.isFinite(numericWidth) || numericWidth <= 0) {
    return 100;
  }

  return Math.max(40, Math.round(numericWidth * 7.2 + 12));
};

const toHotData = (worksheet) => {
  const maxRow = worksheet.rowCount;
  let maxCol = 0;

  for (let row = 1; row <= maxRow; row += 1) {
    const rowObj = worksheet.getRow(row);
    maxCol = Math.max(maxCol, rowObj.cellCount || 0);
  }

  const hotData = [];
  for (let row = 1; row <= maxRow; row += 1) {
    const rowData = [];
    for (let col = 1; col <= maxCol; col += 1) {
      const cell = worksheet.getCell(row, col);
      rowData.push(valueToText(cell.value));
    }
    hotData.push(rowData);
  }

  const colWidths = [];
  for (let col = 1; col <= maxCol; col += 1) {
    colWidths.push(excelWidthToHotWidth(worksheet.getColumn(col)?.width));
  }

  const mergeCells = [];
  const merges = worksheet.model?.merges || [];
  merges.forEach((address) => {
    const [start, end] = address.split(":");
    const startCell = worksheet.getCell(start);
    const endCell = worksheet.getCell(end || start);
    mergeCells.push({
      row: startCell.row - 1,
      col: startCell.col - 1,
      rowspan: endCell.row - startCell.row + 1,
      colspan: endCell.col - startCell.col + 1,
    });
  });

  return { hotData, mergeCells, colWidths };
};

const getAvailableSofficePath = () => {
  for (const candidate of SOFFICE_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (_error) {
      // Ignore invalid candidate path.
    }
  }
  return null;
};

const convertXlsxBufferToPdf = async (xlsxBuffer) => {
  return PDFConverter.convertXlsxBufferToPdf(xlsxBuffer);
};

const buildWorkbookFromSummary = (summary, useFormulas) => {
  const workbook = buildWorkbook([summary], { useFormulas });
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Workbook không có worksheet");
  }
  return { workbook, worksheet };
};

const sanitizeWorksheetName = (value, fallback) => {
  const trimmed = String(value || fallback || "Sheet1")
    .replace(/[\\/?*:[\]]/g, " ")
    .trim();
  return (trimmed || fallback || "Sheet1").slice(0, 31);
};

const excelNumber = (value) => Number(Number(value || 0).toFixed(2));

const buildPaymentWorksheet = (workbook, summaries, khoa, namHoc) => {
  // Use the new PaymentGenerator from department_excel module
  const { PaymentGenerator } = require("./department_excel");
  
  return PaymentGenerator.createPaymentSheet(workbook, {
    summaries,
    khoa,
    namHoc
  });
};

const attachDepartmentSheet = (workbook, { summaries, khoa, namHoc }) => {
  // Use the new DepartmentGenerator from department_excel module
  return DepartmentGenerator.createDepartmentSheet(workbook, {
    summaries,
    khoa,
    namHoc
  });
};

const buildDepartmentWorkbook = ({ summaries, khoa, namHoc }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VuotGioV2";
  workbook.created = new Date();
  attachDepartmentSheet(workbook, { summaries, khoa, namHoc });
  return workbook;
};

const buildDepartmentPreviewPdf = async ({ summaries, khoa, namHoc }) => {
  const workbook = DepartmentGenerator.generateDepartmentWorkbook({ summaries, khoa, namHoc });
  let xlsxBuffer;
  try {
    xlsxBuffer = await workbook.xlsx.writeBuffer();
  } catch (error) {
    throw wrapStageError("write-xlsx-buffer", error);
  }

  let pdfBuffer;
  try {
    pdfBuffer = await convertXlsxBufferToPdf(Buffer.from(xlsxBuffer));
  } catch (error) {
    throw wrapStageError("convert-pdf-libreoffice", error);
  }

  return {
    previewType: "pdf",
    pdfBase64: pdfBuffer.toString("base64"),
    warnings: [],
    intermediateJson: null,
    meta: {
      khoa,
      namHoc,
      sheetName: sanitizeWorksheetName(khoa, "PreviewKhoa"),
      totalSummaries: summaries.length,
    },
  };
};

const buildTemplatePreview = async ({ summary }) => {
  const { worksheet } = buildWorkbookFromSummary(summary, false);

  let hotData;
  let mergeCells;
  let colWidths;
  try {
    ({ hotData, mergeCells, colWidths } = toHotData(worksheet));
  } catch (error) {
    throw wrapStageError("build-hot-data", error);
  }

  return {
    hotData,
    mergeCells,
    colWidths,
    styles: [],
    warnings: [],
    intermediateJson: null,
    meta: {
      giangVien: summary.giangVien,
      namHoc: summary.nam_hoc || summary.namHoc,
      khoa: summary.maKhoa,
      templateSheet: worksheet.name,
    },
  };
};

const buildTemplatePreviewPdf = async ({ summary }) => {
  const { workbook, worksheet } = buildWorkbookFromSummary(summary, false);

  let xlsxBuffer;
  try {
    xlsxBuffer = await workbook.xlsx.writeBuffer();
  } catch (error) {
    throw wrapStageError("write-xlsx-buffer", error);
  }

  let pdfBuffer;
  try {
    pdfBuffer = await convertXlsxBufferToPdf(Buffer.from(xlsxBuffer));
  } catch (error) {
    throw wrapStageError("convert-pdf-libreoffice", error);
  }

  return {
    previewType: "pdf",
    pdfBase64: pdfBuffer.toString("base64"),
    warnings: [],
    intermediateJson: null,
    meta: {
      giangVien: summary.giangVien,
      namHoc: summary.nam_hoc || summary.namHoc,
      khoa: summary.maKhoa,
      templateSheet: worksheet.name,
    },
  };
};

const buildConsolidatedPreviewPdf = async ({ namHoc }) => {
  let workbook;
  try {
    workbook = await ConsolidatedGenerator.generateConsolidatedWorkbook(namHoc);
  } catch (error) {
    throw wrapStageError("build-consolidated-workbook", error);
  }

  let xlsxBuffer;
  try {
    xlsxBuffer = await workbook.xlsx.writeBuffer();
  } catch (error) {
    throw wrapStageError("write-xlsx-buffer", error);
  }

  let pdfBuffer;
  try {
    pdfBuffer = await convertXlsxBufferToPdf(Buffer.from(xlsxBuffer));
  } catch (error) {
    throw wrapStageError("convert-pdf-libreoffice", error);
  }

  return {
    previewType: "pdf",
    pdfBase64: pdfBuffer.toString("base64"),
    warnings: [],
    intermediateJson: null,
    meta: {
      namHoc,
      previewType: "consolidated",
      totalSheets: workbook.worksheets.length,
      sheetNames: workbook.worksheets.map(ws => ws.name),
    },
  };
};

module.exports = {
  attachDepartmentSheet,
  buildTemplatePreview,
  buildTemplatePreviewPdf,
  buildDepartmentPreviewPdf,
  buildConsolidatedPreviewPdf,
};
````

## File: src/services/vuotgio_v2/tongHop.service.js
````javascript
/**
 * VUOT GIO V2 - Tổng Hợp Service (Core SDO Engine)
 * Lõi tính toán số tiết vượt giờ
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/tongHop.repo");
const statsService = require("../nckh_v3/stats.service");

const mapper = require("../../mappers/vuotgio_v2/summary.mapper");

const withConnection = async (connection, callback) => {
    let shouldRelease = false;
    if (!connection) {
        connection = await createPoolConnection();
        shouldRelease = true;
    }
    try {
        return await callback(connection);
    } finally {
        if (shouldRelease && connection) {
            connection.release();
        }
    }
};

const chuanHoaNamHoc = (namHoc) => {
    if (!namHoc) return "";
    let clean = namHoc.toString().replace(/\s+/g, "");
    if (clean.length === 8 && !clean.includes("-")) {
        return clean.substring(0, 4) + " - " + clean.substring(4);
    }
    if (clean.includes("-")) {
        let parts = clean.split("-");
        return parts[0] + " - " + parts[1];
    }
    return namHoc;
};

/**
 * Lấy SDO nguyên bản (Atomic SDO) cho 1 giảng viên
 */
const getAtomicSDO = async (namHocInput, id_User, connection) => withConnection(connection, async (activeConnection) => {
    const namHoc = chuanHoaNamHoc(namHocInput);
    const nv = await repo.getNhanVienById(activeConnection, id_User);
    if (!nv) return null;

    const [giangDay, lopNgoaiQC, kthp, doAn, hdtq, nckhRecords, dinhMuc, chuNhiemKhoa] = await Promise.all([
        repo.getGiangDayByIdUser(activeConnection, { namHoc, idUser: id_User }),
        repo.getLopNgoaiQCByIdUser(activeConnection, { namHoc, idUser: id_User }),
        repo.getKthpByIdUser(activeConnection, { namHoc, idUser: id_User }),
        repo.getDoAnByIdUser(activeConnection, { namHoc, idUser: id_User }),
        repo.getHuongDanThamQuanByIdUser(activeConnection, { namHoc, idUser: id_User }),
        id_User ? statsService.getLecturerRecords(id_User, namHoc) : [],
        repo.getDinhMuc(activeConnection),
        repo.getChuNhiemKhoaByKhoa(activeConnection, nv.maKhoa)
    ]);

    return mapper.toAtomicSDO(nv, { giangDay, lopNgoaiQC, kthp, doAn, hdtq, nckhRecords }, namHoc, dinhMuc, { chuNhiemKhoa });
});

/**
 * Lấy danh sách SDO cho tất cả GV trong khoa
 */
const getCollectionSDO = async (namHocInput, khoa) => withConnection(null, async (connection) => {
    const namHoc = chuanHoaNamHoc(namHocInput);
    const [rawData, nckhData, dinhMuc] = await Promise.all([
        repo.getDuLieuThoTongHop(connection, { namHoc, khoa }),
        statsService.getLecturerSummary(namHoc, "ALL"),
        repo.getDinhMuc(connection)
    ]);

    console.info("[tongHopService] raw sizes", {
        namHoc,
        khoa,
        rawCount: Array.isArray(rawData) ? rawData.length : 0,
        nckhCount: Array.isArray(nckhData) ? nckhData.length : 0,
        hasDinhMuc: Boolean(dinhMuc)
    });

    const nckhMap = new Map(nckhData.map(r => [Number(r.lecturerId), r.tongSoTietGiangVien]));

    const missingNckh = rawData.filter(r => !nckhMap.has(Number(r.id_User))).map(r => r.id_User);
    if (missingNckh.length) {
        console.warn("[tongHopService] missing NCKH records", {
            count: missingNckh.length,
            sample: missingNckh.slice(0, 20)
        });
    }

    return mapper.toCollectionSDO(rawData, nckhMap, namHoc, dinhMuc);
});

/**
 * Lấy danh sách SDO chi tiết (bao gồm tableF) cho tất cả GV trong khoa.
 * Sử dụng batch fetch để giảm số lượng queries (từ N*8 xuống ~8).
 */
const getCollectionSDODetail = async (namHocInput, khoa) => withConnection(null, async (connection) => {
    const namHoc = chuanHoaNamHoc(namHocInput);
    const rawData = await repo.getDuLieuThoTongHop(connection, { namHoc, khoa });

    if (!rawData.length) return [];

    // Lấy danh sách ID (đã là số nguyên từ DB, an toàn cho parameterized query)
    const ids = rawData.map(r => r.id_User);

    // Batch fetch tất cả dữ liệu nguồn song song (~7 queries thay vì N*8)
    const [allGD, allLNQC, allKTHP, allDA, allHDTQ, nckhData, dinhMuc, allNV] = await Promise.all([
        repo.getGiangDayByIds(connection, { namHoc, ids }),
        repo.getLopNgoaiQCByIds(connection, { namHoc, ids }),
        repo.getKthpByIds(connection, { namHoc, ids }),
        repo.getDoAnByIds(connection, { namHoc, ids }),
        repo.getHuongDanThamQuanByIds(connection, { namHoc, ids }),
        statsService.getLecturerSummary(namHoc, "ALL"),
        repo.getDinhMuc(connection),
        repo.getNhanVienByIds(connection, ids),
    ]);

    // Group by id_User trong memory
    const groupByUser = (arr, key = 'id_User') => {
        const map = new Map();
        for (const r of arr) {
            const id = r[key];
            if (!map.has(id)) map.set(id, []);
            map.get(id).push(r);
        }
        return map;
    };

    const gdMap = groupByUser(allGD);
    const lnqcMap = groupByUser(allLNQC);
    const kthpMap = groupByUser(allKTHP);
    const daMap = groupByUser(allDA);
    const hdtqMap = groupByUser(allHDTQ);
    const nvMap = new Map(allNV.map(nv => [nv.id_User, nv]));
    const nckhMap = new Map(nckhData.map(r => [Number(r.lecturerId), r.tongSoTietGiangVien]));

    // Fetch chuNhiemKhoa — deduplicate theo khoa
    const uniqueKhoas = [...new Set(allNV.map(nv => nv.maKhoa).filter(Boolean))];
    const chuNhiemMap = new Map();
    await Promise.all(uniqueKhoas.map(async (k) => {
        const name = await repo.getChuNhiemKhoaByKhoa(connection, k);
        chuNhiemMap.set(k, name);
    }));

    // Map từng GV với data đã có sẵn (pure computation, không query thêm)
    const sdoList = [];
    for (const row of rawData) {
        const nv = nvMap.get(row.id_User);
        if (!nv) continue;

        const userRawData = {
            giangDay: gdMap.get(row.id_User) || [],
            lopNgoaiQC: lnqcMap.get(row.id_User) || [],
            kthp: kthpMap.get(row.id_User) || [],
            doAn: daMap.get(row.id_User) || [],
            hdtq: hdtqMap.get(row.id_User) || [],
            // Tạo mảng giả lập nckhRecords với tổng số tiết (đủ cho calculateOvertime)
            nckhRecords: [{ soTietGiangVien: nckhMap.get(Number(row.id_User)) || 0 }],
        };

        const sdo = mapper.toAtomicSDO(nv, userRawData, namHoc, dinhMuc, {
            chuNhiemKhoa: chuNhiemMap.get(nv.maKhoa) || ""
        });
        if (!sdo) continue;

        sdoList.push({
            id_User: sdo.id_User,
            giangVien: sdo.giangVien,
            maKhoa: sdo.maKhoa,
            khoa: sdo.khoa,
            isKhoa: sdo.isKhoa ?? row.isKhoa ?? 1,
            chucVu: sdo.chucVu,
            soTaiKhoan: sdo.soTaiKhoan,
            nganHang: sdo.nganHang,
            lyDoMienGiam: sdo.lyDoMienGiam,
            phanTramMienGiam: sdo.phanTramMienGiam,
            hsl: sdo.hsl,
            luong: sdo.luong,
            soTietGiangDay: sdo.soTietGiangDay,
            soTietNgoaiQC: sdo.soTietNgoaiQC,
            soTietKTHP: sdo.soTietKTHP,
            soTietDoAn: sdo.soTietDoAn,
            soTietHDTQ: sdo.soTietHDTQ,
            tongThucHien: sdo.tongThucHien,
            mienGiam: sdo.mienGiam,
            dinhMucSauMienGiam: sdo.dinhMucSauMienGiam,
            thieuTietGiangDay: sdo.thieuTietGiangDay,
            thieuNCKH: sdo.thieuNCKH,
            tongVuot: sdo.tongVuot,
            thanhToan: sdo.thanhToan,
            dinhMucChuan: sdo.dinhMucChuan,
            soTietNCKH: sdo.soTietNCKH,
            nam_hoc: sdo.nam_hoc,
            tableF: sdo.tableF,
            breakdown: sdo.breakdown
        });
    }

    console.info(`[getCollectionSDODetail] Aggregated ${sdoList.length} records. Total luong: ${sdoList.reduce((s, r) => s + (r.luong || 0), 0)}. Sample:`, 
        sdoList.slice(0, 5).map(r => ({ gv: r.giangVien, luong: r.luong })));

    return sdoList;
});

module.exports = {
    getAtomicSDO,
    getCollectionSDO,
    getCollectionSDODetail,
    chuanHoaNamHoc
};
````

## File: src/services/vuotgio_v2/xuatFile.service.js
````javascript
/**
 * VUOT GIO V2 - Xuất File Service (Type A: Kê khai cá nhân)
 *
 * Hỗ trợ 3 cấp độ granularity:
 *   1. giangVien (id_User hoặc HoTen) → 1 giảng viên cụ thể
 *   2. khoa (MaPhongBan)              → toàn bộ GV trong 1 khoa
 *   3. khoa = 'ALL' / không truyền   → toàn bộ GV trong hệ thống
 *
 * Output: ExcelJS Workbook — mỗi GV 1 sheet kê khai (A, B, C, D, E, F)
 * Folder: src/services/vuotgio_v2/excel/  (keKhaiReport.generator.js)
 */

const tongHopService = require('./tongHop.service');
const createPoolConnection = require('../../config/databasePool');
const sharedRepo = require('../../repositories/vuotgio_v2/shared.repo');
const { buildWorkbook } = require('./excel');

/**
 * Resolve danh sách SDO dựa theo scope (giangVien / khoa / toàn bộ)
 * @returns {Promise<Array>} summaries (Atomic SDO list)
 */
const _resolveSummaries = async (connection, namHoc, { khoa, giangVien }) => {
    // ─── Scope: 1 giảng viên ───────────────────────────────────────────────────
    if (giangVien) {
        let sdo = await tongHopService.getAtomicSDO(namHoc, giangVien, connection);

        // giangVien có thể là HoTen (string) thay vì id_User → fallback lookup
        if (!sdo) {
            const teachers = await sharedRepo.getTeachers(connection, khoa !== 'ALL' ? khoa : undefined);
            const matched = teachers.find(t =>
                String(t.id_User) === String(giangVien) ||
                String(t.HoTen || '').trim() === String(giangVien).trim()
            );
            if (matched) {
                sdo = await tongHopService.getAtomicSDO(namHoc, matched.id_User, connection);
            }
        }

        return sdo ? [sdo] : [];
    }

    // ─── Scope: theo khoa hoặc toàn bộ ────────────────────────────────────────
    const khoaFilter = (!khoa || khoa === 'ALL') ? undefined : khoa;
    const teachers = await sharedRepo.getTeachers(connection, khoaFilter);

    const summaries = [];
    for (const teacher of teachers) {
        const sdo = await tongHopService.getAtomicSDO(namHoc, teacher.id_User, connection);
        if (sdo) summaries.push(sdo);
    }
    return summaries;
};

/**
 * Xuất workbook kê khai cá nhân.
 * Mỗi GV = 1 sheet. Không có sheet tổng hợp.
 *
 * @param {string} namHoc
 * @param {string|undefined} khoa     - mã khoa, hoặc 'ALL'
 * @param {string|undefined} giangVien - id_User hoặc HoTen
 * @returns {Promise<{workbook: ExcelJS.Workbook, meta: {giangVienName: string|null, maKhoa: string|null}}>}
 */
const exportExcel = async (namHoc, khoa, giangVien) => {
    if (!namHoc) throw new Error('Thiếu thông tin Năm học');

    let connection;
    try {
        connection = await createPoolConnection();

        const summaries = await _resolveSummaries(connection, namHoc, { khoa, giangVien });

        if (!summaries.length) {
            throw new Error('Không có dữ liệu để xuất file');
        }

        console.info('[xuatFile.service] exportExcel', {
            namHoc,
            khoa: khoa || 'ALL',
            giangVien: giangVien || 'ALL',
            count: summaries.length,
        });

        // Extract metadata from summaries for filename generation
        const meta = {
            giangVienName: giangVien ? (summaries[0].giangVien || null) : null,
            maKhoa: (khoa && khoa !== 'ALL') ? (summaries[0].maKhoa || khoa) : null,
        };

        const workbook = await buildWorkbook(summaries, { useFormulas: true });
        return { workbook, meta };
    } finally {
        if (connection) connection.release();
    }
};

module.exports = { exportExcel };
````

## File: src/views/vuotgio_v2/vuotgio.huongDanThamQuan.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hướng Dẫn Tham Quan Thực Tế - Vượt Giờ V2</title>

    <!-- Bootstrap 5 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />

    <!-- SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

    <!-- Custom Styles -->
    <link rel="stylesheet" href="/css/admin.css" />
    <link rel="stylesheet" href="/css/styles.css" />
    <link rel="stylesheet" href="/css/table.css" />
    
    <style>
        .page-wrap {
            padding: 20px;
        }
        .panel {
            background: #fff;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }
        .title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 14px;
        }
        .header-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        .loc {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        .search {
            height: 45px !important;
            padding: 0 1rem !important;
            box-sizing: border-box;
        }
        .btn {
            height: 45px !important;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0 1.5rem !important;
            box-sizing: border-box;
            margin-bottom: 0 !important;
        }
        .table-wrap {
            margin-top: 14px;
            overflow: auto;
            height: 500px;
        }
        table.class-table {
            width: 100%;
            border-collapse: collapse;
        }
        .class-table th,
        .class-table td {
            border: 1px solid #dbe3f0;
            padding: 8px;
            font-size: 0.78rem;
            vertical-align: middle;
            text-align: center;
        }
        .class-table th {
            background: #1f4ea8;
            color: #fff;
            position: sticky;
            top: 0;
            z-index: 1;
            font-weight: 600;
        }
        .class-table tbody tr:hover {
            background-color: #f8f9fa;
        }
        /* Searchable Select Styles */
        .searchable-select {
            position: relative;
        }
        .searchable-select .dropdown-menu {
            max-height: 200px;
            overflow-y: auto;
            display: none;
            width: 100%;
        }
        .searchable-select .dropdown-menu.show {
            display: block;
        }
        /* Action Button Styles */
        .btn-action {
            padding: 4px 8px;
            font-size: 0.85rem;
            border-radius: 4px;
        }
        .btn-action i {
            font-size: 0.9rem;
        }
    </style>
</head>

<body>
    <%- include('../header') %>

    <div class="page-wrap">
        <div class="panel">
            <!-- Data Lock Banner -->
            <div id="dataLockBanner" class="alert alert-warning align-items-center mb-3 d-none" role="alert">
                <i class="bi bi-info-circle-fill me-2 fs-5"></i>
                <span id="dataLockMessage"></span>
            </div>

            <div class="title">Hướng dẫn tham quan thực tế</div>

            <!-- Toolbar -->
            <div class="header-actions" style="height: 45px">
                <div class="loc d-flex">
                    <select class="selectop" id="namHocFilter" style="width: 130px;"></select>
                    <select class="selectop" id="kiFilter" style="width: 100px;">
                        <option value="1">Kì 1</option>
                        <option value="2">Kì 2</option>
                    </select>
                    <select class="selectop" id="dotFilter" style="width: 100px;">
                        <option value="1">Đợt 1</option>
                        <option value="2">Đợt 2</option>
                    </select>
                    <select class="selectop" id="khoaFilter" style="width: 200px;">
                        <option value="ALL">Tất cả khoa</option>
                    </select>
                    
                    <button id="loadDataBtn" class="btn text-nowrap mx-2">Hiển thị</button>
                    <button id="updateApprovalBtn" class="btn btn-success text-nowrap" style="display: none;">CẬP NHẬT</button>
                </div>

                <a href="/v2/vuotgio/huong-dan-tham-quan/add" class="btn btn-success text-nowrap">Thêm mới</a>
            </div>

            <!-- Table Section -->
            <div class="table-wrap">
                <table class="class-table" id="mainTable">
                    <thead>
                        <tr>
                            <th>STT</th>
                            <th>Giảng viên</th>
                            <th>Khoa</th>
                            <th>Hệ Đào Tạo</th>
                            <th>Ngành học</th>
                            <th>Mô tả hoạt động</th>
                            <th>Số ngày</th>
                            <th>Số tiết quy đổi</th>
                            <th style="width: 80px;" id="khoaColumn">
                                <div class="form-check d-flex justify-content-center align-items-center">
                                    <input class="check me-1" type="checkbox" id="checkAllKhoa"
                                        onclick="checkAll('khoa')" />
                                    <label class="form-check-label" for="checkAllKhoa">Khoa</label>
                                </div>
                            </th>
                            <th style="width: 80px;" id="phongColumn">
                                <div class="form-check d-flex justify-content-center align-items-center">
                                    <input class="check me-1" type="checkbox" id="checkAllDaoTao"
                                        onclick="checkAll('daoTao')" />
                                    <label class="form-check-label text-nowrap" for="checkAllDaoTao">ĐT</label>
                                </div>
                            </th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody id="tableBody">
                        <!-- Dữ liệu sẽ được chèn vào đây -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Modal Form -->
    <div class="modal fade" id="formModal" tabindex="-1">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="modalTitle">Thêm mới hướng dẫn tham quan</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <form id="dataForm">
                    <div class="modal-body">
                        <input type="hidden" id="recordId" name="id">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Giảng viên <span class="text-danger">*</span></label>
                                <div class="searchable-select">
                                    <input type="text" class="form-control" id="teacherSearch" placeholder="Nhập tên giảng viên..." autocomplete="off" required>
                                    <input type="hidden" id="id_User" name="id_User">
                                    <ul class="dropdown-menu" id="teacherList"></ul>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Khoa (Đơn vị) <span class="text-danger">*</span></label>
                                <select class="form-select" id="khoa" name="khoa" required></select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Năm học <span class="text-danger">*</span></label>
                                <select class="form-select" id="nam_hoc" name="nam_hoc" required></select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Kỳ học</label>
                                <select class="form-select" id="hoc_ky" name="hoc_ky">
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Đợt</label>
                                <select class="form-select" id="dot" name="dot">
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                </select>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Hệ đào tạo <span class="text-danger">*</span></label>
                                <select class="form-select" id="he_dao_tao_id" name="he_dao_tao_id" required></select>
                            </div>
                            <div class="col-md-12">
                                <label class="form-label">Ngành học</label>
                                <input type="text" class="form-control" name="nganh_hoc">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Theo QĐ</label>
                                <input type="text" class="form-control" name="theo_qd">
                            </div>
                            <div class="col-md-12">
                                <label class="form-label">Mô tả hoạt động</label>
                                <textarea class="form-control" name="mo_ta_hoat_dong" rows="2"></textarea>
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Số ngày <span class="text-danger">*</span></label>
                                <input type="number" class="form-control" id="so_ngay" name="so_ngay" required min="0">
                            </div>
                            <div class="col-md-4">
                                <label class="form-label">Số tiết quy đổi</label>
                                <input type="text" class="form-control bg-light" id="so_tiet_quy_doi" readonly value="0">
                                <small class="text-muted">(1 ngày = 3 tiết)</small>
                            </div>
                            <div class="col-md-12">
                                <label class="form-label">Ghi chú</label>
                                <textarea class="form-control" name="ghi_chu" rows="2"></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                        <button type="submit" class="btn btn-primary">Lưu dữ liệu</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Scripts -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>

    <script src="/js/vuotgio_v2/khoaFilter.utils.js"></script>
    <script src="/js/vuotgio_v2/huongDanThamQuan/index.js"></script>

    <!-- Data Lock Check -->
    <script>
    (function() {
        const namHocSelect = document.getElementById('namHocFilter');
        const banner = document.getElementById('dataLockBanner');
        const bannerMsg = document.getElementById('dataLockMessage');

        function checkLockStatus() {
            const namHoc = namHocSelect ? namHocSelect.value : '';
            if (!namHoc) {
                banner.classList.add('d-none');
                banner.classList.remove('d-flex');
                enableButtons();
                return;
            }
            fetch('/v2/vuotgio/trang-thai-khoa?namHoc=' + encodeURIComponent(namHoc))
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data.success && data.locked) {
                        var info = data.lockInfo;
                        bannerMsg.textContent = 'Dữ liệu năm học ' + namHoc + ' đã được lưu bởi ' + info.nguoi_khoa + ' vào ' + info.ngay_khoa + '. Không thể chỉnh sửa.';
                        banner.classList.remove('d-none');
                        banner.classList.add('d-flex');
                        disableButtons();
                    } else {
                        banner.classList.add('d-none');
                        banner.classList.remove('d-flex');
                        enableButtons();
                    }
                })
                .catch(function() {
                    banner.classList.add('d-none');
                    banner.classList.remove('d-flex');
                    enableButtons();
                });
        }

        function disableButtons() {
            var actionBtns = document.querySelectorAll('#updateApprovalBtn, #checkAllKhoa, #checkAllDaoTao');
            actionBtns.forEach(function(btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            });
            // Disable "Thêm mới" link button
            var addBtn = document.querySelector('a[href="/v2/vuotgio/huong-dan-tham-quan/add"]');
            if (addBtn) {
                addBtn.style.opacity = '0.5';
                addBtn.style.pointerEvents = 'none';
            }
            document.querySelectorAll('#tableBody .btn-action, #tableBody .btn').forEach(function(btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            });
            document.body.dataset.locked = 'true';
        }

        function enableButtons() {
            var actionBtns = document.querySelectorAll('#updateApprovalBtn, #checkAllKhoa, #checkAllDaoTao');
            actionBtns.forEach(function(btn) {
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            });
            var addBtn = document.querySelector('a[href="/v2/vuotgio/huong-dan-tham-quan/add"]');
            if (addBtn) {
                addBtn.style.opacity = '';
                addBtn.style.pointerEvents = '';
            }
            document.querySelectorAll('#tableBody .btn-action, #tableBody .btn').forEach(function(btn) {
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            });
            document.body.dataset.locked = 'false';
        }

        if (namHocSelect) {
            namHocSelect.addEventListener('change', checkLockStatus);
        }
        setTimeout(checkLockStatus, 500);

        // Re-check after data loads
        var observer = new MutationObserver(function() {
            if (document.body.dataset.locked === 'true') {
                disableButtons();
            }
        });
        var tableBody = document.getElementById('tableBody');
        if (tableBody) {
            observer.observe(tableBody, { childList: true });
        }
    })();
    </script>
</body>

</html>
````

## File: src/controllers/vuotgio_v2/base.controller.js
````javascript
/**
 * VUOT GIO V2 - Base Controller
 * Render các views cơ bản cho module Vượt Giờ V2
 * Date: 2026-01-29
 */

const createPoolConnection = require("../../config/databasePool");
const sharedRepo = require("../../repositories/vuotgio_v2/shared.repo");

// =====================================================
// RENDER VIEWS
// =====================================================

/**
 * Render trang Thêm Lớp Ngoài Quy Chuẩn
 */
const getThemLopNgoaiQC = (req, res) => {
    res.render("vuotgio_v2/vuotgio.themLopNgoaiQC.ejs");
};

const getCoiChamRaDeThi = (req, res) => {
    res.render("vuotgio_v2/vuotgio.file.coiChamRaDe.ejs");
};

/**
 * Render trang Danh Sách Lớp Ngoài Quy Chuẩn
 */
const getDanhSachLopNgoaiQC = (req, res) => {
    res.render("vuotgio_v2/vuotgio.danhSachLopNgoaiQC.ejs");
};

/**
 * Render trang Thêm Kết Thúc Học Phần
 */
const getThemKTHP = (req, res) => {
    res.render("vuotgio_v2/vuotgio.add.coiChamRaDe.ejs");
};

/**
 * Render trang Duyệt Kết Thúc Học Phần
 */
const getDuyetKTHP = (req, res) => {
    res.render("vuotgio_v2/vuotgio.duyet.coiChamRaDe.ejs");
};

/**
 * Render trang Tổng Hợp Giảng Viên
 */
const getTongHopGV = (req, res) => {
    res.render("vuotgio_v2/vuotgio.tongHopGV.ejs");
};

/**
 * Render trang Tổng Hợp Khoa
 */
const getTongHopKhoa = (req, res) => {
    res.render("vuotgio_v2/vuotgio.tongHopKhoa.ejs");
};

/**
 * Render trang Xuất File
 */
const getXuatFile = (req, res) => {
    res.render("vuotgio_v2/vuotgio.xuatFile.ejs");
};

/**
 * Render trang Hướng Dẫn Đồ Án Tốt Nghiệp
 */
const getHuongDanDATN = (req, res) => {
    res.render("vuotgio_v2/vuotgio.huongDanDATN.ejs");
};

/**
 * Render trang Hướng Dẫn Tham Quan Thực Tế
 */
const getHuongDanThamQuan = (req, res) => {
    res.render("vuotgio_v2/vuotgio.huongDanThamQuan.ejs");
};

/**
 * Render trang Thêm Hướng Dẫn Tham Quan Thực Tế
 */
const getHuongDanThamQuanAdd = (req, res) => {
    res.render("vuotgio_v2/vuotgio.huongDanThamQuan.add.ejs");
};

/**
 * Render trang Thong Ke Giang Day (Co huu)
 */
const getThongKeGiangDay = (req, res) => {
    res.render("vuotgio_v2/vuotgio.thongKeGiangDay.ejs");
};

// =====================================================
// API DÙNG CHUNG
// =====================================================

/**
 * Lấy danh sách giảng viên theo khoa
 */
const getTeachers = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { Khoa } = req.query;

        const results = await sharedRepo.getTeachers(connection, Khoa);
        res.json(results);
    } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu giảng viên" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy danh sách học phần
 */
const getHocPhan = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const results = await sharedRepo.getHocPhan(connection);
        res.json(results);
    } catch (error) {
        console.error("Error fetching hoc phan:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu học phần" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy danh sách lớp học
 */
const getLopHoc = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { NamHoc } = req.query;

        const results = await sharedRepo.getLopHoc(connection, NamHoc);
        res.json(results);
    } catch (error) {
        console.error("Error fetching lop hoc:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu lớp học" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy định mức giảng dạy và NCKH
 */
const getDinhMuc = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const result = await sharedRepo.getDinhMuc(connection);

        res.json(result || { GiangDay: 280, NCKH: 280 });
    } catch (error) {
        console.error("Error fetching dinh muc:", error);
        res.status(500).json({ message: "Lỗi khi lấy định mức" });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Render views
    getThemLopNgoaiQC,
    getDanhSachLopNgoaiQC,
    getThemKTHP,
    getDuyetKTHP,
    getTongHopGV,
    getTongHopKhoa,
    getXuatFile,
    getHuongDanDATN,
    getHuongDanThamQuan,
    getHuongDanThamQuanAdd,
    getThongKeGiangDay,
    getCoiChamRaDeThi,

    // API chung
    getTeachers,
    getHocPhan,
    getLopHoc,
    getDinhMuc
};
````

## File: src/public/js/vuotgio_v2/duyetKTHP/index.js
````javascript
/**
 * Duyệt Kết Thúc Học Phần - Frontend JS
 * VuotGio V2 - Refactored to HTML Table (No AG-Grid)
 */

let globalData = []; // Biến toàn cục để lưu dữ liệu từ server
let heDaoTaoList = [];

function toFixedInput(value, decimals) {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return '';
    return num.toFixed(decimals);
}

function setSelectValueWithFallback(select, value) {
    if (!select) return;
    const normalized = String(value ?? '').trim();
    if (!normalized) return;
    const exists = Array.from(select.options).some(option => option.value === normalized);
    if (!exists) {
        const option = document.createElement('option');
        option.value = normalized;
        option.textContent = normalized;
        select.appendChild(option);
    }
    select.value = normalized;
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('[DuyetKTHP] Init - HTML Table Version');
    
    // Load dropdowns và tự động tải dữ liệu
    await Promise.all([
        loadNamHocOptions(),
        loadKhoaOptions(),
        loadHeDaoTaoOptions()
    ]);
    
    loadData();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('saveEditBtn').addEventListener('click', handleEditSubmit);
    document.getElementById('updateApprovalBtn').addEventListener('click', submitApprovals);

    // Filter event listeners
    document.getElementById('filterGiangVien').addEventListener('input', filterTable);
    document.getElementById('filterHocPhan').addEventListener('input', filterTable);

    // Setup permission-based UI
    setupUpdateButtonVisibility();
    setupColumnVisibility();
});

// ==================== PERMISSION HELPERS ====================

function setupUpdateButtonVisibility() {
    const role = localStorage.getItem('userRole');
    const MaPhongBan = localStorage.getItem('MaPhongBan');
    const updateBtn = document.getElementById('updateApprovalBtn');

    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
    const khaoThi = window.APP_DEPARTMENTS?.khaoThi || 'KT&ĐBCL';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

    // Khoa: GV_CNBM duyệt, Lãnh đạo khoa bỏ duyệt
    // Phòng (Khảo thí): Trợ lý duyệt, Lãnh đạo phòng bỏ duyệt
    if (role === gvCnbm || role === lanhDaoKhoa) {
        updateBtn.style.display = 'flex';
    } else if (MaPhongBan === khaoThi && (role === troLyPhong || role === lanhDaoPhong)) {
        updateBtn.style.display = 'flex';
    } else if (MaPhongBan === banGiamDoc) {
        updateBtn.style.display = 'flex';
    }
}

function setupColumnVisibility() {
    const role = localStorage.getItem('userRole');
    const MaPhongBan = localStorage.getItem('MaPhongBan');

    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
    const khaoThi = window.APP_DEPARTMENTS?.khaoThi || 'KT&ĐBCL';

    const checkAllKhoa = document.getElementById('checkAllKhoa');
    const checkAllKhaoThi = document.getElementById('checkAllKhaoThi');

    // Mặc định disable tất cả
    if (checkAllKhoa) checkAllKhoa.disabled = true;
    if (checkAllKhaoThi) checkAllKhaoThi.disabled = true;

    // Khoa: GV_CNBM duyệt (check), Lãnh đạo khoa bỏ duyệt (uncheck)
    if (role === gvCnbm || role === lanhDaoKhoa) {
        if (checkAllKhoa) checkAllKhoa.disabled = false;
    }

    // Phòng Khảo thí: Trợ lý duyệt (check), Lãnh đạo phòng bỏ duyệt (uncheck)
    if (MaPhongBan === khaoThi && (role === troLyPhong || role === lanhDaoPhong)) {
        if (checkAllKhaoThi) checkAllKhaoThi.disabled = false;
    }
}

/**
 * Kiểm tra quyền duyệt cho từng cột
 * @param {'khoa'|'khaoThi'} type - Loại duyệt
 * @param {'check'|'uncheck'} action - Hành động (check = duyệt, uncheck = bỏ duyệt)
 */
function canApprove(type, action) {
    const role = localStorage.getItem('userRole');
    const MaPhongBan = localStorage.getItem('MaPhongBan');

    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
    const khaoThi = window.APP_DEPARTMENTS?.khaoThi || 'KT&ĐBCL';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

    // Ban Giám đốc có toàn quyền
    if (MaPhongBan === banGiamDoc) return true;

    if (type === 'khoa') {
        // GV_CNBM: chỉ được duyệt (check)
        if (role === gvCnbm && action === 'check') return true;
        // Lãnh đạo khoa: chỉ được bỏ duyệt (uncheck)
        if (role === lanhDaoKhoa && action === 'uncheck') return true;
        return false;
    }

    if (type === 'khaoThi') {
        if (MaPhongBan !== khaoThi) return false;
        // Trợ lý: chỉ được duyệt (check)
        if (role === troLyPhong && action === 'check') return true;
        // Lãnh đạo phòng: chỉ được bỏ duyệt (uncheck)
        if (role === lanhDaoPhong && action === 'uncheck') return true;
        return false;
    }

    return false;
}

/**
 * Kiểm tra xem user có quyền tương tác với checkbox không (bất kể check/uncheck)
 */
function canInteract(type) {
    return canApprove(type, 'check') || canApprove(type, 'uncheck');
}

// Check if row can be edited/deleted
// Chỉ GV_CNBM và Lãnh đạo khoa mới được sửa/xóa, và chỉ khi chưa duyệt
function canEditDelete(data) {
    const role = localStorage.getItem('userRole');
    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';

    // Chỉ GV_CNBM và Lãnh đạo khoa có quyền sửa/xóa
    if (role !== gvCnbm && role !== lanhDaoKhoa) return false;

    // Chỉ sửa/xóa khi chưa duyệt
    return data.khoaduyet === 0 && data.khaothiduyet === 0;
}

// ==================== DATA LOADING ====================

// Load năm học
async function loadNamHocOptions() {
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();
        
        const selects = [document.getElementById('namHocXem'), document.getElementById('editNamHoc')];
        selects.forEach(select => {
            if (!select) return;
            select.innerHTML = '';
            data.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = item.NamHoc;
                option.textContent = item.NamHoc;
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading nam hoc:', error);
    }
}

// Load khoa
async function loadKhoaOptions() {
    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        
        const khoaXem = document.getElementById('khoaXem');
        const editKhoa = document.getElementById('editKhoa');
        
        if (editKhoa) {
            editKhoa.innerHTML = '<option value="">-- Chọn Khoa --</option>';
        }
        
        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
            khoaXem.appendChild(option.cloneNode(true));
            if (editKhoa) editKhoa.appendChild(option);
        });

        // Enforce khoa filter: nếu user thuộc khoa, lock dropdown
        if (typeof KhoaFilterUtils !== 'undefined') {
            KhoaFilterUtils.applyKhoaFilter(khoaXem);
            KhoaFilterUtils.applyKhoaFilter(editKhoa);
        }
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// Load hệ đào tạo cho modal
async function loadHeDaoTaoOptions() {
    try {
        const response = await fetch('/api/gvm/v1/he-moi-giang');
        if (!response.ok) {
            throw new Error(`Load he dao tao failed with status ${response.status}`);
        }

        const rawData = await response.json();
        const list = Array.isArray(rawData)
            ? rawData
            : (rawData && Array.isArray(rawData.data) ? rawData.data : []);

        heDaoTaoList = list
            .map((item) => ({
                id: item.id,
                value: item.he_dao_tao || item.HeDaoTao || item.value || ''
            }))
            .filter((item) => item.value);

        const editHeDaoTao = document.getElementById('editHeDaoTao');
        if (editHeDaoTao) {
            editHeDaoTao.innerHTML = '<option value="">-- Chọn hệ đào tạo --</option>';
            heDaoTaoList.forEach((item) => {
                const option = document.createElement('option');
                option.value = String(item.value);
                option.textContent = String(item.value);
                editHeDaoTao.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading he dao tao:', error);
        heDaoTaoList = [];
    }
}

// Load data
async function loadData() {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;
    
    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        const response = await fetch(`/v2/vuotgio/duyet-kthp/${namHoc}/${khoa}`);
        const data = await response.json();
        
        globalData = data;
        renderTable(globalData);
        
        if (data.length === 0) {
            Swal.fire('Thông báo', 'Không có dữ liệu', 'info');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu', 'error');
    }
}

// ==================== TABLE RENDERING ====================

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    let STT = 1;

    data.forEach((row, index) => {
        const tableRow = document.createElement('tr');
        tableRow.setAttribute('data-id', row.id);
        tableRow.setAttribute('data-index', index);
        tableRow.setAttribute('data-giangvien', row.giangvien || '');
        tableRow.setAttribute('data-qc', row.sotietqc || 0);

        // STT
        const sttTd = document.createElement('td');
        sttTd.textContent = STT++;
        tableRow.appendChild(sttTd);

        // Giảng viên
        const gvTd = document.createElement('td');
        gvTd.textContent = row.giangvien || '';
        tableRow.appendChild(gvTd);

        // Khoa
        const khoaTd = document.createElement('td');
        khoaTd.textContent = row.khoa || '';
        tableRow.appendChild(khoaTd);

        // Hệ đào tạo
        const heDaoTaoTd = document.createElement('td');
        heDaoTaoTd.textContent = row.doituong || row.doi_tuong || '';
        tableRow.appendChild(heDaoTaoTd);

        // Học kỳ
        const hocKyTd = document.createElement('td');
        hocKyTd.textContent = row.ki || '';
        tableRow.appendChild(hocKyTd);

        // Tên học phần
        const tenHPTd = document.createElement('td');
        tenHPTd.textContent = row.tenhocphan || '';
        tableRow.appendChild(tenHPTd);

        // Lớp HP
        const lopTd = document.createElement('td');
        lopTd.textContent = row.lophocphan || '';
        tableRow.appendChild(lopTd);

        // Loại KTHP (hinhthuc)
        const loaiTd = document.createElement('td');
        loaiTd.textContent = row.hinhthuc || '';
        tableRow.appendChild(loaiTd);

        // Số tiết QC
        const qcTd = document.createElement('td');
        const qcVal = parseFloat(row.sotietqc);
        qcTd.textContent = Number.isNaN(qcVal) ? '' : qcVal.toFixed(2);
        tableRow.appendChild(qcTd);

        // Ghi chú
        const ghiChuTd = document.createElement('td');
        ghiChuTd.textContent = row.ghichu || '';
        tableRow.appendChild(ghiChuTd);

        // Checkbox Khoa
        const khoaCheckTd = document.createElement('td');
        const khoaCheckbox = document.createElement('input');
        khoaCheckbox.type = 'checkbox';
        khoaCheckbox.name = 'khoa';
        khoaCheckbox.checked = row.khoaduyet === 1;
        khoaCheckbox.onchange = () => {
            updateCheckAll('khoa');
            updateKhaoThiCheckboxes();
        };

        // Phân quyền checkbox Khoa
        if (row.khaothiduyet === 1) {
            // Đã duyệt Khảo thí → khóa cả hai
            khoaCheckbox.checked = true;
            khoaCheckbox.disabled = true;
        } else if (row.khoaduyet === 1) {
            // Đã duyệt Khoa → chỉ Lãnh đạo khoa mới bỏ duyệt được
            khoaCheckbox.disabled = !canApprove('khoa', 'uncheck');
        } else {
            // Chưa duyệt Khoa → chỉ GV_CNBM mới duyệt được
            khoaCheckbox.disabled = !canApprove('khoa', 'check');
        }
        khoaCheckTd.appendChild(khoaCheckbox);
        tableRow.appendChild(khoaCheckTd);

        // Checkbox Khảo thí
        const ktCheckTd = document.createElement('td');
        const ktCheckbox = document.createElement('input');
        ktCheckbox.type = 'checkbox';
        ktCheckbox.name = 'khaoThi';
        ktCheckbox.checked = row.khaothiduyet === 1;
        ktCheckbox.onchange = () => updateCheckAll('khaoThi');

        // Phân quyền checkbox Khảo thí
        if (row.khaothiduyet === 1) {
            // Đã duyệt → chỉ Lãnh đạo phòng mới bỏ duyệt được
            ktCheckbox.disabled = !canApprove('khaoThi', 'uncheck');
        } else if (row.khoaduyet !== 1) {
            // Khoa chưa duyệt → không cho duyệt Khảo thí
            ktCheckbox.disabled = true;
        } else {
            // Khoa đã duyệt, Khảo thí chưa duyệt → chỉ Trợ lý mới duyệt được
            ktCheckbox.disabled = !canApprove('khaoThi', 'check');
        }
        
        ktCheckTd.appendChild(ktCheckbox);
        tableRow.appendChild(ktCheckTd);

        // Thao tác (Sửa/Xóa)
        const actionTd = document.createElement('td');
        if (canEditDelete(row)) {
            actionTd.innerHTML = `
                <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="editRecord(${row.id})" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteRecord(${row.id})" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
        tableRow.appendChild(actionTd);

        tableBody.appendChild(tableRow);
    });

    updateSummary();

    // Update Check All states
    updateCheckAll('khoa');
    updateCheckAll('khaoThi');
}

// ==================== UPDATE SUMMARY ====================
function updateSummary() {
    const rows = document.querySelectorAll('#tableBody tr');
    const uniqueGVs = new Set();
    let totalQC = 0;

    rows.forEach(row => {
        if (row.style.display !== 'none') {
            const gv = row.getAttribute('data-giangvien');
            if (gv) uniqueGVs.add(gv);
            
            const qcVal = parseFloat(row.getAttribute('data-qc')) || 0;
            totalQC += qcVal;
        }
    });

    const popTeachers = document.getElementById('totalTeachers');
    const popTotalQC = document.getElementById('totalQC');
    
    if (popTeachers) popTeachers.textContent = uniqueGVs.size;
    if (popTotalQC) popTotalQC.textContent = totalQC.toFixed(2);
}

// ==================== FILTER ====================

function filterTable() {
    const gvFilter = document.getElementById('filterGiangVien').value.toLowerCase();
    const hpFilter = document.getElementById('filterHocPhan').value.toLowerCase();

    const tableRows = document.querySelectorAll('#tableBody tr');

    tableRows.forEach(row => {
        const gvCell = row.querySelector('td:nth-child(2)'); // Giảng viên
        const hpCell = row.querySelector('td:nth-child(6)'); // Tên học phần

        const gvValue = gvCell ? gvCell.textContent.toLowerCase() : '';
        const hpValue = hpCell ? hpCell.textContent.toLowerCase() : '';

        const gvMatch = gvValue.includes(gvFilter);
        const hpMatch = hpValue.includes(hpFilter);

        if (gvMatch && hpMatch) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    updateSummary();
}

// ==================== CHECK ALL ====================

function checkAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    
    const checkAllIdMap = {
        'khoa': 'checkAllKhoa',
        'khaoThi': 'checkAllKhaoThi'
    };

    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;

    const isChecking = checkAllCheckbox.checked;

    checkboxes.forEach(checkbox => {
        if (checkbox.disabled) return;
        
        // Kiểm tra quyền: nếu đang check thì cần quyền 'check', nếu uncheck thì cần quyền 'uncheck'
        const action = isChecking ? 'check' : 'uncheck';
        if (!canApprove(type, action)) return;
        
        checkbox.checked = isChecking;
    });

    // Nếu check Khoa, cần update trạng thái của Khảo thí
    if (type === 'khoa') {
        updateKhaoThiCheckboxes();
    }
}

function updateCheckAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    
    const checkAllIdMap = {
        'khoa': 'checkAllKhoa',
        'khaoThi': 'checkAllKhaoThi'
    };

    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;

    const enabledCheckboxes = Array.from(checkboxes).filter(cb => !cb.disabled);
    
    if (enabledCheckboxes.length === 0) {
        checkAllCheckbox.checked = false;
        return;
    }
    
    const allChecked = enabledCheckboxes.every(cb => cb.checked);
    checkAllCheckbox.checked = allChecked;

    // Nếu thay đổi Khoa, cần update trạng thái của Khảo thí
    if (type === 'khoa') {
        updateKhaoThiCheckboxes();
    }
}

// Update Khảo thí checkboxes based on Khoa status
function updateKhaoThiCheckboxes() {
    const rows = document.querySelectorAll('#tableBody tr');
    
    rows.forEach(row => {
        const khoaCheckbox = row.querySelector('input[name="khoa"]');
        const ktCheckbox = row.querySelector('input[name="khaoThi"]');
        const dataIndex = parseInt(row.getAttribute('data-index'));
        const data = Number.isNaN(dataIndex) ? null : globalData[dataIndex];
        
        if (khoaCheckbox && ktCheckbox) {
            if (data && data.khaothiduyet === 1) {
                // Đã duyệt Khảo thí → chỉ Lãnh đạo phòng mới bỏ duyệt
                khoaCheckbox.checked = true;
                khoaCheckbox.disabled = true;
                ktCheckbox.checked = true;
                ktCheckbox.disabled = !canApprove('khaoThi', 'uncheck');
                return;
            }
            
            // Khảo thí chỉ enable khi Khoa được check VÀ user có quyền
            if (!khoaCheckbox.checked) {
                ktCheckbox.disabled = true;
                ktCheckbox.checked = false;
            } else {
                // Khoa đã check → cho phép duyệt Khảo thí nếu có quyền
                ktCheckbox.disabled = !canApprove('khaoThi', 'check');
            }
        }
    });

    updateCheckAll('khaoThi');
}

// ==================== CRUD OPERATIONS ====================

// Edit record - Open modal
function editRecord(id) {
    const record = globalData.find(r => r.id === id);
    if (!record) return;
    
    if (!canEditDelete(record)) {
        Swal.fire('Không thể sửa', 'Bản ghi đã được duyệt', 'warning');
        return;
    }

    // Fill modal
    document.getElementById('editID').value = record.id;
    document.getElementById('editNamHoc').value = record.namhoc;
    document.getElementById('editHocKy').value = record.ki || 1;
    document.getElementById('editKhoa').value = record.khoa;
    document.getElementById('editTenHP').value = record.tenhocphan || '';
    document.getElementById('editMaHP').value = record.mahocphan || '';
    document.getElementById('editSoTC').value = record.sotc || 0;
    document.getElementById('editGiangVien').value = record.giangvien || '';
    document.getElementById('editLopHP').value = record.lophocphan || '';
    document.getElementById('editSiSo').value = record.tongso || 0;
    const heDaoTaoSelect = document.getElementById('editHeDaoTao');
    setSelectValueWithFallback(heDaoTaoSelect, record.doituong || record.doi_tuong || '');
    const loaiSelect = document.getElementById('editLoaiKTHP');
    setSelectValueWithFallback(loaiSelect, record.hinhthuc || 'Ra đề');
    document.getElementById('editSoTietQC').value = toFixedInput(record.sotietqc, 2) || 0;
    document.getElementById('editGhiChu').value = record.ghichu || '';

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Handle edit submit
async function handleEditSubmit() {
    const id = document.getElementById('editID').value;
    
    const formData = {
        NamHoc: document.getElementById('editNamHoc').value,
        namhoc: document.getElementById('editNamHoc').value,
        ki: document.getElementById('editHocKy').value,
        khoa: document.getElementById('editKhoa').value,
        tenhocphan: document.getElementById('editTenHP').value,
        mahocphan: document.getElementById('editMaHP').value,
        sotc: document.getElementById('editSoTC').value,
        giangvien: document.getElementById('editGiangVien').value,
        lophocphan: document.getElementById('editLopHP').value,
        tongso: document.getElementById('editSiSo').value,
        doituong: document.getElementById('editHeDaoTao').value,
        hinhthuc: document.getElementById('editLoaiKTHP').value,
        sotietqc: document.getElementById('editSoTietQC').value,
        ghichu: document.getElementById('editGhiChu').value
    };

    try {
        const response = await fetch(`/v2/vuotgio/duyet-kthp/edit/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        
        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            loadData();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi cập nhật', 'error');
    }
}

// Delete record
async function deleteRecord(id) {
    const record = globalData.find(r => r.id === id);
    
    if (record && !canEditDelete(record)) {
        Swal.fire('Không thể xóa', 'Bản ghi đã được duyệt', 'warning');
        return;
    }

    const result = await Swal.fire({
        title: 'Xác nhận xóa?',
        text: 'Bạn có chắc muốn xóa bản ghi này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
        const namHoc = document.getElementById('namHocXem').value;
        const response = await fetch(`/v2/vuotgio/duyet-kthp/${id}?NamHoc=${encodeURIComponent(namHoc)}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (data.success) {
            Swal.fire('Đã xóa', data.message, 'success');
            loadData();
        } else {
            Swal.fire('Lỗi', data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa', 'error');
    }
}

// ==================== BATCH APPROVAL ====================

async function submitApprovals() {
    const rows = document.querySelectorAll('#tableBody tr');
    const updates = [];
    
    // Collect current checkbox states
    rows.forEach((row, index) => {
        if (row.style.display === 'none') return;
        
        const dataIndex = parseInt(row.getAttribute('data-index'));
        const id = parseInt(row.getAttribute('data-id'));
        
        const khoaCheckbox = row.querySelector('input[name="khoa"]');
        const ktCheckbox = row.querySelector('input[name="khaoThi"]');
        
        if (globalData[dataIndex]) {
            const khaoThiValue = ktCheckbox?.checked ? 1 : 0;
            if (khaoThiValue === 1 && khoaCheckbox) {
                khoaCheckbox.checked = true;
            }
            updates.push({
                id: id,
                khoaduyet: khoaCheckbox?.checked ? 1 : 0,
                khaothiduyet: khaoThiValue
            });
        }
    });

    if (updates.length === 0) {
        Swal.fire('Thông báo', 'Không có dữ liệu để cập nhật', 'info');
        return;
    }

    try {
        const namHoc = document.getElementById('namHocXem').value;
        const response = await fetch('/v2/vuotgio/duyet-kthp/batch-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ NamHoc: namHoc, updates: updates })
        });

        const result = await response.json();
        
        if (result.success) {
            Swal.fire('Thành công', result.message || 'Cập nhật thành công', 'success');
            loadData();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error submitting approvals:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi cập nhật', 'error');
    }
}

// ==================== TOGGLE SUMMARY ====================
document.addEventListener('DOMContentLoaded', function() {
    const btnToggle = document.getElementById('btnToggleSummary');
    if (btnToggle) {
        btnToggle.addEventListener('click', function() {
            const summaryBox = document.getElementById('summaryBox');
            summaryBox.classList.toggle('collapsed');
            const icon = this.querySelector('i');
            if (summaryBox.classList.contains('collapsed')) {
                icon.className = 'bi bi-chevron-up';
            } else {
                icon.className = 'bi bi-chevron-down';
            }
        });
    }
});
````

## File: src/public/js/vuotgio_v2/xuatFile/index.js
````javascript
/**
 * Xuat File V2 — Frontend JS
 * Handles UI toggle, filter logic, and API calls for both export types.
 */

/* ════════════════════════════════════════════════════
   State
   ════════════════════════════════════════════════════ */
let currentType = 'A';   // 'A' = Kê khai cá nhân  |  'B' = Tổng hợp
let currentScope = 'all'; // 'all' | 'khoa' | 'gv'
let lockStatusCache = {}; // { namHoc: { locked: bool, lockInfo: object } }

/* ════════════════════════════════════════════════════
   Boot
   ════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    loadNamHocOptions();
    loadKhoaOptions();

    // Listen for năm học changes to check lock status
    document.getElementById('namHocA')?.addEventListener('change', () => checkLockStatus('A'));
    document.getElementById('namHocB')?.addEventListener('change', () => checkLockStatus('B'));
});

/* ════════════════════════════════════════════════════
   Type toggle: A / B
   ════════════════════════════════════════════════════ */
function setType(type) {
    currentType = type;

    const btnA  = document.getElementById('btnTypeA');
    const btnB  = document.getElementById('btnTypeB');
    const panelA = document.getElementById('panelTypeA');
    const panelB = document.getElementById('panelTypeB');

    if (type === 'A') {
        btnA.className  = 'xf-type-btn active-typeA';
        btnB.className  = 'xf-type-btn';
        panelA.classList.remove('hidden');
        panelB.classList.add('hidden');
    } else {
        btnA.className  = 'xf-type-btn';
        btnB.className  = 'xf-type-btn active-typeB';
        panelA.classList.add('hidden');
        panelB.classList.remove('hidden');
    }
}

/* ════════════════════════════════════════════════════
   Scope toggle (Type A only): all / khoa / gv
   ════════════════════════════════════════════════════ */
function setScope(scope) {
    currentScope = scope;

    // Update visual state of scope buttons
    ['all', 'khoa', 'gv'].forEach(s => {
        const el = document.getElementById('scope' + s.charAt(0).toUpperCase() + s.slice(1));
        if (el) el.classList.toggle('selected', s === scope);
    });

    const khoaRow = document.getElementById('khoaFilterRow');
    const gvRow   = document.getElementById('gvFilterRow');

    if (scope === 'all') {
        khoaRow.classList.add('hidden');
        gvRow.classList.add('hidden');
    } else if (scope === 'khoa') {
        khoaRow.classList.remove('hidden');
        gvRow.classList.add('hidden');
        // Reset khoa select to ALL
        const khoaSelect = document.getElementById('khoaA');
        if (khoaSelect) khoaSelect.value = 'ALL';
    } else {
        // gv
        khoaRow.classList.remove('hidden');
        gvRow.classList.remove('hidden');
        loadGiangVienByKhoa();
    }
}

/* ════════════════════════════════════════════════════
   Data loaders
   ════════════════════════════════════════════════════ */
async function loadNamHocOptions() {
    try {
        const res  = await fetch('/api/namhoc');
        const data = await res.json();

        document.querySelectorAll('.namHoc').forEach(select => {
            select.innerHTML = '';
            data.forEach((item, index) => {
                const opt = document.createElement('option');
                opt.value = item.NamHoc;
                opt.textContent = item.NamHoc;
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    opt.selected = true;
                }
                select.appendChild(opt);
            });
        });

        // Check lock status for the initially selected năm học
        checkLockStatus('A');
        checkLockStatus('B');
    } catch (err) {
        console.error('[xuatFile] loadNamHoc error:', err);
        const year = new Date().getFullYear();
        document.querySelectorAll('.namHoc').forEach(select => {
            select.innerHTML = `<option value="${year}-${year + 1}">${year}-${year + 1}</option>`;
        });
    }
}

async function loadKhoaOptions() {
    try {
        const res  = await fetch('/api/khoa');
        const data = await res.json();

        document.querySelectorAll('.khoa').forEach(select => {
            select.innerHTML = '<option value="ALL">Tất cả các Khoa</option>';
            data.forEach(dept => {
                const opt = document.createElement('option');
                opt.value = dept.MaPhongBan;
                opt.textContent = dept.TenPhongBan || dept.MaPhongBan;
                select.appendChild(opt);
            });
        });

        // When khoa changes, reload GV list
        const khoaA = document.getElementById('khoaA');
        if (khoaA) khoaA.addEventListener('change', loadGiangVienByKhoa);
    } catch (err) {
        console.error('[xuatFile] loadKhoa error:', err);
    }
}

async function loadGiangVienByKhoa() {
    const khoa  = document.getElementById('khoaA')?.value || 'ALL';
    const select = document.getElementById('giangVienA');
    if (!select) return;

    try {
        const res  = await fetch(`/v2/vuotgio/api/teachers?Khoa=${encodeURIComponent(khoa)}`);
        const data = await res.json();

        select.innerHTML = '<option value="">— Chọn giảng viên —</option>';
        data.forEach(gv => {
            const opt = document.createElement('option');
            opt.value = gv.id_User || gv.HoTen;
            opt.textContent = `${gv.HoTen}${gv.Khoa ? ` (${gv.Khoa})` : ''}`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error('[xuatFile] loadGiangVien error:', err);
        const select = document.getElementById('giangVienA');
        if (select) select.innerHTML = '<option value="">— Chọn giảng viên —</option>';
    }
}

/* ════════════════════════════════════════════════════
   Lock status check
   ════════════════════════════════════════════════════ */
async function checkLockStatus(type) {
    const selectId = type === 'A' ? 'namHocA' : 'namHocB';
    const btnId    = type === 'A' ? 'btnExportA' : 'btnExportB';
    const namHoc   = document.getElementById(selectId)?.value;
    const btn      = document.getElementById(btnId);

    if (!namHoc || !btn) return;

    // Check cache first
    if (lockStatusCache[namHoc] !== undefined) {
        _updateExportButton(btn, type, lockStatusCache[namHoc]);
        return;
    }

    try {
        const res = await fetch(`/v2/vuotgio/trang-thai-khoa?namHoc=${encodeURIComponent(namHoc)}`);
        const data = await res.json();

        if (data.success) {
            lockStatusCache[namHoc] = data.locked;
            _updateExportButton(btn, type, data.locked);
        }
    } catch (err) {
        console.error('[xuatFile] checkLockStatus error:', err);
    }
}

function _updateExportButton(btn, type, locked) {
    const warningId = `lockWarning${type}`;
    let warningEl = document.getElementById(warningId);

    if (!locked) {
        // Chưa lưu → disable nút xuất + hiển thị cảnh báo
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
        btn.style.pointerEvents = 'none';

        if (!warningEl) {
            warningEl = document.createElement('div');
            warningEl.id = warningId;
            warningEl.style.cssText = 'background:#fef3c7;border-left:4px solid #b45309;border-radius:0 8px 8px 0;padding:12px 16px;font-size:.87rem;color:#92400e;margin-bottom:16px;display:flex;gap:10px;align-items:center;';
            warningEl.innerHTML = '<i class="fas fa-lock" style="flex-shrink:0;"></i><span><strong>Chưa thể xuất file:</strong> Dữ liệu năm học này chưa được lưu. Vui lòng lưu dữ liệu trước khi xuất file.</span>';
            btn.parentNode.insertBefore(warningEl, btn);
        }
    } else {
        // Đã lưu → enable nút xuất + xóa cảnh báo
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.style.pointerEvents = '';

        if (warningEl) {
            warningEl.remove();
        }
    }
}

/* ════════════════════════════════════════════════════
   Export Type A — Kê khai cá nhân
   Query: namHoc + (khoa?) + (giangVien?)
   ════════════════════════════════════════════════════ */
async function exportTypeA() {
    const namHoc = document.getElementById('namHocA')?.value;
    if (!namHoc) return Swal.fire('Thiếu thông tin', 'Vui lòng chọn Năm học', 'warning');

    const query = new URLSearchParams();
    query.set('namHoc', namHoc);

    if (currentScope === 'khoa') {
        const khoa = document.getElementById('khoaA')?.value;
        if (khoa && khoa !== 'ALL') query.set('khoa', khoa);

    } else if (currentScope === 'gv') {
        const khoa = document.getElementById('khoaA')?.value;
        const gv   = document.getElementById('giangVienA')?.value;
        if (!gv) return Swal.fire('Thiếu thông tin', 'Vui lòng chọn Giảng viên', 'warning');
        if (khoa && khoa !== 'ALL') query.set('khoa', khoa);
        query.set('giangVien', gv);
    }
    // scope === 'all' → không cần thêm khoa / giangVien

    await _download(`/v2/vuotgio/xuat-file/excel?${query.toString()}`, 'Đang tạo file kê khai...');
}

/* ════════════════════════════════════════════════════
   Export Type B — Tổng hợp Khoa/Phòng
   Query: namHoc (toàn bộ khoa)
   ════════════════════════════════════════════════════ */
async function exportTypeB() {
    const namHoc = document.getElementById('namHocB')?.value;
    if (!namHoc) return Swal.fire('Thiếu thông tin', 'Vui lòng chọn Năm học', 'warning');

    const query = new URLSearchParams();
    query.set('namHoc', namHoc);

    await _download(`/v2/vuotgio/xuat-file/tong-hop?${query.toString()}`, 'Đang tạo file tổng hợp...');
}

/* ════════════════════════════════════════════════════
   Download helper (triggers browser download)
   ════════════════════════════════════════════════════ */
async function _download(url, loadingMsg) {
    showLoading(loadingMsg);
    try {
        const res = await fetch(url);

        if (!res.ok) {
            let msg = 'Không thể xuất file';
            try { const err = await res.json(); msg = err.message || msg; } catch (_) {}
            throw new Error(msg);
        }

        const disposition = res.headers.get('Content-Disposition') || '';
        let filename = 'VuotGio_V2.xlsx';
        // Ưu tiên filename* (UTF-8) nếu có, fallback về filename thường
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;\s]+)/i);
        if (utf8Match && utf8Match[1]) {
            filename = decodeURIComponent(utf8Match[1]);
        } else {
            const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
            if (match && match[1]) filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
        }

        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);

        hideLoading();
        Swal.fire({ icon: 'success', title: 'Thành công', text: 'File Excel đã được tải xuống', timer: 2000, showConfirmButton: false });
    } catch (err) {
        hideLoading();
        console.error('[xuatFile] download error:', err);
        Swal.fire('Lỗi xuất file', err.message || 'Không thể xuất file', 'error');
    }
}

function showLoading(msg) {
    Swal.fire({
        title: msg || 'Đang xử lý...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
    });
}
function hideLoading() { Swal.close(); }
````

## File: src/views/vuotgio_v2/vuotgio.add.coiChamRaDe.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Coi chấm ra đề thi - Vượt Giờ V2</title>

    <link
        href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600&family=Playfair+Display:wght@500&display=swap"
        rel="stylesheet" />

    <!-- Bootstrap 5 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />

    <!-- SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

    <!-- Custom Styles -->
    <link rel="stylesheet" href="/css/admin.css" />
    <link rel="stylesheet" href="/css/styles.css" />

    <style>
        *,
        *::before,
        *::after {
            box-sizing: border-box;
        }

        :root {
            --bg: #f5f4f0;
            --surface: #ffffff;
            --surface2: #f9f8f5;
            --border: #e2e0d8;
            --border2: #d0cdbb;
            --text: #1a1916;
            --text2: #6b6860;
            --text3: #9a9890;
            --accent: #2d5a3d;
            --accent-light: #eaf3de;
            --accent-text: #1b3d27;
            --blue: #1a3f6f;
            --blue-light: #e6eff9;
            --radius: 10px;
            --radius-sm: 6px;
            --shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 1px rgba(0, 0, 0, 0.04);
            --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        body {
            font-family: 'Be Vietnam Pro', sans-serif;
            background: var(--bg);
            color: var(--text);
            font-size: 14px;
            line-height: 1.6;
        }

        .page-header {
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            padding: 24px 28px 20px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: var(--shadow);
        }

        .header-inner {
            max-width: 1100px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 20px;
        }

        .header-title-group h1 {
            font-family: 'Playfair Display', serif;
            font-size: 24px;
            font-weight: 500;
            margin-bottom: 4px;
        }

        .header-title-group p {
            font-size: 12px;
            color: var(--text3);
            letter-spacing: 0.04em;
            text-transform: uppercase;
            margin: 0;
        }

        .header-total {
            text-align: right;
            flex-shrink: 0;
        }

        .total-label {
            font-size: 11px;
            color: var(--text3);
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }

        .total-value {
            font-size: 28px;
            font-weight: 600;
            color: var(--accent);
            line-height: 1.1;
        }

        .main {
            max-width: 1100px;
            margin: 0 auto;
            padding: 24px 28px 48px;
        }

        .meta-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            padding: 18px;
            margin-bottom: 18px;
        }

        .meta-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
            flex-wrap: wrap;
        }

        .meta-title {
            margin: 0;
            font-size: 16px;
            font-weight: 600;
            color: var(--accent);
        }

        .meta-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 12px;
        }

        .meta-grid-2 {
            display: grid;
            grid-template-columns: 1.2fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
        }

        .meta-grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 12px;
            margin-bottom: 12px;
        }

        .required {
            color: #dc3545;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(160px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }

        .sum-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            padding: 14px 16px;
        }

        .sc-label {
            font-size: 11px;
            color: var(--text3);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }

        .sc-val {
            font-size: 22px;
            font-weight: 600;
            color: var(--text);
        }

        .sc-unit {
            color: var(--text3);
            font-size: 12px;
        }

        .section {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: var(--shadow);
            overflow: hidden;
            margin-bottom: 14px;
            transition: box-shadow 0.2s;
        }

        .section:hover {
            box-shadow: var(--shadow-md);
        }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 20px;
            background: var(--surface2);
            border-bottom: 1px solid var(--border);
            cursor: pointer;
            user-select: none;
        }

        .sec-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .sec-badge {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            background: var(--text);
            color: #fff;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .sec-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text);
        }

        .sec-right {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .sec-total-pill {
            background: var(--accent-light);
            color: var(--accent-text);
            font-size: 12px;
            font-weight: 600;
            border-radius: 20px;
            padding: 4px 12px;
        }

        .sec-arrow {
            font-size: 11px;
            color: var(--text3);
            transition: transform 0.2s;
        }

        .sec-arrow.open {
            transform: rotate(180deg);
        }

        .col-headers,
        .item-row {
            display: grid;
            grid-template-columns: 1fr 90px 110px 90px 90px;
            padding: 0 20px;
            align-items: center;
        }

        .col-headers {
            border-bottom: 1px solid var(--border);
            background: #fafaf7;
        }

        .col-headers span {
            font-size: 10px;
            color: var(--text3);
            text-transform: uppercase;
            letter-spacing: 0.07em;
            font-weight: 600;
            text-align: center;
            padding: 8px 6px;
        }

        .col-headers span:first-child {
            text-align: left;
            padding-left: 0;
        }

        .item-row {
            border-bottom: 1px solid var(--border);
            transition: background 0.1s;
        }

        .item-row:last-child {
            border-bottom: none;
        }

        .item-row:hover {
            background: #fcfbf8;
        }

        .i-label {
            padding: 10px 0;
            font-size: 13px;
            color: var(--text);
            line-height: 1.45;
            padding-right: 10px;
        }

        .i-dvt,
        .i-gio,
        .i-result {
            font-size: 12px;
            text-align: center;
            padding: 10px 6px;
        }

        .i-dvt {
            color: var(--text2);
        }

        .i-gio {
            color: var(--blue);
            font-weight: 500;
        }

        .i-input {
            text-align: center;
            padding: 7px 6px;
        }

        .i-input input {
            width: 74px;
            text-align: center;
            border: 1px solid var(--border2);
            border-radius: var(--radius-sm);
            background: var(--surface);
            padding: 6px 8px;
            font-weight: 500;
            color: var(--text);
            appearance: textfield;
            -moz-appearance: textfield;
        }

        .i-input input::-webkit-inner-spin-button,
        .i-input input::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }

        .i-input input:focus {
            outline: none;
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(45, 90, 61, 0.12);
        }

        .i-input input.has-val {
            background: var(--accent-light);
            border-color: var(--accent);
            color: var(--accent-text);
        }

        .i-result {
            color: var(--accent-text);
            font-weight: 600;
        }

        .i-result.zero {
            color: var(--text3);
            font-weight: 400;
        }

        .coeff-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            border-bottom: 1px solid var(--border);
            background: var(--blue-light);
            padding: 10px 20px;
        }

        .coeff-text {
            font-size: 12px;
            color: var(--blue);
            font-style: italic;
            flex: 1;
        }

        .coeff-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 500;
            color: var(--blue);
            cursor: pointer;
        }

        .coeff-label input[type=checkbox] {
            width: 16px;
            height: 16px;
            accent-color: var(--blue);
            cursor: pointer;
        }

        .info-row {
            display: flex;
            align-items: center;
            gap: 8px;
            border-bottom: 1px solid var(--border);
            background: #fafaf7;
            padding: 9px 20px;
        }

        .info-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--text3);
            flex-shrink: 0;
        }

        .info-text {
            font-size: 12px;
            color: var(--text3);
            font-style: italic;
        }

        .autocomplete-container {
            position: relative;
        }

        .suggestion-list {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 4px;
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        }

        .suggestion-list.show {
            display: block;
        }

        .suggestion-item {
            padding: 8px 12px;
            cursor: pointer;
            color: #333;
        }

        .suggestion-item:hover {
            background: #f0f0f0;
        }

        .action-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 26px;
            padding-top: 18px;
            border-top: 1px solid var(--border);
        }

        @media (max-width: 992px) {
            .meta-grid,
            .meta-grid-2,
            .meta-grid-3,
            .summary-grid {
                grid-template-columns: 1fr 1fr;
            }
        }

        @media (max-width: 700px) {
            .page-header {
                padding: 16px;
            }

            .main {
                padding: 16px 12px 40px;
            }

            .header-inner {
                flex-direction: column;
                align-items: flex-start;
            }

            .meta-grid,
            .meta-grid-2,
            .meta-grid-3,
            .summary-grid {
                grid-template-columns: 1fr;
            }

            .col-headers {
                display: none;
            }

            .item-row {
                grid-template-columns: 1fr auto;
                grid-template-rows: auto auto;
                gap: 0;
            }

            .i-dvt,
            .i-gio {
                display: none;
            }

            .i-label {
                grid-column: 1;
                grid-row: 1;
            }

            .i-input {
                grid-column: 2;
                grid-row: 1 / 3;
                padding-left: 8px;
            }

            .i-result {
                grid-column: 1;
                grid-row: 2;
                text-align: left;
                padding: 0 0 8px;
            }
        }
    </style>
</head>

<body>
    <%- include('../header') %>

    <header class="page-header">
        <div class="header-inner">
            <div class="header-title-group">
                <h1>Bảng Tính Vượt Giờ</h1>
                <p>Coi thi · Chấm thi · Ra đề · Ngân hàng câu hỏi</p>
            </div>
            <div class="header-total">
                <div class="total-label">Tổng giờ vượt</div>
                <div class="total-value" id="grandTotal">0,00 giờ</div>
            </div>
        </div>
    </header>

    <main class="main">
        <!-- Data Lock Banner -->
        <div id="dataLockBanner" class="alert alert-warning align-items-center mb-3 d-none" role="alert">
            <i class="bi bi-info-circle-fill me-2 fs-5"></i>
            <span id="dataLockMessage"></span>
        </div>

        <form id="themKTHPForm">
            <div class="meta-card">
                <div class="meta-top">
                    <h3 class="meta-title">
                        <i class="fas fa-plus-circle me-2"></i>Thông tin kê khai
                    </h3>
                    <a href="/v2/vuotgio/import-kthp" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-file-import me-1"></i>Thêm bằng file
                    </a>
                </div>

                <div class="meta-grid">
                    <div>
                        <label class="form-label">Năm học <span class="required">*</span></label>
                        <select id="namHocForm" class="form-select namHoc" required></select>
                    </div>
                    <div>
                        <label class="form-label">Học kỳ</label>
                        <select id="hocKyForm" class="form-select">
                            <option value="1">Học kỳ 1</option>
                            <option value="2">Học kỳ 2</option>
                            <option value="3">Học kỳ hè</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label">Khoa <span class="required">*</span></label>
                        <select id="khoaForm" class="form-select khoa" required></select>
                    </div>
                </div>

                <div class="meta-grid-2">
                    <div>
                        <label class="form-label">Tên học phần <span class="required">*</span></label>
                        <input type="text" id="tenHPForm" class="form-control" placeholder="Nhập tên học phần" required />
                    </div>
                    <div>
                        <label class="form-label">Mã HP</label>
                        <input type="text" id="maHPForm" class="form-control" placeholder="Mã học phần" />
                    </div>
                    <div>
                        <label class="form-label">Số TC</label>
                        <input type="number" id="soTCForm" class="form-control" value="0" min="0" />
                    </div>
                </div>

                <div class="meta-grid-3">
                    <div class="autocomplete-container">
                        <label class="form-label">Giảng viên <span class="required">*</span></label>
                        <input type="text" id="giangVienForm" class="form-control" placeholder="Nhập tên giảng viên..."
                            autocomplete="off" required />
                        <div id="suggestionContainer" class="suggestion-list"></div>
                    </div>
                    <div>
                        <label class="form-label">Lớp</label>
                        <input type="text" id="lopForm" class="form-control" placeholder="VD: CNTT01" />
                    </div>
                    <div>
                        <label class="form-label">Số SV</label>
                        <input type="number" id="siSoForm" class="form-control" value="0" min="0" />
                    </div>
                </div>

                <div class="meta-grid-3">
                    <div>
                        <label class="form-label">Hệ đào tạo <span class="required">*</span></label>
                        <select id="doiTuongForm" class="form-select" required>
                            <option value="">-- Chọn hệ đào tạo --</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label class="form-label">Ghi chú</label>
                    <input type="text" id="ghiChuForm" class="form-control" placeholder="Ghi chú (nếu có)" />
                </div>
            </div>

            <div class="summary-grid">
                <div class="sum-card">
                    <div class="sc-label">Ra đề thi</div>
                    <div><span class="sc-val" id="sum1">0,00</span> <span class="sc-unit">giờ</span></div>
                </div>
                <div class="sum-card">
                    <div class="sc-label">Coi thi, giám sát</div>
                    <div><span class="sc-val" id="sum2">0,00</span> <span class="sc-unit">giờ</span></div>
                </div>
                <div class="sum-card">
                    <div class="sc-label">Chấm thi</div>
                    <div><span class="sc-val" id="sum3">0,00</span> <span class="sc-unit">giờ</span></div>
                </div>
                <div class="sum-card">
                    <div class="sc-label">Ngân hàng câu hỏi</div>
                    <div><span class="sc-val" id="sum4">0,00</span> <span class="sc-unit">giờ</span></div>
                </div>
            </div>

            <div id="app"></div>

            <div class="action-bar">
                <button type="button" id="resetCalculatorBtn" class="btn btn-outline-danger">
                    <i class="fas fa-trash me-1"></i>Xóa toàn bộ
                </button>
                <div class="d-flex gap-2">
                    <!-- <button type="button" class="btn btn-outline-secondary" onclick="window.print()">
                        <i class="fas fa-print me-1"></i>In / Xuất PDF
                    </button> -->
                    <button type="submit" class="btn btn-success">
                        <i class="fas fa-save me-1"></i>Lưu lại
                    </button>
                </div>
            </div>
        </form>
    </main>

    <!-- Scripts -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>

    <script src="/js/vuotgio_v2/khoaFilter.utils.js"></script>
    <script src="/js/vuotgio_v2/themKTHP/index.js"></script>

    <!-- Data Lock Check -->
    <script>
    (function() {
        const namHocSelect = document.getElementById('namHocForm');
        const banner = document.getElementById('dataLockBanner');
        const bannerMsg = document.getElementById('dataLockMessage');

        function checkLockStatus() {
            const namHoc = namHocSelect ? namHocSelect.value : '';
            if (!namHoc) {
                banner.classList.add('d-none');
                banner.classList.remove('d-flex');
                enableButtons();
                return;
            }
            fetch('/v2/vuotgio/trang-thai-khoa?namHoc=' + encodeURIComponent(namHoc))
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    if (data.success && data.locked) {
                        var info = data.lockInfo;
                        bannerMsg.textContent = 'Dữ liệu năm học ' + namHoc + ' đã được lưu bởi ' + info.nguoi_khoa + ' vào ' + info.ngay_khoa + '. Không thể chỉnh sửa.';
                        banner.classList.remove('d-none');
                        banner.classList.add('d-flex');
                        disableButtons();
                    } else {
                        banner.classList.add('d-none');
                        banner.classList.remove('d-flex');
                        enableButtons();
                    }
                })
                .catch(function() {
                    banner.classList.add('d-none');
                    banner.classList.remove('d-flex');
                    enableButtons();
                });
        }

        function disableButtons() {
            // Disable save and reset buttons
            var btns = document.querySelectorAll('#themKTHPForm button[type="submit"], #resetCalculatorBtn');
            btns.forEach(function(btn) {
                btn.disabled = true;
                btn.style.opacity = '0.5';
                btn.style.pointerEvents = 'none';
            });
        }

        function enableButtons() {
            var btns = document.querySelectorAll('#themKTHPForm button[type="submit"], #resetCalculatorBtn');
            btns.forEach(function(btn) {
                btn.disabled = false;
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            });
        }

        if (namHocSelect) {
            namHocSelect.addEventListener('change', checkLockStatus);
        }
        setTimeout(checkLockStatus, 500);
    })();
    </script>
</body>

</html>
````

## File: src/views/vuotgio_v2/vuotgio.danhSachLopNgoaiQC.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Danh Sách Lớp Ngoài Quy Chuẩn - Vượt Giờ V2</title>

    <!-- Bootstrap 5 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />

    <!-- SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

    <!-- Custom Styles -->
    <link rel="stylesheet" href="/css/admin.css" />
    <link rel="stylesheet" href="/css/styles.css" />
    <link rel="stylesheet" href="/css/table.css" />
    <link rel="stylesheet" href="/css/teachingInfo.css" />

    <style>
        .vuotgio-v2-container {
            padding: 20px;
        }

        .page-header {
            margin-bottom: 20px;
        }

        .page-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: #333;
        }

        .grid-container {
            background: #fff;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .grid-toolbar {
            display: flex;
            gap: 15px;
            align-items: flex-end;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }

        .search {
            width: 200px;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            height: 50px;
        }

        .btn-action {
            padding: 4px 8px;
            font-size: 0.85rem;
        }

        .total-label {
            margin-left: auto;
            margin-right: 0;
            font-family: Arial, sans-serif;
            font-size: 16px;
            background-color: #f4f4f4;
            padding: 10px;
            border-radius: 8px;
            width: fit-content;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            display: block;
            margin-top: 15px;
        }

        .total-label label {
            font-weight: bold;
            color: #000;
            margin-right: 8px;
            padding: 5px 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background-color: #007BFF;
            color: #fff;
        }

        .total-label span {
            font-weight: bold;
            color: #fff;
        }

        .fixed-section {
            height: 500px;
            overflow-y: auto;
        }

        select.hdt-select {
            background-color: #fff !important;
            color: #333 !important;
            border: 1px solid #ccc !important;
            border-radius: 3px !important;
            padding: 2px 4px !important;
            font-size: 0.78rem !important;
            box-shadow: none !important;
            text-align: left !important;
            width: 100%;
        }

        /* Summary Popup Styles */
        .summary {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.9);
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(31, 38, 135, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .summary.collapsed {
            transform: translateY(calc(100% + 10px));
        }

        .summary-toggle {
            position: absolute;
            top: -35px;
            right: 0;
            width: 35px;
            height: 35px;
            background: #007BFF;
            color: white;
            border: none;
            border-radius: 10px 0 0 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }

        .summary.collapsed .summary-toggle {
            transform: translateY(5px);
            border-radius: 10px 10px 0 0;
            right: 10px;
            top: -40px;
        }

        .summary-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            min-width: 200px;
            padding: 4px 0;
        }

        .summary-box .label {
            color: #516078;
            font-size: 0.85rem;
            font-weight: 500;
        }

        .summary-box .value {
            color: #007BFF;
            font-weight: 700;
            font-size: 1rem;
        }
    </style>
</head>

<body>
    <%- include('../header') %>

        <div class="vuotgio-v2-container">
            <div class="summary" id="summaryBox">
                <button class="summary-toggle" id="btnToggleSummary" title="Ẩn/Hiện tổng kết">
                    <i class="bi bi-chevron-down"></i>
                </button>
                <div class="summary-box">
                    <div class="label">Tổng giảng viên</div>
                    <div class="value" id="totalTeachers">0</div>
                </div>
                <div class="summary-box">
                    <div class="label">Tổng tiết Lên Lớp</div>
                    <div class="value" id="popupTotalLL">0</div>
                </div>
                <div class="summary-box">
                    <div class="label">Tổng tiết Quy Chuẩn</div>
                    <div class="value" id="popupTotalQC">0</div>
                </div>
            </div>

            <!-- Data Lock Banner -->
            <div id="dataLockBanner" class="alert alert-warning align-items-center mb-3 d-none" role="alert">
                <i class="bi bi-info-circle-fill me-2 fs-5"></i>
                <span id="dataLockMessage"></span>
            </div>

            <!-- Grid Section -->
            <div class="grid-container">
                <!-- Toolbar: Dropdowns + Buttons -->
                <div class="grid-toolbar">
                    <select class="selectop" id="namHocFilter" style="width: 130px; margin: 0; box-shadow: none;">
                        <option value="">Chọn năm học</option>
                    </select>
                    <select class="selectop" id="khoaFilter" style="width: 150px; margin: 0; box-shadow: none;">
                        <option value="ALL" selected>Tất cả khoa</option>
                    </select>
                    <button id="loadDataBtn" class="btn btn-primary" style="height: 45px; width: 130px; margin: 0;">
                        Hiển thị
                    </button>
                    <button id="updateApprovalBtn" class="btn btn-success"
                        style="height: 45px; width: 130px; margin: 0; display: none;">
                        CẬP NHẬT
                    </button>
                </div>

                <!-- Filter Row -->
                <div class="d-flex my-3" style="height: 70px">
                    <input type="text" id="filterGiangVien" placeholder="Tìm theo tên giảng viên"
                        class="form-control m-2 search" />
                    <input type="text" id="filterHocPhan" placeholder="Tìm theo tên học phần"
                        class="form-control m-2 search" />
                </div>

                <!-- Table Section -->
                <div id="renderInfo" class="fixed-section">
                    <table class="text-center" style="width: 100%">
                        <thead>
                            <tr>
                                <th style="width: 40px;">STT</th>
                                <th style="width: 180px;">Giảng viên</th>
                                <th style="width: 70px;">Khoa</th>
                                <th style="width: 50px;">Kì</th>
                                <th style="width: 50px;">Đợt</th>
                                <th style="width: 200px;">Lớp học phần</th>
                                <th style="width: 80px;">Mã HP</th>
                                <th style="width: 50px;">Số TC</th>
                                <th style="width: 130px;">Hệ ĐT</th>
                                <th style="width: 70px;">LL</th>
                                <th style="width: 60px;">Số SV</th>
                                <th style="width: 60px;">QC</th>
                                <th style="width: 100px;">Ngày BD</th>
                                <th style="width: 100px;">Ngày KT</th>
                                <th style="width: 160px;">Ghi chú</th>
                                <th style="width: 80px;" id="khoaColumn">
                                    <div class="form-check d-flex justify-content-center align-items-center">
                                        <input class="check me-1" type="checkbox" id="checkAllKhoa"
                                            onclick="checkAll('khoa')" />
                                        <label class="form-check-label" for="checkAllKhoa">Khoa</label>
                                    </div>
                                </th>
                                <th style="width: 80px;" id="daoTaoColumn">
                                    <div class="form-check d-flex justify-content-center align-items-center">
                                        <input class="check me-1" type="checkbox" id="checkAllDaoTao"
                                            onclick="checkAll('daoTao')" />
                                        <label class="form-check-label text-nowrap" for="checkAllDaoTao">ĐT</label>
                                    </div>
                                </th>
                                <th style="width: 100px;">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            <!-- Dữ liệu sẽ được chèn vào đây -->
                        </tbody>
                    </table>
                </div>

                <!-- Total Labels -->
                <div class="total-label d-none">
                    <label>Tổng số tiết Lên Lớp: <span class="value" id="totalLL">0</span></label>
                    <label>Tổng số tiết Quy Chuẩn: <span class="value" id="totalQC">0</span></label>
                </div>
            </div>
        </div>

        <!-- Edit Modal -->
        <div class="modal fade" id="editModal" tabindex="-1">
            <div class="modal-dialog modal-xl">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Sửa Lớp Ngoài Quy Chuẩn</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editForm">
                            <input type="hidden" id="editID" />
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <label class="form-label">Năm học</label>
                                    <select id="editNamHoc" class="form-select"></select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Học kỳ</label>
                                    <select id="editHocKy" class="form-select">
                                        <option value="1">Học kỳ 1</option>
                                        <option value="2">Học kỳ 2</option>
                                    </select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Khoa</label>
                                    <select id="editKhoa" class="form-select"></select>
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Đợt</label>
                                    <input type="number" id="editDot" class="form-control" min="1" />
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-5">
                                    <label class="form-label">Lớp học phần</label>
                                    <input type="text" id="editTenHP" class="form-control" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Mã HP</label>
                                    <input type="text" id="editMaHP" class="form-control" />
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Mã BM</label>
                                    <input type="text" id="editMaBoMon" class="form-control" />
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Số TC</label>
                                    <input type="number" id="editSoTC" class="form-control" />
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <label class="form-label">Giảng viên</label>
                                    <input type="text" id="editGiangVien" class="form-control" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">GV giảng dạy</label>
                                    <input type="text" id="editGiaoVienGiangDay" class="form-control" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Tên lớp</label>
                                    <input type="text" id="editLop" class="form-control" />
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Sĩ số</label>
                                    <input type="number" id="editSoSV" class="form-control" />
                                </div>
                                <div class="col-md-1">
                                    <label class="form-label">Mời giảng</label>
                                    <div class="form-check mt-2">
                                        <input class="form-check-input" type="checkbox" id="editMoiGiang" />
                                    </div>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <label class="form-label">Số tiết LL</label>
                                    <input type="number" id="editSoTietLL" class="form-control" step="0.5" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">Số tiết CTĐT</label>
                                    <input type="number" id="editSoTietCTDT" class="form-control" step="0.5" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">HS T7CN</label>
                                    <input type="number" id="editHeSoT7CN" class="form-control" step="0.1" />
                                </div>
                                <div class="col-md-3">
                                    <label class="form-label">HS Lớp đông</label>
                                    <input type="number" id="editHeSoLopDong" class="form-control" step="0.1" />
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-2">
                                    <label class="form-label">Quy chuẩn</label>
                                    <input type="number" id="editQuyChuan" class="form-control" step="0.5" />
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Hệ đào tạo</label>
                                    <select id="editHeDaoTaoId" class="form-select"></select>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Ngày bắt đầu</label>
                                    <input type="date" id="editNgayBatDau" class="form-control" />
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label">Ngày kết thúc</label>
                                    <input type="date" id="editNgayKetThuc" class="form-control" />
                                </div>
                                <div class="col-md-4">
                                    <label class="form-label">Ghi chú</label>
                                    <input type="text" id="editGhiChu" class="form-control" />
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Hủy</button>
                        <button type="button" class="btn btn-primary" id="saveEditBtn">Lưu thay đổi</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Scripts -->
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>

        <script src="/js/vuotgio_v2/khoaFilter.utils.js"></script>
        <script src="/js/vuotgio_v2/lopNgoaiQC/danhSachLopNgoaiQC.js"></script>

        <!-- Data Lock Check -->
        <script>
        (function() {
            const namHocSelect = document.getElementById('namHocFilter');
            const banner = document.getElementById('dataLockBanner');
            const bannerMsg = document.getElementById('dataLockMessage');

            function checkLockStatus() {
                const namHoc = namHocSelect ? namHocSelect.value : '';
                if (!namHoc) {
                    banner.classList.add('d-none');
                    banner.classList.remove('d-flex');
                    enableButtons();
                    return;
                }
                fetch('/v2/vuotgio/trang-thai-khoa?namHoc=' + encodeURIComponent(namHoc))
                    .then(function(res) { return res.json(); })
                    .then(function(data) {
                        if (data.success && data.locked) {
                            var info = data.lockInfo;
                            bannerMsg.textContent = 'Dữ liệu năm học ' + namHoc + ' đã được lưu bởi ' + info.nguoi_khoa + ' vào ' + info.ngay_khoa + '. Không thể chỉnh sửa.';
                            banner.classList.remove('d-none');
                            banner.classList.add('d-flex');
                            disableButtons();
                        } else {
                            banner.classList.add('d-none');
                            banner.classList.remove('d-flex');
                            enableButtons();
                        }
                    })
                    .catch(function() {
                        banner.classList.add('d-none');
                        banner.classList.remove('d-flex');
                        enableButtons();
                    });
            }

            function disableButtons() {
                // Disable edit/delete buttons in table rows and approval checkboxes
                var actionBtns = document.querySelectorAll('#updateApprovalBtn, #checkAllKhoa, #checkAllDaoTao');
                actionBtns.forEach(function(btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                });
                // Disable all action buttons in table body (edit/delete per row)
                document.querySelectorAll('#tableBody .btn-action, #tableBody .btn').forEach(function(btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.pointerEvents = 'none';
                });
                // Mark page as locked for dynamic content
                document.body.dataset.locked = 'true';
            }

            function enableButtons() {
                var actionBtns = document.querySelectorAll('#updateApprovalBtn, #checkAllKhoa, #checkAllDaoTao');
                actionBtns.forEach(function(btn) {
                    btn.disabled = false;
                    btn.style.opacity = '';
                    btn.style.pointerEvents = '';
                });
                document.querySelectorAll('#tableBody .btn-action, #tableBody .btn').forEach(function(btn) {
                    btn.disabled = false;
                    btn.style.opacity = '';
                    btn.style.pointerEvents = '';
                });
                document.body.dataset.locked = 'false';
            }

            if (namHocSelect) {
                namHocSelect.addEventListener('change', checkLockStatus);
            }
            setTimeout(checkLockStatus, 500);

            // Re-check after data loads (observe table body changes)
            var observer = new MutationObserver(function() {
                if (document.body.dataset.locked === 'true') {
                    disableButtons();
                }
            });
            var tableBody = document.getElementById('tableBody');
            if (tableBody) {
                observer.observe(tableBody, { childList: true });
            }
        })();
        </script>
</body>

</html>
````

## File: src/controllers/vuotgio_v2/tongHop.controller.js
````javascript
/**
 * VUOT GIO V2 - Tổng Hợp Controller
 * Date: 2026-04-28
 */

const tongHopService = require("../../services/vuotgio_v2/tongHop.service");
const thongKeService = require("../../services/vuotgio_v2/thongKe.service");

/**
 * API Tổng hợp vượt giờ theo Giảng viên
 */
const tongHopTheoGV = async (req, res) => {
    const { namHoc, khoa, detail } = req.query;
    if (!namHoc) return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });

    try {
        const isDetail = String(detail) === "1";
        console.info("[tongHopTheoGV] request", { namHoc, khoa, detail: isDetail });
        const data = isDetail
            ? await tongHopService.getCollectionSDODetail(namHoc, khoa)
            : await tongHopService.getCollectionSDO(namHoc, khoa);
        console.info("[tongHopTheoGV] response", { count: Array.isArray(data) ? data.length : 0, detail: isDetail });
        res.json({ success: true, data });
    } catch (error) {
        console.error("Lỗi khi tổng hợp vượt giờ theo GV:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    }
};

/**
 * API Tổng hợp vượt giờ theo Khoa (Thống kê)
 */
const tongHopTheoKhoa = async (req, res) => {
    const { namHoc } = req.query;
    if (!namHoc) return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học" });

    try {
        const result = await thongKeService.getThongKeKhoa(namHoc);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("Lỗi khi tổng hợp vượt giờ theo Khoa:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Lấy dữ liệu SDO cho 1 giảng viên (Dùng cho Preview/Thống kê lẻ)
 */
const getStandardSummaryData = async (req, res) => {
    const { MaGV } = req.params;
    const { namHoc } = req.query;

    if (!namHoc || !MaGV) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin Năm học hoặc Giảng viên" });
    }

    try {
        const data = await tongHopService.getAtomicSDO(namHoc, decodeURIComponent(MaGV));
        if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu giảng viên" });
        res.json({ success: true, data });
    } catch (error) {
        console.error("[getStandardSummaryData] Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * API Lấy chi tiết vượt giờ của một giảng viên (Dùng cho trang Chi tiết)
 */
const chiTietGV = async (req, res) => {
    const { MaGV } = req.params;
    const { namHoc } = req.query;

    try {
        const sdo = await tongHopService.getAtomicSDO(namHoc, decodeURIComponent(MaGV));
        if (!sdo) return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu" });

        res.json({
            success: true,
            data: {
                giangVien: sdo.giangVien,
                thongTinNhanVien: {
                    id_User: sdo.id_User,
                    giangVien: sdo.giangVien,
                    maKhoa: sdo.maKhoa,
                    khoa: sdo.khoa,
                    chucVu: sdo.chucVu,
                    phanTramMienGiam: sdo.phanTramMienGiam
                },
                giangDay: sdo.raw.giangDay,
                lopNgoaiQC: sdo.raw.lopNgoaiQC,
                kthp: sdo.raw.kthp,
                doAn: sdo.raw.doAn,
                huongDanThamQuan: sdo.raw.hdtq,
                nckh: sdo.raw.nckhRecords
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    tongHopTheoGV,
    tongHopTheoKhoa,
    getStandardSummaryData,
    chiTietGV,
};
````

## File: src/views/vuotgio_v2/vuotgio.tongHopGV.ejs
````ejs
<!DOCTYPE html>
<html lang="vi">

<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tổng Hợp Giảng Viên - Vượt Giờ V2</title>

    <!-- Bootstrap 5 -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css" />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />

    <!-- SweetAlert2 -->
    <link href="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.min.css" rel="stylesheet" />

    <!-- Custom Styles -->
    <link rel="stylesheet" href="/css/admin.css" />
    <link rel="stylesheet" href="/css/styles.css" />
    <link rel="stylesheet" href="/css/table.css" />


    <style>
        /* Override table.css global: overflow:hidden, box-shadow, border */
        #mainTable {
            border-collapse: collapse;
            border-spacing: 0;
            table-layout: auto !important;
            width: 2100px !important;
            min-width: 2100px !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
        }

        /* QUAN TRỌNG: Reset cứng cho tất cả th trước */
        #mainTable thead th {
            background-color: #475569 !important;
            color: #fff !important;
            padding: 8px 4px !important;
            font-size: 0.75rem !important;
            font-weight: 600 !important;
            border: 1px solid #ffffff !important;
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap;
            min-width: 60px;
        }

        .vertical-text {
            white-space: normal !important;
            text-align: center;
            vertical-align: middle !important;
            width: 60px !important;
            min-width: 60px !important;
            max-width: 60px !important;
            line-height: 1.2 !important;
            font-size: 0.75rem !important;
            word-break: break-word !important;
            display: table-cell;
        }

        /* === SECTION: Info cơ bản & Thao tác === */
        #mainTable thead th.s-base,
        #mainTable thead th.s-action {
            background-color: #64748b !important;
            color: #fff !important;
        }

        /* === SECTION: Thực tế giảng dạy — xanh dương === */
        #mainTable thead th.s-teaching {
            background-color: #1d4ed8 !important;
            color: #fff !important;
        }

        #mainTable thead th.s-teaching-hk1,
        #mainTable thead th.s-teaching-hk2,
        #mainTable thead th.s-teaching-year {
            background-color: #3b82f6 !important;
            color: #fff !important;
        }

        #mainTable thead th.s-teaching-sub {
            background-color: #60a5fa !important;
            color: #fff !important;
            font-weight: 600 !important;
        }

        /* === SECTION: Vượt định mức — xanh lá === */
        #mainTable thead th.s-over {
            background-color: #059669 !important;
            color: #fff !important;
        }

        #mainTable thead th.s-over-sub {
            background-color: #10b981 !important;
            color: #fff !important;
            font-weight: 600 !important;
        }

        /* === SECTION: Mức TT chuẩn — tím === */
        #mainTable thead th.s-rate {
            background-color: #7c3aed !important;
            color: #fff !important;
        }

        /* === SECTION: Thành tiền — cam nâu === */
        #mainTable thead th.s-money {
            background-color: #b45309 !important;
            color: #fff !important;
        }

        #mainTable thead th.s-money-sub {
            background-color: #d97706 !important;
            color: #fff !important;
            font-weight: 600 !important;
        }

        /* === SECTION: Thực nhận === */
        #mainTable thead th.s-net {
            background-color: #4338ca !important;
            color: #fff !important;
            font-weight: 600 !important;
        }

        /* ===== TBODY ===== */
        #mainTable tbody td {
            padding: 4px 2px;
            border: 1px solid #dee2e6;
            vertical-align: middle;
            box-sizing: border-box;
            font-size: 0.75rem;
            white-space: nowrap;
            min-width: 40px;
        }



        #mainTable tbody tr:hover td {
            background-color: #e2e8f0 !important;
        }

        /* ===== TFOOT ===== */
        #mainTable tfoot td {
            background-color: #eaecee;
            color: #1c2833;
            font-weight: 600;
            padding: 8px 4px;
            border: 1px solid #d5d8dc;
            font-size: 0.85rem;
        }

        /* ===== WARNING ROW ===== */
        #mainTable tbody tr.row-warning-danger,
        #mainTable tbody tr.row-warning-danger td {
            background-color: #fff3cd !important;
        }

        /* ===== VALUE COLORS ===== */
        .text-danger-bold {
            color: #dc2626;
            font-weight: 600;
        }

        .text-success-bold {
            color: #16a34a;
            font-weight: 600;
        }

        .controls-container {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 20px !important;
            margin-bottom: 25px !important;
        }


        .search {
            width: 200px;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 14px;
            height: 50px;
        }

        .highlight-vuotgio {
            background-color: #d4edda !important;
        }

        /* ===== SUMMARY BOX ===== */
        .summary {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            flex-direction: column;
            gap: 5px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.95);
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(26, 82, 118, 0.15);
            border: 1px solid #aed6f1;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .summary.collapsed {
            transform: translateY(calc(100% + 10px));
        }

        .summary-toggle {
            position: absolute;
            top: -35px;
            right: 0;
            width: 35px;
            height: 35px;
            background: #1a5276;
            color: white;
            border: none;
            border-radius: 10px 0 0 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
        }

        .summary.collapsed .summary-toggle {
            transform: translateY(5px);
            border-radius: 10px 10px 0 0;
            right: 10px;
            top: -40px;
        }

        .summary-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            min-width: 220px;
            padding: 4px 0;
        }

        .summary-box .label {
            color: #64748b;
            font-size: 0.85rem;
            font-weight: 500;
        }

        .summary-box .value {
            color: #1a5276;
            font-weight: 700;
            font-size: 1.1rem;
        }

        /* ===== Loading skeleton ===== */
        @keyframes shimmer {
            0%   { background-position: -600px 0; }
            100% { background-position:  600px 0; }
        }

        .skeleton-row td {
            background: linear-gradient(90deg, #f0f4f8 25%, #e2e8f0 50%, #f0f4f8 75%);
            background-size: 600px 100%;
            animation: shimmer 1.2s infinite;
            color: transparent !important;
            border-radius: 4px;
            height: 36px;
        }

        /* ===== NO INTERNAL SCROLL ===== */
        .over-f, #renderInfo {
            overflow: visible !important;
            width: 2100px !important;
            display: block !important;
        }

        .container-fluid {
            min-width: 2100px !important;
        }

        #renderInfo::-webkit-scrollbar {
            height: 8px;
        }

        #renderInfo::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 4px;
        }

        #renderInfo::-webkit-scrollbar-thumb {
            background: #94a3b8;
            border-radius: 4px;
        }

        #renderInfo::-webkit-scrollbar-thumb:hover {
            background: #64748b;
        }

        /* ===== COMPACT VIEW ===== */
        .compact-active #mainTable {
            width: auto !important;
            min-width: auto !important;
        }

        .compact-active #renderInfo {
            width: auto !important;
        }

        .compact-active .container-fluid {
            min-width: auto !important;
        }

        #btnCompactView {
            transition: all 0.2s ease;
        }

        #btnCompactView.active {
            background-color: #6366f1 !important;
            border-color: #6366f1 !important;
            color: #fff !important;
        }

        /* Compact table (rendered separately) */
        #compactTable {
            border-collapse: collapse;
            border-spacing: 0;
            table-layout: auto !important;
            width: auto !important;
            min-width: 900px !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
        }

        #compactTable thead th {
            background-color: #475569 !important;
            color: #fff !important;
            padding: 8px 6px !important;
            font-size: 0.8rem !important;
            font-weight: 600 !important;
            border: 1px solid #ffffff !important;
            text-align: center !important;
            vertical-align: middle !important;
            white-space: nowrap;
        }

        #compactTable tbody td {
            padding: 6px 4px;
            border: 1px solid #dee2e6;
            vertical-align: middle;
            font-size: 0.8rem;
            white-space: nowrap;
        }

        #compactTable tbody tr:hover td {
            background-color: #e2e8f0 !important;
        }

        #compactTable tfoot td {
            background-color: #eaecee;
            color: #1c2833;
            font-weight: 600;
            padding: 8px 6px;
            border: 1px solid #d5d8dc;
            font-size: 0.85rem;
        }

        #compactTable tbody tr.row-warning-danger td {
            background-color: #fff3cd !important;
        }

        #compactTable tbody tr.group-header td {
            background-color: #f8fafc !important;
            font-weight: 600;
        }
    </style>

</head>

<body>
    <%- include('../header') %>

    <div class="container-fluid m-4">
        <div class="gvmList">
            <div class="m-5 reCss">
                <h4>Bảng Tổng Hợp Vượt Giờ</h4>

                <div class="controls-container">
                    <select class="selectop" id="namHocXem" style="width: 130px; margin: 0; box-shadow: none;">
                        <option value="">Chọn năm học</option>
                    </select>

                    <select class="selectop" id="khoaXem" style="width: 150px; margin: 0; box-shadow: none;">
                        <option value="ALL">Tất cả khoa</option>
                    </select>
                    <button id="loadDataBtn" class="btn btn-primary" style="height: 45px; width: 130px; margin: 0;">
                        Hiển thị
                    </button>
                    <button id="btnSwitchToKhoa" class="btn btn-primary"
                        style="height: 45px; width: 180px; margin: 0; margin-left: 5px;">
                        Thống kê khoa
                    </button>
                    <button id="khoaDuLieuBtn" class="btn btn-primary"
                        style="height: 45px; width: 180px; margin: 0; margin-left: 5px; display: none;">
                        <i class="bi bi-save-fill me-1"></i> Lưu Dữ Liệu
                    </button>

                    <button id="btnDuyetTatCa" class="btn btn-success"
                        style="height: 45px; width: 180px; margin: 0; margin-left: 5px; display: none;">
                        <i class="bi bi-check-all me-1"></i> Duyệt tất cả
                    </button>

                    <button id="btnCompactView" class="btn btn-outline-secondary"
                        style="height: 45px; width: 150px; margin: 0; margin-left: 20px;"
                        title="Chuyển đổi giữa bảng đầy đủ và bảng rút gọn">
                        <i class="bi bi-layout-three-columns me-1"></i> Rút gọn
                    </button>
                </div>

                <!-- Summary Boxes -->
                <div class="summary" id="summaryBox" style="display: none;">
                    <button class="summary-toggle" id="btnToggleSummary" title="Ẩn/Hiện tổng kết">
                        <i class="bi bi-chevron-down"></i>
                    </button>
                    <div class="summary-box">
                        <div class="label">Tổng giảng viên</div>
                        <div class="value" id="totalGV">0</div>
                    </div>
                    <div class="summary-box">
                        <div class="label">GV có vượt giờ</div>
                        <div class="value" id="gvCoVuotGio">0</div>
                    </div>
                    <div class="summary-box">
                        <div class="label">Tổng tiết vượt giờ</div>
                        <div class="value" id="totalVuotGio">0</div>
                    </div>
                </div>

                <!-- Filter Row -->
                <div class="controls-container">
                    <input type="text" id="filterGiangVien" placeholder="Tìm theo tên giảng viên"
                        class="form-control m-2 search" style="width: 300px;" />
                </div>

                <!-- Banner trạng thái đã lưu -->
                <div id="lockStatusBanner" style="display:none; background:#d1fae5; border:1px solid #6ee7b7; border-radius:6px; padding:10px 16px; margin-bottom:12px; font-size:0.9rem; color:#065f46;">
                    <i class="bi bi-check-circle-fill me-1"></i>
                    <span id="lockStatusText">Đã lưu</span>
                </div>

                <!-- Table Section (No scroll container) -->
                <div id="renderInfo">
                    <table class="table table-hover table-bordered text-center" id="mainTable">
                        <thead>
                            <tr>
                                <th rowspan="3" class="s-base" style="width:40px">STT</th>
                                <th rowspan="3" class="s-base" style="width:180px">Họ tên Giảng viên</th>
                                <th rowspan="3" class="s-base" style="width:100px">Thu nhập</th>
                                <th rowspan="3" class="s-base vertical-text" style="width:40px">Định mức giờ giảng</th>
                                <th rowspan="3" class="s-base vertical-text" style="width:40px">Được giảm</th>
                                <th rowspan="3" class="s-base vertical-text" style="width:40px">Số tiết chưa hoàn thành NCKH</th>
                                <th rowspan="3" class="s-base vertical-text" style="width:40px">Định mức phải giảng</th>

                                <th colspan="15" class="s-teaching">Thực tế giảng dạy + coi, ra đề, chấm thi + ĐATN + HDTQ</th>
                                <th colspan="6" class="s-over">Số tiết vượt định mức</th>
                                <th rowspan="3" class="s-rate" style="width:90px" title="Được tính tự động theo công thức: TRUNC(Thu nhập / 176, 1)">Mức TT chuẩn</th>
                                <th colspan="6" class="s-money">Thành tiền</th>
                                <th rowspan="3" class="s-net" style="width:90px">Thực nhận</th>
                                <th rowspan="3" class="s-action" style="width:70px">Thao tác</th>
                            </tr>
                            <tr>
                                <th colspan="5" class="s-teaching-hk1">Học kỳ I</th>
                                <th colspan="5" class="s-teaching-hk2" title="Bao gồm: Giảng dạy HK2 + Đồ án tốt nghiệp + Hướng dẫn tham quan (không có thông tin HK, mặc định vào HK2)">
                                    Học kỳ II <small style="font-weight:400; font-size:0.65rem; display:block; opacity:0.85;">(gồm ĐA &amp; TQ)</small>
                                </th>
                                <th colspan="5" class="s-teaching-year">Cả năm</th>

                                <th rowspan="2" class="s-over-sub" style="width:70px">VN</th>
                                <th rowspan="2" class="s-over-sub" style="width:70px">Lào</th>
                                <th rowspan="2" class="s-over-sub" style="width:70px">Cuba</th>
                                <th rowspan="2" class="s-over-sub" style="width:70px">CPC</th>
                                <th rowspan="2" class="s-over-sub" style="width:70px">Đóng HP</th>
                                <th rowspan="2" class="s-over-sub" style="width:80px;font-weight:700">Tổng</th>

                                <th rowspan="2" class="s-money-sub" style="width:70px">VN</th>
                                <th rowspan="2" class="s-money-sub" style="width:70px">Lào</th>
                                <th rowspan="2" class="s-money-sub" style="width:70px">Cuba</th>
                                <th rowspan="2" class="s-money-sub" style="width:70px">CPC</th>
                                <th rowspan="2" class="s-money-sub" style="width:70px">Đóng HP</th>
                                <th rowspan="2" class="s-money-sub" style="width:80px;font-weight:700">Tổng</th>
                            </tr>
                            <tr>
                                <!-- HKI -->
                                <th class="s-teaching-sub">VN</th>
                                <th class="s-teaching-sub">Lào</th>
                                <th class="s-teaching-sub">Cuba</th>
                                <th class="s-teaching-sub">CPC</th>
                                <th class="s-teaching-sub">Đóng HP</th>
                                <!-- HKII -->
                                <th class="s-teaching-sub">VN</th>
                                <th class="s-teaching-sub">Lào</th>
                                <th class="s-teaching-sub">Cuba</th>
                                <th class="s-teaching-sub">CPC</th>
                                <th class="s-teaching-sub">Đóng HP</th>
                                <!-- Cả năm -->
                                <th class="s-teaching-sub">VN</th>
                                <th class="s-teaching-sub">Lào</th>
                                <th class="s-teaching-sub">Cuba</th>
                                <th class="s-teaching-sub">CPC</th>
                                <th class="s-teaching-sub">Đóng HP</th>
                            </tr>
                        </thead>
                        <tbody id="tableBody">
                            <!-- Dữ liệu sẽ được chèn vào đây -->
                        </tbody>
                        <tfoot id="tableFoot">
                            <!-- Tổng cộng -->
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Scripts -->
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11.6.16/dist/sweetalert2.all.min.js"></script>

        <script src="/js/vuotgio_v2/tongHop/giangVien.js"></script>

        <!-- Data Lock Feature -->
        <script>
        (function() {
            'use strict';

            let isDataLocked = false;

            /**
             * Kiểm tra trạng thái khóa dữ liệu cho năm học hiện tại
             */
            async function checkLockStatus() {
                const namHoc = document.getElementById('namHocXem').value;
                if (!namHoc) return;

                try {
                    const response = await fetch(`/v2/vuotgio/trang-thai-khoa?namHoc=${encodeURIComponent(namHoc)}`);
                    const result = await response.json();

                    if (result.success) {
                        isDataLocked = result.locked;
                        updateLockUI(result.locked, result.lockInfo);
                    }
                } catch (error) {
                    console.error('[dataLock] Error checking lock status:', error);
                }
            }

            /**
             * Cập nhật giao diện dựa trên trạng thái khóa
             */
            function updateLockUI(locked, lockInfo) {
                const lockBanner = document.getElementById('lockStatusBanner');
                const lockText = document.getElementById('lockStatusText');
                const khoaBtn = document.getElementById('khoaDuLieuBtn');

                if (locked && lockInfo) {
                    // Hiển thị banner trạng thái khóa trên đầu bảng
                    lockBanner.style.display = 'block';
                    lockText.textContent = `Đã lưu - ${lockInfo.ngay_khoa} bởi ${lockInfo.nguoi_khoa}`;

                    // Ẩn nút Lưu Dữ Liệu
                    if (khoaBtn) khoaBtn.style.display = 'none';
                } else {
                    // Ẩn banner
                    lockBanner.style.display = 'none';
                    lockText.textContent = '';

                    // Hiển thị nút Lưu chỉ cho Lãnh đạo phòng VP
                    const role = localStorage.getItem('userRole');
                    const MaPhongBan = localStorage.getItem('MaPhongBan');
                    if (khoaBtn) {
                        khoaBtn.style.display = (role === 'Lãnh đạo phòng' && MaPhongBan === 'VP') ? '' : 'none';
                    }
                }
            }

            /**
             * Xử lý nhấn nút "Lưu & Khóa Dữ Liệu"
             */
            async function handleLockData() {
                const namHoc = document.getElementById('namHocXem').value;
                if (!namHoc) {
                    Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
                    return;
                }

                // Hiển thị hộp thoại xác nhận
                const confirmResult = await Swal.fire({
                    title: 'Xác nhận Lưu Dữ Liệu',
                    html: `Sau khi lưu, toàn bộ dữ liệu vượt giờ năm học <strong>${namHoc}</strong> sẽ không thể chỉnh sửa. Bạn có chắc chắn?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#0d6efd',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'Xác nhận lưu',
                    cancelButtonText: 'Hủy',
                    reverseButtons: true
                });

                if (!confirmResult.isConfirmed) return;

                // Hiển thị loading và vô hiệu hóa nút
                const khoaBtn = document.getElementById('khoaDuLieuBtn');
                const originalContent = khoaBtn.innerHTML;
                khoaBtn.disabled = true;
                khoaBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Đang xử lý...';

                try {
                    const response = await fetch('/v2/vuotgio/tong-hop/khoa-du-lieu', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ namHoc, ghiChu: null })
                    });
                    const result = await response.json();

                    if (result.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Thành công',
                            text: result.message || 'Dữ liệu đã được lưu thành công',
                            timer: 3000,
                            showConfirmButton: true
                        });
                        // Cập nhật lại trạng thái UI
                        await checkLockStatus();
                    } else {
                        let errorHtml = result.message || 'Không thể lưu dữ liệu';
                        // Hiển thị chi tiết lỗi nếu có (prerequisites chưa đạt)
                        if (result.errors && result.errors.length > 0) {
                            errorHtml += '<br><br><strong>Chi tiết:</strong><ul style="text-align: left; margin-top: 8px;">';
                            result.errors.forEach(err => {
                                errorHtml += `<li>${err.table}: ${err.unapproved}/${err.total} bản ghi chưa duyệt</li>`;
                            });
                            errorHtml += '</ul>';
                        }
                        Swal.fire({
                            icon: 'error',
                            title: 'Không thể lưu dữ liệu',
                            html: errorHtml
                        });
                    }
                } catch (error) {
                    console.error('[dataLock] Error locking data:', error);
                    Swal.fire('Lỗi', 'Không thể kết nối đến server', 'error');
                } finally {
                    // Khôi phục nút
                    khoaBtn.disabled = false;
                    khoaBtn.innerHTML = originalContent;
                }
            }

            // Khởi tạo khi DOM ready
            document.addEventListener('DOMContentLoaded', function() {
                const khoaBtn = document.getElementById('khoaDuLieuBtn');
                const namHocSelect = document.getElementById('namHocXem');

                // Hiển thị nút lưu chỉ cho Lãnh đạo phòng VP
                const role = localStorage.getItem('userRole');
                const MaPhongBan = localStorage.getItem('MaPhongBan');
                if (role === 'Lãnh đạo phòng' && MaPhongBan === 'VP' && khoaBtn) {
                    khoaBtn.style.display = '';
                }

                // Gắn sự kiện click cho nút khóa
                if (khoaBtn) {
                    khoaBtn.addEventListener('click', handleLockData);
                }

                // Kiểm tra trạng thái khóa khi load trang (delay nhỏ để đợi loadNamHocOptions hoàn thành)
                setTimeout(checkLockStatus, 500);

                // Kiểm tra lại trạng thái khóa khi thay đổi năm học
                if (namHocSelect) {
                    namHocSelect.addEventListener('change', checkLockStatus);
                }
            });
        })();
        </script>

        <!-- Compact View Toggle -->
        <script>
        (function() {
            'use strict';

            let isCompact = true; // Mặc định hiển thị rút gọn

            // Bảng rút gọn: giữ nguyên cấu trúc group header theo khoa
            // Chỉ hiển thị: STT | Họ tên | Định mức phải giảng | Tổng tiết cả năm | Tổng vượt giờ | Mức TT | Tổng thành tiền | Thực nhận | Thao tác
            // Dữ liệu lấy từ bảng chính (đã render), chỉ pick các cột cần thiết

            function applyCompactState() {
                const btn = document.getElementById('btnCompactView');
                const mainTable = document.getElementById('mainTable');
                const renderInfo = document.getElementById('renderInfo');
                const containerFluid = document.querySelector('.container-fluid');

                if (isCompact) {
                    btn.classList.add('active');
                    btn.innerHTML = '<i class="bi bi-table me-1"></i> Chi tiết';

                    // Ẩn bảng chính
                    mainTable.style.display = 'none';

                    // Tạo hoặc cập nhật bảng rút gọn
                    let compactTable = document.getElementById('compactTable');
                    if (!compactTable) {
                        compactTable = document.createElement('table');
                        compactTable.id = 'compactTable';
                        compactTable.className = 'table table-hover table-bordered text-center';
                        renderInfo.appendChild(compactTable);
                    }

                    renderCompactTable(compactTable);

                    // Điều chỉnh width
                    renderInfo.style.width = 'auto';
                    renderInfo.style.minWidth = '900px';
                    if (containerFluid) containerFluid.style.minWidth = 'auto';

                } else {
                    btn.classList.remove('active');
                    btn.innerHTML = '<i class="bi bi-layout-three-columns me-1"></i> Rút gọn';

                    // Hiện lại bảng chính
                    mainTable.style.display = '';

                    // Xóa bảng rút gọn
                    const compactTable = document.getElementById('compactTable');
                    if (compactTable) compactTable.remove();

                    // Khôi phục width
                    renderInfo.style.width = '2100px';
                    renderInfo.style.minWidth = '';
                    if (containerFluid) containerFluid.style.minWidth = '2100px';
                }
            }

            function toggleCompactView() {
                isCompact = !isCompact;
                applyCompactState();
            }

            function renderCompactTable(table) {
                const mainBody = document.getElementById('tableBody');
                const mainFoot = document.getElementById('tableFoot');

                // Header rút gọn
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th class="s-base" style="width:40px">STT</th>
                            <th class="s-base" style="width:200px">Họ tên Giảng viên</th>
                            <th class="s-base" style="width:80px">Định mức phải giảng</th>
                            <th style="background-color:#3b82f6!important;color:#fff!important;width:90px">Tổng tiết giảng dạy</th>
                            <th style="background-color:#10b981!important;color:#fff!important;width:90px">Tổng vượt giờ</th>
                            <th style="background-color:#7c3aed!important;color:#fff!important;width:90px">Mức TT chuẩn</th>
                            <th style="background-color:#d97706!important;color:#fff!important;width:100px">Tổng thành tiền</th>
                            <th style="background-color:#4338ca!important;color:#fff!important;width:100px">Thực nhận</th>
                            <th class="s-action" style="width:70px">Thao tác</th>
                        </tr>
                    </thead>
                `;

                // Body: lấy dữ liệu từ bảng chính theo index cột (0-based):
                // 0: STT, 1: Họ tên, 2: Thu nhập, 3: Định mức, 4: Được giảm, 5: Thiếu NCKH, 6: Định mức phải giảng
                // 7-11: HK1 (VN,Lào,Cuba,CPC,ĐóngHP), 12-16: HK2, 17-21: Cả năm
                // 22-27: Vượt giờ (VN,Lào,Cuba,CPC,ĐóngHP,Tổng)
                // 28: Mức TT, 29-34: Thành tiền (VN,Lào,Cuba,CPC,ĐóngHP,Tổng)
                // 35: Thực nhận, 36: Thao tác

                const tbody = document.createElement('tbody');
                const rows = mainBody.querySelectorAll('tr');

                rows.forEach(row => {
                    const newRow = document.createElement('tr');

                    // Group header row
                    if (row.classList.contains('group-header')) {
                        newRow.className = 'group-header table-light fw-bold';
                        // Copy data-khoa-code attribute cho approval badge
                        const khoaCode = row.getAttribute('data-khoa-code');
                        if (khoaCode) newRow.setAttribute('data-khoa-code', khoaCode);
                        newRow.innerHTML = '<td colspan="9" class="text-start px-3 py-2">' + row.querySelector('td').innerHTML + '</td>';
                        tbody.appendChild(newRow);
                        return;
                    }

                    // Copy class (warning, etc.)
                    if (row.classList.contains('row-warning-danger')) {
                        newRow.classList.add('row-warning-danger');
                    }

                    const cells = row.querySelectorAll('td');
                    if (cells.length < 37) return; // skip invalid rows

                    // Tính tổng tiết cả năm = sum(cells[17..21]) — cả năm VN+Lào+Cuba+CPC+ĐóngHP
                    // Hoặc đơn giản hơn: lấy tổng từ cột vượt giờ + định mức (nhưng không chính xác)
                    // Chính xác nhất: sum cells index 17,18,19,20,21 (cả năm)
                    const parseVal = (td) => {
                        const text = td ? td.textContent.trim().replace(/,/g, '') : '0';
                        return parseFloat(text) || 0;
                    };

                    const tongTietCaNam = parseVal(cells[17]) + parseVal(cells[18]) + parseVal(cells[19]) + parseVal(cells[20]) + parseVal(cells[21]);

                    newRow.innerHTML = `
                        <td>${cells[0].textContent}</td>
                        <td style="text-align:left;padding-left:8px;">${cells[1].textContent}</td>
                        <td>${cells[6].textContent}</td>
                        <td>${tongTietCaNam ? tongTietCaNam.toLocaleString('vi-VN') : '0'}</td>
                        <td style="color:green;font-weight:bold;">${cells[27].textContent}</td>
                        <td>${cells[28].textContent}</td>
                        <td style="font-weight:bold;">${cells[34].textContent}</td>
                        <td style="font-weight:bold;color:#1a5276;">${cells[35].textContent}</td>
                        <td>${cells[36].innerHTML}</td>
                    `;

                    tbody.appendChild(newRow);
                });

                table.appendChild(tbody);

                // Footer
                if (mainFoot && mainFoot.querySelector('tr')) {
                    const tfoot = document.createElement('tfoot');
                    const footCells = mainFoot.querySelectorAll('td');
                    // Footer có colspan=2 ở ô đầu, nên index lệch so với body:
                    // [0]=TỔNG CỘNG(colspan2), [1]=luong, [2]=dinhMuc, [3]=mienGiam, [4]=thieuNCKH, [5]=dinhMucPhaiGiang
                    // [6-10]=HK1, [11-15]=HK2, [16-20]=Cả năm, [21-26]=Vượt(VN,Lào,Cuba,CPC,ĐóngHP,Tổng)
                    // [27]=MứcTT, [28-33]=Tiền(VN,Lào,Cuba,CPC,ĐóngHP,Tổng), [34]=ThựcNhận, [35]=Actions
                    if (footCells.length >= 34) {
                        const parseVal = (td) => {
                            const text = td ? td.textContent.trim().replace(/,/g, '') : '0';
                            return parseFloat(text) || 0;
                        };
                        const tongTietFoot = parseVal(footCells[16]) + parseVal(footCells[17]) + parseVal(footCells[18]) + parseVal(footCells[19]) + parseVal(footCells[20]);

                        tfoot.innerHTML = `
                            <tr>
                                <td colspan="3" style="text-align:right;font-weight:700;">Tổng cộng</td>
                                <td>${tongTietFoot ? tongTietFoot.toLocaleString('vi-VN') : '0'}</td>
                                <td style="color:green;font-weight:bold;">${footCells[26].textContent}</td>
                                <td>-</td>
                                <td style="font-weight:bold;">${footCells[33].textContent}</td>
                                <td style="font-weight:bold;color:#1a5276;">${footCells[34].textContent}</td>
                                <td></td>
                            </tr>
                        `;
                    }
                    table.appendChild(tfoot);
                }
            }

            document.addEventListener('DOMContentLoaded', function() {
                const btn = document.getElementById('btnCompactView');
                if (btn) {
                    btn.addEventListener('click', toggleCompactView);
                }

                // Mặc định: ẩn bảng chính, hiển thị nút ở trạng thái active
                applyCompactState();

                // Theo dõi khi bảng chính được render lại (loadData → renderTable)
                // để tự động cập nhật bảng rút gọn
                const tableBody = document.getElementById('tableBody');
                if (tableBody) {
                    const observer = new MutationObserver(function() {
                        if (isCompact) {
                            applyCompactState();
                        }
                    });
                    observer.observe(tableBody, { childList: true });
                }
            });
        })();
        </script>

        <!-- Duyệt Tổng Hợp theo Khoa (VP) -->
        <script>
        (function() {
            'use strict';

            // Trạng thái duyệt: Map<khoa, { van_phong_duyet, van_phong_ngay_duyet, ... }>
            let approvalMap = new Map();

            const ROLE_TRO_LY = 'Trợ lý';
            const ROLE_LANH_DAO = 'Lãnh đạo phòng';
            const MA_VP = 'VP';

            /**
             * Kiểm tra user hiện tại có quyền duyệt/hủy duyệt không
             */
            function canApproveOrRevoke() {
                const role = localStorage.getItem('userRole') || '';
                const maPhongBan = localStorage.getItem('MaPhongBan') || '';
                return (role === ROLE_TRO_LY || role === ROLE_LANH_DAO) && maPhongBan === MA_VP;
            }

            /**
             * Load trạng thái duyệt từ API
             */
            async function loadApprovalStatus() {
                const namHoc = document.getElementById('namHocXem').value;
                if (!namHoc) return;

                try {
                    const response = await fetch(`/v2/vuotgio/tong-hop/duyet-trang-thai?namHoc=${encodeURIComponent(namHoc)}`);
                    const result = await response.json();

                    if (result.success && Array.isArray(result.data)) {
                        approvalMap.clear();
                        result.data.forEach(item => {
                            approvalMap.set(item.khoa, item);
                        });
                        // Cập nhật UI group headers
                        updateGroupHeaders();
                    }
                } catch (error) {
                    console.error('[duyetTongHop] Error loading approval status:', error);
                }
            }

            /**
             * Cập nhật badge + nút duyệt trên các group header row
             */
            function updateGroupHeaders() {
                // Cập nhật cả bảng chính và bảng compact
                const containers = [
                    document.getElementById('tableBody'),
                    document.querySelector('#compactTable tbody')
                ].filter(Boolean);

                containers.forEach(container => {
                    const groupRows = container.querySelectorAll('tr.group-header');
                    groupRows.forEach(row => {
                        applyApprovalBadge(row);
                    });
                });
            }

            function applyApprovalBadge(row) {
                const td = row.querySelector('td');
                if (!td) return;

                // Lấy mã khoa từ data attribute
                const maKhoa = row.getAttribute('data-khoa-code');
                if (!maKhoa) return;

                const approval = approvalMap.get(maKhoa);
                const isDuyet = approval && approval.van_phong_duyet === 1;

                // Xóa badge/nút cũ nếu có
                const existingBadge = td.querySelector('.approval-badge-container');
                if (existingBadge) existingBadge.remove();
                // Xóa text info cũ nếu có
                const existingInfo = td.querySelector('.approval-info-text');
                if (existingInfo) existingInfo.remove();

                // Thêm text thông tin duyệt ngay sau tên khoa
                if (isDuyet) {
                    const ngayDuyet = approval.van_phong_ngay_duyet
                        ? new Date(approval.van_phong_ngay_duyet).toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
                        : '';
                    const nguoiDuyet = approval.van_phong_nguoi_duyet_ten || '';
                    const infoParts = [nguoiDuyet, ngayDuyet].filter(Boolean).join(' - ');
                    if (infoParts) {
                        const infoSpan = document.createElement('span');
                        infoSpan.className = 'approval-info-text';
                        infoSpan.style.cssText = 'margin-left:12px; font-size:0.72rem; color:#059669; font-weight:400; font-style:italic;';
                        infoSpan.innerHTML = `<i class="bi bi-check-circle-fill me-1"></i>Đã duyệt: ${infoParts}`;
                        td.appendChild(infoSpan);
                    }
                }

                // Tạo container badge (nút hành động)
                const container = document.createElement('span');
                container.className = 'approval-badge-container';
                container.style.cssText = 'float:right; display:inline-flex; align-items:center; gap:8px;';

                if (isDuyet) {
                    // Badge đã duyệt (ngắn gọn)
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-success';
                    badge.style.cssText = 'font-size:0.7rem; padding:4px 8px; font-weight:500;';
                    badge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Đã duyệt';
                    container.appendChild(badge);

                    // Nút hủy duyệt (nếu có quyền)
                    if (canApproveOrRevoke()) {
                        const btnRevoke = document.createElement('button');
                        btnRevoke.className = 'btn btn-sm btn-outline-danger';
                        btnRevoke.style.cssText = 'font-size:0.65rem; padding:2px 8px; line-height:1.4;';
                        btnRevoke.innerHTML = '<i class="bi bi-x-circle me-1"></i>Hủy duyệt';
                        btnRevoke.title = 'Hủy duyệt khoa này';
                        btnRevoke.addEventListener('click', (e) => {
                            e.stopPropagation();
                            handleRevoke(maKhoa);
                        });
                        container.appendChild(btnRevoke);
                    }
                } else {
                    // Badge chưa duyệt
                    const badge = document.createElement('span');
                    badge.className = 'badge bg-warning text-dark';
                    badge.style.cssText = 'font-size:0.7rem; padding:4px 8px; font-weight:500;';
                    badge.innerHTML = '<i class="bi bi-clock me-1"></i>Chưa duyệt';
                    container.appendChild(badge);

                    // Nút duyệt (nếu có quyền)
                    if (canApproveOrRevoke()) {
                        const btnApprove = document.createElement('button');
                        btnApprove.className = 'btn btn-sm btn-success';
                        btnApprove.style.cssText = 'font-size:0.65rem; padding:2px 8px; line-height:1.4;';
                        btnApprove.innerHTML = '<i class="bi bi-check-lg me-1"></i>Duyệt';
                        btnApprove.title = 'Duyệt tổng hợp khoa này';
                        btnApprove.addEventListener('click', (e) => {
                            e.stopPropagation();
                            handleApprove(maKhoa);
                        });
                        container.appendChild(btnApprove);
                    }
                }

                td.appendChild(container);
            }

            /**
             * Xử lý duyệt 1 khoa
             */
            async function handleApprove(maKhoa) {
                const namHoc = document.getElementById('namHocXem').value;
                if (!namHoc) return;

                // Kiểm tra điều kiện tiên quyết trước
                try {
                    const checkRes = await fetch(`/v2/vuotgio/tong-hop/duyet-kiem-tra?namHoc=${encodeURIComponent(namHoc)}&khoa=${encodeURIComponent(maKhoa)}`);
                    const checkResult = await checkRes.json();

                    if (checkResult.success && !checkResult.passed) {
                        let errorHtml = '<strong>Chưa đủ điều kiện duyệt:</strong><ul style="text-align:left;margin-top:8px;">';
                        (checkResult.errors || []).forEach(err => {
                            errorHtml += `<li>${err.tableName || err.table}: ${err.unapproved}/${err.total} bản ghi chưa duyệt</li>`;
                        });
                        errorHtml += '</ul>';
                        Swal.fire({ icon: 'warning', title: 'Chưa đủ điều kiện', html: errorHtml });
                        return;
                    }
                } catch (err) {
                    console.error('[duyetTongHop] check prerequisites error:', err);
                }

                // Xác nhận
                const confirm = await Swal.fire({
                    title: 'Xác nhận duyệt',
                    html: `Duyệt tổng hợp vượt giờ khoa <strong>${maKhoa}</strong>?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Duyệt',
                    cancelButtonText: 'Hủy',
                    confirmButtonColor: '#059669',
                    reverseButtons: true
                });

                if (!confirm.isConfirmed) return;

                try {
                    const response = await fetch('/v2/vuotgio/tong-hop/duyet-khoa', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ namHoc, khoa: maKhoa })
                    });
                    const result = await response.json();

                    if (result.success) {
                        Swal.fire({ icon: 'success', title: 'Đã duyệt', text: result.message, timer: 2000, showConfirmButton: false });
                        await loadApprovalStatus();
                    } else {
                        let errorHtml = result.message || 'Không thể duyệt';
                        if (result.errors && result.errors.length > 0) {
                            errorHtml += '<br><br><ul style="text-align:left;">';
                            result.errors.forEach(err => {
                                errorHtml += `<li>${err.tableName || err.table}: ${err.unapproved}/${err.total} chưa duyệt</li>`;
                            });
                            errorHtml += '</ul>';
                        }
                        Swal.fire({ icon: 'error', title: 'Lỗi', html: errorHtml });
                    }
                } catch (error) {
                    console.error('[duyetTongHop] approve error:', error);
                    Swal.fire('Lỗi', 'Không thể kết nối server', 'error');
                }
            }

            /**
             * Xử lý hủy duyệt 1 khoa
             */
            async function handleRevoke(maKhoa) {
                const namHoc = document.getElementById('namHocXem').value;
                if (!namHoc) return;

                const confirm = await Swal.fire({
                    title: 'Xác nhận hủy duyệt',
                    html: `Hủy duyệt tổng hợp khoa <strong>${maKhoa}</strong>?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Hủy duyệt',
                    cancelButtonText: 'Quay lại',
                    confirmButtonColor: '#dc2626',
                    reverseButtons: true
                });

                if (!confirm.isConfirmed) return;

                try {
                    const response = await fetch('/v2/vuotgio/tong-hop/huy-duyet-khoa', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ namHoc, khoa: maKhoa })
                    });
                    const result = await response.json();

                    if (result.success) {
                        Swal.fire({ icon: 'success', title: 'Đã hủy duyệt', text: result.message, timer: 2000, showConfirmButton: false });
                        await loadApprovalStatus();
                    } else {
                        Swal.fire('Lỗi', result.message || 'Không thể hủy duyệt', 'error');
                    }
                } catch (error) {
                    console.error('[duyetTongHop] revoke error:', error);
                    Swal.fire('Lỗi', 'Không thể kết nối server', 'error');
                }
            }

            /**
             * Xử lý duyệt tất cả khoa chưa duyệt
             */
            async function handleApproveAll() {
                const namHoc = document.getElementById('namHocXem').value;
                if (!namHoc) return;

                // Lấy danh sách khoa chưa duyệt
                const chuaDuyet = [];
                approvalMap.forEach((val, khoa) => {
                    if (!val.van_phong_duyet || val.van_phong_duyet === 0) {
                        chuaDuyet.push(khoa);
                    }
                });

                // Thêm cả khoa có trong bảng nhưng chưa có trong approvalMap (chưa có record)
                const tableBody = document.getElementById('tableBody');
                if (tableBody) {
                    tableBody.querySelectorAll('tr.group-header[data-khoa-code]').forEach(row => {
                        const code = row.getAttribute('data-khoa-code');
                        if (code && !approvalMap.has(code)) {
                            chuaDuyet.push(code);
                        } else if (code && approvalMap.has(code) && !approvalMap.get(code).van_phong_duyet) {
                            if (!chuaDuyet.includes(code)) chuaDuyet.push(code);
                        }
                    });
                }

                if (chuaDuyet.length === 0) {
                    Swal.fire('Thông báo', 'Tất cả khoa đã được duyệt', 'info');
                    return;
                }

                const confirm = await Swal.fire({
                    title: 'Duyệt tất cả',
                    html: `Duyệt tổng hợp vượt giờ cho <strong>${chuaDuyet.length}</strong> khoa chưa duyệt?<br><small class="text-muted">${chuaDuyet.join(', ')}</small>`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Duyệt tất cả',
                    cancelButtonText: 'Hủy',
                    confirmButtonColor: '#059669',
                    reverseButtons: true
                });

                if (!confirm.isConfirmed) return;

                const btn = document.getElementById('btnDuyetTatCa');
                const originalContent = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Đang duyệt...';

                let successCount = 0;
                let failedKhoa = [];

                for (const khoa of chuaDuyet) {
                    try {
                        const response = await fetch('/v2/vuotgio/tong-hop/duyet-khoa', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ namHoc, khoa })
                        });
                        const result = await response.json();
                        if (result.success) {
                            successCount++;
                        } else {
                            failedKhoa.push({ khoa, message: result.message || 'Lỗi' });
                        }
                    } catch (err) {
                        failedKhoa.push({ khoa, message: 'Lỗi kết nối' });
                    }
                }

                btn.disabled = false;
                btn.innerHTML = originalContent;

                if (failedKhoa.length === 0) {
                    Swal.fire({ icon: 'success', title: 'Hoàn tất', text: `Đã duyệt ${successCount} khoa`, timer: 2500, showConfirmButton: false });
                } else {
                    let html = `Duyệt thành công: ${successCount}/${chuaDuyet.length}<br><br><strong>Không duyệt được:</strong><ul style="text-align:left;">`;
                    failedKhoa.forEach(f => { html += `<li>${f.khoa}: ${f.message}</li>`; });
                    html += '</ul>';
                    Swal.fire({ icon: 'warning', title: 'Kết quả', html });
                }

                await loadApprovalStatus();
            }

            // Khởi tạo
            document.addEventListener('DOMContentLoaded', function() {
                const namHocSelect = document.getElementById('namHocXem');
                const loadBtn = document.getElementById('loadDataBtn');
                const btnDuyetTatCa = document.getElementById('btnDuyetTatCa');

                // Hiển thị nút "Duyệt tất cả" nếu có quyền
                if (btnDuyetTatCa && canApproveOrRevoke()) {
                    btnDuyetTatCa.style.display = '';
                    btnDuyetTatCa.addEventListener('click', handleApproveAll);
                }

                // Load trạng thái duyệt sau khi data đã load (delay để đợi renderTable)
                // Dùng MutationObserver trên tableBody
                const tableBody = document.getElementById('tableBody');
                if (tableBody) {
                    const observer = new MutationObserver(function() {
                        // Mỗi khi bảng render lại → load lại trạng thái duyệt
                        loadApprovalStatus();
                    });
                    observer.observe(tableBody, { childList: true });
                }

                // Khi đổi năm học → load lại
                if (namHocSelect) {
                    namHocSelect.addEventListener('change', () => {
                        setTimeout(loadApprovalStatus, 300);
                    });
                }

                // Load lần đầu (delay để đợi loadNamHocOptions + loadData)
                setTimeout(loadApprovalStatus, 1000);
            });
        })();
        </script>

</body>

</html>
````

## File: src/public/js/vuotgio_v2/lopNgoaiQC/danhSachLopNgoaiQC.js
````javascript
/**
 * Danh Sách Lớp Ngoài Quy Chuẩn - Frontend JS
 * VuotGio V2 - Refactored 2026-03-04
 * 
 * Đọc từ bảng lopngoaiquychuan (chính thức, cột mới sau migration):
 *   LopHocPhan, MaHocPhan, SoTinChi, TenLop, LL, MaBoMon, KiHoc, Dot...
 */

let globalData = [];
let heDaoTaoList = [];
let currentEditId = null;

const userRole = localStorage.getItem('userRole') || '';
const userKhoa = localStorage.getItem('MaPhongBan') || '';

function toDateInputValue(value) {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(0, 10);
}

function toDateDisplay(value) {
    const input = toDateInputValue(value);
    if (!input) return '';
    const [year, month, day] = input.split('-');
    return `${day}/${month}/${year}`;
}

function toFixedInput(value, decimals) {
    const num = parseFloat(value);
    if (Number.isNaN(num)) return '';
    return num.toFixed(decimals);
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('[DanhSachLopNgoaiQC] Init - chính thức (cột mới)');

    // Load dropdowns và tự động tải dữ liệu
    await Promise.all([
        loadNamHocOptions(),
        loadKhoaOptions(),
        loadHeDaoTaoOptions()
    ]);

    loadData();

    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    document.getElementById('saveEditBtn').addEventListener('click', handleEditSubmit);
    document.getElementById('updateApprovalBtn').addEventListener('click', submitApprovals);

    document.getElementById('filterGiangVien').addEventListener('input', filterTable);
    document.getElementById('filterHocPhan').addEventListener('input', filterTable);

    setupUpdateButtonVisibility();
    setupColumnVisibility();
});

function setupColumnVisibility() {
    const role = localStorage.getItem('userRole');
    const MaPhongBan = localStorage.getItem('MaPhongBan');

    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
    const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DAOTAO';
    const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';

    const checkAllKhoa = document.getElementById('checkAllKhoa');
    const checkAllDaoTao = document.getElementById('checkAllDaoTao');

    // Mặc định disable tất cả
    if (checkAllKhoa) checkAllKhoa.disabled = true;
    if (checkAllDaoTao) checkAllDaoTao.disabled = true;

    // Khoa: GV_CNBM duyệt (check), Lãnh đạo khoa bỏ duyệt (uncheck)
    if (role === gvCnbm || role === lanhDaoKhoa) {
        if (checkAllKhoa) checkAllKhoa.disabled = false;
    }

    // Phòng ĐT/VP: Trợ lý duyệt (check), Lãnh đạo phòng bỏ duyệt (uncheck)
    if ((MaPhongBan === daoTao || MaPhongBan === vanPhong) && (role === troLyPhong || role === lanhDaoPhong)) {
        if (checkAllDaoTao) checkAllDaoTao.disabled = false;
    }
}

function setupUpdateButtonVisibility() {
    const MaPhongBan = localStorage.getItem('MaPhongBan');
    const role = localStorage.getItem('userRole');
    const updateBtn = document.getElementById('updateApprovalBtn');

    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
    const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DAOTAO';
    const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

    // Khoa: GV_CNBM duyệt, Lãnh đạo khoa bỏ duyệt
    if (role === gvCnbm || role === lanhDaoKhoa) {
        updateBtn.style.display = 'flex';
    }
    // Phòng (ĐT/VP): Trợ lý duyệt, Lãnh đạo phòng bỏ duyệt
    else if ((MaPhongBan === daoTao || MaPhongBan === vanPhong) && (role === troLyPhong || role === lanhDaoPhong)) {
        updateBtn.style.display = 'flex';
    }
    // Ban Giám đốc: toàn quyền
    else if (MaPhongBan === banGiamDoc) {
        updateBtn.style.display = 'flex';
    }
}

// ==================== PERMISSION HELPERS ====================

function canEditDelete(data) {
    const role = localStorage.getItem('userRole');
    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';

    // Chỉ GV_CNBM và Lãnh đạo khoa có quyền sửa/xóa
    if (role !== gvCnbm && role !== lanhDaoKhoa) return false;

    // Chỉ sửa/xóa khi chưa duyệt
    return data.KhoaDuyet === 0 && data.DaoTaoDuyet === 0;
}

/**
 * Kiểm tra quyền duyệt cho từng cột
 * @param {'khoa'|'daoTao'} type - Loại duyệt
 * @param {'check'|'uncheck'} action - Hành động (check = duyệt, uncheck = bỏ duyệt)
 */
function canApprove(type, action) {
    const MaPhongBan = localStorage.getItem('MaPhongBan');
    const role = localStorage.getItem('userRole');

    const gvCnbm = window.APP_ROLES?.gv_cnbm || 'GV_CNBM';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'Lãnh đạo khoa';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'Trợ lý';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'Lãnh đạo phòng';
    const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DAOTAO';
    const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGĐ';

    // Ban Giám đốc có toàn quyền
    if (MaPhongBan === banGiamDoc) return true;

    if (type === 'khoa') {
        // GV_CNBM: chỉ được duyệt (check)
        if (role === gvCnbm && action === 'check') return true;
        // Lãnh đạo khoa: chỉ được bỏ duyệt (uncheck)
        if (role === lanhDaoKhoa && action === 'uncheck') return true;
        return false;
    }

    if (type === 'daoTao') {
        if (MaPhongBan !== daoTao && MaPhongBan !== vanPhong) return false;
        // Trợ lý: chỉ được duyệt (check)
        if (role === troLyPhong && action === 'check') return true;
        // Lãnh đạo phòng: chỉ được bỏ duyệt (uncheck)
        if (role === lanhDaoPhong && action === 'uncheck') return true;
        return false;
    }

    return false;
}

/**
 * Kiểm tra xem user có quyền tương tác với checkbox không (bất kể check/uncheck)
 */
function canInteract(type) {
    return canApprove(type, 'check') || canApprove(type, 'uncheck');
}

// ==================== DATA LOADING ====================

async function loadNamHocOptions() {
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();

        const selects = [document.getElementById('namHocFilter'), document.getElementById('editNamHoc')];
        selects.forEach(select => {
            if (!select) return;
            select.innerHTML = '';
            data.forEach((item, index) => {
                const option = document.createElement('option');
                option.value = item.NamHoc;
                option.textContent = item.NamHoc;
                if (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1))) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        });
    } catch (error) {
        console.error('Error loading nam hoc:', error);
    }
}

async function loadKhoaOptions() {
    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();

        const khoaFilter = document.getElementById('khoaFilter');
        const editKhoa = document.getElementById('editKhoa');

        if (editKhoa) {
            editKhoa.innerHTML = '<option value="">-- Chọn Khoa --</option>';
        }

        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
            khoaFilter.appendChild(option.cloneNode(true));
            if (editKhoa) editKhoa.appendChild(option);
        });

        // Enforce khoa filter: nếu user thuộc khoa, lock dropdown
        if (typeof KhoaFilterUtils !== 'undefined') {
            KhoaFilterUtils.applyKhoaFilter(khoaFilter);
            KhoaFilterUtils.applyKhoaFilter(editKhoa);
        }
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

async function loadHeDaoTaoOptions() {
    try {
        const response = await fetch('/api/gvm/v1/he-dao-tao');
        const result = await response.json();

        if (Array.isArray(result)) {
            heDaoTaoList = result;
        } else if (result.success && Array.isArray(result.data)) {
            heDaoTaoList = result.data;
        } else {
            heDaoTaoList = [];
        }

        const editHeDaoTaoId = document.getElementById('editHeDaoTaoId');
        if (editHeDaoTaoId) {
            editHeDaoTaoId.innerHTML = '<option value="">-- Chọn hệ đào tạo --</option>';
            heDaoTaoList.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.he_dao_tao || item.ten || '';
                editHeDaoTaoId.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading he dao tao:', error);
    }
}

// Gọi API chính thức (lopngoaiquychuan)
async function loadData() {
    const namHoc = document.getElementById('namHocFilter').value;
    const khoa = document.getElementById('khoaFilter').value;

    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    try {
        // API chính thức mới
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/chinh-thuc/${namHoc}/${khoa}`);
        const data = await response.json();

        globalData = data;
        renderTable(globalData);
        calculateTotals();

        if (data.length === 0) {
            Swal.fire('Thông báo', 'Không có dữ liệu', 'info');
        }
    } catch (error) {
        console.error('Error loading data:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu', 'error');
    }
}

// ==================== TABLE RENDERING ====================
// Dùng tên cột mới: LopHocPhan, SoTinChi, TenLop, LL, KiHoc, Dot...

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    const MaPhongBan = localStorage.getItem('MaPhongBan');
    const role = localStorage.getItem('userRole');

    const daoTao = window.APP_DEPARTMENTS?.daoTao || 'DT';
    const vanPhong = window.APP_DEPARTMENTS?.vanPhong || 'VP';
    const banGiamDoc = window.APP_DEPARTMENTS?.banGiamDoc || 'BGD';
    const troLyPhong = window.APP_ROLES?.troLy_phong || 'troLy_phong';
    const lanhDaoPhong = window.APP_ROLES?.lanhDao_phong || 'lanhDao_phong';
    const lanhDaoKhoa = window.APP_ROLES?.lanhDao_khoa || 'lanhDao_khoa';

    let STT = 1;

    data.forEach((row, index) => {
        const tableRow = document.createElement('tr');
        tableRow.setAttribute('data-id', row.ID);
        tableRow.setAttribute('data-index', index);
        tableRow.setAttribute('data-giangvien', row.GiangVien || '');
        tableRow.setAttribute('data-ll', row.LL || 0);
        tableRow.setAttribute('data-qc', row.QuyChuan || 0);

        // STT
        const sttTd = document.createElement('td');
        sttTd.textContent = STT++;
        tableRow.appendChild(sttTd);

        // Giảng viên
        const gvTd = document.createElement('td');
        gvTd.textContent = row.GiangVien || '';
        tableRow.appendChild(gvTd);

        // Khoa
        const khoaTd = document.createElement('td');
        khoaTd.textContent = row.Khoa || '';
        tableRow.appendChild(khoaTd);

        // Kì (KiHoc - tên mới)
        const kiTd = document.createElement('td');
        kiTd.textContent = row.KiHoc || '';
        tableRow.appendChild(kiTd);

        // Đợt (Dot - cột mới)
        const dotTd = document.createElement('td');
        dotTd.textContent = row.Dot || '';
        tableRow.appendChild(dotTd);

        // Lớp học phần (LopHocPhan - tên mới, trước là TenHocPhan)
        const tenHPTd = document.createElement('td');
        tenHPTd.textContent = row.LopHocPhan || '';
        tableRow.appendChild(tenHPTd);

        // Mã HP
        const maHPTd = document.createElement('td');
        maHPTd.textContent = row.MaHocPhan || '';
        tableRow.appendChild(maHPTd);

        // Số TC (SoTinChi - tên mới)
        const soTCTd = document.createElement('td');
        soTCTd.textContent = row.SoTinChi || '';
        tableRow.appendChild(soTCTd);

        // Hệ đào tạo (he_dao_tao - display only, edit via modal)
        const heDTTd = document.createElement('td');
        
        const currentHeDT = String(
            row.he_dao_tao_id ?? row.HeDaoTaoId ?? row.he_dao_tao ?? row.HeDaoTao ?? ''
        ).trim();

        // Find display text from heDaoTaoList
        let displayText = '';
        if (currentHeDT) {
            const foundItem = heDaoTaoList.find(item => 
                String(item.id) === currentHeDT || String(item.he_dao_tao) === currentHeDT
            );
            displayText = foundItem ? (foundItem.he_dao_tao || foundItem.ten || currentHeDT) : currentHeDT;
        }

        heDTTd.textContent = displayText;
        tableRow.appendChild(heDTTd);

        // Số tiết LL (LL - tên mới, trước là LenLop)
        const llTd = document.createElement('td');
        llTd.textContent = row.LL || '';
        tableRow.appendChild(llTd);

        // Số SV
        const svTd = document.createElement('td');
        svTd.textContent = row.SoSV || '';
        tableRow.appendChild(svTd);

        // Quy chuẩn
        const qcTd = document.createElement('td');
        const qcVal = parseFloat(row.QuyChuan);
        qcTd.textContent = isNaN(qcVal) ? '' : qcVal.toFixed(2);
        tableRow.appendChild(qcTd);

        // Ngày bắt đầu
        const startDateTd = document.createElement('td');
        startDateTd.textContent = toDateDisplay(row.NgayBatDau);
        tableRow.appendChild(startDateTd);

        // Ngày kết thúc
        const endDateTd = document.createElement('td');
        endDateTd.textContent = toDateDisplay(row.NgayKetThuc);
        tableRow.appendChild(endDateTd);

        // Ghi chú
        const ghiChuTd = document.createElement('td');
        ghiChuTd.textContent = row.GhiChu || '';
        tableRow.appendChild(ghiChuTd);

        // Checkbox Khoa
        const khoaCheckTd = document.createElement('td');
        const khoaCheckbox = document.createElement('input');
        khoaCheckbox.type = 'checkbox';
        khoaCheckbox.name = 'khoa';
        khoaCheckbox.checked = row.KhoaDuyet === 1;
        khoaCheckbox.onchange = () => {
            updateCheckAll('khoa');
            updateDaoTaoCheckboxes();
        };

        // Phân quyền checkbox Khoa
        if (row.DaoTaoDuyet === 1) {
            // Đã duyệt ĐT → khóa Khoa
            khoaCheckbox.checked = true;
            khoaCheckbox.disabled = true;
        } else if (row.KhoaDuyet === 1) {
            // Đã duyệt Khoa → chỉ Lãnh đạo khoa mới bỏ duyệt được
            khoaCheckbox.disabled = !canApprove('khoa', 'uncheck');
        } else {
            // Chưa duyệt Khoa → chỉ GV_CNBM mới duyệt được
            khoaCheckbox.disabled = !canApprove('khoa', 'check');
        }
        khoaCheckTd.appendChild(khoaCheckbox);
        tableRow.appendChild(khoaCheckTd);

        // Checkbox Đào tạo
        const dtCheckTd = document.createElement('td');
        const dtCheckbox = document.createElement('input');
        dtCheckbox.type = 'checkbox';
        dtCheckbox.name = 'daoTao';
        dtCheckbox.checked = row.DaoTaoDuyet === 1;
        dtCheckbox.onchange = () => updateCheckAll('daoTao');

        // Phân quyền checkbox Đào tạo
        if (row.DaoTaoDuyet === 1) {
            // Đã duyệt → chỉ Lãnh đạo phòng mới bỏ duyệt được
            dtCheckbox.disabled = !canApprove('daoTao', 'uncheck');
        } else if (row.KhoaDuyet !== 1) {
            // Khoa chưa duyệt → không cho duyệt ĐT
            dtCheckbox.disabled = true;
        } else {
            // Khoa đã duyệt, ĐT chưa duyệt → chỉ Trợ lý mới duyệt được
            dtCheckbox.disabled = !canApprove('daoTao', 'check');
        }
        dtCheckTd.appendChild(dtCheckbox);
        tableRow.appendChild(dtCheckTd);

        // Thao tác
        const actionTd = document.createElement('td');
        if (canEditDelete(row)) {
            actionTd.innerHTML = `
                <button class="btn btn-sm btn-outline-primary btn-action me-1" onclick="editRecord(${row.ID})" title="Sửa">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger btn-action" onclick="deleteRecord(${row.ID})" title="Xóa">
                    <i class="fas fa-trash"></i>
                </button>
            `;
        }
        tableRow.appendChild(actionTd);

        tableBody.appendChild(tableRow);
    });

    updateCheckAll('khoa');
    updateCheckAll('daoTao');
}

// ==================== FILTER ====================

function filterTable() {
    const gvFilter = document.getElementById('filterGiangVien').value.toLowerCase();
    const hpFilter = document.getElementById('filterHocPhan').value.toLowerCase();

    const tableRows = document.querySelectorAll('#tableBody tr');

    tableRows.forEach(row => {
        const gvCell = row.querySelector('td:nth-child(2)');
        const hpCell = row.querySelector('td:nth-child(6)');

        const gvValue = gvCell ? gvCell.textContent.toLowerCase() : '';
        const hpValue = hpCell ? hpCell.textContent.toLowerCase() : '';

        row.style.display = (gvValue.includes(gvFilter) && hpValue.includes(hpFilter)) ? '' : 'none';
    });

    calculateTotals();
}

// ==================== TOTALS ====================

function calculateTotals() {
    let totalLL = 0;
    let totalQC = 0;
    const uniqueGVs = new Set();

    const rows = document.querySelectorAll('#tableBody tr');
    rows.forEach(row => {
        if (row.style.display === 'none') return;
        
        const gv = row.getAttribute('data-giangvien');
        if (gv) uniqueGVs.add(gv);
        
        const llVal = parseFloat(row.getAttribute('data-ll')) || 0;
        const qcVal = parseFloat(row.getAttribute('data-qc')) || 0;
        
        totalLL += llVal;
        totalQC += qcVal;
    });

    // Cập nhật footer cũ (nếu còn)
    const oldTotalLL = document.getElementById('totalLL');
    const oldTotalQC = document.getElementById('totalQC');
    if (oldTotalLL) oldTotalLL.textContent = totalLL.toFixed(2);
    if (oldTotalQC) oldTotalQC.textContent = totalQC.toFixed(2);
    
    // Cập nhật popup mới
    const popTeachers = document.getElementById('totalTeachers');
    const popTotalLL = document.getElementById('popupTotalLL');
    const popTotalQC = document.getElementById('popupTotalQC');
    
    if (popTeachers) popTeachers.textContent = uniqueGVs.size;
    if (popTotalLL) popTotalLL.textContent = totalLL.toFixed(2);
    if (popTotalQC) popTotalQC.textContent = totalQC.toFixed(2);
}

// ==================== CHECK ALL ====================

function checkAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    const checkAllIdMap = { 'khoa': 'checkAllKhoa', 'daoTao': 'checkAllDaoTao' };
    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;

    const isChecking = checkAllCheckbox.checked;
    const action = isChecking ? 'check' : 'uncheck';

    checkboxes.forEach(cb => {
        if (cb.disabled) return;
        if (!canApprove(type, action)) return;
        cb.checked = isChecking;
    });

    if (type === 'khoa') {
        updateDaoTaoCheckboxes();
    }
}

/**
 * Update Đào tạo checkboxes based on Khoa status
 */
function updateDaoTaoCheckboxes() {
    const rows = document.querySelectorAll('#tableBody tr');
    
    rows.forEach(row => {
        const khoaCheckbox = row.querySelector('input[name="khoa"]');
        const dtCheckbox = row.querySelector('input[name="daoTao"]');
        const dataIndex = parseInt(row.getAttribute('data-index'));
        const data = Number.isNaN(dataIndex) ? null : globalData[dataIndex];
        
        if (khoaCheckbox && dtCheckbox) {
            if (data && data.DaoTaoDuyet === 1) {
                khoaCheckbox.checked = true;
                khoaCheckbox.disabled = true;
                dtCheckbox.checked = true;
                dtCheckbox.disabled = !canApprove('daoTao', 'uncheck');
                return;
            }
            
            if (!khoaCheckbox.checked) {
                dtCheckbox.disabled = true;
                dtCheckbox.checked = false;
            } else {
                dtCheckbox.disabled = !canApprove('daoTao', 'check');
            }
        }
    });

    updateCheckAll('daoTao');
}

function updateCheckAll(type) {
    const checkboxes = document.querySelectorAll(`input[type="checkbox"][name="${type}"]`);
    const checkAllIdMap = { 'khoa': 'checkAllKhoa', 'daoTao': 'checkAllDaoTao' };
    const checkAllCheckbox = document.getElementById(checkAllIdMap[type]);
    if (!checkAllCheckbox) return;
    const enabled = Array.from(checkboxes).filter(cb => !cb.disabled);
    checkAllCheckbox.checked = enabled.length > 0 && enabled.every(cb => cb.checked);
}

// ==================== CRUD (trên lopngoaiquychuan chính thức) ====================

function editRecord(id) {
    const record = globalData.find(r => r.ID === id);
    if (!record) return;

    if (!canEditDelete(record)) {
        Swal.fire('Không thể sửa', 'Bản ghi đã được duyệt', 'warning');
        return;
    }

    // Fill modal với tên cột mới
    document.getElementById('editID').value = record.ID;
    currentEditId = record.ID;
    document.getElementById('editNamHoc').value = record.NamHoc;
    document.getElementById('editHocKy').value = record.KiHoc || '';
    document.getElementById('editKhoa').value = record.Khoa || '';
    document.getElementById('editDot').value = record.Dot || 1;
    document.getElementById('editTenHP').value = record.LopHocPhan || '';
    document.getElementById('editMaHP').value = record.MaHocPhan || '';
    document.getElementById('editMaBoMon').value = record.MaBoMon || '';
    document.getElementById('editSoTC').value = record.SoTinChi || 0;
    document.getElementById('editGiangVien').value = record.GiangVien || '';
    document.getElementById('editGiaoVienGiangDay').value = record.GiaoVienGiangDay || '';
    document.getElementById('editLop').value = record.TenLop || '';
    document.getElementById('editSoSV').value = record.SoSV || 0;
    document.getElementById('editMoiGiang').checked = record.MoiGiang === 1;
    document.getElementById('editSoTietLL').value = record.LL || 0;
    document.getElementById('editSoTietCTDT').value = record.SoTietCTDT || 0;
    document.getElementById('editHeSoT7CN').value = toFixedInput(record.HeSoT7CN ?? 1, 2);
    document.getElementById('editHeSoLopDong').value = toFixedInput(record.HeSoLopDong ?? 1, 2);
    document.getElementById('editQuyChuan').value = record.QuyChuan || 0;
    const editHeDaoTaoId = document.getElementById('editHeDaoTaoId');
    if (editHeDaoTaoId) {
        editHeDaoTaoId.value = record.he_dao_tao || record.he_dao_tao_id || record.HeDaoTaoId || '';
    }
    document.getElementById('editNgayBatDau').value = toDateInputValue(record.NgayBatDau);
    document.getElementById('editNgayKetThuc').value = toDateInputValue(record.NgayKetThuc);
    document.getElementById('editGhiChu').value = record.GhiChu || '';

    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Edit submit - gửi với tên cột mới tương thích lopngoaiquychuan
async function handleEditSubmit() {
    const id = document.getElementById('editID').value;

    const formData = {
        NamHoc: document.getElementById('editNamHoc').value,
        KiHoc: document.getElementById('editHocKy').value,
        Khoa: document.getElementById('editKhoa').value,
        Dot: document.getElementById('editDot').value,
        LopHocPhan: document.getElementById('editTenHP').value,
        MaHocPhan: document.getElementById('editMaHP').value,
        MaBoMon: document.getElementById('editMaBoMon').value,
        SoTinChi: document.getElementById('editSoTC').value,
        GiangVien: document.getElementById('editGiangVien').value,
        GiaoVienGiangDay: document.getElementById('editGiaoVienGiangDay').value,
        TenLop: document.getElementById('editLop').value,
        SoSV: document.getElementById('editSoSV').value,
        MoiGiang: document.getElementById('editMoiGiang').checked ? 1 : 0,
        LL: document.getElementById('editSoTietLL').value,
        SoTietCTDT: document.getElementById('editSoTietCTDT').value,
        HeSoT7CN: document.getElementById('editHeSoT7CN').value,
        HeSoLopDong: document.getElementById('editHeSoLopDong').value,
        QuyChuan: document.getElementById('editQuyChuan').value,
        he_dao_tao_id: document.getElementById('editHeDaoTaoId').value,
        NgayBatDau: document.getElementById('editNgayBatDau').value,
        NgayKetThuc: document.getElementById('editNgayKetThuc').value,
        GhiChu: document.getElementById('editGhiChu').value
    };

    console.log('[LNQC][edit] submit payload:', { id, formData });

    try {
        // API edit chính thức - cần API riêng cho bảng lopngoaiquychuan
        // Tạm thời dùng endpoint cũ tương thích
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/edit-chinh-thuc/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();
        console.log('[LNQC][edit] response:', { status: response.status, result });

        if (result.success) {
            Swal.fire('Thành công', result.message, 'success');
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
            loadData();
        } else {
            Swal.fire('Lỗi', result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi cập nhật', 'error');
    }
}

async function deleteRecord(id) {
    const record = globalData.find(r => r.ID === id);

    if (record && !canEditDelete(record)) {
        Swal.fire('Không thể xóa', 'Bản ghi đã được duyệt', 'warning');
        return;
    }

    const result = await Swal.fire({
        title: 'Xác nhận xóa?',
        text: 'Bạn có chắc muốn xóa bản ghi này?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Xóa',
        cancelButtonText: 'Hủy'
    });

    if (!result.isConfirmed) return;

    try {
        const namHoc = document.getElementById('namHocFilter').value;
        const response = await fetch(`/v2/vuotgio/lop-ngoai-quy-chuan/chinh-thuc/${id}?NamHoc=${encodeURIComponent(namHoc)}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            Swal.fire('Đã xóa', data.message, 'success');
            loadData();
        } else {
            Swal.fire('Lỗi', data.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting:', error);
        Swal.fire('Lỗi', 'Có lỗi xảy ra khi xóa', 'error');
    }
}

// ==================== BATCH APPROVAL ====================

async function submitApprovals() {
    const rows = document.querySelectorAll('#tableBody tr');

    rows.forEach(row => {
        if (row.style.display === 'none') return;
        const dataIndex = parseInt(row.getAttribute('data-index'));

        const khoaCheckbox = row.querySelector('input[name="khoa"]');
        const dtCheckbox = row.querySelector('input[name="daoTao"]');

        if (globalData[dataIndex]) {
            const currentDaoTao = dtCheckbox?.checked ? 1 : 0;
            const lockedByDaoTao = globalData[dataIndex].DaoTaoDuyet === 1 || currentDaoTao === 1;

            if (lockedByDaoTao && khoaCheckbox) {
                khoaCheckbox.checked = true;
            }

            globalData[dataIndex].KhoaDuyet = khoaCheckbox?.checked ? 1 : 0;
            globalData[dataIndex].DaoTaoDuyet = currentDaoTao;
        }
    });

    try {
        const response = await fetch('/v2/vuotgio/lop-ngoai-quy-chuan/batch-approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(globalData)
        });

        const result = await response.json();

        if (result.success) {
            Swal.fire('Thành công', 'Cập nhật thành công', 'success');
            loadData();
        } else {
            Swal.fire('Lỗi', 'Cập nhật thất bại', 'error');
        }
    } catch (error) {
        console.error('Error submitting approvals:', error);
        Swal.fire('Lỗi', 'Cập nhật thất bại', 'error');
    }
}

// ==================== TOGGLE SUMMARY ====================
document.addEventListener('DOMContentLoaded', function() {
    const btnToggle = document.getElementById('btnToggleSummary');
    if (btnToggle) {
        btnToggle.addEventListener('click', function() {
            const summaryBox = document.getElementById('summaryBox');
            summaryBox.classList.toggle('collapsed');
            const icon = this.querySelector('i');
            if (summaryBox.classList.contains('collapsed')) {
                icon.className = 'bi bi-chevron-up';
            } else {
                icon.className = 'bi bi-chevron-down';
            }
        });
    }
});
````

## File: src/public/js/vuotgio_v2/tongHop/giangVien.js
````javascript
/**
 * Tổng hợp theo Giảng viên - Frontend JS
 * VuotGio V2 - Refactored to HTML Table (No AG-Grid)
 */

let globalData = []; // Biến toàn cục để lưu dữ liệu từ server
let previewPdfObjectUrl = null;

const REQUIRED_FIELDS = [
    "id_User",
    "giangVien",
    "maKhoa",
    "dinhMucChuan",
    "dinhMucSauMienGiam",
    "thieuNCKH",
    "thanhToan",
    "tableF"
];

const logMissingFields = (rows, context) => {
    const missingMap = new Map();
    const maxSamples = 20;
    let sampleCount = 0;

    rows.forEach((row, index) => {
        const missing = REQUIRED_FIELDS.filter((key) => {
            const value = row?.[key];
            if (value === null || value === undefined) return true;
            if (key === "tableF" && !value?.rows) return true;
            if (typeof value === "number" && Number.isNaN(value)) return true;
            return false;
        });

        if (missing.length) {
            missing.forEach((key) => {
                missingMap.set(key, (missingMap.get(key) || 0) + 1);
            });

            if (sampleCount < maxSamples) {
                console.warn("[tongHopGV] Missing fields", {
                    context,
                    index,
                    id_User: row?.id_User,
                    giangVien: row?.giangVien,
                    missing
                });
                sampleCount += 1;
            }
        }
    });

    if (missingMap.size) {
        const summary = Array.from(missingMap.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => ({ key, count }));
        console.warn("[tongHopGV] Missing fields summary", { context, summary });
    } else {
        console.info("[tongHopGV] Missing fields summary", { context, summary: [] });
    }
};

const logFirstRowDetails = (rows, context) => {
    if (!Array.isArray(rows) || rows.length === 0) {
        console.info("[tongHopGV] First row details", { context, message: "no rows" });
        return;
    }

    const firstRow = rows[0];
    console.info("[tongHopGV] First row raw data", { context, row: firstRow });
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async function () {
    console.log('[tongHopGV] DOMContentLoaded - HTML Table Version');

    // Load dropdowns và tự động nạp dữ liệu
    await Promise.all([
        loadNamHocOptions(),
        loadKhoaOptions()
    ]);

    loadData();

    // Event listeners
    document.getElementById('loadDataBtn').addEventListener('click', loadData);
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportExcel);
    document.getElementById('filterGiangVien').addEventListener('input', filterTable);

    // Chuyển sang thống kê Khoa
    const btnSwitchToKhoa = document.getElementById('btnSwitchToKhoa');
    if (btnSwitchToKhoa) {
        btnSwitchToKhoa.addEventListener('click', () => {
            const namHoc = document.getElementById('namHocXem').value;
            window.location.href = `/v2/vuotgio/tong-hop-khoa?namHoc=${encodeURIComponent(namHoc)}`;
        });
    }

    // Toggle Summary
    const btnToggleSummary = document.getElementById('btnToggleSummary');
    if (btnToggleSummary) {
        btnToggleSummary.addEventListener('click', () => {
            document.getElementById('summaryBox').classList.toggle('collapsed');
            const icon = btnToggleSummary.querySelector('i');
            if (icon.classList.contains('bi-chevron-down')) {
                icon.classList.replace('bi-chevron-down', 'bi-chevron-up');
            } else {
                icon.classList.replace('bi-chevron-up', 'bi-chevron-down');
            }
        });
    }
});

// ==================== DATA LOADING ====================

// Load năm học từ API có sẵn
async function loadNamHocOptions() {
    console.log('[tongHopGV] loadNamHocOptions called');
    const urlNamHoc = new URLSearchParams(window.location.search).get('namHoc');
    
    try {
        const response = await fetch('/api/namhoc');
        const data = await response.json();
        console.log('[tongHopGV] NamHoc data:', data);

        const select = document.getElementById('namHocXem');
        select.innerHTML = '';
        data.forEach((item, index) => {
            const option = document.createElement('option');
            option.value = item.NamHoc;
            option.textContent = item.NamHoc;
            
            // Ưu tiên chọn năm học từ URL
            if (urlNamHoc && item.NamHoc === urlNamHoc) {
                option.selected = true;
            } else if (!urlNamHoc && (item.trangthai === 1 || (index === 0 && !data.some(i => i.trangthai === 1)))) {
                option.selected = true;
            }
            select.appendChild(option);
        });

        // Sau khi load xong năm học, load dữ liệu
        loadData();
    } catch (error) {
        console.error('Error loading nam hoc:', error);
        const currentYear = new Date().getFullYear();
        const select = document.getElementById('namHocXem');
        select.innerHTML = `<option value="${currentYear}-${currentYear + 1}">${currentYear}-${currentYear + 1}</option>`;
    }
}

// Load khoa từ API có sẵn
async function loadKhoaOptions() {
    console.log('[tongHopGV] loadKhoaOptions called');
    const urlKhoa = new URLSearchParams(window.location.search).get('khoa');

    try {
        const response = await fetch('/api/khoa');
        const data = await response.json();
        console.log('[tongHopGV] Khoa data:', data);

        const select = document.getElementById('khoaXem');
        data.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.MaPhongBan;
            option.textContent = dept.TenPhongBan || dept.MaPhongBan;
            
            // Ưu tiên chọn khoa từ URL
            if (urlKhoa && dept.MaPhongBan === urlKhoa) {
                option.selected = true;
            }
            
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading khoa:', error);
    }
}

// ==================== FORMAT HELPERS ====================

// Format number
function formatNumber(val) {
    if (val === null || val === undefined) return '0';
    return Number(val).toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ==================== SKELETON LOADING ====================

function showSkeletonRows() {
    const body = document.getElementById('tableBody');
    if (!body) return;
    body.innerHTML = Array.from({ length: 5 })
        .map(() => `<tr class="skeleton-row"><td colspan="37">&nbsp;</td></tr>`)
        .join('');
}

function clearSkeletonRows() {
    const body = document.getElementById('tableBody');
    if (body) {
        body.innerHTML =
            '<tr><td colspan="37" class="text-center text-muted py-4">Không có dữ liệu</td></tr>';
    }
}

// ==================== LOAD DATA ====================

// Load data
async function loadData() {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;

    if (!namHoc) {
        Swal.fire('Lỗi', 'Vui lòng chọn năm học', 'warning');
        return;
    }

    showSkeletonRows();

    try {
        Swal.showLoading();

        const url = `/v2/vuotgio/tong-hop/giang-vien?namHoc=${namHoc}&khoa=${khoa}&detail=1`;

        console.info('[tongHopGV] loadData request', { namHoc, khoa, url });
        const response = await fetch(url);
        const result = await response.json();
        Swal.close();

        console.info('[tongHopGV] loadData response', {
            status: response.status,
            ok: response.ok,
            success: result?.success,
            message: result?.message,
            dataType: Array.isArray(result?.data) ? 'array' : typeof result?.data,
            dataCount: Array.isArray(result?.data) ? result.data.length : null
        });

        if (!result.success) {
            Swal.fire('Lỗi', result.message || 'Không thể tải dữ liệu', 'error');
            clearSkeletonRows();
            return;
        }

        let data = result.data || [];

        globalData = data;
        console.info('[tongHopGV] loadData final', {
            count: data.length,
            sample: data.slice(0, 3)
        });

        logMissingFields(data, { namHoc, khoa });
        logFirstRowDetails(data, { namHoc, khoa });
        renderTable(globalData);
        updateSummary(globalData);


        if (data.length === 0) {
            Swal.fire('Thông báo', 'Không có dữ liệu', 'info');
        }
    } catch (error) {
        Swal.close();
        console.error('Error loading data:', error);
        Swal.fire('Lỗi', 'Không thể tải dữ liệu', 'error');
        clearSkeletonRows();
    }
}


// ==================== TABLE RENDERING ====================

function renderTable(data) {
    const tableBody = document.getElementById('tableBody');
    const tableFoot = document.getElementById('tableFoot');
    tableBody.innerHTML = '';
    tableFoot.innerHTML = '';

    let STT = 1;

    // Initialize totals for all columns
    let totals = {
        dinhMucChuan: 0, mienGiam: 0, thieuNCKH: 0, dinhMucSauGiamTru: 0,
        hk1_vn: 0, hk1_lao: 0, hk1_cuba: 0, hk1_cpc: 0, hk1_dongHP: 0,
        hk2_vn: 0, hk2_lao: 0, hk2_cuba: 0, hk2_cpc: 0, hk2_dongHP: 0,
        year_vn: 0, year_lao: 0, year_cuba: 0, year_cpc: 0, year_dongHP: 0,
        vuot_vn: 0, vuot_lao: 0, vuot_cuba: 0, vuot_cpc: 0, vuot_dongHP: 0, vuot_tong: 0,
        mucTT: 0,
        tien_vn: 0, tien_lao: 0, tien_cuba: 0, tien_cpc: 0, tien_dongHP: 0, tien_tong: 0,
        thucNhan: 0,
        luong: 0
    };

    let lastKhoa = null;

    data.forEach((row, index) => {
        if (index < 5) console.log(`[renderTable] Row ${index}:`, row);
        // Thêm dòng tiêu đề nhóm nếu khoa thay đổi
        if (row.khoa !== lastKhoa) {
            const groupRow = document.createElement('tr');
            groupRow.className = 'group-header table-light fw-bold';
            groupRow.setAttribute('data-khoa-code', row.maKhoa || row.khoa || '');
            groupRow.innerHTML = `
                <td colspan="37" class="text-start px-3 py-2">
                    <i class="fas fa-university me-2"></i> ${row.khoa || 'Khác'}
                </td>
            `;
            tableBody.appendChild(groupRow);
            lastKhoa = row.khoa;
        }

        const tableRow = document.createElement('tr');
        tableRow.setAttribute('data-index', index);
        tableRow.setAttribute('data-khoa', row.khoa || ''); // Phục vụ filter

        if (row.thieuTietGiangDay > 0) {
            tableRow.classList.add('row-warning-danger');
        }

        // Ưu tiên dùng breakdown đã tính sẵn từ Backend (single source of truth).
        // Fallback: tự tính nếu là snapshot cũ chưa có breakdown.
        const bd = row.breakdown || emptyBreakdown();

        const mucTT  = bd.mucTT || 0;
        const thucNhan = bd.thucNhan || 0;

        tableRow.innerHTML = `
            <td>${STT++}</td>
            <td style="text-align: left; padding-left: 8px;">${row.giangVien || ''}</td>
            <td>${formatNumber(row.luong)}</td>
            <td>${formatNumber(row.dinhMucChuan)}</td>
            <td>${formatNumber(row.mienGiam)}</td>
            <td class="${row.thieuNCKH > 0 ? 'text-danger-bold' : ''}">${formatNumber(row.thieuNCKH)}</td>
            <td>${formatNumber(row.dinhMucSauMienGiam)}</td>

            <!-- HK1 -->
            <td>${formatNumber(bd.hk1.vn)}</td>
            <td>${formatNumber(bd.hk1.lao)}</td>
            <td>${formatNumber(bd.hk1.cuba)}</td>
            <td>${formatNumber(bd.hk1.cpc)}</td>
            <td>${formatNumber(bd.hk1.dongHP)}</td>

            <!-- HK2 -->
            <td>${formatNumber(bd.hk2.vn)}</td>
            <td>${formatNumber(bd.hk2.lao)}</td>
            <td>${formatNumber(bd.hk2.cuba)}</td>
            <td>${formatNumber(bd.hk2.cpc)}</td>
            <td>${formatNumber(bd.hk2.dongHP)}</td>

            <!-- Cả năm -->
            <td>${formatNumber(bd.year.vn)}</td>
            <td>${formatNumber(bd.year.lao)}</td>
            <td>${formatNumber(bd.year.cuba)}</td>
            <td>${formatNumber(bd.year.cpc)}</td>
            <td>${formatNumber(bd.year.dongHP)}</td>

            <!-- Vượt giờ -->
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.vn)}</td>
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.lao)}</td>
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.cuba)}</td>
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.cpc)}</td>
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.dongHP)}</td>
            <td style="color: green; font-weight: bold;">${formatNumber(bd.vuot.total)}</td>

            <!-- Mức TT -->
            <td>${formatNumber(mucTT)}</td>

            <!-- Thành tiền -->
            <td>${formatNumber(bd.money.vn)}</td>
            <td>${formatNumber(bd.money.lao)}</td>
            <td>${formatNumber(bd.money.cuba)}</td>
            <td>${formatNumber(bd.money.cpc)}</td>
            <td>${formatNumber(bd.money.dongHP)}</td>
            <td style="font-weight: bold;">${formatNumber(bd.money.total)}</td>

            <!-- Thực nhận -->
            <td style="font-weight: bold; color: #1a5276;">${formatNumber(thucNhan)}</td>

            <!-- Actions -->
            <td>
                <button class="btn btn-sm btn-success" onclick="previewExcel('${row.id_User}', '${row.giangVien}')" title="Xem preview Excel">
                    <i class="fas fa-file-excel"></i>
                </button>
            </td>
        `;

        tableBody.appendChild(tableRow);

        // Accumulate totals
        totals.luong            += row.luong || 0;
        totals.dinhMucChuan     += row.dinhMucChuan || 0;
        totals.mienGiam         += row.mienGiam || 0;
        totals.thieuNCKH        += row.thieuNCKH || 0;
        totals.dinhMucSauGiamTru += row.dinhMucSauMienGiam || 0;
        totals.hk1_vn     += bd.hk1.vn;    totals.hk1_lao    += bd.hk1.lao;
        totals.hk1_cuba   += bd.hk1.cuba;  totals.hk1_cpc    += bd.hk1.cpc;
        totals.hk1_dongHP += bd.hk1.dongHP;
        totals.hk2_vn     += bd.hk2.vn;    totals.hk2_lao    += bd.hk2.lao;
        totals.hk2_cuba   += bd.hk2.cuba;  totals.hk2_cpc    += bd.hk2.cpc;
        totals.hk2_dongHP += bd.hk2.dongHP;
        totals.year_vn    += bd.year.vn;   totals.year_lao   += bd.year.lao;
        totals.year_cuba  += bd.year.cuba; totals.year_cpc   += bd.year.cpc;
        totals.year_dongHP += bd.year.dongHP;
        totals.vuot_vn    += bd.vuot.vn;   totals.vuot_lao   += bd.vuot.lao;
        totals.vuot_cuba  += bd.vuot.cuba; totals.vuot_cpc   += bd.vuot.cpc;
        totals.vuot_dongHP += bd.vuot.dongHP; totals.vuot_tong += bd.vuot.total;
        totals.tien_vn    += bd.money.vn;  totals.tien_lao   += bd.money.lao;
        totals.tien_cuba  += bd.money.cuba; totals.tien_cpc  += bd.money.cpc;
        totals.tien_dongHP += bd.money.dongHP; totals.tien_tong += bd.money.total;
        totals.thucNhan   += thucNhan;
    });

    // Render footer
    renderFooter(totals);
}

/**
 * Fallback: tự tính breakdown cho dữ liệu snapshot cũ không có sẵn breakdown từ server.
 * Cấu trúc trả về giống hệt computeSdoBreakdown() ở backend.
 */
function emptyBreakdown() {
    return {
        hk1:  { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
        hk2:  { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
        year: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
        vuot: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
        money: { vn: 0, lao: 0, cuba: 0, cpc: 0, dongHP: 0, total: 0 },
        thucNhan: 0,
        mucTT: 0,
    };
}

/**
 * Render footer with totals
 */
function renderFooter(totals) {
    const tableFoot = document.getElementById('tableFoot');
    tableFoot.innerHTML = '';
    
    const footRow = document.createElement('tr');
    footRow.style.fontWeight = 'bold';
    footRow.style.backgroundColor = '#e9ecef';

    footRow.innerHTML = `
        <td colspan="2" style="text-align: center;">TỔNG CỘNG</td>
        <td>${formatNumber(totals.luong)}</td>
        <td>${formatNumber(totals.dinhMucChuan)}</td>
        <td>${formatNumber(totals.mienGiam)}</td>
        <td>${formatNumber(totals.thieuNCKH)}</td>
        <td>${formatNumber(totals.dinhMucSauGiamTru)}</td>
        
        <!-- HK1 -->
        <td>${formatNumber(totals.hk1_vn)}</td>
        <td>${formatNumber(totals.hk1_lao)}</td>
        <td>${formatNumber(totals.hk1_cuba)}</td>
        <td>${formatNumber(totals.hk1_cpc)}</td>
        <td>${formatNumber(totals.hk1_dongHP)}</td>
        
        <!-- HK2 -->
        <td>${formatNumber(totals.hk2_vn)}</td>
        <td>${formatNumber(totals.hk2_lao)}</td>
        <td>${formatNumber(totals.hk2_cuba)}</td>
        <td>${formatNumber(totals.hk2_cpc)}</td>
        <td>${formatNumber(totals.hk2_dongHP)}</td>
        
        <!-- Cả năm -->
        <td>${formatNumber(totals.year_vn)}</td>
        <td>${formatNumber(totals.year_lao)}</td>
        <td>${formatNumber(totals.year_cuba)}</td>
        <td>${formatNumber(totals.year_cpc)}</td>
        <td>${formatNumber(totals.year_dongHP)}</td>
        
        <!-- Vượt giờ -->
        <td>${formatNumber(totals.vuot_vn)}</td>
        <td>${formatNumber(totals.vuot_lao)}</td>
        <td>${formatNumber(totals.vuot_cuba)}</td>
        <td>${formatNumber(totals.vuot_cpc)}</td>
        <td>${formatNumber(totals.vuot_dongHP)}</td>
        <td>${formatNumber(totals.vuot_tong)}</td>
        
        <!-- Mức TT -->
        <td></td>
        
        <!-- Thành tiền -->
        <td>${formatNumber(totals.tien_vn)}</td>
        <td>${formatNumber(totals.tien_lao)}</td>
        <td>${formatNumber(totals.tien_cuba)}</td>
        <td>${formatNumber(totals.tien_cpc)}</td>
        <td>${formatNumber(totals.tien_dongHP)}</td>
        <td>${formatNumber(totals.tien_tong)}</td>
        
        <!-- Thực nhận -->
        <td>${formatNumber(totals.thucNhan)}</td>
        
        <!-- Actions -->
        <td></td>
    `;

    tableFoot.appendChild(footRow);
}



// ==================== UPDATE SUMMARY ====================

function updateSummary(data) {
    const totalGV = data.length;
    const totalVuotGio = data.reduce((sum, r) => sum + (r.thanhToan || 0), 0);
    const gvCoVuotGio = data.filter(r => (r.thanhToan || 0) > 0).length;

    const elTotalGV = document.getElementById('totalGV');
    const elTotalVuotGio = document.getElementById('totalVuotGio');
    const elGvCoVuotGio = document.getElementById('gvCoVuotGio');

    if (elTotalGV) elTotalGV.textContent = totalGV;
    if (elTotalVuotGio) elTotalVuotGio.textContent = formatNumber(totalVuotGio);
    if (elGvCoVuotGio) elGvCoVuotGio.textContent = gvCoVuotGio;

    // Show the summary box once data is loaded
    const summaryBox = document.getElementById('summaryBox');
    if (summaryBox) summaryBox.style.display = '';
}

// ==================== FILTER ====================

function filterTable() {
    const gvFilter = document.getElementById('filterGiangVien').value.toLowerCase();
    
    // 1. Lọc dữ liệu từ globalData
    const filteredData = globalData.filter(row => {
        const hoTen = (row.giangVien || '').toLowerCase();
        return hoTen.includes(gvFilter);
    });

    // 2. Render lại toàn bộ bảng dựa trên dữ liệu đã lọc
    // Việc gọi renderTable sẽ tự động xử lý lại STT và Group Header cho Khoa
    renderTable(filteredData);

    // 3. Cập nhật Summary box
    updateSummary(filteredData);
}

// Remove old updateFooterTotals function as it's replaced by renderFooter

// ==================== EXCEL PREVIEW (PDF) ====================

// Preview Excel as PDF generated from xlsx + LibreOffice
async function previewExcel(maGV, hoTen) {
    const namHoc = document.getElementById('namHocXem').value;
    const khoa = document.getElementById('khoaXem').value;
    const previewMode = 'pdf';

    console.info('[vuotgio_v2.preview] click', {
        giangVien: hoTen,
        maGV,
        namHoc,
        khoa,
        previewMode,
        url: `/v2/vuotgio/tong-hop/preview/${maGV}?namHoc=${namHoc}&format=${previewMode}`
    });

    Swal.showLoading();

    try {
        const response = await fetch(`/v2/vuotgio/tong-hop/preview/${maGV}?namHoc=${namHoc}&format=${previewMode}`);
        const result = await response.json();

        console.info('[vuotgio_v2.preview] result from server:', result);

        if (result.success) {
            console.info('[vuotgio_v2.preview] intermediate data keys:', Object.keys(result.data?.intermediateJson || {}));
            if (result.data?.pdfBase64) {
                console.info('[vuotgio_v2.preview] PDF base64 received, length:', result.data.pdfBase64.length);
            }
        }

        if (!result.success) {
            Swal.close();
            Swal.fire('Lỗi', result.message || 'Không thể tải dữ liệu preview', 'error');
            return;
        }

        if (result.data?.pdfBase64) {
            renderExcelPdfPreview(result.data, hoTen, namHoc, khoa);
        } else {
            Swal.close();
            Swal.fire('Lỗi', 'Không tạo được bản PDF preview', 'error');
        }

        if (Array.isArray(result.data?.warnings) && result.data.warnings.length > 0) {
            console.warn('[preview-template] warnings:', result.data.warnings);
            Swal.fire({
                icon: 'warning',
                title: 'Lưu ý preview',
                text: result.data.warnings[0],
                timer: 3500,
                showConfirmButton: false,
            });
        }

    } catch (error) {
        Swal.close();
        console.error('Error loading excel preview:', error);
        Swal.fire('Lỗi', 'Không thể tải chi tiết', 'error');
    }
}

function renderExcelPdfPreview(serverData, hoTen, namHoc, khoa) {
    Swal.close();

    if (previewPdfObjectUrl) {
        URL.revokeObjectURL(previewPdfObjectUrl);
        previewPdfObjectUrl = null;
    }

    const pdfBytes = atob(serverData.pdfBase64);
    const byteNumbers = new Array(pdfBytes.length);
    for (let i = 0; i < pdfBytes.length; i++) {
        byteNumbers[i] = pdfBytes.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
    previewPdfObjectUrl = URL.createObjectURL(pdfBlob);

    const previewWindow = window.open('', '_blank');
    if (!previewWindow) {
        Swal.fire('Lỗi', 'Trình duyệt đã chặn cửa sổ preview mới. Vui lòng cho phép popup.', 'error');
        return;
    }

    const escapeHtml = (text) => String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const escapedTitle = escapeHtml(`Xem trước: ${hoTen || ''}`);
    const escapedNamHoc = escapeHtml(namHoc || '');
    const escapedKhoa = escapeHtml(khoa === 'ALL' ? 'Tất cả' : (khoa || ''));
    
    previewWindow.document.open();
    previewWindow.document.write(`
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${escapedTitle}</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css" />
            <style>
                html, body {
                    margin: 0;
                    width: 100%;
                    height: 100%;
                    background: #fff;
                    overflow: hidden;
                    font-family: Arial, sans-serif;
                }
                .header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 56px;
                    background: #f1f5f9;
                    color: #1e293b;
                    display: flex;
                    align-items: center;
                    padding: 0 20px;
                    gap: 20px;
                    z-index: 1000;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                    border-bottom: 1px solid #e2e8f0;
                }
                .header .info-group {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    font-size: 14px;
                }
                .header .info-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    white-space: nowrap;
                }
                .header .info-item strong {
                    color: #64748b;
                }
                .header button {
                    height: 36px;
                    width: 36px;
                    border: 1px solid #e2e8f0;
                    background: #fff;
                    color: #64748b;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    transition: all 0.2s ease;
                }
                .header button:hover {
                    background: #f8fafc;
                    color: #1e293b;
                }
                .header button.close-btn {
                    margin-left: auto;
                }
                .header button.close-btn:hover {
                    background: #fee2e2;
                    color: #ef4444;
                    border-color: #fecaca;
                }
                .header .title {
                    font-weight: 600;
                    font-size: 16px;
                    color: #0f172a;
                }
                .layout {
                    display: flex;
                    width: 100%;
                    height: 100%;
                    padding-top: 56px;
                }
                .sidebar {
                    width: 260px;
                    min-width: 260px;
                    border-right: 1px solid #e5e7eb;
                    background: #f8fafc;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .sidebar.hidden {
                    display: none;
                }
                .sidebar .meta {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    font-size: 14px;
                    color: #334155;
                }
                .meta-item {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 10px 12px;
                    line-height: 1.4;
                }
                .viewer {
                    flex: 1;
                    height: 100%;
                    border: 0;
                }
            </style>
            <script>
                // Sidebar toggle removed as sidebar is gone
            </script>
        </head>
        <body>
            <div class="header">
                <div class="title">${escapedTitle}</div>
                <div class="info-group">
                    <div class="info-item">
                        <strong>Năm học:</strong> ${escapedNamHoc}
                    </div>
                    <div class="info-item">
                        <strong>Khoa:</strong> ${escapedKhoa}
                    </div>
                </div>
                <button class="close-btn" onclick="window.close()" title="Đóng">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="layout">
                <iframe class="viewer" src="${previewPdfObjectUrl}#toolbar=0&navpanes=0" title="Excel PDF Preview"></iframe>
            </div>
        </body>
        </html>
    `);
    previewWindow.document.close();
}

// ==================== EXPORT EXCEL ====================

// function exportExcel() {
//     if (globalData.length === 0) {
//         Swal.fire('Thông báo', 'Không có dữ liệu để xuất', 'info');
//         return;
//     }

//     const namHoc = document.getElementById('namHocXem').value;
//     const khoa = document.getElementById('khoaXem').value;

//     // Create CSV content
//     let csvContent = '\uFEFF'; // BOM for UTF-8
//     csvContent += 'STT,Mã GV,Họ tên,Khoa,Chức danh,Thực hiện,Định mức,Thiếu NCKH,Vượt giờ\n';

//     globalData.forEach((row, index) => {
//         csvContent += `${index + 1},"${row.MaGV || ''}","${row.HoTen || ''}","${row.MaKhoa || ''}","${row.ChucDanh || ''}",${row.SoTietThucHien || 0},${row.SoTietDinhMuc || 0},${row.SoTietThieuNCKH || 0},${row.SoTietVuotGio || 0}\n`;
//     });

//     // Download
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const link = document.createElement('a');
//     link.href = URL.createObjectURL(blob);
//     link.download = `TongHopVuotGio_${namHoc}_${khoa}.csv`;
//     link.click();
// }
````

## File: src/controllers/vuotgio_v2/xuatFile.controller.js
````javascript
/**
 * VUOT GIO V2 - Xuất File Controller
 *
 * Routes:
 *   GET /v2/vuotgio/xuat-file              → renderPage
 *   GET /v2/vuotgio/xuat-file/excel        → exportExcel      (Type A: Kê khai cá nhân)
 *   GET /v2/vuotgio/xuat-file/tong-hop     → exportConsolidated (Type B: Tổng hợp Khoa/Phòng)
 */

const xuatFileService          = require('../../services/vuotgio_v2/xuatFile.service');
const consolidatedExportService = require('../../services/vuotgio_v2/consolidatedExport.service');
const dataLockService          = require('../../services/vuotgio_v2/dataLock.service');

/* ════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════ */

/**
 * Chuẩn hóa chuỗi để dùng trong tên file (xóa ký tự đặc biệt, giữ chữ/số/dấu gạch)
 */
const sanitizeFileName = (str) =>
    String(str || '')
        .normalize('NFC')
        .replace(/[^a-zA-Z0-9À-ỹ_\- ]/g, '')
        .trim()
        .replace(/\s*-\s*/g, '-')
        .replace(/\s+/g, '_')
        .slice(0, 40);

/**
 * Gửi workbook ExcelJS về client dưới dạng file tải xuống.
 */
const _sendWorkbook = async (res, workbook, filename) => {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // RFC 5987: filename cho client cũ, filename* cho client hỗ trợ UTF-8
    const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition',
        `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`);
    await workbook.xlsx.write(res);
    res.end();
};

/* ════════════════════════════════════════════════════
   Controllers
   ════════════════════════════════════════════════════ */

/**
 * Render trang xuất file
 */
const renderPage = (req, res) => {
    res.render('vuotgio_v2/vuotgio.xuatFile.ejs');
};

/**
 * Type A — Kê khai cá nhân
 * Query params:
 *   - namHoc     (required)
 *   - khoa       (optional) — mã khoa/phòng, hoặc 'ALL'
 *   - giangVien  (optional) — id_User hoặc HoTen
 */
const exportExcel = async (req, res) => {
    const { namHoc, khoa, giangVien } = req.query;

    if (!namHoc) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin Năm học' });
    }

    // Kiểm tra dữ liệu đã được lưu chưa
    try {
        const locked = await dataLockService.isLocked(namHoc);
        if (!locked) {
            return res.status(403).json({
                success: false,
                message: 'Dữ liệu năm học này chưa được lưu. Vui lòng lưu dữ liệu trước khi xuất file.'
            });
        }
    } catch (err) {
        console.error('[xuatFile.controller] lock check error:', err);
        return res.status(500).json({ success: false, message: 'Không thể kiểm tra trạng thái lưu dữ liệu.' });
    }

    try {
        const { workbook, meta } = await xuatFileService.exportExcel(namHoc, khoa, giangVien);

        // Build descriptive filename based on scope
        const namHocPart = sanitizeFileName(namHoc);
        let filename;

        if (giangVien && meta.giangVienName) {
            // Scope: 1 giảng viên → KeKhai_VuotGio_Nguyen_Van_A_2024-2025.xlsx
            filename = `KeKhai_VuotGio_${sanitizeFileName(meta.giangVienName)}_${namHocPart}.xlsx`;
        } else if (khoa && khoa !== 'ALL' && meta.maKhoa) {
            // Scope: 1 khoa → KeKhai_VuotGio_Khoa_CNTT_2024-2025.xlsx
            filename = `KeKhai_VuotGio_Khoa_${sanitizeFileName(meta.maKhoa)}_${namHocPart}.xlsx`;
        } else {
            // Scope: tất cả khoa → KeKhai_VuotGio_TatCaKhoa_2024-2025.xlsx
            filename = `KeKhai_VuotGio_TatCaKhoa_${namHocPart}.xlsx`;
        }

        await _sendWorkbook(res, workbook, filename);
    } catch (err) {
        console.error('[xuatFile.controller] exportExcel error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: err.message || 'Có lỗi khi xuất file kê khai.' });
        }
    }
};

/**
 * Type B — Tổng hợp Khoa/Phòng toàn trường
 * Query params:
 *   - namHoc (required)
 *
 * File xuất ra gồm 3 loại sheet:
 *   1. Các sheet Khoa/Phòng (36 cột)
 *   2. Sheet TỔNG HỢP
 *   3. Sheet TIỀN THANH TOÁN
 */
const exportConsolidated = async (req, res) => {
    const { namHoc } = req.query;

    if (!namHoc) {
        return res.status(400).json({ success: false, message: 'Thiếu thông tin Năm học' });
    }

    // Kiểm tra dữ liệu đã được lưu chưa
    try {
        const locked = await dataLockService.isLocked(namHoc);
        if (!locked) {
            return res.status(403).json({
                success: false,
                message: 'Dữ liệu năm học này chưa được lưu. Vui lòng lưu dữ liệu trước khi xuất file.'
            });
        }
    } catch (err) {
        console.error('[xuatFile.controller] lock check error:', err);
        return res.status(500).json({ success: false, message: 'Không thể kiểm tra trạng thái lưu dữ liệu.' });
    }

    try {
        const workbook = await consolidatedExportService.exportConsolidatedByDepartment(namHoc);

        const namHocPart = sanitizeFileName(namHoc);
        const filename   = `TongHop_VuotGio_${namHocPart}.xlsx`;

        await _sendWorkbook(res, workbook, filename);
    } catch (err) {
        console.error('[xuatFile.controller] exportConsolidated error:', err);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: err.message || 'Có lỗi khi xuất file tổng hợp.' });
        }
    }
};

module.exports = {
    renderPage,
    exportExcel,
    exportConsolidated,
};
````