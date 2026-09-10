# Workload Aggregation

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.

This document describes how the current TTCS source builds per-lecturer Standardized Data Objects (SDOs) for Vượt Giờ V2 and how NCKH hours are persisted and injected into that calculation.

---

## Vượt Giờ V2 aggregation

### Production path

```text
GET /v2/vuotgio/tong-hop/giang-vien
  → tongHop.controller.tongHopTheoGV()
  → tongHop.service.getCollectionSDO()                 (summary)
    or getCollectionSDODetail()                        (detail/table F)
  → repository batch queries + nckh_v3/stats.service
  → summary.mapper.toCollectionSDO()/toAtomicSDO()
  → OvertimePolicyFactory → PolicyV1 or PolicyV2
```

`summary.mapper.calculateOvertime()` still exists as an internal, non-exported helper, but it is **not** the production entry point. Production calculations go through `toAtomicSDO()`/`toCollectionSDO()` and the policy returned by `OvertimePolicyFactory`.

### Source matrix by mode

`isDuKien=true` is the live projected view. `isDuKien=false` is the live official view. A locked year is read from the snapshot path described below.

| Workload | Projected/live (`isDuKien=true`) | Official/live (`isDuKien=false`) | Runtime tables | Notes |
|---|---|---|---|---|
| Standard teaching | `quychuan` (mapped in memory by `processQuyChuanData`) | `giangday` | `quychuan`, `giangday` | Only internal lecturers (`MoiGiang = 0`) are included. |
| LNQC | `vg_lop_ngoai_quy_chuan`, without approval predicate | `khoa_duyet = 1 AND dao_tao_duyet = 1` | `vg_lop_ngoai_quy_chuan` (aggregation source); `course_schedule_details` (upstream draft) | Draft rows enter the official table only after `confirmToMain()`; the draft table is not queried by aggregation. |
| KTHP | `vg_kthp` and child tables, without approval predicate | `khoa_duyet = 1 AND khao_thi_duyet = 1` | `vg_kthp`, `vg_kthp_ra_de`, `vg_kthp_coi_thi`, `vg_kthp_cham_thi` | The parent row carries the approval flags; child rows hold activity details. |
| DATN | `doantotnghiep` transformed and mapped to internal lecturers | `exportdoantotnghiep` | `doantotnghiep`, `exportdoantotnghiep` | `isMoiGiang = 0`; official mapping uses `COALESCE(da.id_User, nv.id_User)` and CCCD when needed. |
| HDTQ | `vg_huong_dan_tham_quan_thuc_te`, without approval predicate | `khoa_duyet = 1 AND dao_tao_duyet = 1` | `vg_huong_dan_tham_quan_thuc_te` | `so_tiet_quy_doi` is aggregated. |

Teaching, DATN, and the non-approved projected rows are intentionally different from the official query. Do not describe the projected view as an approval-cleared or immutable total.

All lecturer-list aggregation queries exclude the hard-coded system user `id_User = 1`. Non-faculty staff (`phongban.isKhoa = 0`) are grouped under `BGĐ&PHONG`.

### NCKH injection

The Vượt Giờ service calls:

```js
statsService.getLecturerSummary(namHoc, "ALL")
// default scope = STATS_SCOPE.OFFICIAL
```

and, for a single lecturer, calls `statsService.getLecturerRecords(idUser, namHoc)` with the same default. Therefore the NCKH amount injected into Vượt Giờ is filtered by **both** `nckh_chung.khoa_duyet = 1` and `nckh_chung.vien_nc_duyet = 1`, even when the Vượt Giờ screen is otherwise using projected workload sources. A lecturer with no qualifying NCKH rows receives `soTietNCKH = 0` and the corresponding shortfall is applied by the overtime policy.

The NCKH module's explicit `PREVIEW` scope (year filter only) is used by NCKH preview APIs, not by this Vượt Giờ cross-module call.

### Batch fetch and SDO shape

`getCollectionSDODetail()` fetches each source in batches, groups rows by `id_User` in memory, then maps each lecturer to a complete SDO (including `raw`, `tableE`, `tableF`, and `breakdown`). This avoids an N+1 query loop. `getCollectionSDO()` returns a lighter collection and a warning list for lecturers with no NCKH summary.

### Table F

`summary.mapper.buildTableF()` emits five fixed training-system rows, zero-filled when necessary:

```text
vn, lao, cuba, cpc, dongHP
```

Teaching, LNQC, and KTHP use their semester fields. DATN and HDTQ do not carry a
semester: `buildTableF()` keeps them in `do_an`/`tham_quan`, and the payment
breakdown maps those columns into **HK2 by convention**. Payment is then
distributed across the five groups proportionally to annual workload.

---

## Lock and snapshot semantics

`dataLock.service.lockData()` validates the academic-year format and existence,
rejects an already locked year, requires all LNQC/KTHP/HDTQ rows to satisfy their
two-level approval predicates, and requires every faculty to have
`vg_duyet_tong_hop.van_phong_duyet = 1`. It computes the official SDO collection
through a separate service-managed connection, then stores the full JSON SDO and
lock record atomically in the lock transaction.

- **Before lock:** aggregation and personal/faculty preview can use live projected or official data, selected by `isDuKien`.
- **After lock:** personal/faculty preview automatically reads the latest snapshot for that year.
- **Statistics by faculty and Excel exports:** require a locked year and read the snapshot; they do not re-query the base workload tables.
- `checkDataLock` blocks only middleware-protected Vượt Giờ mutating routes after a
  year is locked. Synthesis approval routes are separate; revoke checks the lock
  in service, while approve has no explicit lock guard. There is no public unlock route.

---

## NCKH aggregation and persistence

### Tables

| Table | Role |
|---|---|
| `nckh_chung` | Master record for a research work |
| `nckh_so_tiet` | Persisted participant/hour rows |

NCKH participant hours are calculated when a record is created, updated, or imported, then written to `nckh_so_tiet`. They are **not recalculated dynamically by `listUnified()`**.

### Statistics scopes

`stats.repo.buildStatsWhere()` has two explicit scopes:

- `OFFICIAL` (default): `nam_hoc = ? AND khoa_duyet = 1 AND vien_nc_duyet = 1`.
- `PREVIEW`: `nam_hoc = ?` only.

`GET /v3/nckh/records` uses `listUnified()` and may show pending records because that management list does not apply an approval predicate. Lecturer/faculty/institute statistics and exports use the scope-specific stats repository.

### Import pipeline

```text
Excel buffer
  → detect header row and map row fields
  → resolve rule by loaiNckh + phanLoai/capNhiemVu (when supplied)
  → if a rule matches, override tongSoTiet with SoGio from the rule
  → if no classification is supplied, keep the Excel tongSoTiet
  → if classification is supplied but does not match, mark the row as an error
  → resolve participant names to nhanvien.id_User (or retain external participant data)
  → buildParticipantsByMode()
  → save nckh_chung + nckh_so_tiet in transaction(s)
  → round2(sum participant hours) must equal round2(tongSoTiet)
```

Manual input always uses `payload.tongSoTiet`; it is never replaced by a rule lookup. Excel `HOIDONG` has a special role-per-row branch and therefore differs from the manual fixed-mode constraint.
