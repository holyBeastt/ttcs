# Contract Generation

This document describes the workflow for generating Word contract documents for guest lecturers.

---

## Overview

Contracts are generated from pre-populated data in the `hopdonggvmoi` table. The system selects a Word template based on training system metadata, fills it using `docxtemplater`, and delivers either individual files or a ZIP archive. This module follows a [controller-centric legacy pattern](./controller-centric-legacy-modules.md).

**Controller:** `src/controllers/exportHDController.js` (~3033 lines, monolithic)  
**Dependencies:** `docxtemplater`, `pizzip`, `archiver`, `exceljs`  
**Templates:** `src/templates/*.docx`

---

## Route → Controller Map

| Method | Path | Handler |
|--------|------|---------|
| GET | `/exportHD` | `renderExportHDPage()` — view render |
| GET | `/exportHD/export-multiple` | `exportMultipleContracts()` |
| GET | `/exportHD/export-single/:id` | `exportSingleContract()` |

*Note: Exact route registration is in the main server.js or a dedicated route file. Handlers are confirmed from controller function names.*

---

## Template Selection

**File:** `exportHDController.js → getTemplateFileName(loaiHopDongId, heDaoTaoData)`

The template is selected by joining `loaiHopDongId` against the `he_dao_tao` table and evaluating two fields:

| `he_dao_tao.loai_hinh` | `he_dao_tao.cap_do` | Template File |
|------------------------|---------------------|--------------|
| `đồ án` | any | `HopDongDA.docx` |
| `mời giảng` | 1 | `HopDongHP.docx` (Undergraduate) |
| `mời giảng` | 2 | `HopDongMM.docx` (Master) |
| `mời giảng` | 3 | `HopDongCH.docx` (Postgraduate) |
| `mời giảng` | 4 | `HopDongNCS.docx` (PhD) |
| any other combination | — | `null` → HTTP 400 |

**Evidence:** `exportHDController.js → getTemplateFileName()` lines 315–345 (approx).

---

## Data Source

**File:** `exportHDController.js → exportMultipleContracts()`

```sql
SELECT
  hd.id_Gvm, hd.DienThoai, hd.Email, hd.MaSoThue, hd.DanhXung,
  hd.HoTen, hd.NgaySinh, hd.HocVi, hd.ChucVu, hd.HSL,
  hd.CCCD, hd.NoiCapCCCD, hd.DiaChi, hd.STK, hd.NganHang,
  MIN(hd.NgayBatDau) AS NgayBatDau,
  MAX(hd.NgayKetThuc) AS NgayKetThuc,
  SUM(hd.SoTiet)  AS SoTiet,
  SUM(hd.SoTien)  AS SoTien,
  SUM(hd.TruThue) AS TruThue,
  SUM(hd.ThucNhan) AS ThucNhan,
  hd.NgayCap, hd.NgayNghiemThu, hd.Dot, hd.KiHoc, hd.NamHoc,
  hd.MaPhongBan, hd.MaBoMon, hd.NoiCongTac,
  hd.SoHopDong, hd.SoThanhLyHopDong, hd.CoSoDaoTao
FROM hopdonggvmoi hd
JOIN gvmoi gv ON hd.id_Gvm = gv.id_Gvm
WHERE hd.Dot = ? AND hd.KiHoc = ? AND hd.NamHoc = ? AND hd.he_dao_tao = ?
GROUP BY hd.HoTen, hd.id_Gvm, ...
```

**Key observations:**
- Multiple course rows per lecturer are **aggregated into one contract** via `SUM` and `MIN/MAX`.
- `TruThue` (tax withheld) is **pre-computed and stored** in `hopdonggvmoi` — it is not calculated at export time.
- `ThucNhan` = `SoTien - TruThue` (net payout) — also stored, not computed at export.
- `NgayBatDau` and `NgayKetThuc` use `MIN/MAX` to span the full engagement period across multiple courses.

---

## Faculty Scoping

**File:** `exportHDController.js → exportMultipleContracts()`

```js
if (isKhoa == 1) {
  khoa = req.session.MaPhongBan;
}
```

If the session marks the user as faculty-role (`isKhoa == 1`), the `khoa` filter is overridden with the session's department code. This is the same pattern used by `enforceKhoaFilter` middleware but implemented inline in this controller.

> ⚠️ **Inconsistency:** Other modules use the shared `enforceKhoaFilter` middleware for this scoping. This controller reimplements it ad hoc. A faculty-role user who manipulates query parameters directly could potentially see other faculties' contracts if this inline check has a bug.

---

## Utility Functions

| Function | Purpose |
|----------|---------|
| `numberToWords(amount)` | Converts a numeric amount to Vietnamese text (e.g., for the contract body "Một triệu đồng") |
| `convertToRoman(n)` | Converts integers to Roman numerals for contract section numbering |
| `formatDateForExcel(dateValue)` | Normalizes date formats (handles string, Excel serial number, and Date objects) to `dd/MM/yyyy` |
| `deleteFolderRecursive(path)` | Recursively deletes the temporary folder after ZIP is sent to client |

---

## Multi-Contract ZIP Generation

**File:** `exportHDController.js → exportMultipleContracts()`

1. Query all matching lecturers for the batch (`Dot`, `KiHoc`, `NamHoc`, `he_dao_tao`).
2. For each lecturer: select template → fill with `docxtemplater` → write to temp folder.
3. Use `archiver` to ZIP the temp folder.
4. Pipe ZIP stream to HTTP response.
5. Call `deleteFolderRecursive()` on response `finish` event.

---

## Guest Lecturer Name Lookup

**File:** `exportHDController.js` (inferred from `gvmServices.getHeDaoTaoData` call)

`he_dao_tao` lookup uses the `gvmServices` service module. If a `loaiHopDong` parameter is passed as a name string (not an ID), the controller first converts it:

```js
if (loaiHopDong && isNaN(loaiHopDong)) {
  const [rows] = await connection.query(
    'SELECT id FROM he_dao_tao WHERE he_dao_tao = ?', [loaiHopDong]
  );
  loaiHopDongId = rows[0]?.id;
}
```

If no matching training system is found, the response is an inline JavaScript redirect rather than a standard HTTP error.

---

## Confirmed Behaviors

| # | Rule | Evidence |
|---|------|---------|
| C1 | Template is selected by `(loai_hinh, cap_do)` pair — 5 possible templates | `getTemplateFileName()` |
| C2 | Tax (`TruThue`) is stored pre-computed — not calculated at export | `SUM(hd.TruThue)` in query |
| C3 | `NgayBatDau/NgayKetThuc` span full engagement via `MIN/MAX` aggregation | SQL GROUP BY query |
| C4 | Faculty scoping is inline (not via middleware) for this controller | `isKhoa == 1` check in controller |
| C5 | ZIP cleanup uses response `finish` event to delete temp folder | `deleteFolderRecursive` on finish |

---

## Assumptions (Not Fully Traced)

| # | Assumption |
|---|-----------|
| A1 | Template marker names in `*.docx` files map 1:1 to the SQL column aliases — not verified against actual `.docx` XML |
| A2 | `docxtemplater` errors (e.g., missing marker in template) are caught and returned as HTTP 500 — error handling path not read |
| A3 | The `gvmServices` module that provides `getHeDaoTaoData` is a shared service; its internals are not analyzed here |
