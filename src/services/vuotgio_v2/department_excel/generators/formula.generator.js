/**
 * Formula Generator - Hybrid Excel Export (Vượt Giờ V2)
 *
 * Generates Excel formula strings for the 36-column department/master layout.
 *
 * Strategy (based on excel-formula-master-suite / EXCEL_FORMULA_SPEC.md):
 *   - Input columns  (C,D,E,F,G, H–L HK1, M–Q HK2): Static values from SDO.
 *   - Derived columns (R–V year, W–AB vuot, AC mucTT, AD–AI money, AJ thucNhan): Excel formulas.
 *   - Footer row    : SUM range formulas over the data rows.
 *
 * Column index map (1-based, matching summary.component.js):
 *   1=STT  2=Name  3=luong  4=dinhMucChuan  5=mienGiam  6=thieuNCKH  7=dinhMucSauMienGiam
 *   8=hk1_vn  9=hk1_lao  10=hk1_cuba  11=hk1_cpc  12=hk1_dongHP
 *  13=hk2_vn 14=hk2_lao 15=hk2_cuba 16=hk2_cpc 17=hk2_dongHP
 *  18=year_vn 19=year_lao 20=year_cuba 21=year_cpc 22=year_dongHP
 *  23=vuot_vn 24=vuot_lao 25=vuot_cuba 26=vuot_cpc 27=vuot_dongHP  28=vuot_total
 *  29=mucTT
 *  30=money_vn 31=money_lao 32=money_cuba 33=money_cpc 34=money_dongHP 35=money_total
 *  36=thucNhan
 */

const CellFormatter    = require('../../shared_excel/core/cell.formatter');
const PaymentCalculator = require('../data/calculator');

// ── Column letter helpers ─────────────────────────────────────────────────────

const COL = (n) => CellFormatter.columnToLetter(n);

// Pre-compute letters for all used columns (1-indexed)
// C=3  D=4  E=5  F=6  G=7
// H=8  I=9  J=10 K=11 L=12    (HK1 VN/Lao/Cuba/CPC/DHP)
// M=13 N=14 O=15 P=16 Q=17    (HK2 VN/Lao/Cuba/CPC/DHP)
// R=18 S=19 T=20 U=21 V=22    (Year VN/Lao/Cuba/CPC/DHP)
// W=23 X=24 Y=25 Z=26 AA=27 AB=28  (Vuot VN/Lao/Cuba/CPC/DHP/Total)
// AC=29 = mucTT
// AD=30 AE=31 AF=32 AG=33 AH=34 AI=35  (Money VN/Lao/Cuba/CPC/DHP/Total)
// AJ=36 = thucNhan

const COLS = {
  luong:               COL(3),
  dinhMucChuan:        COL(4),
  mienGiam:            COL(5),
  thieuNCKH:           COL(6),
  dinhMucSauMienGiam:  COL(7),
  // HK1
  hk1_vn:   COL(8),  hk1_lao:   COL(9),  hk1_cuba:  COL(10), hk1_cpc: COL(11), hk1_dhp: COL(12),
  // HK2
  hk2_vn:  COL(13), hk2_lao:  COL(14), hk2_cuba: COL(15), hk2_cpc: COL(16), hk2_dhp: COL(17),
  // Year (col 18-22)
  year_vn:  COL(18), year_lao: COL(19), year_cuba:COL(20), year_cpc:COL(21), year_dhp:COL(22),
  // Vuot (col 23-28)
  vuot_vn:  COL(23), vuot_lao: COL(24), vuot_cuba:COL(25), vuot_cpc:COL(26), vuot_dhp:COL(27),
  vuot_total: COL(28),
  // Mức TT (col 29)
  mucTT: COL(29),
  // Money (col 30-35)
  money_vn: COL(30), money_lao:COL(31), money_cuba:COL(32), money_cpc:COL(33), money_dhp:COL(34),
  money_total: COL(35),
  // Thực nhận (col 36)
  thucNhan: COL(36),
};

