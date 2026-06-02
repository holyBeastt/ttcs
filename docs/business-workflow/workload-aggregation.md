# Workload Aggregation

This document describes how raw workload records from multiple sources are merged into a per-lecturer Standardized Data Object (SDO).

---

## VuotGio (Teaching Overtime) Aggregation

### Entry Point

```
GET /v2/vuotgio/tong-hop/giang-vien
  → tongHop.controller.js
  → tongHop.service.js → getCollectionSDO()
  → summary.mapper.js → toAtomicSDO()
```

### The 5 Workload Sources

| # | Source | Table | Approval Gate | Exclusion Rule |
|---|--------|-------|--------------|----------------|
| 1 | Teaching | `giangday` | None — all rows | `id_User <> 1` |
| 2 | Non-standard classes | `vg_lop_ngoai_quy_chuan` | `khoa_duyet = 1` | — |
| 3 | Exam / proctoring | `vg_coi_cham_ra_de` | `khoa_duyet = 1` | — |
| 4 | Thesis supervision | `exportdoantotnghiep` | None | `isMoiGiang = 0` (See [Project Supervision](./project-supervision-workflow.md)) |
| 5 | Field-trip guidance | `vg_huong_dan_tham_quan_thuc_te` | `khoa_duyet = 1` | — |

**Evidence:** `src/repositories/vuotgio_v2/tongHop.repo.js` — per-source fetch queries.

> **Note:** Second-level approvals (`dao_tao_duyet`, `khao_thi_duyet`) are **not** required for hour-count queries — only for the pre-lock prerequisite check. This is confirmed behavior.

### Batch-Fetch Pattern

`getCollectionSDODetail()` avoids N+1 queries by fetching all rows per table once, grouping by `id_User` in memory, then iterating lecturers against those Maps.

**Evidence:** `src/services/vuotgio_v2/tongHop.service.js → getCollectionSDODetail()`

### Non-Faculty Staff

Staff with `phongban.isKhoa = 0` are grouped under the hardcoded code `"BGĐ&PHONG"`.

**Evidence:** `tongHop.repo.js → NON_KHOA_GROUP_CODE = "BGĐ&PHONG"`

### NCKH Hours Injection

Research hours are fetched from the NCKH module and injected into each SDO:
```js
nckhRecords: [{ soTietGiangVien: nckhMap.get(Number(row.id_User)) || 0 }]
```
If a lecturer has no NCKH records, `soTietNCKH = 0` and the shortfall penalises overtime.

**Evidence:** `tongHop.service.js → getCollectionSDODetail()` (nckhMap construction).

### Table F: Breakdown by Training System

Five fixed rows (zero-filled if empty): `vn`, `lao`, `cuba`, `cpc`, `dongHP`.

- `giangday`, `vg_lop_ngoai_quy_chuan`, `vg_coi_cham_ra_de` → split by semester.
- `exportdoantotnghiep`, `vg_huong_dan_tham_quan_thuc_te` → no semester field; **assigned to HK2 by convention**.

**Evidence:** `src/mappers/vuotgio_v2/summary.mapper.js → buildTableF()`

---

## NCKH (Research) Aggregation

### Tables

| Table | Role |
|-------|------|
| `nckh_chung` | Master record per research work |
| `nckh_so_tiet` | Per-participant hour allocation |

### Approval Gate (Stricter than VuotGio)

Only records with **both** `khoa_duyet = 1 AND vien_nc_duyet = 1` appear in lecturer summaries. VuotGio only requires `khoa_duyet = 1` for hour counting.

**Evidence:** `src/repositories/nckh_v3/nckhChung.repo.js → listUnified()`

### Import Pipeline

```
Excel buffer
  → auto-detect header row
  → map rows → payload (import.mapper.js)
  → override tongSoTiet from quyDinh table (Excel value ignored)
  → resolve MaSoCanBo → id_User
  → check duplicates
  → buildParticipantsByMode() (formula.service.js)
  → transaction: INSERT nckh_chung + bulk INSERT nckh_so_tiet
  → integrity check: SUM(so_tiet) == tongSoTiet → rollback on mismatch
```

> **Important:** The `tongSoTiet` in the Excel file is silently discarded. The authoritative value always comes from the `quyDinh` table.

**Evidence:** `src/services/nckh_v3/import.service.js`
