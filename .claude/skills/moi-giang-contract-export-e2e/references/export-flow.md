# TKB → mời giảng contract/export flow

This reference is for the local Ttcs application. Source-level context can be cross-checked with the `moi-giang-module` skill and the TKB controllers/routes.

## 1. Routes and source-of-truth boundaries

| Boundary | Route/table | Assertion |
|---|---|---|
| TKB import | `POST /api/v1/tkb/import` (`multipart` field `file`) | The import computes QC through the TKB factory before inserting source rows. |
| TKB render/update | `POST /api/v1/tkb/data-tkb-to-render`, `POST /api/v1/tkb/update-row` | Render/update uses stored/canonical QC; recalculation is only at the TKB source boundary. |
| TKB → QCDK | `POST /api/v1/tkb/save-data-to-qcdk` | Body: `{ major, dot, ki_hoc, nam_hoc }`; `major` is a faculty code or `ALL`. Expected success is normally HTTP 200/201 depending on route version. |
| QCDK UI/API | QCDK page and its existing API | `tam.QuyChuan` must equal the TKB canonical value. |
| Financial mời giảng data | `POST /api/duyet-hop-dong` | Form body: `dot`, `ki`, `namHoc`, `loaiHopDong=Mời giảng`. Filter the returned `groupedByTeacher` object to the target lecturer. |
| Per-training-program export | `GET /exportHD/downloadAll` | Query: `dot`, `ki`, `namHoc`, `teacherName`, `loaiHopDong` (training-program ID such as `6` or `7`). |
| Combined lecturer export | `GET /exportTongHopGvm/downloadAll` | Query: `dot`, `ki`, `namHoc`, `khoa=ALL` or a faculty code, `teacherName`, `loaiHopDong`. |

The export controllers read `hopdonggvmoi`; they do not prove that an approval button was clicked. That is why the direct bypass below can be used for an authorized local fixture test.

## 2. Fixture design

Use an isolated, uniquely identifiable test scope. A good fractional case is:

```text
lecturer: the user-selected lecturer
Dot: 1
KiHoc: 2
NamHoc: 2025 - 2026
faculty: ATTT (or the user's selected faculty)
LL: 45
HeSoLopDong: 1.50
HeSoT7CN: 2.25
raw QC: 151.875
canonical QC: 151.87
```

For a smaller import-only check, `1.2678` must become `1.26`. Do not use a value that can pass both truncate and round-nearest, such as `1.2700`.

Create a unique workbook/record identifier if importing through the UI. Before mutation, save the original rows with a read-only query. The snapshot must include the complete row or all columns that the cleanup will change, not only `QuyChuan`.

## 3. Import and TKB/QCDK verification

The TKB import form sends these fields in addition to the file:

```text
file: <xlsx>
semester: JSON.stringify({ dot, ki, nam })
lastTTValue: JSON.stringify(<number>)
location: hvktmm   # use the UI's selected location when applicable
```

Use Chrome DevTools `upload_file` for the file input or reproduce the same `FormData` request in `evaluate_script`. Record the response status and JSON message.

Verify the source rows directly (read-only SQL):

```sql
SELECT ...
FROM room_timetable
WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? AND ...;

SELECT ...
FROM course_schedule_details
WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? AND ...;
```

For every fixture row, assert that both source QC values are the exact canonical decimal string/value, e.g. `151.87`, not `151.88` or a binary-float artifact.

Then call the TKB → QCDK action with the exact selected faculty/period. Verify:

```sql
SELECT ...
FROM tam
WHERE dot = ? AND ki = ? AND nam = ? AND ...;
```

The `tam.QuyChuan` value must equal the TKB value. Do not run an extra UI rounding step after this boundary.

## 4. UI verification

Open `/duyet-hop-dong`, select the exact dot, semester, school year, and `Mời giảng`, then click the page's display/load button. Filter by the exact lecturer name.

Capture the relevant DOM/API values. For the example above, expected values are:

```text
QC CH: 151,87 (or locale-equivalent 151.87)
other program: 225.00
lecturer total: 376.87
```

The UI may use a comma as the decimal separator. Compare canonical numeric meaning, not punctuation. It must not convert a raw `151.875` and round it to `151.88`.

The browser console may contain pre-existing static-resource 404s. Treat a new exception from the changed QC display code as a failure and include the stack/message in the report.

## 5. Authorized direct-export bypass

Use this only after the user explicitly says the current test may bypass UI approval. The bypass is not a product feature and must never be generalized to production.

### Narrow bypass procedure

