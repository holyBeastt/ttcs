# Routes → Controllers → Services → Repository Map

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.

Format: `Route → Controller → Service → Repository/Mapper → tables`.

## vuotgio_v2

### Views and core aggregation

```text
GET /v2/vuotgio/tong-hop-giang-vien
  → base.controller.getTongHopGV()                         (view)

GET /v2/vuotgio/tong-hop/giang-vien
  → tongHop.controller.tongHopTheoGV()
  → tongHop.service.getCollectionSDO()                     (summary)
      or getCollectionSDODetail()                          (detail=1)
  → tongHop.repo.getDuLieuThoTongHop()
  → stats.service.getLecturerSummary()                     (NCKH, default OFFICIAL)
  → summary.mapper.toCollectionSDO()/toAtomicSDO()
  → OvertimePolicyFactory → PolicyV1/PolicyV2
```

`getCollectionSDODetail()` batch-loads:

```text
getGiangDayByIds()
getLopNgoaiQCByIds()
getKthpByIds()
getDoAnByIds()
getHuongDanThamQuanByIds()
getNhanVienByIds()
getDinhMuc()
statsService.getLecturerSummary()
```

### Single-lecturer APIs

```text
GET /v2/vuotgio/tong-hop/chi-tiet/:MaGV
  → tongHop.controller.chiTietGV()
  → tongHop.service.getAtomicSDO(namHoc, idUser, null, isDuKien)
  → tongHop.repo per-source methods + stats.service.getLecturerRecords()
  → summary.mapper.toAtomicSDO()

GET /v2/vuotgio/tong-hop/data-chuan/:MaGV
  → tongHop.controller.getStandardSummaryData()
  → tongHop.service.getAtomicSDO()

GET /v2/vuotgio/tong-hop/data-snapshot/:MaGV
  → tongHop.controller.getSnapshotSummaryData()
  → snapshotData.service.getSnapshotSDOByUser()
```

### Live source selection

```text
isDuKien=true:
  quychuan + doantotnghiep + VG rows without approval predicates

isDuKien=false:
  giangday + exportdoantotnghiep
  + LNQC(khoa_duyet=1, dao_tao_duyet=1)
  + KTHP(vg_kthp parent: khoa_duyet=1, khao_thi_duyet=1)
  + HDTQ(khoa_duyet=1, dao_tao_duyet=1)
```

Runtime KTHP repositories use `vg_kthp`, `vg_kthp_ra_de`, `vg_kthp_coi_thi`, and `vg_kthp_cham_thi`.

### LNQC

```text
POST /v2/vuotgio/lop-ngoai-quy-chuan
  → lopNgoaiQC.controller.save()
  → lnqc.service.save()
  → lnqc.repo.insertDraft()                    → course_schedule_details

POST /v2/vuotgio/lop-ngoai-quy-chuan/confirm
  → lopNgoaiQC.controller.confirmToMain()
  → lnqc.service.confirmToMain()
  → lnqc.repo.insertOfficial()/deleteDraft()    → vg_lop_ngoai_quy_chuan

POST /v2/vuotgio/lop-ngoai-quy-chuan/approve/:ID
POST /v2/vuotgio/lop-ngoai-quy-chuan/batch-approve
  → lnqc.service.approve()/batchApprove()
  → vg_lop_ngoai_quy_chuan.khoa_duyet
```

### KTHP import and approval

```text
POST /v2/vuotgio/kthp-import/preview
  → coiChamRaDe.file.controller.preview()
  → kthpImport.service.preview()
  → normalized preview token

POST /v2/vuotgio/kthp-import/commit
  → coiChamRaDe.file.controller.commitPreview()
  → kthpImport.service.commit()
  → kthpImportSave.service
  → vg_kthp + one child table

POST /v2/vuotgio/duyet-kthp/batch-approve
  → duyetKTHP.controller.batchApprove()
  → kthp.service.batchApprove()
  → kthp.repo.updateBatchApproval()             → vg_kthp
```

The child table is selected by `loai_kthp`: `ra_de`, `coi_thi`, or `cham_thi`.

### Faculty synthesis approval