// ── Formula builders ─────────────────────────────────────────────────────────

/**
 * Formula for "Tổng năm" of a training-system group.
 * Tổng năm = HK1 + HK2  (Đồ án & Tham quan are already summed into HK1 by the mapper).
 *
 * @param {string} hk1Col - Column letter for HK1 of the group
 * @param {string} hk2Col - Column letter for HK2 of the group
 * @param {number} r      - Excel row number
 */
const yearFormula = (hk1Col, hk2Col, r) => `${hk1Col}${r}+${hk2Col}${r}`;

/**
 * Formula for proportional overtime distribution for a single training-system group.
 * Based on EXCEL_FORMULA_SPEC.md Bước 4:
 *   distributed = IF(yearTotal>0, ROUND(year_group / yearTotal * thanhToan, 0), 0)
 *
 * yearTotal = R+S+T+U+V  (cols 18-22)
 * thanhToan = vuot_total  (col 28, which is a static pre-calculated value)
 *
 * NOTE: col 27 (vuot_dhp / last group) uses remainder subtraction to avoid rounding drift.
 *
 * @param {string} yearGroupCol - Column letter for year_group
 * @param {string} yearTotalRange - e.g. "R9:V9"
 * @param {string} thanhToanCol  - column letter for vuot_total (col 28)
 * @param {number} r
 */
const vuotGroupFormula = (yearGroupCol, yearTotalRange, thanhToanCol, r) =>
  `IF(SUM(${yearTotalRange})>0,ROUND(${yearGroupCol}${r}/SUM(${yearTotalRange})*${thanhToanCol}${r},0),0)`;

/**
 * Remainder formula for the LAST group in proportional distribution (dongHP).
 * dongHP_vuot = vuot_total - SUM(other four vuot groups)
 * Ensures exact total without rounding error.
 */
const vuotLastGroupFormula = (thanhToanCol, firstVuotCol, preLastVuotCol, r) =>
  `${thanhToanCol}${r}-SUM(${firstVuotCol}${r}:${preLastVuotCol}${r})`;

/**
 * Formula for money (thành tiền) per group.
 * Based on EXCEL_FORMULA_SPEC.md Bước 5: TRUNC(vuot_group * mucTT, 2)
 */
const moneyGroupFormula = (vuotGroupCol, mucTTCol, r) =>
  `TRUNC(${vuotGroupCol}${r}*${mucTTCol}${r},2)`;

/**
 * Footer SUM formula over a column's data range.
 */
const sumRange = (colLetter, startRow, endRow) => `SUM(${colLetter}${startRow}:${colLetter}${endRow})`;

// ── Public API ────────────────────────────────────────────────────────────────

