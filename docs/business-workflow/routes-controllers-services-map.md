# Routes → Controllers → Services → Repository Map

Full trace for each domain module. Format: `Route → Controller.method → Service.method → Repo.method → Tables`.

---

## vuotgio_v2

### Core Aggregation

```
GET /v2/vuotgio/tong-hop/giang-vien
  → tongHop.controller.js :: tongHopTheoGV()
  → tongHop.service.js :: getCollectionSDO()
      → tongHop.repo.js :: getAllNhanVien()        → nhanvien, phongban
      → tongHop.repo.js :: getAllGiangDay()        → giangday
      → tongHop.repo.js :: getAllLNQC()            → vg_lop_ngoai_quy_chuan (khoa_duyet=1)
      → tongHop.repo.js :: getAllKTHP()            → vg_coi_cham_ra_de (khoa_duyet=1)
      → tongHop.repo.js :: getAllDoAn()            → exportdoantotnghiep (isMoiGiang=0)
      → tongHop.repo.js :: getAllHDTQ()            → vg_huong_dan_tham_quan_thuc_te (khoa_duyet=1)
      → [NCKH cross-module fetch]                  → nckh_so_tiet
      → shared.repo.js :: getDinhMuc()             → sotietdinhmuc
      → summary.mapper.js :: toAtomicSDO() [×N]
          → summary.mapper.js :: calculateOvertime()
          → summary.mapper.js :: buildTableF()

GET /v2/vuotgio/tong-hop/chi-tiet/:MaGV
  → tongHop.controller.js :: chiTietGV()
  → tongHop.service.js :: getAtomicSDO(namHoc, idUser)
      → tongHop.repo.js :: getNhanVienById()        → nhanvien, phongban
      → tongHop.repo.js :: getGiangDayByIdUser()    → giangday
      → tongHop.repo.js :: getLopNgoaiQCByIdUser()  → vg_lop_ngoai_quy_chuan
      → tongHop.repo.js :: getKTHPByIdUser()        → vg_coi_cham_ra_de
      → tongHop.repo.js :: getDoAnByIdUser()        → exportdoantotnghiep
      → tongHop.repo.js :: getHDTQByIdUser()        → vg_huong_dan_tham_quan_thuc_te
      → shared.repo.js :: getDinhMuc()              → sotietdinhmuc
      → summary.mapper.js :: toAtomicSDO()
```

### Non-Standard Classes (LNQC)

```
POST /v2/vuotgio/lop-ngoai-quy-chuan       [KF, DL]
  → lopNgoaiQC.controller.js :: save()
  → lnqc.service.js :: save()
      → lnqc.repo.js :: insertDraft()       → course_schedule_details

POST /v2/vuotgio/lop-ngoai-quy-chuan/confirm   [KF, DL]
  → lopNgoaiQC.controller.js :: confirmToMain()
  → lnqc.service.js :: confirmToMain()
      → lnqc.repo.js :: getDraftRecords()   → course_schedule_details
      → lnqc.repo.js :: insertOfficial()    → vg_lop_ngoai_quy_chuan
      → lnqc.repo.js :: deleteDraft()       → course_schedule_details

POST /v2/vuotgio/lop-ngoai-quy-chuan/approve/:ID   [KF, DL]
  → lopNgoaiQC.controller.js :: approve()
  → lnqc.service.js :: approve()
      → lnqc.repo.js :: setKhoaDuyet(id, 1) → vg_lop_ngoai_quy_chuan

POST /v2/vuotgio/lop-ngoai-quy-chuan/batch-approve   [KF, DL]
  → lopNgoaiQC.controller.js :: batchApprove()
  → lnqc.service.js :: batchApprove()
      → lnqc.repo.js :: batchSetKhoaDuyet() → vg_lop_ngoai_quy_chuan

POST /v2/vuotgio/lop-ngoai-qc/confirm-import   [KF, DL]
  → lopNgoaiQCImport.controller.js :: confirmImport()
  → lnqcImport.service.js :: confirmImport()
      → lnqc.repo.js :: insertOfficial()    → vg_lop_ngoai_quy_chuan
```

### Exam Workload (KTHP)

```
POST /v2/vuotgio/them-kthp   [KF, DL]
  → themKTHP.controller.js :: save()
  → kthp.service.js :: save()
      → kthp.repo.js :: insert()            → vg_coi_cham_ra_de

POST /v2/vuotgio/import-kthp/import   [KF, DL]
  → coiChamRaDe.file.controller.js :: importWorkloadToDB()
  → kthpImport.service.js :: importToDB()
      → kthp.repo.js :: bulkInsert()        → vg_coi_cham_ra_de

POST /v2/vuotgio/duyet-kthp/batch-approve   [KF, DL]
  → duyetKTHP.controller.js :: batchApprove()
  → kthp.service.js :: batchApprove()
      → kthp.repo.js :: batchSetKhoaDuyet() → vg_coi_cham_ra_de
```

### Data Lock

