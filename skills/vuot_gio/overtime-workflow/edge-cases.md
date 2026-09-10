# Edge Cases & Failure-Prone Areas

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**.

- Missing `sotietdinhmuc` silently activates `280/200` defaults.
- NCKH is absent or not officially approved → `soTietNCKH=0` and the full NCKH shortfall may reduce overtime.
- Projected and official modes intentionally have different source tables and approval predicates.
- Once the academic year is locked, preview switches to snapshot; before lock it can remain live.
- Faculty statistics and Excel export require snapshot; personal/faculty preview does not require snapshot before lock.
- A locked year blocks middleware-protected Vượt Giờ POST/PUT/DELETE through
  `checkDataLock`; synthesis approval routes have separate guards and no public
  unlock route exists.
- `id_User=1` is omitted from lecturer aggregation.
- DATN guest records (`isMoiGiang != 0`) are omitted.
- Table F always has five categories; DATN/HDTQ are assigned to HK2 because source rows lack semester.
- `MAX_PAYABLE_HOURS=300` is an unused constant; do not assert it is an active payment formula.
- The bundled validator calls a non-exported `calculateOvertime`; test policy modules directly until the validator is repaired.

## Minimum regression scenarios

1. V1 year with 0%, partial%, and 100% teaching exemption.
2. Each configured V2 year with zero and positive exemption.
3. NCKH below/equal/above the 200-hour fallback quota.
4. LNQC/HDTQ with only faculty approval versus both approvals.
5. KTHP with only faculty approval versus both approvals.
6. Projected versus official source selection.
7. Preview before and after lock.
8. Snapshot export rejects an unlocked year.
9. Payment distribution when one category is empty and when rounded remainder is assigned to `dongHP`.
