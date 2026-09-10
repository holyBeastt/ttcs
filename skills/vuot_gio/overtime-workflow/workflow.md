# Overtime Workflow (current)

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**.

## 1. Live data modes

### Projected (`isDuKien=true`)

- Teaching: `quychuan`, mapped in memory to internal lecturers.
- DATN: `doantotnghiep`, transformed/mapped for preview.
- LNQC, KTHP, HDTQ: runtime rows without approval predicates.
- NCKH injection: still the default `OFFICIAL` stats scope.

### Official (`isDuKien=false`)

- Teaching: `giangday`.
- DATN: `exportdoantotnghiep`.
- LNQC: `khoa_duyet=1 AND dao_tao_duyet=1`.
- KTHP: `khoa_duyet=1 AND khao_thi_duyet=1` on `vg_kthp`.
- HDTQ: `khoa_duyet=1 AND dao_tao_duyet=1`.

`id_User = 1` is excluded from lecturer aggregation. DATN guest rows (`isMoiGiang != 0`) are excluded.

## 2. Production calculation

```text
tongHop.service
  → summary.mapper.toAtomicSDO()/toCollectionSDO()
  → OvertimePolicyFactory → PolicyV1 or PolicyV2
```

The internal non-exported `summary.mapper.calculateOvertime()` helper is not the production entry point.

## 3. Lock and snapshot

`dataLock.service.lockData()` validates the academic year, requires two-level approval for LNQC/KTHP/HDTQ, requires every teaching faculty to have `van_phong_duyet=1`, computes the official SDO collection through a separate service-managed connection, then writes versioned JSON SDOs to `vg_so_tiet_tong_hop` together with the lock record in the lock transaction.

- Before lock: personal/faculty preview may use live projected or official data.
- After lock: personal/faculty preview uses the latest snapshot.
- Faculty statistics and Excel exports require a locked year and snapshot.
- `checkDataLock` blocks middleware-protected Vượt Giờ writes after lock. Synthesis approval routes are separate: revoke checks the lock in service, while approve has no explicit lock guard.
