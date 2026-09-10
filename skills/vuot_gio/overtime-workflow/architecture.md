# Architecture Mapping

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**.

## Request and aggregation layers

- `src/routes/vuotGioV2Route.js` — `/v2/vuotgio` route registration.
- `src/controllers/vuotgio_v2/tongHop.controller.js` — live and snapshot SDO endpoints.
- `src/controllers/vuotgio_v2/preview.controller.js` — snapshot-after-lock/live-before-lock preview selection.
- `src/services/vuotgio_v2/tongHop.service.js` — `getAtomicSDO()`, `getCollectionSDO()`, `getCollectionSDODetail()`.
- `src/repositories/vuotgio_v2/tongHop.repo.js` — projected/official source selection and batch fetches.
- `src/repositories/vuotgio_v2/kthp.repo.js` — current KTHP parent/child runtime model and two-level approval filtering.

## Calculation layers

- `src/mappers/vuotgio_v2/summary.mapper.js`
  - `toAtomicSDO()` / `toCollectionSDO()` shape SDOs;
  - `buildTableF()` builds the five training-system categories;
  - calls the policy returned by `OvertimePolicyFactory`.
- `src/mappers/vuotgio_v2/policies/OvertimePolicyFactory.js` — explicit V2 year list and V1 fallback.
- `src/mappers/vuotgio_v2/policies/PolicyV1.js` — percentage-based teaching-quota reduction.
- `src/mappers/vuotgio_v2/policies/PolicyV2.js` — 80%-of-280 teaching quota when exemption is positive.
- `src/services/vuotgio_v2/department_excel/data/calculator.js` — `computeSdoBreakdown()` and `ROUND(luong / 176, 0)` payment rate.

## NCKH integration

- `src/services/nckh_v3/stats.service.js` — lecturer totals/records.
- `src/repositories/nckh_v3/stats.repo.js` — `OFFICIAL` requires `khoa_duyet=1 AND vien_nc_duyet=1`; `PREVIEW` filters by year only.
- `tongHop.service.js` calls the NCKH functions without a scope, so Vượt Giờ receives the default `OFFICIAL` totals.

## Lock, snapshot, and output

- `src/services/vuotgio_v2/dataLock.service.js` — validates two-level approvals and faculty synthesis approval, computes official SDOs via a separate service-managed connection, and saves snapshot/lock atomically in the lock transaction.
- `src/services/vuotgio_v2/snapshotData.service.js` — requires a locked year and parses `vg_so_tiet_tong_hop.chi_tiet`.
- `src/services/vuotgio_v2/thongKe.service.js` — faculty statistics from snapshot.
- `src/services/vuotgio_v2/xuatFile.service.js` — Excel export from snapshot.
- `vg_so_tiet_tong_hop` — versioned snapshot table; not planned/deferred.

## Runtime KTHP tables

```text
vg_kthp
├── vg_kthp_ra_de
├── vg_kthp_coi_thi
└── vg_kthp_cham_thi
```

`vg_coi_cham_ra_de` is a legacy/historical name, not the current runtime aggregation table.
