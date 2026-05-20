# Canonical Formulas

Notation (per-lecturer, per-year):
- [I] total_actual_teaching = sum(normalized teaching sources)
- [II] standard_quota = configured `dinhMucChuan` (default 280)
- [III] missing_research_hours = max(0, dinhMucNCKH_after_discount - soTietNCKH)
- [IV] reduced_hours = standard_quota * (phanTramMienGiam / 100)
- [V] total_overtime_raw = [I] - [II] - [III] + [IV]
- [V_final] total_overtime = max(0, total_overtime_raw)
- [VI] paid_overtime = min([V_final], [II] - [IV])

JS pseudocode (canonical):

const mienGiam = dinhMucChuan * (phanTramMienGiam / 100);
const dinhMucSauMienGiam = dinhMucChuan - mienGiam;
const mienGiamNCKH = dinhMucNCKH * (phanTramMienGiam / 100);
const dinhMucNCKHSauGiam = dinhMucNCKH - mienGiamNCKH;
const thieuNCKH = Math.max(0, dinhMucNCKHSauGiam - soTietNCKH);
let raw = (total_actual_teaching - thieuNCKH) - dinhMucSauMienGiam;
let V = Math.max(0, raw);
let paid = Math.min(V, dinhMucSauMienGiam);

Rounding: normalize final reported numeric fields to 2 decimal places. Intermediate rounding policy: prefer exact arithmetic until final rounding, unless existing code requires toFixed(2) at intermediate steps (confirm if change desired).

Defaults: if `sotietdinhmuc` missing, default `dinhMucChuan = 280` and `dinhMucNCKH = 280`.

Uncertain items (must verify with product owners):
- Should `phanTramMienGiam` always apply to `dinhMucNCKH`?
- Rounding at each intermediate step vs final only.
