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
