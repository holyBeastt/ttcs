# Kiến Trúc Tổng Hợp Dữ Liệu Vượt Giờ (Data Consolidation Architecture)

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. Khi tài liệu mâu thuẫn với source code, source code là nguồn quyết định.

Tài liệu này giải thích cách Vượt Giờ V2 gom dữ liệu theo `nhanvien.id_User`, phân biệt nguồn dự kiến/chính thức và chuyển kết quả sang snapshot.

## 1. Khóa gom nhóm: `id_User`

`id_User` là khóa nội bộ để group SDO. Mọi nguồn phải được map về nhân viên nội bộ trước khi tính tổng; dữ liệu hiển thị tên không được dùng làm khóa group cuối cùng.

## 2. Hai chế độ live

### A. Chính thức (`isDuKien=false`)

Nguồn chính thức được query từ các bảng runtime:

| Nguồn | Bảng | Cách map `id_User` |
|---|---|---|
| Giảng dạy | `giangday` | `gd.id_User` |
| LNQC | `vg_lop_ngoai_quy_chuan` | `lnqc.id_User` |
| KTHP | `vg_kthp` + child tables | `p.id_user` trên parent |
| DATN | `exportdoantotnghiep` | `COALESCE(da.id_User, nv.id_User)`; join CCCD khi cần |
| HDTQ | `vg_huong_dan_tham_quan_thuc_te` | `t.id_User` |

Official aggregation adds the approval predicates required by each source: LNQC/HDTQ need `khoa_duyet=1 AND dao_tao_duyet=1`; KTHP needs `khoa_duyet=1 AND khao_thi_duyet=1`. DATN excludes `isMoiGiang != 0`.

`exportdoantotnghiep` is not universally `id_User IS NULL`; current SQL uses a stored ID when available and falls back to an employee match by CCCD.

### B. Dự kiến (`isDuKien=true`)

Projected data is live and is used for preview:

| Nguồn | Bảng/đầu vào | Mapping |
|---|---|---|
| Giảng dạy | `quychuan` | `processQuyChuanData()` loads employee data and maps rows in memory; only `MoiGiang=0` is processed |
| DATN | `doantotnghiep` | `transformDoAnData()` then maps internal lecturers by CCCD first and name as fallback |
| LNQC/KTHP/HDTQ | Current runtime tables | Query without approval predicate for preview |

Projected mapping is a convenience for estimation, not a replacement for official persisted IDs. The source still filters the resulting rows to the requested faculty/lecturer set.

## 3. Batch consolidation flow

`tongHop.service.getCollectionSDODetail()`:

1. loads the lecturer list (excluding `id_User = 1`);
2. loads each source in a batch query;
3. groups each result array by `id_User` in memory;
4. loads approved NCKH totals through `statsService.getLecturerSummary()` (default `OFFICIAL`);
5. builds one raw-data object per lecturer;
6. calls `summary.mapper.toAtomicSDO()` and the policy factory;
7. returns full SDOs for snapshot or preview.

Non-faculty staff (`phongban.isKhoa=0`) are grouped under `BGĐ&PHONG`.

## 4. Snapshot boundary

When `dataLock.service.lockData()` succeeds, it computes the official collection and writes each complete SDO as JSON in `vg_so_tiet_tong_hop.chi_tiet`, with version/latest metadata. Faculty statistics and Excel exports require this snapshot. Personal/faculty preview uses snapshot after lock and live calculation before lock.

## 5. Implementation guidance

- Prefer `id_User`; use CCCD only as the documented DATN fallback when the source row lacks a usable ID.
- Do not describe `quychuan` or transformed `doantotnghiep` as official persisted sources.
- Do not use the legacy KTHP table name in runtime diagrams; current runtime is `vg_kthp` plus `vg_kthp_ra_de`, `vg_kthp_coi_thi`, and `vg_kthp_cham_thi`.
- Keep the default NCKH scope explicit when changing Vượt Giờ cross-module queries, because it changes overtime eligibility.