class FormulaGenerator {
  /**
   * Write formula-based derived cells for a single data row.
   *
   * Columns that remain as static values (already written by caller):
   *   1-7   (STT, Name, luong, dinhMucChuan, mienGiam, thieuNCKH, dinhMucSauMienGiam)
   *   8-17  (HK1 and HK2 breakdown per training system)
   *   28    (vuot_total / thanhToan — pre-calculated by SDO engine, source of truth)
   *   29    (mucTT — constant 100,000 VND)
   *
   * Columns written as formulas here:
   *   18-22 (year per group) — sum of HK1+HK2
   *   23-27 (vuot per group) — proportional distribution with last-remainder
   *   30-34 (money per group) — TRUNC(vuot * mucTT, 2)
   *   35    (money total)     — SUM(AD:AH)
   *   36    (thucNhan)        — same as money total for now
   *
   * @param {ExcelJS.Worksheet} ws
   * @param {number} r           - Excel row number
   * @param {object} bd          - Pre-calculated breakdown (used as `result` cache)
   */
  static writeDataRowFormulas(ws, r, bd) {
    const C = COLS;
    const numFmt = '#,##0.00';

    // Year totals per group (cols 18-22)
    // yearRange = R:V (cols 18-22)
    const yearGroups = [
      [C.year_vn,   C.hk1_vn,  C.hk2_vn,  bd.year.vn],
      [C.year_lao,  C.hk1_lao, C.hk2_lao, bd.year.lao],
      [C.year_cuba, C.hk1_cuba,C.hk2_cuba, bd.year.cuba],
      [C.year_cpc,  C.hk1_cpc, C.hk2_cpc,  bd.year.cpc],
      [C.year_dhp,  C.hk1_dhp, C.hk2_dhp, bd.year.dongHP],
    ];
    yearGroups.forEach(([col, hk1, hk2, result]) => {
      CellFormatter.applyFormula(
        ws.getCell(`${col}${r}`),
        yearFormula(hk1, hk2, r),
        result,
        { numFmt, hAlign: 'center', vAlign: 'middle' }
      );
    });

    // yearTotalRange for proportional division
    const yearTotalRange = `${C.year_vn}${r}:${C.year_dhp}${r}`;

    // Proportional vuot per group (cols 23-27)
    // First 4 groups use ROUND formula; last group (dongHP col 27) uses remainder subtraction
    const vuotGroups = [
      [C.vuot_vn,   C.year_vn,   bd.vuot.vn],
      [C.vuot_lao,  C.year_lao,  bd.vuot.lao],
      [C.vuot_cuba, C.year_cuba, bd.vuot.cuba],
      [C.vuot_cpc,  C.year_cpc,  bd.vuot.cpc],
    ];
    vuotGroups.forEach(([col, yearCol, result]) => {
      CellFormatter.applyFormula(
        ws.getCell(`${col}${r}`),
        vuotGroupFormula(yearCol, yearTotalRange, C.vuot_total, r),
        result,
        { numFmt, hAlign: 'center', vAlign: 'middle' }
      );
    });

    // Last vuot group: dongHP (col 27) — remainder to avoid rounding drift
    CellFormatter.applyFormula(
      ws.getCell(`${C.vuot_dhp}${r}`),
      vuotLastGroupFormula(C.vuot_total, C.vuot_vn, C.vuot_cpc, r),
      bd.vuot.dongHP,
      { numFmt, hAlign: 'center', vAlign: 'middle' }
    );

    // Money per group (cols 30-34): TRUNC(vuot_group * mucTT, 2)
    const moneyGroups = [
      [C.money_vn,   C.vuot_vn,   bd.money.vn],
      [C.money_lao,  C.vuot_lao,  bd.money.lao],
      [C.money_cuba, C.vuot_cuba, bd.money.cuba],
      [C.money_cpc,  C.vuot_cpc,  bd.money.cpc],
      [C.money_dhp,  C.vuot_dhp,  bd.money.dongHP],
    ];
    moneyGroups.forEach(([col, vuotCol, result]) => {
      CellFormatter.applyFormula(
        ws.getCell(`${col}${r}`),
        moneyGroupFormula(vuotCol, C.mucTT, r),
        result,
        { numFmt, hAlign: 'center', vAlign: 'middle' }
      );
    });

    // Total money (col 35): SUM(AD:AH)
    CellFormatter.applyFormula(
      ws.getCell(`${C.money_total}${r}`),
      `SUM(${C.money_vn}${r}:${C.money_dhp}${r})`,
      bd.money.total,
      { numFmt, hAlign: 'center', vAlign: 'middle', fontSize: 11.5 }
    );

    // Thực nhận (col 36): mirrors money_total for now
    CellFormatter.applyFormula(
      ws.getCell(`${C.thucNhan}${r}`),
      `${C.money_total}${r}`,
      bd.thucNhan,
      { numFmt, hAlign: 'center', vAlign: 'middle', fontSize: 11.5 }
    );
  }

