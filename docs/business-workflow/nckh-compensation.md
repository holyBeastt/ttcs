# NCKH Compensation — Research Hour Distribution

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.

This document describes how NCKH V3 allocates declared research hours to participant rows. Allocation happens during create/update/import and the resulting rows are stored in `nckh_so_tiet`.

**Primary implementation:** `src/services/nckh_v3/formula.service.js`

---

## Research types and modes

| Type key | Vietnamese name | Mode |
|---|---|---|
| `DETAI_DUAN` | Đề tài, dự án | `standard` |
| `BAIBAO` | Bài báo khoa học | `standard` |
| `SANGKIEN` | Sáng kiến | `standard` |
| `GIAITHUONG` | Giải thưởng và sáng chế | `standard` |
| `SACHGIAOTRINH` | Sách, giáo trình | `standard` |
| `DEXUAT` | Đề xuất nghiên cứu | `equal` in manual/type registry |
| `HUONGDAN` | Hướng dẫn SV NCKH | `equal` in manual/type registry |
| `HOIDONG` | Thành viên hội đồng khoa học | `fixed` |

---

## `standard`: weighted author/member allocation

`quyDoiSoTietStandard(T, n, m, duration)` receives:

- `T`: declared total hours (`tongSoTiet`),
- `n`: total participants, including internal, external, and corresponding authors,
- `m`: main-author count, where both `tac_gia` **and** `tac_gia_lien_he` count as main authors,
- `duration`: `soNamThucHien` unless it is a literal calendar year (`> 1900`), in which case duration is `1`.

For a single main-author group:

| Participants | Main-author allocation | Each member allocation |
|---|---:|---:|
| `n = 1` | `T` | — |
| `n = 2` | `2T/3` | `T/3` |
| `n = 3` | `T/2` | `T/4` |
| `n ≥ 4` | `T/3 + 2T/(3n)` | `2T/(3n)` |

For `m ≥ 2`:

```text
base = 2T / (3n)
main-author row = T / (3m) + base
member row       = base
```

The resulting per-person values are divided by `duration` and rounded to two decimals before year expansion. Duplicate participant IDs are removed; corresponding authors are kept in the main-author group and are not double-counted as ordinary authors or members.

---

## Excel import mode divergence

The manual services and `NCKH_TYPE_OPTIONS` registry assign `equal` mode to
`DEXUAT` and `HUONGDAN`. The current Excel mapper instead returns
`mode: "standard"` for both types, so Excel imports currently use weighted
author/member allocation. Treat this as an implementation limitation until the
mapper is changed; do not document Excel imports as equal-mode today.

---

## `equal`: equal allocation (manual/type registry)

Used by `DEXUAT` and `HUONGDAN`:

```text
hours_per_participant = round2(T / n / duration)
```

All participant roles receive the same base value. As with standard mode, `duration` is treated as `1` when `soNamThucHien > 1900`.

After expansion and rounding, any delta needed to reconcile the rounded participant sum is added to the **last participant**. Thus equal mode is equal before correction, but the final persisted rows can differ by the correction delta.

---

## `fixed`: fixed value per participant row

Used by `HOIDONG` manual input:

```text
hours_per_participant = round2(T)
```

Manual fixed input requires exactly **one** participant and a valid council role (`chu_tich`, `phan_bien`, or `uy_vien`). `soNamThucHien` is not used to expand fixed-mode records.

Excel `HOIDONG` is a separate branch: one row may contain multiple role/name pairs. Each resolved role receives the row's fixed hours, and the record's `tongSoTiet` is adjusted to the rounded fixed value multiplied by the number of role rows. Do not generalize the manual one-person constraint to that Excel branch.

---

## Multi-year expansion

For `standard` and `equal` modes:

1. Divide each participant's allocation by the duration.
2. Expand participant rows into one row per participant per year (`namThucHien = 1..duration`).
3. If `soNamThucHien > 1900`, keep that literal year on one row per participant instead of looping through years.

`fixed` mode skips this expansion and ignores the duration value.

---

## Rounding and delta correction

The source uses:

```js
const round2 = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;
```

There is no project constant such as `EPSILON = 1e-9`; the implementation uses JavaScript's `Number.EPSILON` directly.

- Standard mode: if the rounded sum differs from `T`, add the delta to the last `thanh_vien`; if no member exists, use the last participant.
- Equal mode: add the delta to the last participant.
- The database integrity check compares `round2(SUM(nckh_so_tiet.so_tiet))` with `round2(nckh_chung.tong_so_tiet)`, not raw floating-point equality.

A mismatch aborts the transaction, so a successfully saved record satisfies the rounded total invariant.

---

## Excel import and hour rules

`src/services/nckh_v3/import/excel.strategy.js` resolves the active rule set by NCKH type and then attempts to match `phanLoai`, falling back to `capNhiemVu` when needed.

- A matching rule overrides `tongSoTiet` with the rule's `SoGio`.
- If neither classification field is supplied, the mapped Excel `tongSoTiet` remains authoritative for that row.
- If a classification field is supplied but does not match the database rule set, the row is rejected during preview.
- Manual input always uses its payload value.

The rule service defaults to `NCKH_QUYDINH_TABLE || "nckh_quydinhsogio"`, probes up to four candidate table names, and supports up to three candidate column names for a field. Rules are keyed by `loaiNckh` and classification, not by academic year.

---

## Approval and statistics

- New records start with `khoa_duyet = 0` and `vien_nc_duyet = 0`.
- Official NCKH statistics require both approval flags.
- Preview statistics filter by academic year only.
- `GET /v3/nckh/records` is a management list and can include pending records because `nckhChung.repo.listUnified()` does not filter approval.
- Update is blocked after `vien_nc_duyet = 1`.
- Delete is blocked when **either** `khoa_duyet = 1` or `vien_nc_duyet = 1`.

---

## Persistence model

`nckh_chung` stores the work-level total and metadata. `nckh_so_tiet` stores one row per participant/year allocation, including external participant names when no internal `id_User` exists. Vượt Giờ reads approved totals through `stats.service.js`; it does not recompute the NCKH formula itself.

Statistics and Vượt Giờ numeric totals join `nckh_so_tiet.nhanvien_id` to
`nhanvien`. External participant rows are persisted and can appear in record
detail/author displays, but their hours are excluded from lecturer, faculty,
institute, and Vượt Giờ totals because they have no internal `id_User`.
