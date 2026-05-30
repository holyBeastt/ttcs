# Known Limitations and Technical Debt

This document lists confirmed gaps, inconsistencies, and risks identified during codebase analysis. Each item includes the file evidence and a recommended action.

Items are classified:
- 🔴 **High** — security, data integrity, or correctness risk
- 🟡 **Medium** — reliability or maintainability risk
- 🟢 **Low** — cosmetic or minor inconsistency

---

## Security / Access Control

### L-01 🔴 NCKH Import Department Check Bypassed

**File:** `src/middlewares/importAuthMiddleware.js`

```js
// hasDept = await checkUserHasDept(userId);  // COMMENTED OUT
hasDept = true;  // HARDCODED
```

Any authenticated user can import NCKH records for any department. The original department validation function is commented out, not deleted, suggesting this was intentional but temporary.

**Recommended action:** Reinstate `checkUserHasDept(userId)` and validate that the user's `MaPhongBan` matches the import target department before accepting the file.

---

### L-02 🔴 Synthesis Approval Routes Not Faculty-Scoped

**File:** `src/routes/vuotGioV2Route.js` — lines 129–132

```
POST /v2/vuotgio/tong-hop/duyet-khoa
POST /v2/vuotgio/tong-hop/huy-duyet-khoa
GET  /v2/vuotgio/tong-hop/duyet-trang-thai
```

None of these routes apply `enforceKhoaFilter`. A faculty-role user who sends a crafted request with another faculty's `khoa` code could approve or revoke that faculty's synthesis approval.

**Recommended action:** Apply `enforceKhoaFilter` to the `POST` routes. For the `GET` route, restrict the response to the user's own faculty when `isKhoa == 1`.

---

### L-03 🟡 Contract Controller Reimplements Faculty Scoping

**File:** `src/controllers/exportHDController.js → exportMultipleContracts()`

```js
if (isKhoa == 1) {
  khoa = req.session.MaPhongBan;
}
```

The shared `enforceKhoaFilter` middleware is not used. This ad-hoc duplication means that if the scoping logic ever needs to change, it must be updated in both the middleware and this controller.

**Recommended action:** Apply `enforceKhoaFilter` to the export routes and remove the inline check.

---

## Data Integrity

### L-04 🔴 Quota Fallback Is Silent

**File:** `src/mappers/vuotgio_v2/summary.mapper.js → toAtomicSDO()`

```js
const dmChuan = base.toDecimal(globalDinhMuc?.GiangDay) || 280;
const dmNCKH  = base.toDecimal(globalDinhMuc?.NCKH)     || 280;
```

If the `sotietdinhmuc` table is empty (or the query fails silently), both quotas default to `280`. No warning, log, or error is emitted. All overtime calculations would then use this hardcoded fallback value, producing incorrect results without any visible indication.

**Recommended action:** Log a warning when the fallback is applied. Consider throwing if the table is empty, as this is a critical configuration value.

---

### L-05 🟡 `giangday.QuyChuan` Origin Not Covered

The normalized teaching hours field `QuyChuan` in the `giangday` table is the single most important input to the overtime formula. How this value is calculated and written (presumably by the TKB/timetable import module) is not documented or traced.

If the TKB import applies incorrect normalization rules, all downstream overtime calculations are silently wrong.

**Recommended action:** Document the TKB import module's normalization formula for `QuyChuan` and add an integration test that verifies known inputs produce known outputs.

---

### L-06 🟡 NCKH `soTietNCKH` Cross-Module Injection

**File:** `src/services/vuotgio_v2/tongHop.service.js → getCollectionSDODetail()`

```js
nckhRecords: [{ soTietGiangVien: nckhMap.get(Number(row.id_User)) || 0 }]
```

NCKH hours are injected into the VuotGio SDO as a pseudo-record. The source query that populates `nckhMap` is not fully traced. A change to the NCKH aggregation logic (e.g., changing the approval gate from `vien_nc_duyet=1` to a new field) would silently affect VuotGio overtime calculations.

**Recommended action:** Document the exact cross-module query. Consider creating a dedicated shared service function `getApprovedNCKHHoursForLecturer(namHoc, idUser)` with explicit contracts.

---

### L-07 🟡 `quyDinh` Table Schema Discovery

**File:** `src/services/nckh_v3/quyDinh.service.js`

The system probes 4 candidate table names and 4–6 candidate column names to locate the NCKH hour regulation table. This means:
- A new table matching a candidate name could be silently used instead of the intended one.
- Column renames might redirect the lookup to an unintended column.
- `SHOW COLUMNS` calls add overhead on every import.

**Recommended action:** Fix the table and column names in a configuration constant. Remove the dynamic discovery unless multiple environments genuinely have different schemas.

---

## Correctness

### L-08 🟡 `thieuTietGiangDay` Not Used in Formula

**File:** `src/mappers/vuotgio_v2/summary.mapper.js → calculateOvertime()`

```js
thieuTietGiangDay: base.toDecimal(Math.max(0, dinhMucSauMienGiam - tongThucHien).toFixed(2))
```

This field is calculated but not used in any overtime formula step. It appears to be a display-only field (shown in the declaration sheet). If business rules change to penalise teaching shortfall, this field would need to be incorporated into `tongVuot`.