```
GET /v2/vuotgio/trang-thai-khoa
  → dataLock.controller.js :: getLockStatus()
  → dataLock.service.js :: getLockStatus(namHoc)
      → dataLock.repo.js :: getLockRecordWithUserName() → vg_khoa_du_lieu, nhanvien

POST /v2/vuotgio/tong-hop/khoa-du-lieu
  → dataLock.controller.js :: lockData()
  → dataLock.service.js :: lockData(namHoc, userId, ghiChu)
      → dataLock.repo.js :: checkNamHocExists()     → namhoc
      → dataLock.repo.js :: getLockRecord()         → vg_khoa_du_lieu
      → dataLock.repo.js :: getUnapprovedCounts()   → vg_lop_ngoai_quy_chuan,
                                                        vg_coi_cham_ra_de,
                                                        vg_huong_dan_tham_quan_thuc_te
      → duyetTongHop.repo.js :: isAllKhoaApproved() → vg_duyet_tong_hop, phongban
      → dataLock.repo.js :: insertLockRecord()      → vg_khoa_du_lieu
```

### Faculty Synthesis Approval

```
GET /v2/vuotgio/tong-hop/duyet-trang-thai
  → duyetTongHop.controller.js :: getApprovalStatus()
  → duyetTongHop.service.js :: getApprovalStatus(namHoc)
      → phongban (isKhoa=1) + duyetTongHop.repo.js :: getApprovalStatus() → vg_duyet_tong_hop

POST /v2/vuotgio/tong-hop/duyet-khoa
  → duyetTongHop.controller.js :: approveKhoa()
  → duyetTongHop.service.js :: approveKhoa(namHoc, khoa)
      → duyetTongHop.repo.js :: getUnapprovedCountsByKhoa()
          → vg_lop_ngoai_quy_chuan, vg_coi_cham_ra_de, vg_huong_dan_tham_quan_thuc_te
      → duyetTongHop.repo.js :: upsertApproval()    → vg_duyet_tong_hop

POST /v2/vuotgio/tong-hop/huy-duyet-khoa
  → duyetTongHop.controller.js :: revokeKhoa()
  → duyetTongHop.service.js :: revokeKhoa()
      → duyetTongHop.repo.js :: revokeApproval()    → vg_duyet_tong_hop
```

### Excel Export

```
GET /v2/vuotgio/xuat-file/excel
  → xuatFile.controller.js :: exportExcel()
  → xuatFile.service.js :: exportExcel(namHoc, khoa, giangVien)
      → _resolveSummaries()
          → tongHop.service.js :: getAtomicSDO() [×N]
      → excel/index.js :: buildWorkbook(summaries)
          → keKhaiReport.generator.js [per lecturer sheet]
  → HTTP response (.xlsx)

GET /v2/vuotgio/xuat-file/tong-hop
  → xuatFile.controller.js :: exportConsolidated()
  → consolidatedExport.service.js
      → department_excel/ generators
  → HTTP response (.xlsx)
```

---

## nckh_v3

```
POST /v3/nckh/import/:type
  → importController.js :: importExcel()
  → import.service.js :: importFromBuffer()
      → import.mapper.js :: mapRows()
      → quyDinh.service.js :: getHourRule()   → [schema-discovered table]
      → resolve MaSoCanBo → nhanvien.id_User
      → formula.service.js :: buildParticipantsByMode()
      → connection.beginTransaction()
      → nckhChung.repo.js :: insert()          → nckh_chung
      → nckhSoTiet.repo.js :: bulkInsert()     → nckh_so_tiet
      → nckhSoTiet.repo.js :: sumHours()       → nckh_so_tiet [integrity check]
      → connection.commit()

GET /v3/nckh/list/:type
  → recordController.js :: list()
  → record.service.js :: list()
      → nckhChung.repo.js :: listUnified()
          → nckh_chung, nckh_so_tiet, nhanvien, phongban

POST /v3/nckh/approve/:id
  → recordController.js :: approve()
  → record.service.js :: approve()
      → nckhChung.repo.js :: setKhoaDuyet(id, 1) → nckh_chung

GET /v3/nckh/export/lecturer/:namHoc
  → exportController.js :: exportLecturer()
  → export.service.js :: exportForLecturer()
      → stats.repo.js :: listLecturerSummary()
          → nckh_so_tiet, nhanvien, phongban, nckh_chung (khoa_duyet=1 AND vien_nc_duyet=1)
      → ExcelJS workbook builder
```

---

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

| Middleware | Applied To | Not Applied To |
|-----------|-----------|---------------|
| `enforceKhoaFilter` | All LNQC, KTHP, HDTQ mutate + read routes | `duyet-khoa`, `huy-duyet-khoa`, `duyet-trang-thai` |
| `checkDataLock` | All LNQC, KTHP, HDTQ, DATN mutate routes | Lock creation route, approval routes |
| `requireLogin` | All authenticated routes (applied at router level) | Public/static assets |