```text
GET /v2/vuotgio/tong-hop/duyet-trang-thai
  → duyetTongHop.controller.getApprovalStatus()
  → duyetTongHop.service.getApprovalStatus()
  → duyetTongHop.repo + phongban                → vg_duyet_tong_hop

POST /v2/vuotgio/tong-hop/duyet-khoa
  → duyetTongHop.controller.approveKhoa()
  → duyetTongHop.service.approveKhoa()
  → getUnapprovedCountsByKhoa()                 → LNQC/KTHP/HDTQ
  → upsertApproval()                             → vg_duyet_tong_hop

POST /v2/vuotgio/tong-hop/huy-duyet-khoa
  → duyetTongHop.controller.revokeKhoa()
  → duyetTongHop.service.revokeKhoa()
  → revokeApproval()                             → vg_duyet_tong_hop
```

### Lock and snapshot

```text
POST /v2/vuotgio/tong-hop/khoa-du-lieu
  → dataLock.controller.lockData()
  → dataLock.service.lockData()
      → dataLock.repo.checkNamHocExists()       → namhoc
      → dataLock.repo.getUnapprovedCounts()     → LNQC/KTHP/HDTQ (two-level)
      → duyetTongHop.repo.isAllKhoaApproved()   → vg_duyet_tong_hop + phongban
      → tongHop.service.getCollectionSDODetail("ALL")
      → soTietTongHop.repo.saveSnapshot()       → vg_so_tiet_tong_hop
      → dataLock.repo.insertLockRecord()        → vg_khoa_du_lieu

GET /v2/vuotgio/trang-thai-khoa
  → dataLock.service.getLockStatus()

GET /v2/vuotgio/tong-hop/giang-vien-snapshot
  → snapshotData.service.getSnapshotSDOList()
```

### Preview and export

```text
GET /v2/vuotgio/tong-hop/preview/:MaGV
GET /v2/vuotgio/tong-hop/preview-khoa/:khoa
  → preview.controller
  → if locked: snapshotData.service
  → else: tongHop.service live calculation

GET /v2/vuotgio/xuat-file/excel
  → xuatFile.controller.exportExcel()
  → xuatFile.service.exportExcel()
  → snapshotData.service.getSnapshotSDOByUser()/getSnapshotSDOList()
  → excel.buildWorkbook()

GET /v2/vuotgio/xuat-file/tong-hop
  → xuatFile.controller.exportConsolidated()
  → consolidated/export services
  → snapshot-backed data

GET /v2/vuotgio/tong-hop/khoa
  → tongHop.controller.tongHopTheoKhoa()
  → thongKe.service.getThongKeKhoa()
  → snapshotData.service.getSnapshotSDOList()   (lock required)
```

## nckh_v3

### Type-specific CRUD

Each type-specific controller exposes the same pattern:

```text
GET  /v3/nckh/{type}/metadata
GET  /v3/nckh/{type}/list/:namHoc/:khoaId
GET  /v3/nckh/{type}/:id
POST /v3/nckh/{type}
PUT  /v3/nckh/{type}/:id
DELETE /v3/nckh/{type}/:id
  → type controller
  → typeInput.service / record.service
  → formula.service + nckh repositories
  → nckh_chung + nckh_so_tiet
```

The eight type slugs are `de-tai-du-an`, `bai-bao-khoa-hoc`, `sang-kien`, `giai-thuong`, `de-xuat-nghien-cuu`, `sach-giao-trinh`, `huong-dan-sv-nckh`, and `thanh-vien-hoi-dong` (with the historical alias `hoi-dong-khoa-hoc`).

### Unified records and approvals

```text
GET   /v3/nckh/records/filters
GET   /v3/nckh/records
GET   /v3/nckh/records/:id
DELETE /v3/nckh/records/:id
PATCH /v3/nckh/records/:id/khoa-duyet
PATCH /v3/nckh/records/:id/vien-duyet
PATCH /v3/nckh/records/bulk-approvals
  → record.controller
  → record.service
  → nckhChung.repo / nckhSoTiet.repo
  → nckh_chung + nckh_so_tiet
```

`GET /records` is a management list and can include pending rows. Official stats use the separate stats repository approval gate.

### NCKH import

