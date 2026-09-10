# Business Rules

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.

All rules below are confirmed against the current implementation. The production Vượt Giờ path is:

```text
tongHop.service
  → summary.mapper.toAtomicSDO()/toCollectionSDO()
  → OvertimePolicyFactory
  → PolicyV1 or PolicyV2
```

The non-exported `summary.mapper.calculateOvertime()` helper is not the production entry point.

---

## Vượt Giờ (teaching overtime)

### BR-VG-01 — Overtime formula

For one lecturer and one academic year:

```text
tongThucHien = soTietGiangDay + soTietNgoaiQC + soTietKTHP
              + soTietDoAn + soTietHDTQ

thieuNCKH = max(0, dinhMucNCKH - soTietNCKH)

tongVuot = max(0, tongThucHien - thieuNCKH - dinhMucSauMienGiam)
thanhToan = min(tongVuot, dinhMucSauMienGiam)
```

`thieuNCKH` reduces effective teaching hours. Overtime and payment are never negative. The payment cap is the adjusted **teaching** quota; there is no separate NCKH exemption in the current policies.

### BR-VG-02 — Policy versions

`OvertimePolicyFactory` normalizes the year string and selects:

- **Policy V1:** all years not in the configured V2 list. The teaching exemption is `dinhMucChuan × phanTramMienGiam / 100`.
- **Policy V2:** exactly `2025 - 2026` through `2031 - 2032`. If `phanTramMienGiam > 0`, teaching quota is set to `280 × 80% = 224` and `mienGiam = 56`; the percentage is not applied as a continuous multiplier. If the percentage is zero, the normal quota arithmetic is used.

Do not document V2 as applying to every year from 2025 onward; years outside the explicit list fall back to V1.

### BR-VG-03 — Quota source and defaults

`tongHop.repo.getDinhMuc()` reads one global row:

```sql
SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1
```

The current mapper fallback is:

```text
dinhMucChuan = 280
dinhMucNCKH  = 200
```

The values are global, not per faculty or rank. A missing row is currently silent; see `known-limitations.md`.

### BR-VG-04 — Workload sources and approval gates

| Source | Projected live | Official live and lock prerequisite |
|---|---|---|
| `quychuan` / `giangday` | projected uses `quychuan`; official uses `giangday`; no approval predicate | no approval predicate |
| `vg_lop_ngoai_quy_chuan` | no approval predicate | `khoa_duyet = 1 AND dao_tao_duyet = 1` |
| `vg_kthp` parent + children | no approval predicate | `khoa_duyet = 1 AND khao_thi_duyet = 1` |
| `doantotnghiep` / `exportdoantotnghiep` | projected/official source respectively; `isMoiGiang = 0` | no approval predicate |
| `vg_huong_dan_tham_quan_thuc_te` | no approval predicate | `khoa_duyet = 1 AND dao_tao_duyet = 1` |

Official Vượt Giờ aggregation therefore requires both approval levels for LNQC, KTHP, and HDTQ. The same two-level predicates are checked before year lock and before faculty synthesis approval.

### BR-VG-05 — Guest lecturer and admin exclusions

- DATN rows with `isMoiGiang != 0` are excluded.
- Lecturer lists exclude hard-coded `id_User = 1`.
- Standard teaching queries include only internal lecturers (`MoiGiang = 0`).

### BR-VG-06 — LNQC staging

LNQC is entered in `course_schedule_details`, moved by `confirmToMain()` to `vg_lop_ngoai_quy_chuan`, and then reviewed/approved in the official table. Draft rows are not the official aggregation source.

### BR-VG-07 — KTHP parent/child model

Runtime KTHP data uses:

```text
vg_kthp
├── vg_kthp_ra_de
├── vg_kthp_coi_thi
└── vg_kthp_cham_thi
```

Approval flags live on `vg_kthp`; activity-specific details live in the child table selected by `loai_kthp`.

### BR-VG-08 — Year-lock gate

`dataLock.service.lockData()` validates prerequisites while holding the lock
transaction. The official SDO read is computed through `getCollectionSDODetail()`
on a separate service-managed connection; the lock row and snapshot writes are
the part committed atomically:

