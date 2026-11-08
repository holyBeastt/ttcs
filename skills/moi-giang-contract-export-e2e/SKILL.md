---
name: moi-giang-contract-export-e2e
description: Run browser-based end-to-end verification of the TKB → Quy chuẩn dự kiến → mời giảng contract/export flow, including an explicitly authorized direct-export bypass, ZIP/document assertions, and database fixture cleanup. Use for local Ttcs mời giảng export testing; do not use for production or unrelated contract modules.
---

# Mời giảng contract export E2E

Use this skill when the requested test starts from **thời khóa biểu (TKB)** and must prove that the canonical QC value survives the Quy chuẩn dự kiến and mời giảng contract/export flow. The normal path uses Chrome DevTools MCP. A direct export bypass is allowed only when the user explicitly authorizes it for the current test and the target is an isolated/local test database.

Read [references/export-flow.md](references/export-flow.md) for exact routes, fixture SQL shape, ZIP inspection, and cleanup procedures.

## Non-negotiable boundaries

- Test only the local/staging target explicitly identified by the user. Never apply the bypass to production or an unknown database.
- Do not start Docker or launch/recreate services automatically. Use an already-running app/database, or ask for explicit approval before any service action.
- Use Chrome DevTools MCP from the main agent. Do not delegate MCP/browser calls when the parent task forbids subagent MCP usage.
- Credentials are runtime input. Do not write usernames/passwords, cookies, JWTs, or session IDs into this skill, source files, screenshots, logs, or commits.
- The bypass must be narrow: one lecturer, one dot/semester/school year, and one or two selected training-program IDs. Never call a bulk approval/save endpoint merely to make export pass.
- Never call `submitData2` for this test; it has bulk side effects outside the selected lecturer.
- Snapshot every DB row before a fixture mutation. Restore the exact original values and delete only rows created by the test.
- Do not migrate or silently correct old production data. If the old record is `151.88`, report it as old data; only newly computed TKB/QCDK values should become `151.87` under the truncate policy.

## Required proof

A test is successful only when all applicable evidence exists:

1. TKB import or update returns success and stores canonical QC at the source boundary.
2. The TKB → QCDK request succeeds and the temporary table contains the same canonical QC without a second calculation.
3. The relevant mời giảng UI displays the stored value; it must not round a raw value again.
4. Direct export (when authorized) returns HTTP 200 with `application/zip` and a valid ZIP signature.
5. The ZIP contains only the target lecturer's contract/appendix/statistics and the document text has the expected hours/value.
6. Cleanup assertions prove no test rows remain and original DB rows are restored.

A success dialog alone is not proof. Match it with the corresponding network status and persisted DB/API value.

## Browser operating rules

- Take a fresh accessibility snapshot after every navigation or substantial UI update; never reuse stale element UIDs.
- Record the URL, request method/status, response content type, and relevant response body for each boundary.
- After the run, inspect console errors and network requests. Distinguish known unrelated 404/static-resource noise from an error caused by this test.
- Leave the browser on the requested mời giảng page or export result, not on an internal debug page.

## High-level workflow

1. Confirm local app/database target, test scope, lecturer, dot, semester, school year, and training-program IDs. Obtain explicit bypass authorization if direct export will skip UI approval.
2. Login through the UI with the credentials supplied at runtime. Verify the session by opening `/duyet-hop-dong` or the requested TKB page.
3. Create or import a unique fractional-QC TKB fixture. Prefer a value such as `45 × 1.50 × 2.25 = 151.875`, whose canonical result is `151.87`.
4. Verify `room_timetable.qc` and `course_schedule_details.qc` (or the equivalent source rows) contain the canonical value.
5. Save TKB to Quy chuẩn dự kiến through `/api/v1/tkb/save-data-to-qcdk`; verify `tam.QuyChuan` and the QCDK UI.
6. Load the financial mời giảng view with the exact dot/semester/year, filter the target lecturer, and verify the displayed QC and totals.
7. If direct export is authorized, use the narrow fixture/bypass in the reference. Do not click approval buttons or invoke bulk save/approval flows. Call `/exportHD/downloadAll` and, when requested, `/exportTongHopGvm/downloadAll` directly from the authenticated browser session.
8. Parse the ZIP, inspect filenames and document text, then perform the mandatory cleanup and rerun read-only assertions.

## Reporting

Report a compact matrix containing: boundary, request/status, expected canonical value, observed value, lecturer/scope, ZIP entries/document assertion, console/network findings, cleanup result, and blockers. Explicitly state whether the export was performed through the UI approval path or the authorized direct bypass. Include the exact old-vs-new data distinction when no migration was performed.
