# Access Control — RBAC and ABAC

This document describes the authentication, authorization, and data-scoping mechanisms in the system.

---

## Authentication Layers

Three separate authentication mechanisms exist:

| Layer | Mechanism | Used By |
|-------|-----------|---------|
| **Session Auth** | `req.session.userId` + `req.session.isKhoa` | Web UI (EJS pages) |
| **JWT** | `Authorization: Bearer <token>` | Mobile API (`/api/mobile/`) |
| **Import Middleware** | `importAuthMiddleware` | NCKH Excel import routes |

Session auth is the primary mechanism for all `vuotgio_v2`, `nckh_v3`, and `exportHD` operations.

---

## Session Schema

Key session fields set at login:

| Field | Type | Meaning |
|-------|------|---------|
| `userId` | number | Linked to `nhanvien.id_User` |
| `isKhoa` | `0` or `1` | Whether the user is faculty-role |
| `MaPhongBan` | string | The user's department/faculty code |
| `TenNhanVien` | string | Display name (used in audit logs) |

---

## Middleware: `enforceKhoaFilter`

**File:** `src/middlewares/khoaFilterMiddleware.js → enforceKhoaFilter()`

### Behavior

If `req.session.isKhoa == 1`, the middleware **silently overwrites** all three request locations with the session's faculty code:

```js
req.query.Khoa  = req.session.MaPhongBan;
req.body.Khoa   = req.session.MaPhongBan;
req.params.Khoa = req.session.MaPhongBan;
```

This is **Attribute-Based Access Control (ABAC)**: the data attribute `Khoa` is enforced based on the user's session attribute `MaPhongBan`. Faculty users cannot see or modify other departments' data regardless of what they pass in the request.

### Applied To

All mutating routes (POST, PUT, DELETE) for LNQC, KTHP, HDTQ, and thesis modules. Read routes that return filtered data also apply this middleware.

### Where It Is NOT Applied

- `POST /v2/vuotgio/tong-hop/duyet-khoa` — faculty synthesis approval is not scoped.
- `POST /v2/vuotgio/tong-hop/huy-duyet-khoa` — revoke approval is not scoped.
- `GET /v2/vuotgio/tong-hop/duyet-trang-thai` — approval status read is not scoped.

> ⚠️ **Security gap:** A faculty-role user could approve or revoke approval for another faculty's synthesis if they know the target faculty code. `enforceKhoaFilter` is absent from these routes.

### Legacy Controllers (Ad-Hoc Scoping)
Several legacy modules (e.g., Mời Giảng, Đồ Án, ExportHD) **do not** use this middleware. Instead, they duplicate the logic inline within the controller body (e.g., `if (isKhoa == 1) { query += " AND MaPhongBan LIKE '%" + req.session.MaPhongBan + "%'" }`). This introduces SQL injection risks and makes maintenance difficult. See [Controller-Centric Legacy Modules](./controller-centric-legacy-modules.md).

---

## Middleware: `checkDataLock`

**File:** `src/middlewares/dataLockMiddleware.js → checkDataLock()`

### Behavior

Blocks `POST`, `PUT`, and `DELETE` requests if the academic year is locked in `vg_khoa_du_lieu`.

**`NamHoc` resolution priority:** `req.params.NamHoc` → `req.query.NamHoc` → `req.body.NamHoc` (first non-null wins).

### Applied To

All mutating routes in `vuotgio_v2` for LNQC, KTHP, HDTQ, DATN, and individual record operations.

### Where It Is NOT Applied

- `POST /v2/vuotgio/tong-hop/khoa-du-lieu` (the lock creation itself — correctly unguarded).
- `POST /v2/vuotgio/tong-hop/duyet-khoa` (synthesis approval — should be evaluated for lock-awareness).

---

## Role Model

| Role | `isKhoa` | `MaPhongBan` | Capabilities |
|------|----------|-------------|-------------|
| Admin / Office | `0` | varies | Full access to all faculties' data |
| Faculty Head / Staff | `1` | own faculty code | Scoped to own faculty by `enforceKhoaFilter` |

> There is no explicit role table in the identified schema. Roles are encoded directly on the session fields.

---

## Department Identification

**Table:** `phongban`

```sql
WHERE isKhoa = 1  -- marks a Faculty (Khoa)
WHERE isKhoa = 0  -- administrative/support department
```

This flag is the single source of truth for "is this a teaching faculty?"

Used by:
- `duyetTongHop.service.js → getApprovalStatus()` — lists all `isKhoa = 1` departments.
- `duyetTongHop.repo.js → isAllKhoaApproved()` — counts `phongban WHERE isKhoa = 1`.
- `xuatFile.service.js → _resolveSummaries()` — filters lecturers by faculty.

---

## Data Lock Enforcement Chain

```
[User submits POST/PUT/DELETE]
  → checkDataLock middleware
  → extract NamHoc (params > query > body)
  → query vg_khoa_du_lieu WHERE nam_hoc = ?
  → if record exists: HTTP 423 / redirect (blocked)
  → if not exists: proceed to controller
```

**Lock creation** (`dataLock.service.js → lockData()`):
- 5-step gate (see `business-rules.md → BR-VG-08`).
- Race condition handled via MySQL `ER_DUP_ENTRY` catch.

**Lock revocation:** No route or service exists for unlocking a year. A lock is permanent once written.

---

## NCKH Import Auth Middleware

**File:** `src/middlewares/importAuthMiddleware.js` (name inferred)

```js
// hasDept = await checkUserHasDept(userId);  // COMMENTED OUT
hasDept = true;  // HARDCODED
```

> ⚠️ **Critical gap:** The department check for NCKH imports is bypassed. Any authenticated user can import NCKH records for any department. The original `checkUserHasDept()` function is commented out, not deleted.

---

## Audit Logging

**File:** `src/services/logService.js`

LNQC create/edit/delete operations log changes via:

```js
await LogService.logChange(userId, userName, action, detail);
```

Log errors are caught silently (`console.error` only) — a logging failure does not roll back the business operation.

**Modules with logging:** LNQC, HDTQ (confirmed). KTHP, DATN, NCKH import — unconfirmed.

---

## Admin User Exclusion

**File:** All aggregation queries

```sql
WHERE nv.id_User <> 1
```

`id_User = 1` is a hardcoded admin/system user permanently excluded from all workload calculations. This is embedded in raw SQL across multiple repository files, not configurable.
