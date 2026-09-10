# Phân Tích Luồng Tính Lương Vượt Giờ V2 (Current Source Analysis)

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.
>
> This file replaces older analysis sections that described one-level approval, deferred snapshots, the legacy KTHP table, or a standalone `calculateOvertime()` production engine. Those statements are historical and are not current runtime behavior.

## 1. Scope and production entry points

Module route prefix: `/v2/vuotgio` (`src/routes/vuotGioV2Route.js`).

The current production calculation path is:

```text
tongHop.controller
  → tongHop.service.getAtomicSDO/getCollectionSDO/getCollectionSDODetail
  → summary.mapper.toAtomicSDO/toCollectionSDO
  → OvertimePolicyFactory.getCalculator(namHoc)
  → PolicyV1.calculate() or PolicyV2.calculate()
  → SDO (tableE, tableF, breakdown, raw)
```

`summary.mapper.calculateOvertime()` remains as an internal helper in the file but is not exported and is not called as the production entry point. The skill validator that requires that export is stale and currently fails for that reason.

## 2. Data-source matrix

### 2.1 Projected/live mode (`isDuKien=true`)

| Component | Source | Approval filter |
|---|---|---|
| Standard teaching | `quychuan`, processed by `processQuyChuanData()` | none in projected query; only `MoiGiang=0` |
| DATN | `doantotnghiep`, transformed in memory | `isMoiGiang=0` |
| LNQC | `vg_lop_ngoai_quy_chuan` | no approval predicate |
| KTHP | `vg_kthp` + child tables | no approval predicate |
| HDTQ | `vg_huong_dan_tham_quan_thuc_te` | no approval predicate |
| NCKH | `stats.service` default scope | **official NCKH scope**: both approvals |

Projected data is a live estimate and can change before official save/lock.

### 2.2 Official/live mode (`isDuKien=false`)

| Component | Source | Approval filter |
|---|---|---|
| Standard teaching | `giangday` | none; internal rows (`MoiGiang=0`) |
| DATN | `exportdoantotnghiep` | `isMoiGiang=0`; `COALESCE(da.id_User, nv.id_User)` with CCCD fallback |
| LNQC | `vg_lop_ngoai_quy_chuan` | `khoa_duyet=1 AND dao_tao_duyet=1` |
| KTHP | `vg_kthp` + child tables | `khoa_duyet=1 AND khao_thi_duyet=1` |
| HDTQ | `vg_huong_dan_tham_quan_thuc_te` | `khoa_duyet=1 AND dao_tao_duyet=1` |
| NCKH | `stats.service` default scope | `nckh_chung.khoa_duyet=1 AND vien_nc_duyet=1` |

Current KTHP runtime tables are:

```text
vg_kthp
├── vg_kthp_ra_de
├── vg_kthp_coi_thi
└── vg_kthp_cham_thi
```

`vg_coi_cham_ra_de` is a legacy/historical table name and is not the runtime KTHP source.

## 3. Aggregation services

### 3.1 Atomic SDO

`tongHop.service.getAtomicSDO(namHoc, idUser, connection, isDuKien)`:

1. loads employee metadata;
2. queries the five Vượt Giờ source groups according to mode;
3. calls `statsService.getLecturerRecords(idUser, namHoc)` without a scope, therefore default `OFFICIAL`;
4. loads global quota row from `sotietdinhmuc`;
5. maps raw rows through `toAtomicSDO()`;
6. computes `tableF` and payment `breakdown`.

### 3.2 Collection SDO

`getCollectionSDO()` returns a lightweight collection plus missing-NCKH warnings. `getCollectionSDODetail()` batch-fetches all source rows, groups them by `id_User`, and maps complete SDOs. The detailed function is used when `tableF`, `raw`, and snapshot-ready JSON are needed.

The lecturer list excludes `id_User=1`. Non-faculty staff (`phongban.isKhoa=0`) are grouped as `BGĐ&PHONG`.

## 4. Formula and policy behavior

For every policy:

```text
tongThucHien = giangDay + LNQC + KTHP + DATN + HDTQ
thieuNCKH = max(0, dinhMucNCKH - soTietNCKH)
tongVuot = max(0, tongThucHien - thieuNCKH - dinhMucSauMienGiam)
thanhToan = min(tongVuot, dinhMucSauMienGiam)
```

### 4.1 Quota defaults

