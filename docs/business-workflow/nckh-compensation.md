# NCKH Compensation — Research Hour Distribution

This document covers the formula layer for research workload (NCKH) hour distribution among participants.

---

## Overview

Research hours are not stored as flat values. They are calculated dynamically from a master record's total hours, distributed among participants according to their role and count, using one of three modes.

**Primary file:** `src/services/nckh_v3/formula.service.js`

---

## Research Types and Modes

| Type Key | Vietnamese Name | Distribution Mode |
|----------|----------------|-------------------|
| `BAIBAO` | Bài báo khoa học | `standard` |
| `DETAI_DUAN` | Đề tài / Dự án | `standard` |
| `SACHGIAOTRINH` | Sách / Giáo trình | `standard` |
| `SANGKIEN` | Sáng kiến | `standard` |
| `GIAITHUONG` | Giải thưởng / Bằng sáng chế | `standard` |
| `DEXUAT` | Đề xuất nghiên cứu | `equal` |
| `HUONGDAN` | Hướng dẫn sinh viên NCKH | `equal` |
| `HOIDONG` | Thành viên hội đồng | `fixed` |

**Evidence:** `src/config/nckh_v3/types.js` + `formula.service.js`

---

## Mode: `standard` — Weighted Author/Member Split

### Function

`formula.service.js → quyDoiSoTietStandard(T, n, m)`

- `T` = total hours for the work (`tongSoTiet`)
- `n` = total participants
- `m` = main authors (`tac_gia` role count)

### Formulas

**Single main author (`m == 1`):**

| Participants (n) | Main Author Gets | Each Member Gets |
|-----------------|-----------------|-----------------|
| 1 | `T` | — |
| 2 | `2T / 3` | `T / 3` |
| 3 | `T / 2` | `T / 4` |
| ≥ 4 | `T/3 + 2T/(3n)` | `2T/(3n)` |

**Multiple main authors (`m >= 2`):**

```
base = 2T / (3n)
tacGia_hours    = T / (3m) + base
thanhVien_hours = base
```

### Design Rationale

Main authors always receive a guaranteed share (`T/3` split equally among them) plus a proportional base allocation. Members receive only the base allocation. This encodes the university's policy that first/corresponding authorship carries more weight.

---

## Mode: `equal` — Even Split

### Function

`formula.service.js → buildParticipantsEqual(T, participants, duration)`

```
soTietMoiNguoi = round2(T / n / duration)
```

All participants receive identical hours. Used for proposals (`DEXUAT`) and student research guidance (`HUONGDAN`) where role distinction is not applicable.

---

## Mode: `fixed` — Per-Record Fixed Hours

### Function

`formula.service.js → buildParticipantsFixed(T)`

```
soTietMoiNguoi = round2(T)
```

Each record represents exactly **one person's contribution**. The constraint `tongSoNguoi === 1` is strictly enforced — any other count throws an error and rolls back the transaction.

Used for council members (`HOIDONG`), where each person's hours are defined independently per record.

---

## Multi-Year Projects

**File:** `formula.service.js`

If `soNamThucHien > 1` (project spans multiple years):

1. Per-person hours are divided by `duration` (years).
2. Participant rows are **expanded** — one row per year per person.
3. Rounding is applied to each year-row independently.

This means a 2-year project with 1 author and `T = 100` hours produces two `nckh_so_tiet` rows, each with `50` hours (before rounding correction).

---

## Rounding Rules

**File:** `formula.service.js`

```js
const EPSILON = 1e-9;
const round2 = (v) => Math.round((v + EPSILON) * 100) / 100;
```

`EPSILON` is added before rounding to prevent floating-point truncation (e.g., `0.005` rounding down to `0.00`).

### Delta Correction

After all participants' hours are rounded, the system checks:

```
delta = round2(tongSoTiet) - SUM(round2(participant hours))
```

If `delta != 0`, it is added to:
1. The last `thanh_vien` (member) in the list.
2. If no member exists, the last participant overall.

This guarantees `SUM(nckh_so_tiet.so_tiet) == nckh_chung.tong_so_tiet` exactly.

**Evidence:** `formula.service.js → buildParticipantsByMode()` delta correction block.

---

## Post-Calculation Integrity Check

**File:** `src/services/nckh_v3/typeInput.service.js → create()` and `update()`

After every save operation, the system re-queries the database:

```js
const total = round2(await nckhSoTietRepo.sumHours(connection, nckhId));
const expected = round2(Number(payload.tongSoTiet));
if (total !== expected) {
  throw new Error(`Tổng số tiết không khớp: ${total} vs ${expected}`);
}
```

A mismatch triggers a full transaction rollback. This is a hard integrity constraint — no record can be saved with mismatched totals.

---

## Schema Discovery for `quyDinh` Table

**File:** `src/services/nckh_v3/quyDinh.service.js`

The system does not assume a fixed table name or column name for the hour regulations table. It probes the database with:

- **4 candidate table names**: `admin_quydinhsogio`, `nckh_quydinhsogio`, and variants.
- **4–6 candidate column names** per field.

This is a defensive pattern for environments where schema names differ between development and production. It uses `SHOW COLUMNS FROM <table>` before querying.

> ⚠️ This approach means hour rules can silently change if a table column is renamed to match a candidate. Schema drift should be monitored.

---

## Approval Lifecycle

```
[Created]
  → khoa_duyet = 0, vien_nc_duyet = 0

[Department Head approves]
  → khoa_duyet = 1

[Research Institute approves]
  → vien_nc_duyet = 1

[Appears in aggregation]  ← Only after both = 1

[Deletion blocked]        ← After vien_nc_duyet = 1
```

**Evidence:** `src/repositories/nckh_v3/nckhChung.repo.js → listUnified()` WHERE clause.
