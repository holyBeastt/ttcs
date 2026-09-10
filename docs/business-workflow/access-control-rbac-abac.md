# Access Control — RBAC and ABAC

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.

This document describes the authentication, authorization, and data-scoping mechanisms relevant to the current NCKH V3 and Vượt Giờ V2 modules.

---

## Authentication layers

| Layer | Mechanism | Main consumers |
|---|---|---|
| Session | `req.session.userId`, `isKhoa`, `MaPhongBan`, role fields | Web UI and the Vượt Giờ/NCKH routes |
| JWT | `Authorization: Bearer <token>` | Mobile API (`/api/mobile/`) |
| NCKH import guard | Inline `importAuthMiddleware` in `src/routes/nckhV3Route.js` | NCKH Excel import page/preview/save |

Session authentication is normally established by the application-level login middleware before these routers are reached.

## Session attributes

| Field | Meaning |
|---|---|
| `userId` | Internal staff ID (`nhanvien.id_User`) |
| `isKhoa` | `1` for faculty-scoped users; `0` for office/admin-style users |
| `MaPhongBan` | Department/faculty code used for ABAC scoping |
| `TenNhanVien` | Display name used by audit logging |
| `role` | Used by the NCKH import guard and other role checks |

## Faculty scoping: `enforceKhoaFilter`

**File:** `src/middlewares/khoaFilterMiddleware.js`

For a faculty-scoped session (`isKhoa == 1`), the middleware overwrites request query/body/parameter values with `req.session.MaPhongBan`. This prevents a faculty user from selecting another faculty on routes where the middleware is attached.

It is attached to the Vượt Giờ LNQC, KTHP, and HDTQ read/mutation routes. It is **not** attached to the synthesis approval status/approve/revoke routes:

```text
GET  /v2/vuotgio/tong-hop/duyet-trang-thai
POST /v2/vuotgio/tong-hop/duyet-khoa
POST /v2/vuotgio/tong-hop/huy-duyet-khoa
```

The missing route-level scoping remains a limitation; the service still validates approval prerequisites, but the caller's faculty ownership is not enforced by this middleware.

## Data lock: `checkDataLock`

**File:** `src/middlewares/dataLockMiddleware.js`

For Vượt Giờ mutation routes, the middleware resolves `NamHoc` from parameters, query, then body and checks `vg_khoa_du_lieu`. A locked year causes the write to be rejected. The lock-creation route itself is intentionally not guarded by this middleware.

NCKH V3 record/import routes do not use the Vượt Giờ `checkDataLock` middleware; their edit/delete behavior is governed by NCKH approval guards instead.

## NCKH import authorization

**File:** `src/routes/nckhV3Route.js`

The import guard is inline, not a separate `src/middlewares/importAuthMiddleware.js` file. It requires both:

1. role equal to `ROLE_PHONGBAN_TROLY` or `ROLE_PHONGBAN_LANHDAO` (environment-overridable; defaults `tro_ly_phong` / `lanh_dao_phong`), and
2. `req.session.MaPhongBan` equal to the configured Institute code (`VIEN_NCKH_HTPT`, default `NCKHHTQT`).

Requests failing either check receive HTTP 403 for JSON/XHR or redirect to `/v3/nckh` for a page request.

There is no `hasDept = true` bypass in the current route. The guard authorizes the importer as an Institute NCKH assistant/leader, but it does not perform a separate target-department check for every participant row in the uploaded file; participant names are resolved against the employee directory during preview.

## NCKH approval permissions

- New records start with `khoa_duyet = 0`, `vien_nc_duyet = 0`.
- Institute approval requires the faculty approval state first.
- Update is blocked once `vien_nc_duyet = 1`.
- Delete is blocked once **either** approval flag is `1`.
- Official statistics/export require both approval flags; the management list may show pending records.

## Audit logging

NCKH import/save, create/update/delete, and admin rule changes call `LogService.logChange()` (logging failures are caught and do not roll back the business transaction). The current NCKH approval update methods do not add a separate `LogService.logChange()` call. Vượt Giờ and legacy modules have additional module-specific logging behavior.

## Department identification

`phongban.isKhoa = 1` marks a teaching faculty; `isKhoa = 0` marks a non-faculty unit. Vượt Giờ groups non-faculty staff under `BGĐ&PHONG`. The faculty list used by year-lock approval counts is derived from `phongban.isKhoa = 1`.

## Hard-coded exclusions

Vượt Giờ aggregation excludes `id_User = 1` in lecturer-list queries. This is a source-code constant rather than a configurable role rule.
