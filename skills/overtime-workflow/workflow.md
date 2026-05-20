# Overtime Workflow (concise)

1. Data sources (per academic year/semester):
   - `giangday` (core teaching records)
   - `vg_coi_cham_ra_de` (KTHP: coi/ra đề/chấm)
   - `vg_lop_ngoai_quy_chuan` (external classes)
   - `exportdoantotnghiep` (guidance for theses/projects)
   - `vg_huong_dan_tham_quan_thuc_te` (field trip guidance)
   - NCKH data from `nckh_v3` via `stats.service.js`

2. Inclusion rules:
   - Only records with `khoa_duyet = 1` are counted by current aggregation queries (see repos).
   - `id_User = 1` is excluded from lecturers list.

3. Aggregation:
   - Aggregator builds an Atomic SDO per lecturer in `tongHop.service.getAtomicSDO`.
   - `summary.mapper.calculateOvertime` implements the canonical formula.

4. Approval & Export:
   - Per-record approvals (department/test) prevent edits/deletes once set.
   - Exports rely on SDO outputs; snapshots (`vg_so_tiet_tong_hop`) are planned but currently deferred.

5. Snapshot semantics (future):
   - Once snapshot is implemented, historical views must be read from `vg_so_tiet_tong_hop.chi_tiet` JSON.
