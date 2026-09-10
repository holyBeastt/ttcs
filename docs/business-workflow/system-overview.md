# System Overview — TTCS Academic Workload Management System

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.

## Purpose

TTCS collects teaching, research, and auxiliary workload; applies approval and quota rules; produces per-lecturer SDOs; locks academic years; and generates Excel/Word/finance outputs.

## Technology and architecture

TTCS is a Node.js CommonJS/Express application using EJS, MySQL raw SQL, `mysql2`, `multer`, ExcelJS, PizZip/docxtemplater, and archiver. New workload modules use:

```text
Route → Controller → Service → Repository/Mapper → MySQL
```

Mời Giảng, Đồ Án, and several contract flows remain controller-centric legacy code.

## Main modules

| Module | Prefix | Role |
|---|---|---|
| `vuotgio_v2` | `/v2/vuotgio` | Vượt Giờ data entry, two-level approval, aggregation, lock/snapshot, export |
| `nckh_v3` | `/v3/nckh` | Eight NCKH types, allocation, two approval flags, stats, export |
| Mời Giảng | various | Invited lecturer legacy workflow |
| Đồ Án | various | Thesis/project legacy workflow |
| ExportHD/UNC | various | Contract and payment document generation |

## Vượt Giờ production flow

```text
Projected: quychuan + doantotnghiep + VG rows without approval predicates
Official:  giangday + exportdoantotnghiep
           + LNQC(khoa_duyet=1, dao_tao_duyet=1)
           + KTHP(khoa_duyet=1, khao_thi_duyet=1)
           + HDTQ(khoa_duyet=1, dao_tao_duyet=1)

→ tongHop.service
→ summary.mapper.toAtomicSDO()/toCollectionSDO()
→ OvertimePolicyFactory → PolicyV1/PolicyV2
→ SDO
```

The NCKH cross-module call uses `statsService.getLecturerSummary()`/`getLecturerRecords()` without a scope, so the default NCKH `OFFICIAL` scope requires both `khoa_duyet` and `vien_nc_duyet`.

`summary.mapper.calculateOvertime()` is an internal non-exported helper and not the production entry point.

## NCKH production flow

```text
Manual or Excel input
  → import/type strategy
  → formula.service (standard/equal/fixed)
  → nckh_chung + nckh_so_tiet
  → rounded sum integrity check
  → approval flags
  → stats scope (OFFICIAL/PREVIEW) and export
```

Official stats use both approval flags. Preview stats filter by year only. The management `GET /v3/nckh/records` list may include pending records.

## Key runtime tables

| Table | Role |
|---|---|
| `giangday` | Official normalized teaching |
| `quychuan` | Projected teaching input |
| `course_schedule_details` | LNQC draft staging |
| `vg_lop_ngoai_quy_chuan` | Official LNQC |
| `vg_kthp` | KTHP parent/approval row |
| `vg_kthp_ra_de` | KTHP paper-setting detail |
| `vg_kthp_coi_thi` | KTHP proctoring detail |
| `vg_kthp_cham_thi` | KTHP grading detail |
| `doantotnghiep` | Projected DATN source |
| `exportdoantotnghiep` | Official DATN source |
| `vg_huong_dan_tham_quan_thuc_te` | HDTQ source |
| `vg_duyet_tong_hop` | Faculty synthesis approval |
| `vg_khoa_du_lieu` | Year lock |
| `vg_so_tiet_tong_hop` | Versioned SDO snapshot |
| `sotietdinhmuc` | Global `GiangDay`/`NCKH` quotas |
| `nckh_chung` | NCKH master records |
| `nckh_so_tiet` | NCKH participant/year hours |
| `nhanvien`, `phongban` | Shared lecturer/department data |

## Lock, snapshot, and exports

`dataLock.service.lockData()` validates year existence, two-level approval on the
three Vượt Giờ approval tables, and faculty synthesis approval. It computes
official SDOs through a separate service-managed connection, then stores complete
JSON in `vg_so_tiet_tong_hop` and the lock record atomically in the lock
transaction.

- Personal/faculty preview: snapshot after lock, live before lock.
- Faculty statistics and Excel export: snapshot required.
- Middleware-protected Vượt Giờ writes after lock: blocked by `checkDataLock`;
  synthesis approval routes are separate (revoke has a service lock check,
  approve does not).
- No public unlock route exists.
