# Academic Workload Management System — As-Is Overview

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. When this document conflicts with source code, source code is authoritative.

## 1. What the system currently does

TTCS is a university-internal Node.js/Express/MySQL application for teaching workload, NCKH, invited lecturers, thesis supervision, contracts, and finance exports. The two current workload modules are:

- **Vượt Giờ V2 (`/v2/vuotgio`)** — collects teaching, LNQC, KTHP, DATN, and HDTQ; builds SDOs; applies year-specific overtime policies; locks years and stores snapshots; exports Excel/payment data.
- **NCKH V3 (`/v3/nckh`)** — accepts eight research types, allocates participant hours into `nckh_so_tiet`, manages two approval flags, exposes official/preview statistics, and exports reports.

## 2. Architecture reality

The repository is a monolithic Express application using raw MySQL SQL. `vuotgio_v2` and `nckh_v3` use a layered route → controller → service → repository/mapper structure, while older Mời Giảng, Đồ Án, and contract flows remain controller-centric.

The current Vượt Giờ calculation path is:

```text
tongHop.service
  → summary.mapper.toAtomicSDO()/toCollectionSDO()
  → OvertimePolicyFactory
  → PolicyV1 or PolicyV2
```

The helper named `summary.mapper.calculateOvertime()` is internal and not exported; it must not be described as the production entry point.

## 3. Main business flows

### 3.1 Vượt Giờ

```text
Projected sources (`isDuKien=true`)
  quychuan + doantotnghiep + runtime VG tables without approval predicates

Official live (`isDuKien=false`)
  giangday + exportdoantotnghiep
  + LNQC(khoa_duyet=1, dao_tao_duyet=1)
  + KTHP(khoa_duyet=1, khao_thi_duyet=1)
  + HDTQ(khoa_duyet=1, dao_tao_duyet=1)

Both modes → tongHop.service → SDO mapper/policy
After lock → vg_so_tiet_tong_hop snapshot for statistics/export
```

The NCKH hours injected into either Vượt Giờ mode come from `stats.service` with its default `OFFICIAL` scope, so only NCKH records with both `khoa_duyet=1` and `vien_nc_duyet=1` count. Overtime uses:

```text
tongThucHien = GD + LNQC + KTHP + DATN + HDTQ
thieuNCKH = max(0, dinhMucNCKH - soTietNCKH)
tongVuot = max(0, tongThucHien - thieuNCKH - dinhMucSauMienGiam)
thanhToan = min(tongVuot, dinhMucSauMienGiam)
```

### 3.2 NCKH

```text
Manual payload or Excel row
  → type/mode strategy
  → formula.service allocation
  → nckh_chung (master) + nckh_so_tiet (participant rows)
  → rounded total integrity check
  → approval flags
  → stats/export scope
```

NCKH allocation is persisted during save; the management list is not a dynamic formula engine. Official stats require both approvals, while preview stats filter by year only.

## 4. Domain modules

| Module | Architecture | Current source of truth |
|---|---|---|
| Vượt Giờ V2 | Layered | `tongHop.service.js`, `summary.mapper.js`, `OvertimePolicyFactory`, `kthp.repo.js` |
| NCKH V3 | Layered | `formula.service.js`, `stats.repo.js`, `import/excel.strategy.js`, `nckhChung.repo.js` |
| Mời Giảng | Legacy controller-centric | Existing controllers and inline SQL |
| Đồ Án | Legacy controller-centric | Existing controllers and inline SQL |
| ExportHD/UNC | Legacy/document generation | Existing export controllers/services |

## 5. Approval, lock, and access behavior

- Vượt Giờ official source rows use two-level approval for LNQC, KTHP, and HDTQ. Year lock additionally requires every faculty to have `van_phong_duyet=1`; then it stores a full SDO snapshot.
- Before lock, personal/faculty preview may calculate live. After lock, personal/faculty preview reads snapshot; faculty statistics and Excel exports require snapshot.
- NCKH management records can be pending. Official stats/exports require `khoa_duyet=1 AND vien_nc_duyet=1`.
- NCKH import authorization is inline in `nckhV3Route.js`: only configured Institute NCKH assistant/leader roles with the Institute department code may import.
- `enforceKhoaFilter` scopes many Vượt Giờ faculty routes, but the synthesis approval status/approve/revoke routes remain a known scoping gap.

## 6. Current limitations

The active limitations are maintained in [known-limitations.md](./known-limitations.md). Important ones include missing route-level scoping on synthesis approval, silent quota fallback, cross-module NCKH coupling, an outdated overtime validator that calls a non-exported helper, and legacy controller duplication.