  /**
   * Write SUM formula footer row.
   *
   * Columns 1 (STT) and 2 (name) are skipped — caller writes "TỔNG CỘNG" label.
   * Columns with no meaningful sum (col 29 mucTT) are left empty.
   * All other numeric columns (3-36 except 29) get a SUM range formula.
   *
   * @param {ExcelJS.Worksheet} ws
   * @param {number} footerRow  - Row index for the TỔNG CỘNG row
   * @param {number} dataStart  - First data row index
   * @param {number} dataEnd    - Last data row index (inclusive)
   * @param {object} totals     - Pre-calculated totals (used as `result` cache)
   */
  static writeFooterFormulas(ws, footerRow, dataStart, dataEnd, totals) {
    const numFmt = '#,##0.00';
    const boldNumOpts = { numFmt, hAlign: 'center', vAlign: 'middle', fontSize: 11.5 };

    // Map: column index → key in totals object
    const colTotalsMap = {
      3:  ['luong',               totals.luong            ?? totals.tien_tong],
      4:  ['dinhMucChuan',        totals.dinhMucChuan],
      5:  ['mienGiam',            totals.mienGiam],
      6:  ['thieuNCKH',           totals.thieuNCKH],
      7:  ['dinhMucSauMienGiam',  totals.dinhMucSauGiamTru ?? totals.dinhMucSauMienGiam],
      8:  ['hk1_vn',   totals.hk1_vn],   9:  ['hk1_lao',  totals.hk1_lao],
      10: ['hk1_cuba', totals.hk1_cuba], 11: ['hk1_cpc',  totals.hk1_cpc],
      12: ['hk1_dhp',  totals.hk1_dongHP],
      13: ['hk2_vn',   totals.hk2_vn],  14: ['hk2_lao',  totals.hk2_lao],
      15: ['hk2_cuba', totals.hk2_cuba],16: ['hk2_cpc',  totals.hk2_cpc],
      17: ['hk2_dhp',  totals.hk2_dongHP],
      18: ['year_vn',  totals.year_vn], 19: ['year_lao', totals.year_lao],
      20: ['year_cuba',totals.year_cuba],21: ['year_cpc', totals.year_cpc],
      22: ['year_dhp', totals.year_dongHP ?? totals.year_dhp],
      23: ['vuot_vn',  totals.vuot_vn],  24: ['vuot_lao', totals.vuot_lao],
      25: ['vuot_cuba',totals.vuot_cuba],26: ['vuot_cpc', totals.vuot_cpc],
      27: ['vuot_dhp', totals.vuot_dongHP ?? totals.vuot_dhp],
      28: ['vuot_tong',totals.vuot_tong ?? totals.vuot_total],
      // 29 = mucTT — skip (not summed)
      30: ['tien_vn',  totals.tien_vn  ?? totals.money_vn],
      31: ['tien_lao', totals.tien_lao ?? totals.money_lao],
      32: ['tien_cuba',totals.tien_cuba?? totals.money_cuba],
      33: ['tien_cpc', totals.tien_cpc ?? totals.money_cpc],
      34: ['tien_dhp', totals.tien_dongHP?? totals.money_dhp],
      35: ['tien_tong',totals.tien_tong ?? totals.money_total],
      36: ['thucNhan', totals.thucNhan],
    };

    for (let col = 3; col <= 36; col++) {
      if (col === 29) continue; // mucTT — leave blank
      const cell     = ws.getCell(footerRow, col);
      const colLetter = COL(col);
      const [, result] = colTotalsMap[col] || [null, 0];
      CellFormatter.applyFormula(
        cell,
        sumRange(colLetter, dataStart, dataEnd),
        result ?? 0,
        boldNumOpts
      );
      cell.font = { bold: true, size: 11.5 };
    }
  }

  /**
   * Expose COLS map for use in generators that need column letters directly.
   */
  static get COLS() { return COLS; }
}

module.exports = FormulaGenerator;
