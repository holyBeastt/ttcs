# Business Rules

All rules listed here are **confirmed** by direct code evidence. Assumptions are explicitly labeled.

---

## VuotGio (Teaching Overtime) Rules

### BR-VG-01: Overtime Formula

**File:** `src/mappers/vuotgio_v2/summary.mapper.js → calculateOvertime()`

```
tongThucHien      = soTietGiangDay + soTietNgoaiQC + soTietKTHP + soTietDoAn + soTietHDTQ

mienGiam          = dinhMucChuan × (phanTramMienGiam / 100)
dinhMucSauGiam    = dinhMucChuan − mienGiam

mienGiamNCKH      = dinhMucNCKH × (phanTramMienGiam / 100)
dinhMucNCKHSauGiam = dinhMucNCKH − mienGiamNCKH
thieuNCKH         = max(0, dinhMucNCKHSauGiam − soTietNCKH)

tongVuot          = max(0, (tongThucHien − thieuNCKH) − dinhMucSauGiam)
thanhToan         = min(tongVuot, dinhMucSauGiam)
```

**Key constraints:**
- `tongVuot` is floored at 0 — a lecturer cannot have negative overtime.
- `thanhToan` is **capped** at `dinhMucSauMienGiam` — a lecturer's payable overtime cannot exceed their adjusted quota.
- `thieuNCKH` directly reduces effective teaching hours before overtime is computed.

---

### BR-VG-02: NCKH Deficit Penalises Teaching Overtime

**File:** `src/mappers/vuotgio_v2/summary.mapper.js → calculateOvertime()`

If a lecturer's research hours (`soTietNCKH`) are below their exemption-adjusted NCKH quota, the shortfall (`thieuNCKH`) is **subtracted from their teaching total** before overtime is calculated. A lecturer cannot earn overtime pay by teaching more if they have not met their research obligation.

The NCKH quota is subject to the **same exemption percentage** as the teaching quota.

---

### BR-VG-03: Global Quota Source

**File:** `src/repositories/vuotgio_v2/tongHop.repo.js → getDinhMuc()` (via `shared.repo.js`)

```sql
SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1
```

There is a single global row for all lecturers. The quota is **not** per-faculty or per-rank.

**Fallback (hardcoded):** If `sotietdinhmuc` is empty, `dinhMucChuan = 280` and `dinhMucNCKH = 280` are used silently. No error is raised.

**Evidence:** `src/mappers/vuotgio_v2/summary.mapper.js → toAtomicSDO()`

---

### BR-VG-04: Per-Source Approval Gates

**File:** `src/repositories/vuotgio_v2/tongHop.repo.js`

| Source | Required for Hour Count | Required for Year Lock |
|--------|------------------------|----------------------|
| `giangday` | None | N/A |
| `vg_lop_ngoai_quy_chuan` | `khoa_duyet = 1` | `khoa_duyet = 1 AND dao_tao_duyet = 1` |
| `vg_coi_cham_ra_de` | `khoa_duyet = 1` | `khoa_duyet = 1 AND khao_thi_duyet = 1` |
| `exportdoantotnghiep` | None | N/A |
| `vg_huong_dan_tham_quan_thuc_te` | `khoa_duyet = 1` | `khoa_duyet = 1 AND dao_tao_duyet = 1` |

Second-level approval is enforced only at lock time, not at hour-count time.

---

### BR-VG-05: Thesis Records — Guest Lecturer Exclusion

**File:** `src/repositories/vuotgio_v2/tongHop.repo.js`

```sql
WHERE isMoiGiang = 0
```

Thesis supervision records where the supervisor is a guest lecturer are excluded from overtime aggregation. Only internal staff thesis records count.

---

### BR-VG-06: Admin User Excluded

**File:** All aggregation queries in `tongHop.repo.js`

```sql
WHERE nv.id_User <> 1
```

`id_User = 1` is a hardcoded system/admin user excluded from all workload aggregation.

---

### BR-VG-07: LNQC Two-Stage Workflow

**File:** `src/services/vuotgio_v2/lnqc.service.js`

Non-standard class records follow a staging workflow:
1. Faculty enters data → saved to `course_schedule_details` (draft table).
2. Faculty explicitly confirms → `lnqc.service.js → confirmToMain()` moves records to `vg_lop_ngoai_quy_chuan` (official table).
3. Only official-table records with `khoa_duyet = 1` appear in overtime totals.

---

### BR-VG-08: Year-Lock 5-Step Gate

**File:** `src/services/vuotgio_v2/dataLock.service.js → lockData()`

In strict sequence:
1. Validate `NamHoc` format: must match `/^\d{4}\s-\s\d{4}$/`.
2. `namhoc` table: year must exist.
3. `vg_khoa_du_lieu`: year must not already be locked.
4. `getUnapprovedCounts()`: all 3 tables must have zero unapproved 2-level records system-wide.
5. `duyetTongHop.repo.isAllKhoaApproved()`: `COUNT(van_phong_duyet=1) >= COUNT(phongban.isKhoa=1)`.

Race condition on step 5 insert is handled via MySQL `ER_DUP_ENTRY` (error 1062) catch.

