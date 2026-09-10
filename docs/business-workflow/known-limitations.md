# Known Limitations and Technical Debt

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.

This document lists limitations that still exist in the current implementation. Historical findings that have been fixed are intentionally not listed as current behavior.

Items are classified:

- 🔴 **High** — security, data integrity, or correctness risk
- 🟡 **Medium** — reliability or maintainability risk
- 🟢 **Low** — cosmetic or minor inconsistency

---

## Security / access control

### L-01 🔴 Synthesis approval routes are not faculty-scoped

**File:** `src/routes/vuotGioV2Route.js`

The routes below do not attach `enforceKhoaFilter`:

```text
GET  /v2/vuotgio/tong-hop/duyet-trang-thai
POST /v2/vuotgio/tong-hop/duyet-khoa
POST /v2/vuotgio/tong-hop/huy-duyet-khoa
```

A faculty-scoped caller can submit another faculty code to these routes. The service checks two-level data prerequisites, but route-level ownership of the target faculty is not enforced.

**Recommended action:** apply faculty scoping or an explicit capability/ownership check to these routes.

### L-02 🟡 Legacy controllers duplicate faculty scoping

Mời Giảng, Đồ Án, and some export controllers implement faculty filtering inline instead of sharing `enforceKhoaFilter`. Several legacy queries interpolate session attributes directly and should be migrated to parameterized SQL.

### L-03 🟡 NCKH import has no per-row target-department authorization

The current inline NCKH import guard correctly restricts the importer to the configured Institute NCKH role and department code. It does not independently verify a target faculty for each uploaded row; names are resolved against the employee directory. If row-level faculty ownership is required, it must be added explicitly.

---

## Data integrity and configuration

### L-04 🟡 Quota fallback is silent

**File:** `src/mappers/vuotgio_v2/summary.mapper.js`

If `sotietdinhmuc` has no usable row, the mapper silently falls back to:

```text
dinhMucChuan = 280
dinhMucNCKH  = 200
```

The calculation can therefore be wrong without a visible error or warning.

**Recommended action:** log and surface fallback use, or fail closed when quota configuration is missing.

### L-05 🟡 Origin of `giangday.QuyChuan` is not documented here

`giangday.QuyChuan` is a primary input to Vượt Giờ. Its upstream TKB import/normalization rules are outside this document's trace. A regression in that importer propagates directly to overtime totals.

**Recommended action:** document the TKB normalization contract and add a fixture-based integration test.

### L-06 🟡 Cross-module NCKH coupling

**Files:** `src/services/vuotgio_v2/tongHop.service.js`, `src/services/nckh_v3/stats.service.js`, `src/repositories/nckh_v3/stats.repo.js`

The dependency is known and intentional: Vượt Giờ calls `getLecturerSummary()`/`getLecturerRecords()` without a scope, so the default `OFFICIAL` scope requires both `khoa_duyet = 1` and `vien_nc_duyet = 1`. A future change to NCKH scope or schema will change Vượt Giờ deductions. The coupling should remain covered by an integration contract test.

### L-07 🟡 NCKH rule-table schema discovery

`quyDinh.service.js` uses `NCKH_QUYDINH_TABLE` (default `nckh_quydinhsogio`) plus fallback table names and probes candidate column names (at most three candidates per field). This supports deployment drift but can silently select an unintended compatible table/column and adds `SHOW COLUMNS` overhead.

**Recommended action:** keep the environment override but validate the resolved schema at startup and cache it per process.

---

## Correctness and workflow

### L-08 🟡 `thieuTietGiangDay` is display-only

The mapper computes `thieuTietGiangDay` for the SDO/declaration output. It is not an input to `tongVuot`; only `thieuNCKH` is subtracted from effective teaching before overtime is calculated. Keep this distinction when changing formulas.

### L-09 🟡 Internal overtime validator is incompatible with the current export surface

`skills/vuot_gio/overtime-workflow/scripts/validate_implementation.js` requires `summary.mapper.calculateOvertime`, but that helper is not exported. Running the validator therefore fails before comparing fixtures. Production uses `OvertimePolicyFactory` and the `PolicyV1`/`PolicyV2` `calculate()` methods.

**Recommended action:** update the validator to call the policy modules (or export a deliberately supported calculator API) and add tests for both policy versions.

