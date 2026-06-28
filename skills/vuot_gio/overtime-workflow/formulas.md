# Canonical Formulas

There are currently two versions of the Overtime Calculation Policy (Strategy Pattern):
- **Policy V1**: Applies to academic years up to 2024-2025.
- **Policy V2**: Applies to academic years from 2025-2026 onwards (the 80% rule).

Notation (per-lecturer, per-year):
- [I] total_actual_teaching = sum(normalized teaching sources)
- [II] standard_quota = configured `dinhMucChuan` (default 280)
- [III] missing_research_hours = max(0, dinhMucNCKH - soTietNCKH)
- [IV] reduced_hours = exemption amount based on policy version
- [V] total_overtime_raw = [I] - [II] - [III] + [IV]
- [V_final] total_overtime = max(0, total_overtime_raw)
- [VI] paid_overtime = min([V_final], [II] - [IV])

JS pseudocode (canonical V1):
```javascript
const mienGiam = dinhMucChuan * (phanTramMienGiam / 100);
const dinhMucSauMienGiam = dinhMucChuan - mienGiam;
const thieuNCKH = Math.max(0, dinhMucNCKH - soTietNCKH);
let raw = (total_actual_teaching - thieuNCKH) - dinhMucSauMienGiam;
let V = Math.max(0, raw);
let paid = Math.min(V, dinhMucSauMienGiam);
```

JS pseudocode (canonical V2 - 80% Rule):
```javascript
let mienGiam = 0;
let dinhMucSauMienGiam = dinhMucChuan;
if (phanTramMienGiam > 0) {
    dinhMucChuan = 280 * 0.8; // 224
    dinhMucSauMienGiam = dinhMucChuan;
    mienGiam = 280 - dinhMucChuan; 
} else {
    mienGiam = dinhMucChuan * (phanTramMienGiam / 100);
    dinhMucSauMienGiam = dinhMucChuan - mienGiam;
}
const thieuNCKH = Math.max(0, dinhMucNCKH - soTietNCKH);
let raw = (total_actual_teaching - thieuNCKH) - dinhMucSauMienGiam;
let V = Math.max(0, raw);
let paid = Math.min(V, dinhMucSauMienGiam);
```

Rounding: normalize final reported numeric fields to 2 decimal places. Intermediate rounding policy: prefer exact arithmetic until final rounding, unless existing code requires toFixed(2) at intermediate steps (confirm if change desired).

Defaults: if `sotietdinhmuc` missing, default `dinhMucChuan = 280` and `dinhMucNCKH = 200`.

Uncertain items (must verify with product owners):
- Rounding at each intermediate step vs final only.