```text
GET  /v3/nckh/import
POST /v3/nckh/import/preview
POST /v3/nckh/import/save
  → inline importAuthMiddleware in nckhV3Route.js
  → import.controller
  → Excel strategy / import.mapper / quyDinh.service
  → NCKHSaveService.save()
  → nckh_chung + nckh_so_tiet
```

The importer is restricted to the configured Institute NCKH assistant/leader roles and department code. Rule matching conditionally overrides Excel `tongSoTiet`; no classification means the Excel value is retained.

### NCKH stats and export

```text
GET /v3/nckh/stats/giang-vien
GET /v3/nckh/stats/khoa
GET /v3/nckh/stats/hoc-vien
GET /v3/nckh/stats/preview/...
  → stats.controller (scope OFFICIAL or PREVIEW)
  → stats.service
  → stats.repo.buildStatsWhere()
  → nckh_so_tiet + nckh_chung

GET /v3/nckh/export/stats/giang-vien
GET /v3/nckh/export/stats/khoa
GET /v3/nckh/export/stats/hoc-vien
GET /v3/nckh/export/stats/preview/...
  → export.controller → export.service → stats service/repository
```

Official scope adds both `khoa_duyet=1` and `vien_nc_duyet=1`; preview scope adds only the academic-year predicate.

## Mời Giảng (Legacy)
*(No Service or Repository Layers)*

```
POST /daotaonhap
  → multer (middleware)
  → createGvmController.js :: createGvm()
      → INLINE SQL (deduplicate, insert) → gvmoi, lichsunhaplieu

POST /update-qcdk
  → moiGiangQCDKController.js :: updateTableTam()
      → INLINE Formula (LL * HeSoLopDong * HeSoT7CN)
      → INLINE SQL (bulk UPSERT) → tam

GET /gvmList
  → gvmListController.js :: getGvmList()
      → INLINE SQL (ad-hoc filtered by req.session) → gvmoi

GET /duyet-hop-dong-moi-giang
  → hopdong.duyetHopDongMoiGiangController.js :: getDuyetHopDongData()
      → INLINE SQL (CTE query with DON_GIA_EXPR) → tam, gvmoi, he_dao_tao
```

---

## Đồ Án (Legacy)
*(No Service or Repository Layers)*

```
POST /api/doan/quy-chuan/update-do-an
  → doAnChinhThucController.js :: updateDoAn()
      → INLINE Validation (split supervisor names)
      → INLINE SQL (bulk CASE WHEN UPDATE) → doantotnghiep

POST /saveToExportDoAn
  → doAnChinhThucController.js :: saveToExportDoAn()
      → INLINE Business Rules (20/12/8 hours)
      → INLINE SQL (bulk INSERT) → exportdoantotnghiep

GET /duyet-hop-dong-do-an
  → hopdong.duyetHopDongDoAnController.js
      → INLINE SQL (UNION subqueries with DON_GIA_EXPR) → doantotnghiep
```

---

## contract / exportHD

```
GET /exportHD
  → exportHDController.js :: renderExportHDPage()
  → EJS view render

GET /exportHD/export-multiple
  → exportHDController.js :: exportMultipleContracts()
      → gvmServices.getHeDaoTaoData()          → he_dao_tao
      → connection.query()                      → hopdonggvmoi JOIN gvmoi
          (SUM aggregation per lecturer)
      → getTemplateFileName(loaiHopDongId, heDaoTaoData)
      → [for each lecturer]:
          → PizZip.load(templateBuffer)
          → new Docxtemplater(zip, { data: lecturerRecord })
          → render() → write to temp file
      → archiver ZIP → pipe to res
      → deleteFolderRecursive(tempDir) on finish
```

---

## Middleware Application Summary

| Middleware | Applied to | Not applied to / caveat |
|---|---|---|
| `enforceKhoaFilter` | Most LNQC, KTHP, HDTQ reads/mutations | Vượt Giờ synthesis approval status/approve/revoke routes |
| `checkDataLock` | Vượt Giờ LNQC/KTHP/HDTQ/DATN mutations | Lock creation; some approval routes; NCKH routes use their own approval guards |
| NCKH `importAuthMiddleware` | `/v3/nckh/import`, `/import/preview`, `/import/save` | Inline route guard; no per-row target-faculty authorization |
| `requireLogin` / application auth | Authenticated application routes | Public/static assets |