`tongHop.repo.getDinhMuc()` reads `SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1`. If the row is missing/empty, the mapper falls back silently to:

```text
dinhMucChuan=280
dinhMucNCKH=200
```

### 4.2 Policy V1

Every year not in the explicit V2 list uses V1:

```text
mienGiam = dinhMucChuan × phanTramMienGiam / 100
dinhMucSauMienGiam = dinhMucChuan - mienGiam
```

### 4.3 Policy V2

The factory selects V2 only for:

```text
2025 - 2026, 2026 - 2027, 2027 - 2028,
2028 - 2029, 2029 - 2030, 2030 - 2031, 2031 - 2032
```

If `phanTramMienGiam > 0`, teaching quota becomes `280 × 0.8 = 224` and `mienGiam=56`. NCKH quota is not reduced by exemption. Years outside the list fall back to V1.

## 5. Table F and payment

`summary.mapper.buildTableF()` emits fixed categories:

```text
vn, lao, cuba, cpc, dongHP
```

- teaching/LNQC/KTHP use semester fields;
- DATN and HDTQ remain in Table F's `do_an`/`tham_quan` columns; the payment
  breakdown maps those columns into HK2 because their source records have no
  semester;
- `PaymentCalculator.computeSdoBreakdown()` distributes `thanhToan` proportionally by annual category total;
- rounded remainder is assigned to `dongHP` so bucket total equals `thanhToan`;
- rate is `ROUND(luong / 176, 0)`;
- `MAX_PAYABLE_HOURS=300` exists as a constant but is not applied by the active calculator.

## 6. Approval flow

### 6.1 Per-record source approvals

```text
LNQC: khoa_duyet → dao_tao_duyet
KTHP: khoa_duyet → khao_thi_duyet
HDTQ: khoa_duyet → dao_tao_duyet
```

Official aggregation uses both levels. The year-lock prerequisite checks all three tables using the same two-level predicates.

### 6.2 Faculty synthesis approval

`duyetTongHop.service.approveKhoa()` requires all rows in the faculty-scoped LNQC/KTHP/HDTQ sets to satisfy their two-level predicates, then upserts `vg_duyet_tong_hop.van_phong_duyet=1`. Revoke is rejected after year lock. Route-level `enforceKhoaFilter` is missing on synthesis approval endpoints; this remains a known security limitation.

## 7. Lock and snapshot

`dataLock.service.lockData()` coordinates the following flow. The SDO source read
uses a separate service-managed connection; lock and snapshot writes share the
lock transaction:

1. validate `NamHoc` format `YYYY - YYYY`;
2. ensure the year exists in `namhoc`;
3. reject an existing `vg_khoa_du_lieu` lock;
4. require zero unapproved LNQC/KTHP/HDTQ rows;
5. require all teaching faculties to have `van_phong_duyet=1`;
6. compute official SDOs for `ALL`;
7. insert lock record and save versioned snapshot rows in `vg_so_tiet_tong_hop`;
8. commit or rollback together.

Snapshot rows store complete SDO JSON in `chi_tiet`, along with version/latest metadata. This behavior is implemented, not planned.

### Read behavior by endpoint

| Consumer | Year not locked | Year locked |
|---|---|---|
| Personal preview | live projected/official according to request | snapshot |
| Faculty preview | live projected/official according to request | snapshot |
| Faculty statistics | rejected; snapshot required | snapshot |
| Excel export | rejected; snapshot required | snapshot |
| Raw live aggregation API | live SDO | still available when explicitly requested; snapshot endpoints are separate |

## 8. NCKH cross-module contract

`stats.repo.buildStatsWhere()` defines:

```text
OFFICIAL: nam_hoc + khoa_duyet=1 + vien_nc_duyet=1
PREVIEW:  nam_hoc only
```

Vượt Giờ does not pass `PREVIEW`; it receives official NCKH totals in both projected and official Vượt Giờ modes. This is why the projected Vượt Giờ view can show draft teaching data while still using approved NCKH hours only.

## 9. Risk and maintenance notes

- Missing quota rows activate silent `280/200` defaults.
- Legacy reports and old KTHP plans may mention `vg_coi_cham_ra_de`; use `kthp.repo.js` for runtime truth.
- The skill validator must be repaired to call exported policy calculators.
- Keep the explicit policy year list and approval predicates covered by tests.