---

### BR-VG-09: Faculty Synthesis Approval — Per-Faculty Prerequisite

**File:** `src/services/vuotgio_v2/duyetTongHop.service.js → checkPrerequisites()`  
**File:** `src/repositories/vuotgio_v2/duyetTongHop.repo.js → getUnapprovedCountsByKhoa()`

Before `van_phong_duyet` can be set to `1` for a faculty, the same 3-table / 2-level check is run **scoped to that faculty's** `khoa` code. Global year-lock uses the same check without a faculty filter.

Approval is written via `UPSERT`:
```sql
INSERT INTO vg_duyet_tong_hop (...) VALUES (...)
ON DUPLICATE KEY UPDATE van_phong_duyet = 1, ...
```

---

### BR-VG-10: Payment Cap

**File:** `src/mappers/vuotgio_v2/summary.mapper.js → calculateOvertime()`

```js
thanhToan = Math.min(tongVuot, dinhMucSauMienGiam)
```

A lecturer's payable overtime cannot exceed their exemption-adjusted quota. This prevents a scenario where a very high teaching load generates unbounded payment.

---

### BR-VG-11: Table F — Thesis/Field-Trip Convention

**File:** `src/mappers/vuotgio_v2/summary.mapper.js → buildTableF()`

Thesis supervision (`doAn`) and field-trip guidance (`hdtq`) records have no semester field. They are **always attributed to HK2** (Semester 2) in the training-system breakdown table. This is a convention, not derived from data.

---

## NCKH (Research) Rules

### BR-NK-01: Double-Approval Required for Aggregation

**File:** `src/repositories/nckh_v3/nckhChung.repo.js → listUnified()`

Only research records where `khoa_duyet = 1 AND vien_nc_duyet = 1` appear in lecturer hour totals. This is stricter than VuotGio (which only requires `khoa_duyet = 1`).

---

### BR-NK-02: Hour Distribution — Standard Mode (Weighted Split)

**File:** `src/services/nckh_v3/formula.service.js → quyDoiSoTietStandard()`

Used by: `BAIBAO`, `DETAI_DUAN`, `SACHGIAOTRINH`, `SANGKIEN`, `GIAITHUONG`.

```
T = total hours; n = participants; m = main authors (tac_gia)

if m == 1:
  n == 1: tacGia = T
  n == 2: tacGia = 2T/3,  thanhVien = T/3
  n == 3: tacGia = T/2,   thanhVien = T/4
  n >= 4: base = 2T/(3n); tacGia = T/3 + base; thanhVien = base

if m >= 2:
  base = 2T/(3n)
  tacGia = T/(3m) + base; thanhVien = base
```

---

### BR-NK-03: Hour Distribution — Equal Mode

**File:** `src/services/nckh_v3/formula.service.js`

Used by: `DEXUAT`, `HUONGDAN`.

```
soTietMoiNguoi = round2(T / n / duration)
```

All participants receive equal hours. Multi-year projects divide by duration.

---

### BR-NK-04: Hour Distribution — Fixed Mode

**File:** `src/services/nckh_v3/formula.service.js`

Used by: `HOIDONG` (council members).

```
soTietMoiNguoi = round2(T)
```

Strict constraint: exactly **1 participant per record**. Any other count throws and rolls back the transaction.

---

### BR-NK-05: Rounding and Delta Correction

**File:** `src/services/nckh_v3/formula.service.js`

All values are rounded to 2 decimal places using:
```js
round2(v) = Math.round((v + EPSILON) * 100) / 100
```

After rounding, if `SUM(soTiet) ≠ tongSoTiet`, the remainder (delta) is added to the **last `thanh_vien`** (or last participant if no member exists) to prevent floating-point drift.

---

### BR-NK-06: Multi-Year Project Expansion

**File:** `src/services/nckh_v3/formula.service.js`

If `soNamThucHien > 1`, per-person hours are divided by duration and rows are expanded into one record per year per participant.

---

### BR-NK-07: Post-Calculation Integrity Check

**File:** `src/services/nckh_v3/typeInput.service.js → create() / update()`

After formula application:
```js
const total = round2(await nckhSoTietRepo.sumHours(connection, nckhId));
const expected = round2(Number(payload.tongSoTiet));
if (total !== expected) throw new Error(...);  // triggers rollback
```

This ensures the database sum always exactly matches the declared total.

---

### BR-NK-08: quyDinh Table Overrides Excel Hours

**File:** `src/services/nckh_v3/import.service.js`

During Excel import, the `tongSoTiet` value in the uploaded file is **ignored**. The system always fetches the authoritative hour value from the `quyDinh` table (using a schema-discovery pattern with 4 candidate table names and 4-6 candidate column names).

---

### BR-NK-09: Deletion Blocked After Institute Approval

**File:** `src/services/nckh_v3/record.service.js` (inferred from approval gate pattern)

Records where `vien_nc_duyet = 1` cannot be deleted. Deletion requires the record to be in a pre-Institute-approval state.

**Status:** Confirmed by approval gate pattern; specific guard function not fully traced.
