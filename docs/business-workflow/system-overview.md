# System Overview — TTCS Academic Workload Management System

## Purpose

TTCS is a university-internal workload management system. Its core function is to:

1. **Collect** teaching, research, and auxiliary workload records from multiple sources.
2. **Aggregate** those records into per-lecturer standardized data objects (SDOs).
3. **Apply business rules** (quotas, exemptions, approval gates) to compute overtime hours and payment amounts.
4. **Generate** formal university documents: Excel workload declarations and Word contract appendices.
5. **Enforce** a multi-level approval workflow before any year's data is finalized.

The system is **not** a generic CRUD application. It is a business-rule-heavy backend with domain logic spread across a layered calculation stack.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (CommonJS modules) |
| HTTP Framework | Express 4 |
| Templating | EJS (server-rendered HTML) |
| Database | MySQL (raw SQL via `mysql2` pool) |
| ORM | None — all queries are hand-written SQL |
| Document Generation | `docxtemplater` + `pizzip` (Word), `ExcelJS` (Excel), `archiver` (ZIP) |
| Session | `express-session` (server-side) |
| File Upload | `multer` (memory storage) |

---

## Architectural Pattern

```
HTTP Request
  → Express Router  (src/routes/)
  → Auth Middleware  (requireLogin, enforceKhoaFilter, checkDataLock)
  → Controller       (src/controllers/)
  → Service          (src/services/)
  → Repository       (src/repositories/)
  → MySQL Pool       (src/config/databasePool.js)
```

**Connection patterns used:**
- `createPoolConnection()` — caller acquires and must release the connection manually in a `finally` block.
- `withConnection(fn)` — RAII-style wrapper that auto-releases; used in `dataLock.service.js` and `duyetTongHop.service.js`.

**Mapper layer** (`src/mappers/`) sits between repositories and services. It holds all overtime calculation formulas and shapes raw DB rows into Standardized Data Objects (SDOs). This is the primary **business rule calculation layer**.

### Legacy Workflows (Controller-Centric)
Not all modules follow this MVC pattern. Several legacy domains (e.g., Mời Giảng, Đồ Án) use a **controller-centric architecture**, where validation, business logic, file handling, and inline SQL execution are tightly coupled within a single monolithic controller. See [Controller-Centric Legacy Modules](./controller-centric-legacy-modules.md) for details.

---

## Main Domain Modules

| Module | Route Prefix | Description |
|--------|-------------|-------------|
| `vuotgio_v2` | `/v2/vuotgio` | Teaching overtime: data entry, approval, aggregation, export |
| `nckh_v3` | `/v3/nckh` | Research workload: import, formula application, approval, export |
| Mời Giảng | Various | Invited lecturer registration, normalization, and list management (Legacy) |
| Đồ Án | Various | Thesis/project supervision workload and supervisor assignment (Legacy) |
| `exportHD` | `/exportHD` | Contract/appendix generation for guest lecturers (Legacy) |
| Access Control | (middleware) | Session-based RBAC + attribute-based faculty scoping |
| `thongkevuotgio` | `/thongkevuotgio` | Teaching statistics charts and filters |

---

## Data Flow Summary

### Teaching Overtime (VuotGio)

```
TKB Import → giangday table (QuyChuan pre-normalized)
Faculty Entry → course_schedule_details (LNQC draft)
             → vg_lop_ngoai_quy_chuan (after confirmToMain)
Faculty Entry → vg_coi_cham_ra_de (exam/proctoring work)
Faculty Entry → exportdoantotnghiep (thesis supervision)
Faculty Entry → vg_huong_dan_tham_quan_thuc_te (field-trip guidance)
                         ↓
               tongHop.service.js → getAtomicSDO()
                         ↓
               summary.mapper.js → calculateOvertime()
                         ↓
               SDO (Standardized Data Object) per lecturer
                         ↓
               Excel export (xuatFile.service.js)
                  or Web view (tongHop.controller.js)
```

### Research Workload (NCKH)

```
Excel Import → import.service.js → nckh_chung (master record)
                                 → nckh_so_tiet (per-participant hours)
                         ↓ formula.service.js (3 modes)
               stats.repo.js aggregation
                         ↓
               export.service.js → ExcelJS workbook
```

### Contract Generation

```
hopdonggvmoi table (pre-populated)
  → exportHDController.js → getTemplateFileName()
  → src/templates/*.docx (5 templates)
  → docxtemplater fill
  → ZIP archive → HTTP response stream
```

---

## Key Database Tables

| Table | Module | Role |
|-------|--------|------|
| `giangday` | VuotGio | Teaching records (QuyChuan = normalized hours) |
| `vg_lop_ngoai_quy_chuan` | VuotGio | Confirmed non-standard class records |
| `course_schedule_details` | VuotGio | LNQC draft staging table |
| `vg_coi_cham_ra_de` | VuotGio | Exam/proctoring/grading/paper-setting work |
| `exportdoantotnghiep` | VuotGio | Thesis/project supervision hours |
| `vg_huong_dan_tham_quan_thuc_te` | VuotGio | Field-trip guidance hours |
| `vg_khoa_du_lieu` | VuotGio | Year-level data lock records |
| `vg_duyet_tong_hop` | VuotGio | Faculty-level synthesis approval records |
| `sotietdinhmuc` | VuotGio | Global quota thresholds (one row) |
| `nckh_chung` | NCKH | Research work master records |
| `nckh_so_tiet` | NCKH | Per-participant normalized research hours |
| `nhanvien` | Shared | Lecturer/staff profiles and exemption data |
| `phongban` | Shared | Departments; `isKhoa=1` marks a Faculty |
| `hopdonggvmoi` | Contract | Guest lecturer contract data |
| `he_dao_tao` | Contract | Training system levels (cap_do, loai_hinh) |
| `namhoc` | Shared | Valid academic year registry |

---

## Approval Workflow Overview

```
[Faculty enters data]
       ↓
[Department Head approves] → khoa_duyet = 1
       ↓
[Second-level approval]
  LNQC  → dao_tao_duyet = 1   (Training Office)
  KTHP  → khao_thi_duyet = 1  (Exam Office)
  HDTQ  → dao_tao_duyet = 1   (Training Office)
       ↓
[Faculty synthesis approved] → vg_duyet_tong_hop.van_phong_duyet = 1
       ↓
[All faculties approved] → isAllKhoaApproved() = true
       ↓
[Year locked] → INSERT vg_khoa_du_lieu
```

Post-lock: all `POST`, `PUT`, `DELETE` operations are blocked by `checkDataLock` middleware.
