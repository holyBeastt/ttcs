# Mobile Backend Implementation Plan for AI

## Objective

Add a dedicated mobile API layer to the existing Node.js and Express backend.

Target mobile features:
- Phase 1: login, guest lecturer information, announcements, personal profile view and update
- Phase 2: announcements, personal statistics

Do not build mobile features by calling EJS page routes directly. Add JSON APIs under a separate namespace.

## Current Backend Findings

### Architecture

- Main server entry: `src/server.js`
- Backend style: monolithic Express app with EJS views
- Auth style: `express-session`
- Data access style: mixed raw SQL in controllers, some newer service and repository layers
- Existing API quality is inconsistent: some JSON endpoints exist, many routes still render HTML

### Existing Reusable Areas

#### Authentication

Relevant files:
- `src/routes/loginRoute.js`
- `src/controllers/loginController.js`
- `src/server.js`

Current behavior:
- `POST /login` validates username and password from `taikhoannguoidung`
- session fields are set on `req.session`
- response is JSON, but designed around web redirect targets
- global auth middleware redirects unauthenticated requests to `/`

Important limitations:
- no `/me`
- no logout endpoint for API
- no token-based auth
- password check appears plaintext

#### Guest Lecturer Data

Relevant files:
- `src/routes/gvmListRoute.js`
- `src/controllers/gvmListController.js`
- `src/controllers/infoHDGvmController.js`
- `src/controllers/classInfoGvmController.js`
- `src/services/gvmServices.js`

Current behavior:
- guest lecturer list and approval data already has JSON endpoints
- filtering depends on `req.session.isKhoa` and `req.session.MaPhongBan`
- some routes render EJS pages, some return JSON
- contract and class info can be reused for future detail endpoints

Important limitations:
- endpoint naming is web-centric
- response shapes are inconsistent
- some controller logic mixes rendering and business logic

#### Personal Profile

Relevant files:
- `src/routes/adminRoute.js`
- `src/controllers/adminController.js`

Current behavior:
- `GET /infome/:id_User` renders profile page
- `POST /infome/:id_User` updates selected `nhanvien` fields

Important limitations:
- web-oriented route shape
- self-service API trusts route param and request body identity too much
- profile page returns HTML, not JSON

#### Announcements

Relevant files:
- `src/routes/adminRoute.js`
- `src/controllers/admin.js`

Current behavior:
- `GET /getMessage`
- `GET /getMessage/:MaPhongBan`
- `POST /updateMessage`
- `POST /deleteMessage`
- data source appears to be table `thongbao`

Important limitations:
- current APIs are closer to admin CRUD than mobile feed APIs
- no read state per user
- no push notification subsystem
- response shape is not optimized for mobile clients

#### Personal Statistics

Relevant files:
- `src/routes/thongketonghopRoute.js`
- `src/controllers/thongketonghopController.js`
- `src/routes/nckhV3Route.js`
- `src/controllers/nckh_v3/stats.controller.js`
- `src/services/nckh_v3/stats.service.js`

Current behavior:
- existing statistics endpoints are report-style
- NCKH V3 is the cleanest JSON API pattern in the repo

Important limitations:
- current stats are not designed as `my stats`
- endpoints usually depend on query filters, not authenticated user identity

## Recommended Delivery Strategy

### Strategy

Create a new route group:
- `/api/mobile/v1`

Principles:
- JSON only
- no HTML rendering
- no redirect responses
- authenticated user context comes from session
- normalize response format
- reuse existing SQL and service logic where practical
- do not attempt a full repository-wide refactor first

### Recommended Response Shape

Use this structure consistently:

```json
{
  "success": true,
  "message": "optional human-readable message",
  "data": {}
}
```

For errors:

```json
{
  "success": false,
  "message": "error description",
  "errors": []
}
```

## Proposed File Structure

Add a focused mobile API layer:

- `src/routes/mobileRoute.js`
- `src/controllers/mobile/auth.controller.js`
- `src/controllers/mobile/profile.controller.js`
- `src/controllers/mobile/announcement.controller.js`
- `src/controllers/mobile/guestLecturer.controller.js`
- `src/controllers/mobile/stats.controller.js`
- `src/services/mobile/auth.service.js`
- `src/services/mobile/profile.service.js`
- `src/services/mobile/announcement.service.js`
- `src/services/mobile/guestLecturer.service.js`
- `src/services/mobile/stats.service.js`
- `src/middlewares/mobileAuthMiddleware.js`
- `src/utils/mobileResponse.js`

