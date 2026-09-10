# Canonical Formulas

> **Source-of-truth status:** Reconciled against `PolicyV1.js`, `PolicyV2.js`, and `OvertimePolicyFactory.js` on **2026-09-10**.

## Shared formula

```text
tongThucHien = soTietGiangDay + soTietNgoaiQC + soTietKTHP
              + soTietDoAn + soTietHDTQ

thieuNCKH = max(0, dinhMucNCKH - soTietNCKH)

tongVuot = max(0, tongThucHien - thieuNCKH - dinhMucSauMienGiam)
thanhToan = min(tongVuot, dinhMucSauMienGiam)
```

NCKH quota is **not** reduced by `phanTramMienGiam`.

## Policy V1

Used for every normalized year not in the configured V2 list:

```javascript
const mienGiam = dinhMucChuan * (phanTramMienGiam / 100);
const dinhMucSauMienGiam = dinhMucChuan - mienGiam;
const thieuNCKH = Math.max(0, dinhMucNCKH - soTietNCKH);
const tongVuot = Math.max(0,
  (tongThucHien - thieuNCKH) - dinhMucSauMienGiam);
const thanhToan = Math.min(tongVuot, dinhMucSauMienGiam);
```

## Policy V2

The factory selects V2 only for:

```text
2025 - 2026
2026 - 2027
2027 - 2028
2028 - 2029
2029 - 2030
2030 - 2031
2031 - 2032
```

When `phanTramMienGiam > 0`:

```javascript
dinhMucChuan = 280 * 0.8; // 224
mienGiam = 280 - dinhMucChuan; // 56
dinhMucSauMienGiam = dinhMucChuan; // 224
```

When the percentage is zero, V2 uses the normal arithmetic. Years outside the explicit list use V1.

## Defaults and rounding

If the global `sotietdinhmuc` row is missing/empty, the current fallback is:

```text
dinhMucChuan = 280
dinhMucNCKH  = 200
```

The policy keeps exact arithmetic until output fields are rounded to two decimals using `Number.EPSILON`.

## Payment breakdown

`PaymentCalculator.computeSdoBreakdown()` distributes payable overtime (`thanhToan`) across `vn`, `lao`, `cuba`, `cpc`, and `dongHP` proportionally by annual Table F totals. It uses:

```text
rate = ROUND(luong / 176, 0)
```

The in-memory SDO calculator rounds money values to two decimals through
`excelNumber()` (`Number(value.toFixed(2))`). The generated workbook formula uses
`TRUNC(vuot_group * mucTT, 2)` for each money cell; treat that as an export formula,
not as evidence that the in-memory calculator applies truncation.

`MAX_PAYABLE_HOURS = 300` is declared but not applied by the current calculator.
