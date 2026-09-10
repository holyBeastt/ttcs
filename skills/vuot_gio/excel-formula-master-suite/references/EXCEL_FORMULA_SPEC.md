# Excel Formula Specification — Vượt Giờ V2

> **Source-of-truth status:** Reconciled against the current source on **2026-09-10**. The application source is authoritative. Excel workbooks and generated reports are evidence for a particular artifact/version; they may preserve historical formulas and must be labeled as such.

## 1. Scope and authority

There are two related but different contracts:

1. **Current application runtime** — `src/mappers/vuotgio_v2/`,
   `src/mappers/vuotgio_v2/policies/`, and
   `src/services/vuotgio_v2/department_excel/data/calculator.js`.
2. **Workbook forensics** — department/master/payment sheets such as
   `CNTT-092025`, `TỔNG HỢP 2025`, and `Tiền chuyển khoản`.

When a workbook formula differs from the runtime, document the workbook formula as
**historical/observed** and call out the drift. Do not silently promote it to a
current business rule.

## 2. Current runtime calculation

### 2.1 SDO policy

The production path is:

```text
tongHop.service
  → summary.mapper.toAtomicSDO()/toCollectionSDO()
  → OvertimePolicyFactory
  → PolicyV1 or PolicyV2
```

For one lecturer:

```text
tongThucHien = giangDay + LNQC + KTHP + DATN + HDTQ
thieuNCKH = max(0, dinhMucNCKH - soTietNCKH)
tongVuot = max(0, tongThucHien - thieuNCKH - dinhMucSauMienGiam)
thanhToan = min(tongVuot, dinhMucSauMienGiam)
```

- Defaults when `sotietdinhmuc` has no usable row: `dinhMucChuan=280`,
  `dinhMucNCKH=200`.
- NCKH quota is not reduced by the teaching exemption.
- Policy V2 is selected only for `2025 - 2026` through `2031 - 2032`.
  With a positive exemption, V2 uses a teaching quota of `224` and records
  `mienGiam=56`; other years use V1.

### 2.2 Current payment breakdown

`PaymentCalculator.computeSdoBreakdown()` distributes `thanhToan` across the
five annual Table F groups:

```text
vn, lao, cuba, cpc, dongHP
```

The rate is:

```text
rate = ROUND(luong / 176, 0)
```

`computeSdoBreakdown()` rounds the group money values to two decimals through its
`excelNumber()` helper (`Number(value.toFixed(2))`). The separate
`calculatePaymentAmount()` helper uses truncation, but it is not the SDO
breakdown path. `MAX_PAYABLE_HOURS = 300` is declared in source but is **not
applied by the current calculator**. The payable-hour cap comes from the selected
overtime policy (`dinhMucSauMienGiam`), not from that unused constant.

## 3. Current generated workbook formulas

The workbook generator under
`src/services/vuotgio_v2/department_excel/generators/formula.generator.js`
mirrors the current runtime contract where it is used:

- rate cell: `ROUND(luong / 176, 0)`;
- generated per-group payment formula: `TRUNC(vuot_group * mucTT, 2)` (the
  application calculator rounds its in-memory SDO money values to two decimals);
- proportional payable-hour allocation: `ROUND(year_group / year_total * thanhToan, 0)`;
- the final `dongHP` bucket receives the remainder so the five buckets sum to
  `thanhToan`.

Generated Excel is still an output artifact. Validate the SDO/snapshot source
before treating a workbook cell as a new policy.

## 4. Historical workbook layout (non-authoritative)

Older workbooks commonly expose columns with names like these:

| Column | Observed meaning |
|---|---|
| C | `base_income` |
| G | `required_hours` |
| H/M/R | Semester/source VN hours and VN total |
| W | `grand_total_hours` |
| AC | `actual_excess_hours` |
| AD | Workbook's payable/capped hours |
| AE | Workbook's unit rate |
| AK | Workbook's total payment |

A historical workbook may contain formulas such as:

```text
AE = TRUNC(base_income / 176, 1)
AD = IF(actual_excess_hours >= 0, MIN(actual_excess_hours, 300), 0)
```

Those formulas describe that workbook's behavior only. They are **not** the
current runtime contract unless the current source explicitly matches them.

## 5. Workbook-analysis rules

When analyzing a sheet:

1. Record the workbook name, sheet name, and extraction date.
2. Quote the observed formula and distinguish it from the current runtime formula.
3. State whether the result is runtime-compatible or historical drift.
4. For cross-sheet mapping, preserve the observed links (for example,
   `='CNTT-092025'!A15`) without treating the link layout as application code.
5. For payment reconciliation, compare the workbook total with snapshot SDO
   `thanhToan` and the runtime rate `ROUND(luong / 176, 0)`.

## 6. Historical multi-sheet mapping

The legacy workbook family often contains:

- detail sheets per faculty/department;
- one master sheet (`TỔNG HỢP 2025`);
- one payment sheet (`Tiền chuyển khoản`).

Master/detail links and `SUM` formulas are useful for forensic reconciliation,
but they do not replace the current snapshot/export services.