1. Confirm the authenticated browser session and exact target scope.
2. Read the target `quychuan` row(s) and `hopdonggvmoi` rows. Save the full original values.
3. If the export requires contract rows that do not yet exist, insert only temporary `hopdonggvmoi` rows for the target lecturer and selected `he_dao_tao` IDs. Use the actual lecturer identity fields from the local DB; do not invent a second lecturer.
4. Set only the approval flags needed for the fixture (`TaiChinhDuyet=1` when the local export/UI query requires it). This is fixture state, not a UI approval action.
5. Do **not** call `submitData2`, bulk save, bulk approve, or an endpoint that touches all departments/lecturers.
6. From the authenticated page, call the direct export URL with `evaluate_script`/`fetch`, or navigate to it and inspect the resulting network request. Include `credentials: 'include'` for `fetch`.

Example query templates (replace every value with the current test scope):

```text
/exportHD/downloadAll?dot=1&ki=2&namHoc=2025%20-%202026&teacherName=<url-encoded-name>&loaiHopDong=6
/exportHD/downloadAll?dot=1&ki=2&namHoc=2025%20-%202026&teacherName=<url-encoded-name>&loaiHopDong=7
/exportTongHopGvm/downloadAll?dot=1&ki=2&namHoc=2025%20-%202026&khoa=ALL&teacherName=<url-encoded-name>&loaiHopDong=7
```

For a download navigation, Chrome may report `net::ERR_ABORTED`; that is expected when the browser hands a successful file response to the download manager. Inspect the corresponding network request and require HTTP 200 plus `Content-Type: application/zip`.

### Minimal response assertion

```js
async () => {
  const url = '/exportHD/downloadAll?...';
  const response = await fetch(url, { credentials: 'include' });
  const bytes = new Uint8Array(await response.arrayBuffer());
  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    bytes: bytes.length,
    zipSignature: Array.from(bytes.slice(0, 4)), // [80, 75, 3, 4]
  };
}
```

A valid result must have `status: 200`, `contentType: application/zip`, a non-zero body, and ZIP signature `[80,75,3,4]`. For a full assertion, parse the ZIP central directory and return all entry names. The target lecturer's name must appear in contract/appendix names; no unrelated lecturer should be present.

### Document assertion

For DOCX entries, unzip the DOCX `word/document.xml` and strip XML tags before searching. Assert the expected rendered text, for example:

```text
Lê Đình Thích
Số tiết giảng dạy: 225,00 tiết
```

Do not assert only a filename: a valid ZIP can still contain a stale/wrong contract.

## 6. Cleanup and post-cleanup checks

Cleanup is mandatory even when export fails. Perform it from the main agent with a transaction after confirming exact IDs:

```sql
START TRANSACTION;

-- Delete only hopdonggvmoi rows created by this fixture.
DELETE FROM hopdonggvmoi WHERE MaHopDong IN (...fixture IDs...);

-- Restore each mutated quychuan row from the pre-test snapshot.
UPDATE quychuan
SET QuyChuan = ?, TaiChinhDuyet = ?, ...
WHERE ID = ?;

COMMIT;
```

If TKB/QCDK rows were inserted solely for the fixture, delete those exact rows or restore their previous `da_luu`/approval state. Do not delete by lecturer name alone when another real record can match.

After cleanup, assert:

```sql
SELECT COUNT(*) FROM hopdonggvmoi WHERE MaHopDong IN (...);
-- must be 0

SELECT ... FROM quychuan WHERE ID IN (...);
-- must exactly equal the snapshot
```

Also run a read-only API check for the target lecturer. If the original database row was `151.88`, observing `151.88` after cleanup is expected and demonstrates that no migration occurred.

## 7. Failure classification

- `401/403`: session/permission failure; re-authenticate or stop. Do not bypass authorization by changing production permissions.
- `400`: malformed fixture/query or business validation; preserve the response body.
- `404`: no matching contract/lecturer rows; check exact `HoTen`, `Dot`, `KiHoc`, `NamHoc`, and `he_dao_tao`.
- `5xx`: export generation or server failure; inspect server logs and ZIP/temp-file cleanup.
- `200` but non-ZIP: export route returned an HTML alert/error; capture body and do not call it a pass.
- Wrong decimal (`151.88` instead of `151.87`): stop, record the boundary where it changed, and do not “fix” it by editing downstream display code.

## 8. Result template

```text
Scope: <lecturer / dot / semester / school year / faculty>
Authorization: UI approval path | explicit direct-export bypass
Source QC: raw <...> -> canonical <...>
TKB import/update: <status>
TKB source rows: <values>
TKB -> QCDK: <status>; tam.QuyChuan=<value>
Mời giảng UI: <displayed values/totals>
Export hệ <id>: HTTP <status>, ZIP <valid/invalid>, entries=<...>, document=<assertion>
Console/network: <findings>
Cleanup: <rows deleted/restored and verification>
Code changes: <none or commit>
Blockers: <none or exact failures>
```
