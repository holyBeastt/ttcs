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
