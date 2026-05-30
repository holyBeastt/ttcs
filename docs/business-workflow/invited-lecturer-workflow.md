# Invited Lecturer (Mời Giảng) Workflow

This document describes the workflow for managing invited guest lecturers (Giảng viên mời), which is implemented as a **controller-centric legacy workflow** without distinct service or repository layers.

---

## 1. Registration & Data Entry

**Route:** `POST /daotaonhap` → `createGvmController.createGvm`  
**File Evidence:** `src/routes/createGvmRoute.js`, `src/controllers/createGvmController.js`

### Input Processing (Inline)
- The controller directly parses all inputs from `req.body` (e.g., HoTen, CCCD, GioiTinh, NgaySinh, HSL).
- **Faculty Scoping:** The department (`khoa`) is read directly from `req.session.MaPhongBan`, preventing users from submitting for other departments.
- **ID Generation:** `MaGvm` is generated inline using a template: `` `${khoa}_GVM_${COUNT(gvmoi)+1}` ``. (Note: Possible race condition under concurrent inserts).

### Business Rules (Confirmed)
- **BR-REG-01 (Salary Coefficient):** `HSL` must be numeric. The controller replaces commas with periods before inline validation and insertion.
- **BR-REG-02 (CCCD Uniqueness):** Enforced via an inline `SELECT COUNT(*) FROM gvmoi WHERE CCCD = ?` query before inserting.
- **BR-REG-03 (Name Deduplication):** Duplicate names are auto-resolved by appending an `(A)`, `(B)`, `(C)` suffix (using `String.fromCharCode(64 + count)`).
- **BR-REG-04 (Manual Rollback):** If the file saving process fails *after* the database insertion, the controller performs a manual `DELETE FROM gvmoi WHERE MaGvm = ?` to rollback, instead of using a database transaction.

### File Uploads
- Handled by `multer` middleware.
- Max file size is hardcoded to 5MB (`5 * 1024 * 1024`) in `createGvmRoute.js`.
- Files are saved to: `<appRoot>/Giang_Vien_Moi/{khoa}/{boMon}/{hoTen}/`

---

## 2. Normalization & Workload Draft (QCDK)

**Route:** `/qcdk` etc.  
**File Evidence:** `src/controllers/moiGiangQCDKController.js` (2786 lines)

### Formula Pipeline (Inline)
The normalization formula is computed inline inside the controller per row:
```
QuyChuan = LL * HeSoLopDong * HeSoT7CN
```
- **`LL`**: Number of periods.
- **`HeSoLopDong`**: Class size bonus, fetched from `he_so_lop_dong`.
- **`HeSoT7CN`**: Derived from a **string-matching rule** on the training program (`he_dao_tao`) name.

### HeSoT7CN String-Matching Rule (Confirmed)
The multiplier is hardcoded based on string inclusion in the program name:
- Contains `"ĐH"` (Undergraduate) → base multiplier × `1.0`
- Contains `"CH"` (Master's) → base multiplier × `1.5`
- Contains `"NCS"` (PhD) → base multiplier × `2.0`

### Database Operations (Inline SQL)
The controller executes bulk UPSERTs directly using queries like:
```sql
INSERT INTO ?? (...) VALUES ? ON DUPLICATE KEY UPDATE ...
```
The table name is injected via `process.env.DB_TABLE_TAM` using `??` placeholder.

---

## 3. List and Approval

**Route:** `/gvmList` etc.  
**File Evidence:** `src/controllers/gvmListController.js`

### Ad Hoc Faculty Filtering
Faculty filtering is implemented directly inside the controller methods rather than via middleware:
```js
if (isKhoa == 0) {
  query = `SELECT * FROM gvmoi WHERE TinhTrangGiangDay = 1 AND CCCD != '00001'`;
} else if (isKhoa == 1) {
  // SQL Injection Risk: MaPhongBan is interpolated directly.
  query = `SELECT * FROM gvmoi WHERE TinhTrangGiangDay = 1 AND MaPhongBan LIKE '%${MaPhongBan}%'`;
}
```

### Exclusions (Hardcoded)
- `CCCD != '00001'` is hardcoded to exclude a dummy/system record.
- `id_Gvm != 1` is hardcoded to exclude a system user across queries.

### Approval Logic
Approval updates the `hoc_vien_duyet` field via inline bulk `CASE WHEN` updates.

---

## 4. Contract Approval

**File Evidence:** `src/controllers/hopdong.duyetHopDongMoiGiangController.js`

### Inline SQL & Macros
Builds a complex `WITH` CTE query inline that joins `tam` (draft), `gvmoi` (profile), and `he_dao_tao` (training system). It imports the `DON_GIA_EXPR` macro from `src/queries/hopdongQueries.js` for unit price computation.

### Tax Rule (Confirmed)
Tax is hardcoded as 10% of the gross payment: `Thue = ThanhTien * 0.1`.

---

## Recommendations for Refactoring
- **Extract Business Rules:** Move the `QuyChuan` and `HeSoT7CN` logic out of `moiGiangQCDKController.js` into a dedicated mapper or service.
- **Implement Transactions:** Replace manual `DELETE` rollbacks in `createGvmController.js` with SQL transactions.
- **Use Middleware for Scoping:** Replace the ad hoc `if (isKhoa == 1)` checks and inline string interpolation with the `enforceKhoaFilter` middleware to mitigate SQL injection risks.
- **Replace Hardcoded Constants:** Move values like 5MB, `"00001"`, `id_Gvm=1`, and `10%` tax into a configuration file.
