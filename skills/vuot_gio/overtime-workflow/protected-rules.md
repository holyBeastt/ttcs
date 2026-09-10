# Protected Business Rules (OVERTIME)

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**.

1. **Defaults:** missing quota row falls back to `dinhMucChuan=280`, `dinhMucNCKH=200`.
2. **NCKH deficit:** `thieuNCKH=max(0, dinhMucNCKH-soTietNCKH)`; no NCKH exemption is applied.
3. **Policy V1:** direct percentage reduction of the teaching quota.
4. **Policy V2:** only for the explicit years `2025 - 2026` through `2031 - 2032`; positive exemption sets teaching quota to `224` and `mienGiam=56`.
5. **Non-negativity:** `tongVuot` cannot be below zero.
6. **Payment cap:** `thanhToan <= dinhMucSauMienGiam`.
7. **Official approval gates:**
   - LNQC/HDTQ: `khoa_duyet=1 AND dao_tao_duyet=1`;
   - KTHP: `khoa_duyet=1 AND khao_thi_duyet=1`.
8. **Projected mode:** uses live projected sources and intentionally omits source approval predicates.
9. **Snapshot:** lock computes official SDOs and stores JSON in `vg_so_tiet_tong_hop`; locked statistics/export read snapshot.
10. **Identity exclusions:** aggregation excludes `id_User=1`; DATN excludes guest rows.
11. **Rounding:** final numeric policy fields are rounded to two decimals with `Number.EPSILON`; in-memory payment breakdown money values use `excelNumber()`/`toFixed(2)`, while generated workbook money formulas use `TRUNC(..., 2)`.

The legacy table name `vg_coi_cham_ra_de` and the old one-level approval behavior are historical, not current runtime rules.