1. `NamHoc` matches `YYYY - YYYY`.
2. The year exists in `namhoc`.
3. The year is not already present in `vg_khoa_du_lieu`.
4. All LNQC, KTHP, and HDTQ rows satisfy their two-level approval predicates.
5. Every teaching faculty (`phongban.isKhoa = 1`) has `vg_duyet_tong_hop.van_phong_duyet = 1`.
6. The official SDO collection is non-empty; it is then saved to `vg_so_tiet_tong_hop` and the lock/snapshot transaction commits.

`checkDataLock` blocks only the Vượt Giờ mutation routes that attach the
middleware. Synthesis approval routes do not attach it; `revokeKhoa()` checks the
lock in its service, while `approveKhoa()` has no explicit lock guard. There is no
public unlock API.

### BR-VG-09 — Faculty synthesis approval

`duyetTongHop.service` checks the same three-table/two-level prerequisites scoped to the target faculty before upserting `van_phong_duyet = 1`. Revoke is refused after the year lock. The current routes do not apply `enforceKhoaFilter`, so route-level faculty scoping remains a security limitation (see `known-limitations.md`).

### BR-VG-10 — Table F and payment breakdown

`buildTableF()` always returns the five categories `vn`, `lao`, `cuba`, `cpc`, and `dongHP`. DATN and HDTQ are assigned to HK2 because their source rows have no semester.

`PaymentCalculator.computeSdoBreakdown()`:

- distributes payable overtime (`thanhToan`) proportionally by the five annual category totals;
- assigns the remainder to `dongHP` so the five rounded overtime buckets sum to `thanhToan`;
- uses `ROUND(luong / 176, 0)` as the per-hour rate;
- does not apply `MAX_PAYABLE_HOURS = 300` in the current calculator (the constant exists but is not used by this path).

---

## NCKH (research)

### BR-NK-01 — Type-to-mode registry

`DETAI_DUAN`, `BAIBAO`, `SANGKIEN`, `GIAITHUONG`, and `SACHGIAOTRINH` use
`standard`; `DEXUAT` and `HUONGDAN` use `equal`; `HOIDONG` uses `fixed` in the
manual/type registry.

The current Excel mapper hardcodes `mode: "standard"` for `DEXUAT` and
`HUONGDAN`, so those two Excel imports currently use weighted allocation. This is
an implementation divergence, not an equal-mode guarantee for every input path.

### BR-NK-02 — Participant allocation

Standard mode gives main authors a weighted share. `tac_gia_lien_he` is part of the main-author group. Equal mode divides by participant count and duration. Fixed mode requires one participant for manual input and assigns the full declared total to that row. Excel `DEXUAT`/`HUONGDAN` currently use standard mode because of the mapper behavior noted above.

### BR-NK-03 — Duration and rounding

Standard/equal modes expand multi-year projects and support literal years (`soNamThucHien > 1900`). Fixed mode ignores duration. Rounding uses `Number.EPSILON`; delta correction is applied to the last member/participant as described in `nckh-compensation.md`.

### BR-NK-04 — Integrity invariant

After create, update, and import save, the service compares:

```js
round2(SUM(nckh_so_tiet.so_tiet)) === round2(nckh_chung.tong_so_tiet)
```

A mismatch rolls back the transaction.

### BR-NK-05 — Import hour-rule precedence

For Excel rows, a matching `phanLoai` or `capNhiemVu` rule overrides `tongSoTiet` with its database `SoGio`. If no classification is provided, Excel's value is retained. A supplied but unmatched classification is an import error. Manual records always use `payload.tongSoTiet`.

The rule service uses a configurable primary table (`NCKH_QUYDINH_TABLE` or `nckh_quydinhsogio`) plus fallback candidates; rules are keyed by type/classification, not by academic year.

### BR-NK-06 — Approval/statistics semantics

- `stats` scope `OFFICIAL`: both `khoa_duyet = 1` and `vien_nc_duyet = 1`.
- `stats` scope `PREVIEW`: year filter only.
- `nckhChung.repo.listUnified()` is a management list and can include pending records.
- Update is blocked after Institute approval; delete is blocked after either approval flag is set.
- External `nckh_so_tiet` rows with `nhanvien_id IS NULL` are retained for detail/author displays but are excluded from lecturer/faculty/institute numeric totals and the NCKH amount injected into Vượt Giờ.
