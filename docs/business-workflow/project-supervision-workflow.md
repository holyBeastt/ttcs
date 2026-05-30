# Project/Thesis Supervision (Đồ Án) Workflow

This document describes the workflow for managing thesis and project supervision (Đồ án tốt nghiệp), which is implemented as a **controller-centric legacy workflow** without distinct service or repository layers.

---

## 1. Thesis Data Entry & Supervisor Assignment

**Route:** `/doAnChinhThuc` etc.  
**File Evidence:** `src/controllers/doAnChinhThucController.js` (1947 lines)

### Lecturer Resolution (Inline SQL)
The controller fetches lecturers from both `gvmoi` (guests) and `nhanvien` (internal staff) via inline SQL (`getInfoGiangVien`).
- **Deduplication:** Normalizes names by stripping parenthetical suffixes using regex `/\s*\(.*?\)\s*/g`.
- **System Record Exclusion:** Hardcodes `id_Gvm != 1` to exclude system records.

### Role-Split Logic & Validation (Confirmed)
In `updateDoAn`:
- **Faculty Mode (`isKhoa == 1`):** Validates supervisor names and only processes rows where `KhoaDuyet == 1`.
  - Supervisors can be provided as a dash-delimited string (`"HoTen - BienChe - CCCD"`) or as a plain name.
  - Dash-delimited format splits on `"-"` to match all three fields.
  - Plain names match against a unique list (ambiguous names require CCCD).
  - Providing `"không"` (case-insensitive) for `GiangVien2` indicates a single supervisor.
- **Admin Mode:** Performs bulk `CASE WHEN` inline SQL updates for approval fields (`KhoaDuyet`, `DaoTaoDuyet`, `TaiChinhDuyet`).

---

## 2. Workload Record Creation (Export Table)

**File Evidence:** `doAnChinhThucController.js` (`saveToExportDoAn`)

### The 20/12/8 Hour Rule (Confirmed)
The workload split is hardcoded inline:
- **1 Supervisor:** 20 hours (tiết).
- **2 Supervisors:** Primary supervisor = 12 hours, Secondary supervisor = 8 hours.

### Parsing Logic (Inline)
- **`isMoiGiang` Flag:** Detected by splitting the primary supervisor's string by `" - "` to read the `BienChe` field (`"cơ hữu"` = `0`, otherwise = `1`).
- **`KhoaDaoTao` (Training Faculty):** Extracted by slicing the first 4 characters of the student ID (`MaSV.slice(0, 4)`).

### SQL Insertion
Records are bulk-inserted directly into the staging table `exportdoantotnghiep` using inline SQL.

---

## 3. Contract Approval

**File Evidence:** `src/controllers/hopdong.duyetHopDongDoAnController.js`

### Duplicated 20/12/8 Rule (Confirmed)
The controller uses a shared helper `buildDoAnBaseQuery()` to construct a `UNION ALL` subquery.
- **Duplication Risk:** The 20/12/8 hour rule is hardcoded in this SQL query using a `CASE` statement (`CASE WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 20 ELSE 12 END`). This must be kept manually in sync with the logic in `saveToExportDoAn`.

### Unit Price & Tax (Confirmed)
- Uses the shared `DON_GIA_EXPR` macro from `hopdongQueries.js`.
- Tax is hardcoded as 10% of gross payment (`Thue = ThanhTien * 0.1`), duplicating the same rule from the Mời Giảng contract approval.
- Contracts are filtered to only show records with `TaiChinhDuyet = 1` (Finance approved).

---

## Recommendations for Refactoring
- **Consolidate Business Rules:** Move the 20/12/8 hour rule and the 10% tax rule to a shared configuration or calculation service to prevent duplicated hardcoded values.
- **Extract Inline SQL:** Move the complex `UPDATE ... CASE WHEN` and `UNION ALL` queries into dedicated repository methods.
- **Improve Parsing:** Stop parsing supervisor types and student faculties from raw strings (`split(" - ")` and `slice(0,4)`). Use proper foreign key relationships to lookup structured data.