If faster delivery is required, controllers may call existing services or direct SQL initially. Keep new mobile logic isolated even if underlying queries are reused.

## Detailed Phase Plan

## Phase 1

### 1. Mobile Auth Foundation

Tasks:
- add `src/routes/mobileRoute.js`
- mount it in `src/server.js` as `/api/mobile/v1`
- create `mobileAuthMiddleware`
- create `mobileResponse` helper
- expose JSON auth endpoints

Endpoints:
- `POST /api/mobile/v1/auth/login`
- `GET /api/mobile/v1/auth/me`
- `POST /api/mobile/v1/auth/logout`

Implementation notes:
- reuse validation and session field setup from `src/controllers/loginController.js`
- remove redirect logic from mobile response
- return normalized user payload:
  - `id`
  - `username`
  - `fullName`
  - `role`
  - `departmentCode`
  - `isFaculty`

Risks:
- current global middleware in `src/server.js` redirects non-public unauthenticated requests; mobile routes must bypass redirect and return JSON 401 instead

Recommended server change:
- update global auth middleware to treat `/api/mobile/` as API traffic
- unauthenticated mobile requests should return `401` JSON instead of redirect

### 2. Current User Profile API

Endpoints:
- `GET /api/mobile/v1/me/profile`
- `PATCH /api/mobile/v1/me/profile`

Implementation notes:
- reuse read logic from `adminController.infome`
- convert to authenticated-user-only behavior
- ignore client-supplied user id
- read user id from `req.session.userId`
- whitelist editable fields

Suggested editable fields for first release:
- `TenNhanVien`
- `NgaySinh`
- `HocVi`
- `ChucVu`
- `HSL`
- `Luong`
- `PhanTramMienGiam`
- `LyDoMienGiam`

Recommended internal data mapping:
- `TenNhanVien` -> `fullName`
- `NgaySinh` -> `dateOfBirth`
- `HocVi` -> `academicDegree`
- `ChucVu` -> `position`
- `HSL` -> `salaryCoefficient`
- `Luong` -> `salary`
- `PhanTramMienGiam` -> `reductionPercent`
- `LyDoMienGiam` -> `reductionReason`

Validation rules:
- reject updates to another user
- validate numeric fields
- handle null and empty string safely
- return latest saved record after update

### 3. Announcements API

Endpoints:
- `GET /api/mobile/v1/announcements`
- `GET /api/mobile/v1/announcements/:id`

Implementation notes:
- reuse announcement query logic from `admin.js`
- if possible, scope list by `req.session.MaPhongBan`
- sort newest first
- filter out expired entries if product requires active-only feed

Recommended response fields:
- `id`
- `title`
- `message`
- `deadline`
- `expired`
- `departmentCode`

Non-goals for now:
- create announcement
- update announcement
- delete announcement
- read tracking
- push delivery

### 4. Guest Lecturer API

Endpoints:
- `GET /api/mobile/v1/guest-lecturers`
- `GET /api/mobile/v1/guest-lecturers/:id`

Optional endpoints if already easy to support:
- `GET /api/mobile/v1/guest-lecturers/:id/classes`
- `GET /api/mobile/v1/guest-lecturers/:id/planned-contract`

Implementation notes:
- reuse filtering logic from `gvmListController`
- normalize field names for mobile
- ensure department scoping respects existing session permissions

Recommended list filters:
- `departmentCode`
- `status`
- `approvalState`
- `keyword`

Recommended response fields:
- `id`
- `fullName`
- `departmentCode`
- `phone`
- `academicDegree`
- `position`
- `mainSubject`
- `teachingStatus`
- `approvalStatus`

### 5. Phase 1 Verification

Required verification:
- login success and failure
- unauthorized mobile request returns JSON 401
- profile read returns authenticated user only
- profile update cannot modify another user
- announcements list returns JSON
- guest lecturer list returns JSON and respects session scope

## Phase 2

### 6. Personal Statistics API