**Recommended action:** Add a comment clarifying this is display-only and document it in the SDO field description.

---

### L-09 🟡 `dao_tao_duyet` / `khao_thi_duyet` Not Required for Hour Count

**File:** `src/repositories/vuotgio_v2/tongHop.repo.js`

Aggregation queries for LNQC and HDTQ only check `khoa_duyet = 1`, not the second-level approval. The pre-lock check requires both levels. This means:
- Hours are counted and shown in summaries after only level-1 approval.
- The year cannot be locked until level-2 is also complete.
- A lecturer's overtime report can differ depending on whether you view it before or after level-2 approval (because locking changes who can add/remove records, not the count threshold).

**Status:** Likely intentional — allows faculties to see preliminary totals while training/exam offices complete their review. **Document this explicitly.**

---

## Code Quality

### L-10 🟡 `exportHDController.js` Is Monolithic (~3033 lines)

All contract generation logic (template selection, SQL queries, ZIP creation, utility functions) lives in a single controller file. This makes it difficult to:
- Test individual components.
- Reuse template logic across contract types.
- Understand which function handles which route.

**Recommended action:** Extract service layer (`contractService.js`), template utilities (`templateUtils.js`), and number formatting (`formatUtils.js`) into dedicated files.

---

### L-11 🟢 Deprecated Route Still Registered

**File:** `src/routes/vuotGioV2Route.js:106`

```js
router.post("/duyet-kthp/approve/:ID", ..., duyetKTHP.approve); // Deprecated, kept for compatibility
```

The route is live but marked deprecated. If clients still call this endpoint, it will continue to function. If not, it is dead code that increases maintenance surface.

**Recommended action:** Audit client usage. If unused, remove the route and handler.

---

### L-12 🟢 Two EJS Views With No Identified Renderer

**Files:**
- `src/views/vuotgio_v2/vuotGioKyTuBD.ejs`
- `src/views/vuotgio_v2/vuotGioSoTietDM.ejs`

No controller or route was found that renders these views. They may be legacy views or rendered via a shared dynamic renderer not traced in this analysis.

**Recommended action:** Search for `vuotGioKyTuBD` and `vuotGioSoTietDM` strings in all controller files to confirm usage or mark for deletion.

---

### L-13 🟢 `year-lock` Has No Unlock Route

**File:** `src/services/vuotgio_v2/dataLock.service.js`

Once a year is locked (record inserted in `vg_khoa_du_lieu`), there is no API route or service function to unlock it. An unlock would require a direct database operation.

**Recommended action:** If unlock capability is needed for corrections, add a protected admin-only unlock route. If permanently locked by design, document this explicitly.

---

## Hardcoded Values Reference

| Value | Location | Risk |
|-------|----------|------|
| `id_User <> 1` | All aggregation queries | If admin ID changes, all queries must be updated |
| `"BGĐ&PHONG"` | `tongHop.repo.js → NON_KHOA_GROUP_CODE` | Renamed department breaks grouping |
| `dinhMucChuan = 280` | `summary.mapper.js → toAtomicSDO()` | Silently wrong if quota table is empty |
| `dinhMucNCKH = 280` | `summary.mapper.js → toAtomicSDO()` | Same risk as above |
| `cap_do` values 1–4 | `exportHDController.js → getTemplateFileName()` | Adding a new education level requires code change |
| `CATEGORY_ORDER = ["vn","lao","cuba","cpc","dongHP"]` | `summary.mapper.js → buildTableF()` | New training systems require code change |
| `hasDept = true` | `importAuthMiddleware.js` | Bypasses access control for NCKH import |

---

## Legacy Architecture Limitations

### L-14 🔴 SQL Injection Risk in Legacy Controllers
**File:** `src/controllers/gvmListController.js`, `src/controllers/moiGiangQCDKController.js`

Legacy controllers perform faculty scoping by manually appending to the query string instead of using parameterized queries:
`query = "SELECT * FROM gvmoi WHERE TinhTrangGiangDay = 1 AND MaPhongBan LIKE '%" + MaPhongBan + "%'"`
If `MaPhongBan` is compromised or manipulated, it could lead to SQL injection. (Confirmed)

**Recommended action:** Move scoping to `enforceKhoaFilter` middleware and use parameterized SQL queries (`?`).

### L-15 🟡 Lack of Transactions for Multi-Step Operations
**File:** `src/controllers/createGvmController.js`

If inserting an invited lecturer succeeds, but the subsequent file save fails, the controller performs a manual rollback by executing `DELETE FROM gvmoi WHERE MaGvm = ?`. (Confirmed)

**Recommended action:** Use standard database transactions (e.g., `connection.beginTransaction()`).

### L-16 🟡 Hardcoded Duplicated Business Logic (Đồ Án)
**File:** `src/controllers/doAnChinhThucController.js`, `src/controllers/hopdong.duyetHopDongDoAnController.js`

The workload allocation rule for thesis supervisors (1 supervisor = 20 hours; 2 supervisors = 12 hours for primary, 8 hours for secondary) is hardcoded independently in multiple files (in `saveToExportDoAn` and in `buildDoAnBaseQuery`). (Confirmed)

**Recommended action:** Move the 20/12/8 hour rule into a shared service to maintain a single source of truth.
