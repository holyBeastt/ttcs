# Architecture Mapping

Key files and responsibilities (project-specific):

- Aggregation & orchestration:
  - `src/services/vuotgio_v2/tongHop.service.js` — build Atomic/Collection SDOs

- Core formulas and mapping:
  - `src/mappers/vuotgio_v2/summary.mapper.js` — `calculateOvertime` delegates to `OvertimePolicyFactory`, `toAtomicSDO`, `toCollectionSDO`
  - `src/mappers/vuotgio_v2/policies/OvertimePolicyFactory.js` — Strategy Pattern factory determining policy version based on academic year.
  - `src/mappers/vuotgio_v2/policies/PolicyV1.js` — V1 calculation logic (<= 2024-2025).
  - `src/mappers/vuotgio_v2/policies/PolicyV2.js` — V2 calculation logic (>= 2025-2026, 80% quota rule).

- Repositories (data access):
  - `src/repositories/vuotgio_v2/tongHop.repo.js` — aggregation queries for giangday, lnqc, kthp, da, hdtq
  - `src/repositories/vuotgio_v2/kthp.repo.js` — KTHP CRUD and approval updates

- NCKH integration:
  - `src/services/nckh_v3/stats.service.js` — lecturer NCKH totals used by mapper

- Export & reports:
  - `src/services/vuotgio_v2/xuatFile.service.js` — Excel export scaffold
  - `src/services/vuotgio_v2/thongKe.service.js` — grouping and projections

- DB schema:
  - `docs/vuogio_v2/database/vg_so_tiet_tong_hop.sql` — planned snapshot table

Transaction & approval patterns:
- Use transactions in batch inserts (`kthp.service.saveBatch`) and some batch updates, but many per-record updates iterate over records (opportunity to bulk).
- Approval flags: `khoa_duyet`, `khao_thi_duyet` — `khoa_duyet` currently used to gate inclusion.
