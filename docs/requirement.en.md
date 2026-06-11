# Mobile App Requirements for AI

## Goal

Build a Flutter mobile app for lecturers.

Primary use cases:
- sign in
- view guest lecturer information of the faculty
- view announcements
- edit personal profile
- view personal statistics

This document is optimized for AI code generation. Keep scope strict. Do not add features outside this document unless explicitly requested.

## Users

### Lecturer

Supported capabilities:
- authenticate with existing internal account
- view announcements
- view guest lecturer information
- view and update allowed profile fields
- view personal statistics

## Phase Scope

### Phase 1

Required features:
- login
- guest lecturer information of the faculty
- announcements
- personal profile view
- personal profile update

### Phase 2

Required features:
- announcements
- personal statistics

## Functional Requirements

### 1. Authentication

Requirements:
- user can log in with existing account
- backend validates account against current system
- app keeps authenticated session
- user can log out

Minimum API needs:
- login
- current user session info
- logout

### 2. Guest Lecturer Information

Requirements:
- user can see a list of guest lecturers
- user can open guest lecturer detail
- list should support filtering by faculty or status if backend data supports it
- data is read-only on mobile in initial scope

Minimum data fields:
- id
- full name
- faculty / department
- academic title or degree
- teaching status
- contract-related summary if available

### 3. Announcements

Requirements:
- user can see announcement list
- user can open announcement detail
- announcements should be filtered by the user department if backend supports department scoping
- read-only is acceptable in mobile scope

Minimum data fields:
- id
- title
- message
- deadline
- status / expired flag
- department

### 4. Personal Profile

Requirements:
- user can view their own profile
- user can update allowed fields only
- profile update must apply only to authenticated user
- mobile must not update other users by id passed from client

Suggested editable fields:
- full name
- date of birth
- academic degree
- position
- salary coefficient
- salary
- reduction percentage
- reduction reason

If some fields should remain read-only, enforce that on backend.

### 5. Personal Statistics

Requirements:
- user can view a summary of their personal statistics
- data should be easy to render as cards or simple charts
- statistics should be tied to authenticated user, not arbitrary lecturer id from client

Suggested summary fields:
- total teaching workload
- approved workload
- pending workload
- guest lecturer related totals if applicable
- research summary if available and in scope

## Non-Goals

Do not include these features in current mobile scope:
- Excel import
- system synchronization flows
- Word, PDF, Excel export authoring flows
- broad admin management features
- full department administration
- complex document approval workflows unless explicitly added later

## Backend Constraints

Current backend characteristics:
- Node.js with Express
- MySQL
- server-rendered EJS app
- session-based authentication
- mixed HTML routes and JSON routes

Implications:
- mobile should use dedicated JSON endpoints
- do not reuse EJS render routes directly in Flutter
- avoid redirect-based flows for mobile APIs

## API Design Rules

Recommended namespace:
- `/api/mobile/v1`

Response rules:
- always return JSON
- no HTML
- no redirect response for mobile endpoints
- include `success`, `message`, and `data` when practical

Security rules:
- trust authenticated session or token only
- do not trust client-provided user id for self-service endpoints
- validate all writable fields

## Implementation Priority

Priority order:
1. auth
2. current user profile
3. announcements
4. guest lecturer list and detail
5. personal statistics

## Output Expectation for AI

When generating code from this document:
- keep implementation minimal and phase-based
- prefer reusing existing SQL and controller logic where safe
- add a dedicated mobile API layer instead of changing unrelated web pages
- avoid adding large refactors unless necessary
- keep endpoints consistent and machine-readable