Endpoints:
- `GET /api/mobile/v1/me/stats`
- optional: `GET /api/mobile/v1/me/stats/detail`

Delivery strategy:
- start with one summary endpoint
- aggregate from existing report sources
- bind results to current authenticated user

Preferred implementation order:
1. teaching-related summary
2. guest lecturer related summary if directly relevant
3. research summary using NCKH V3 patterns if data is linked to the current user

Recommended response shape:

```json
{
  "success": true,
  "data": {
    "teaching": {
      "totalHours": 0,
      "approvedHours": 0,
      "pendingHours": 0
    },
    "guestLecturing": {
      "plannedClasses": 0,
      "plannedHours": 0
    },
    "research": {
      "totalRecords": 0,
      "totalHours": 0
    }
  }
}
```

Implementation note:
- prefer the NCKH V3 controller and service style as the template for clean JSON API design
- do not expose broad faculty-wide stats to a lecturer-facing `me` endpoint

### 7. Phase 2 Verification

Required verification:
- stats endpoint returns only current user data
- empty data case returns valid zero-state payload
- endpoint remains fast enough for mobile dashboard usage

## Cross-Cutting Technical Tasks

### Authentication and Session Handling

- keep session-based auth first to reduce scope
- ensure Flutter client supports cookie persistence if session cookie is used
- if later required, add token-based auth as a separate enhancement

### Authorization

- centralize mobile auth checks in middleware
- create helper functions for current user context:
  - `getCurrentUserId`
  - `getCurrentDepartmentCode`
  - `getCurrentRole`
  - `isCurrentUserFacultyScoped`

### Data Mapping

Add a mapping layer from database column names to mobile-friendly JSON fields.

Example:
- `TenNhanVien` -> `fullName`
- `MaPhongBan` -> `departmentCode`
- `TinhTrangGiangDay` -> `teachingStatus`
- `LoiNhan` -> `message`
- `HetHan` -> `expired`

This reduces Flutter-side cleanup and makes AI-generated frontend code simpler.

### Validation

For all writable endpoints:
- validate payload type
- reject unknown writable fields
- sanitize strings
- validate dates and numeric fields
- return 400 for invalid payload

### Error Handling

Standardize:
- `400` invalid input
- `401` unauthenticated
- `403` unauthorized
- `404` not found
- `500` server error

Do not return HTML or redirects from mobile endpoints.

## Suggested Execution Order for Coding

1. Add mobile route mounting in `src/server.js`
2. Add mobile auth middleware and response helper
3. Implement mobile auth endpoints
4. Implement `/me/profile` read endpoint
5. Implement `/me/profile` update endpoint
6. Implement announcement list and detail endpoints
7. Implement guest lecturer list and detail endpoints
8. Add targeted tests or manual verification scripts
9. Implement `/me/stats`
10. Refine response consistency and validation

## Testing Plan

### Minimum Manual Tests

- login with valid account
- login with invalid password
- call `/auth/me` without session
- call `/auth/me` after login
- read profile
- update profile with valid payload
- update profile with forbidden fields
- fetch announcements
- fetch guest lecturer list
- fetch stats with and without data

### Optional Automated Tests

If tests are added, keep them focused:
- auth middleware behavior
- profile authorization
- response shape consistency

Do not add large low-value test suites unless the backend already has a clear testing pattern.

## Known Risks

- global redirect-based auth middleware may break mobile API behavior if not adjusted
- plaintext password handling is a security risk but may be out of current scope
- many existing controllers contain embedded SQL and inconsistent naming
- some guest lecturer logic is tied to web workflow assumptions
- announcement subsystem is not a real notification system

## Explicit Non-Goals

Do not include in current implementation unless requested:
- push notifications
- offline sync
- admin creation and approval workflows on mobile
- file-heavy document upload flows
- full backend refactor
- migration to JWT auth

## AI Coding Guidance

When using this plan to generate code:
- prefer small, isolated commits
- preserve existing web routes
- add new mobile-only files instead of rewriting unrelated legacy files
- reuse working queries first, then refactor only if duplication becomes blocking
- keep endpoint names stable and predictable
- return mobile-friendly JSON keys
- avoid introducing frontend assumptions into backend controllers