### L-10 🟢 Policy-year list is explicit, not open-ended

`PolicyV2` is selected only for `2025 - 2026` through `2031 - 2032`. Other years use `PolicyV1`. Any documentation or configuration that says “all years from 2025 onward” is inaccurate.

### L-11 🟢 Year lock has no public unlock route

Once `vg_khoa_du_lieu` exists for a year, `checkDataLock` blocks the
middleware-protected Vượt Giờ mutation routes and no public service route removes
the lock. Synthesis approval has separate guards: revoke checks the lock, while
approve currently does not. Corrections require an explicitly controlled
administrative/database procedure.

### L-12 🟢 Snapshot and live preview have different contracts

After a year is locked, individual/faculty preview automatically reads the snapshot. Before lock, those endpoints calculate live using projected or official sources. Faculty statistics and Excel exports require a locked year and snapshot. Consumers must not assume every preview request is snapshot-backed.

### L-13 🟢 Payment constant `MAX_PAYABLE_HOURS` is unused

`PaymentCalculator` declares `MAX_PAYABLE_HOURS = 300`, but `computeSdoBreakdown()` does not apply that constant. The active payment cap is `thanhToan <= dinhMucSauMienGiam` from the overtime policy.

### L-18 🟡 Excel import mode diverges from the manual NCKH registry

`NCKH_TYPE_OPTIONS` and manual input services mark `DEXUAT` and `HUONGDAN` as
`equal`, but `src/mappers/nckh_v3/import.mapper.js` currently emits
`mode: "standard"` for both Excel types. An Excel import therefore uses weighted
author/member allocation instead of the manual equal split.

**Recommended action:** make the Excel mapper resolve mode from the shared type
registry or explicitly document the intended difference in the import contract.

### L-19 🟡 External NCKH participant hours are excluded from aggregate totals

External participants are stored in `nckh_so_tiet` with `nhanvien_id = NULL` and
can appear in record detail/author displays. The stats repository joins to
`nhanvien` for lecturer/faculty/institute totals, so those external rows are not
included in numeric stats or the NCKH amount injected into Vượt Giờ.

**Recommended action:** decide whether external hours should remain display-only or
be assigned an explicit aggregation policy.

### L-20 🟡 Synthesis approval mutation routes have inconsistent lock guards

The synthesis approval routes are not protected by `checkDataLock`.
`revokeKhoa()` rejects a locked year in the service, but `approveKhoa()` has no
explicit lock check. Year locking still requires all faculties to be approved, so
this route can mutate approval state after lock unless another authorization layer
intervenes.

**Recommended action:** enforce a shared lock/transition guard for both approve and
revoke operations.

---

## Code quality and legacy architecture

### L-14 🟡 Monolithic legacy controllers

`exportHDController.js` and several Mời Giảng/Đồ Án controllers mix validation, SQL, file handling, and rendering. This limits testability and makes business-rule drift likely.

### L-15 🟡 Lack of transactions in some legacy multi-step operations

Some legacy flows still perform a database insert followed by file operations and manually delete the row if the file write fails. They should use a transaction or an explicit outbox/compensation design.

### L-16 🟡 Duplicated Đồ Án allocation rules

The 20/12/8-hour thesis-supervision rule is duplicated in legacy controllers. A shared domain service would reduce inconsistency risk.

### L-17 🟢 Legacy/dead views and handlers need inventory

Some old EJS views and handlers may no longer have a route. They should be confirmed before deletion rather than treated as active source of truth.

---

## Hard-coded values reference

| Value | Location | Current meaning |
|---|---|---|
| `id_User <> 1` | Vượt Giờ repository queries | Exclude system/admin user from lecturer aggregation |
| `BGĐ&PHONG` | `tongHop.repo.js` | Group code for non-faculty staff |
| `dinhMucChuan = 280` / `dinhMucNCKH = 200` | `summary.mapper.js` | Silent fallback when quota row is missing |
| `CATEGORY_ORDER` | `summary.mapper.js` | Fixed Table F/payment categories |
| `ROUND(luong / 176, 0)` | `PaymentCalculator` | Active per-hour payment rate |
| `NCKH_QUYDINH_TABLE` | `quyDinh.service.js` | Optional primary rule-table override |
