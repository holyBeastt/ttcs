# Phân Tích Ảnh Hưởng: Duyệt Hai Cấp Vượt Giờ

> **Document status:** Historical impact analysis, reconciled with the implemented source on **2026-09-10**.
>
> This file records the two-level approval change and its expected data impact. It is not a description of a pending bug. Current runtime behavior is documented in `docs/business-workflow/workload-aggregation.md`, `business-rules.md`, and `LUONG_VUOT_GIO_ANALYSIS.md`.

## 1. Current implementation

Official Vượt Giờ aggregation currently applies these predicates:

```text
LNQC: khoa_duyet = 1 AND dao_tao_duyet = 1
KTHP: khoa_duyet = 1 AND khao_thi_duyet = 1
HDTQ: khoa_duyet = 1 AND dao_tao_duyet = 1
```

Runtime KTHP is the parent/child model:

```text
vg_kthp
├── vg_kthp_ra_de
├── vg_kthp_coi_thi
└── vg_kthp_cham_thi
```

The former `vg_coi_cham_ra_de` table and one-level query are historical context only.

## 2. Behavioral impact of the change

A row with only the faculty approval flag set is visible in projected/live preview when the request intentionally uses `isDuKien=true`, but it is excluded from official/live aggregation until the second-level flag is set.

| Source | Row with only level 1 | Row with both levels |
|---|---|---|
| LNQC | excluded from official total | included |
| KTHP | excluded from official total | included |
| HDTQ | excluded from official total | included |

The same predicates are used by the year-lock prerequisite and faculty synthesis approval checks. This makes the official pre-lock totals consistent with the rows that can be locked.

## 3. Snapshot implications

Snapshots are implemented in `vg_so_tiet_tong_hop`.

- A successful year lock computes official SDOs and stores complete JSON SDO rows with version/latest metadata.
- A snapshot is immutable for normal application writes after `vg_khoa_du_lieu` is inserted.
- Existing snapshots are not recomputed automatically when calculation code changes; any correction requires an explicitly governed administrative procedure.
- After a year is locked, personal/faculty preview, faculty statistics, and exports read the snapshot. Before lock, personal/faculty preview can calculate live.

## 4. User-facing behavior

```text
Projected preview (isDuKien=true)
  → live projected sources; no source approval predicate

Official live (isDuKien=false)
  → persisted sources; two-level approval predicates

Locked year
  → snapshot for preview/statistics/export
```

Users may therefore see fewer official hours than projected hours while second-level review is pending. This is expected and should be explained in operational training.

## 5. Verification checklist

- [x] LNQC official query checks `khoa_duyet` and `dao_tao_duyet`.
- [x] KTHP official query checks `khoa_duyet` and `khao_thi_duyet`.
- [x] HDTQ official query checks `khoa_duyet` and `dao_tao_duyet`.
- [x] Year lock checks all three approval predicates.
- [x] Faculty synthesis approval checks the same predicates by faculty.
- [x] KTHP runtime reads parent/child tables, not `vg_coi_cham_ra_de`.
- [x] Snapshot is implemented and used by locked statistics/export.

## 6. Source references

```text
src/repositories/vuotgio_v2/tongHop.repo.js
src/repositories/vuotgio_v2/kthp.repo.js
src/repositories/vuotgio_v2/dataLock.repo.js
src/repositories/vuotgio_v2/duyetTongHop.repo.js
src/services/vuotgio_v2/dataLock.service.js
src/services/vuotgio_v2/preview.controller.js
src/services/vuotgio_v2/snapshotData.service.js
```
