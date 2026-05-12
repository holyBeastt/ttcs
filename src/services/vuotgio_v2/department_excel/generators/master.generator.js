/**
 * Master Sheet Generator — Renders the "TỔNG HỢP" sheet.
 *
 * Layout mirrors vuotgio.tongHopGV.ejs:
 *   - 36 columns (same as DepartmentLayout)
 *   - One row per lecturer (not per department)
 *   - Groups are separated by a group header row
 *   - isKhoa=0 units are merged into "Ban giám đốc & các phòng"
 *   - Sub-totals per group + grand total footer
 */

const WorkbookFactory  = require('../../shared_excel/core/workbook.factory');
const CellFormatter    = require('../../shared_excel/core/cell.formatter');
const DepartmentLayout = require('../layouts/department.layout');
const PaymentCalculator = require('../data/calculator');
const FormulaGenerator  = require('./formula.generator');

// ── Color palette (synchronized with tongHopGV.ejs) ─────────────────────────
const COLORS = {
    base:          'FF64748B',
    teaching:      'FF1D4ED8',
    teachingHK:    'FF3B82F6',
    teachingSub:   'FF60A5FA',
    over:          'FF059669',
    overSub:       'FF10B981',
    rate:          'FF7C3AED',
    money:         'FFB45309',
    moneySub:      'FFD97706',
    net:           'FF4338CA',
    groupHeader:   'FFE2E8F0',   // light slate — group separator rows
    groupTotal:    'FFDBEAFE',   // light blue — group sub-total
    grandTotal:    'FFCFCFCF',   // grey — grand total
    white:         'FFFFFFFF',
};

const TOTAL_COLS = 36;

/** Helper: style a cell as a coloured header */
const _hdr = (cell, argb, fontSize = 11, wrapText = true) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    cell.font   = { bold: true, size: fontSize, color: { argb: COLORS.white } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText };
    CellFormatter.applyBorder(cell);
};

/** Helper: style a group separator row */
const _groupRow = (ws, row, label, argb = COLORS.groupHeader) => {
    ws.mergeCells(`A${row}:AJ${row}`);
    const cell = ws.getCell(row, 1);
    cell.value = label;
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    cell.font  = { bold: true, size: 12, color: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    CellFormatter.applyBorder(cell);
    ws.getRow(row).height = 22;
};

/** Helper: write numeric value to a cell with #,##0.00 format */
const _num = (cell, value, bold = false) => {
    cell.value  = PaymentCalculator.excelNumber(value);
    cell.numFmt = '#,##0.00';
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.font   = { bold, size: 11.5 };
    CellFormatter.applyBorder(cell);
};

// ── Build 3-row header (rows 3–5) ─────────────────────────────────────────
const _renderHeaders = (ws, startRow) => {
    const r1 = startRow;
    const r2 = startRow + 1;
    const r3 = startRow + 2;

    // Row 1 — main groups
    const merge = (c1, c2, label, argb, fs = 12) => {
        ws.mergeCells(r1, c1, r1, c2);
        _hdr(ws.getCell(r1, c1), argb, fs);
        ws.getCell(r1, c1).value = label;
    };

    // STT, Họ tên, Thu nhập, ĐM, Giảm, NCKH, ĐM-giảng  (cols 1-7 rowspan 3)
    [
        [1,  1,  'STT'],
        [2,  2,  'Họ tên Giảng viên'],
        [3,  3,  'Thu nhập'],
        [4,  4,  'Định mức giờ giảng'],
        [5,  5,  'Được giảm'],
        [6,  6,  'Số tiết chưa hoàn thành NCKH'],
        [7,  7,  'Định mức phải giảng'],
    ].forEach(([c1, c2, label]) => {
        ws.mergeCells(r1, c1, r3, c2);
        _hdr(ws.getCell(r1, c1), COLORS.base, 11.5);
        ws.getCell(r1, c1).value = label;
    });

    merge(8,  22, 'Thực tế giảng dạy + coi, ra đề, chấm thi + ĐATN + HDTQ', COLORS.teaching);
    merge(23, 28, 'Số tiết vượt định mức',    COLORS.over);
    ws.mergeCells(r1, 29, r3, 29);
    _hdr(ws.getCell(r1, 29), COLORS.rate, 11.5);
    ws.getCell(r1, 29).value = 'Mức TT chuẩn';
    merge(30, 35, 'Thành tiền', COLORS.money);
    ws.mergeCells(r1, 36, r3, 36);
    _hdr(ws.getCell(r1, 36), COLORS.net, 11.5);
    ws.getCell(r1, 36).value = 'Thực nhận';

    // Row 2 — sub groups
    [[8, 12, 'Học kỳ I (gồm ĐA & TQ)', COLORS.teachingHK],
     [13, 17, 'Học kỳ II', COLORS.teachingHK],
     [18, 22, 'Cả năm', COLORS.teachingHK],
     [23, 28, '', COLORS.overSub],
     [30, 35, '', COLORS.moneySub],
    ].forEach(([c1, c2, label, argb]) => {
        ws.mergeCells(r2, c1, r2, c2);
        _hdr(ws.getCell(r2, c1), argb, 11);
        ws.getCell(r2, c1).value = label;
    });

    // Row 3 — sub columns (VN/Lào/Cuba/CPC/ĐHP per section)
    const subCols = [
        ...([8,9,10,11,12].map((c, i) => [c, ['VN','Lào','Cuba','CPC','Đóng HP'][i], COLORS.teachingSub])),
        ...([13,14,15,16,17].map((c, i) => [c, ['VN','Lào','Cuba','CPC','Đóng HP'][i], COLORS.teachingSub])),
        ...([18,19,20,21,22].map((c, i) => [c, ['VN','Lào','Cuba','CPC','Đóng HP'][i], COLORS.teachingSub])),
        ...([23,24,25,26,27,28].map((c, i) => [c, ['VN','Lào','Cuba','CPC','Đóng HP','Tổng'][i], COLORS.overSub])),
        ...([30,31,32,33,34,35].map((c, i) => [c, ['VN','Lào','Cuba','CPC','Đóng HP','Tổng'][i], COLORS.moneySub])),
    ];
    subCols.forEach(([c, label, argb]) => {
        _hdr(ws.getCell(r3, c), argb, 11, false);
        ws.getCell(r3, c).value = label;
    });

    [r1, r2, r3].forEach(r => { ws.getRow(r).height = 25; });

    return r3 + 1;
};

// ── Write one lecturer data row ───────────────────────────────────────────
const _renderDataRow = (ws, row, sdo, index, isExport = false) => {
    const bd = sdo.breakdown
        ? sdo.breakdown
        : PaymentCalculator.computeSdoBreakdown(sdo.tableF, sdo.thanhToan);

    // Static input columns (always values)
    const staticValues = {
        1:  index,
        2:  sdo.giangVien || '',
        3:  PaymentCalculator.excelNumber(sdo.luong || 0),
        4:  PaymentCalculator.excelNumber(sdo.dinhMucChuan  || 0),
        5:  PaymentCalculator.excelNumber(sdo.mienGiam      || 0),
        6:  PaymentCalculator.excelNumber(sdo.thieuNCKH     || 0),
        7:  PaymentCalculator.excelNumber(sdo.dinhMucSauMienGiam || 0),
        8:  bd.hk1.vn,  9: bd.hk1.lao, 10: bd.hk1.cuba, 11: bd.hk1.cpc, 12: bd.hk1.dongHP,
        13: bd.hk2.vn, 14: bd.hk2.lao, 15: bd.hk2.cuba, 16: bd.hk2.cpc, 17: bd.hk2.dongHP,
        28: bd.vuot.total,   // vuot_total — SDO engine source of truth
        29: bd.mucTT,        // constant 100,000
    };

    const excelRow = ws.getRow(row);
    Object.entries(staticValues).forEach(([col, val]) => {
        const c = excelRow.getCell(Number(col));
        c.value = val;
        if (Number(col) === 2) {
            c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        } else if (Number(col) >= 3) {
            c.numFmt    = '#,##0.00';
            c.alignment = { horizontal: 'center', vertical: 'middle' };
        } else {
            c.alignment = { horizontal: 'center', vertical: 'middle' };
        }
        c.font = { size: 11.5 };
        CellFormatter.applyBorder(c);
    });

    if (isExport) {
        // Derived columns: Excel formulas (year totals, vuot distribution, money)
        FormulaGenerator.writeDataRowFormulas(ws, row, bd);
    } else {
        // Derived columns: static pre-calculated values (preview / PDF)
        const derivedValues = {
            18: bd.year.vn, 19: bd.year.lao, 20: bd.year.cuba, 21: bd.year.cpc, 22: bd.year.dongHP,
            23: bd.vuot.vn, 24: bd.vuot.lao, 25: bd.vuot.cuba, 26: bd.vuot.cpc, 27: bd.vuot.dongHP,
            30: bd.money.vn,31: bd.money.lao,32: bd.money.cuba,33: bd.money.cpc,34: bd.money.dongHP,
            35: bd.money.total,
            36: 0,   // Thực nhận (placeholder)
        };
        Object.entries(derivedValues).forEach(([col, val]) => {
            const c = excelRow.getCell(Number(col));
            c.value = val;
            c.numFmt    = '#,##0.00';
            c.alignment = { horizontal: 'center', vertical: 'middle' };
            c.font = { size: 11.5 };
            CellFormatter.applyBorder(c);
        });
    }

    excelRow.height = 22;
    return bd;
};

// ── Write a sub-total row ─────────────────────────────────────────────────
const _renderSubTotal = (ws, row, label, totals, bgColor = COLORS.groupTotal, isExport = false, dataStart = null, dataEnd = null) => {
    ws.mergeCells(row, 1, row, 2);
    const labelCell = ws.getCell(row, 1);
    labelCell.value = label;
    labelCell.font  = { bold: true, size: 11.5 };
    labelCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    CellFormatter.applyBorder(labelCell);

    if (isExport && dataStart && dataEnd) {
        // SUM range formulas for each numeric column
        FormulaGenerator.writeFooterFormulas(ws, row, dataStart, dataEnd, totals);
        // Override font/fill since writeFooterFormulas applies applyDataStyle
        for (let c = 3; c <= 36; c++) {
            const cell = ws.getCell(row, c);
            cell.font = { bold: true, size: 11.5 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            CellFormatter.applyBorder(cell);
        }
    } else {
        // Static pre-calculated values
        const numericCols = [4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,
                             23,24,25,26,27,28,29,30,31,32,33,34,35,36];
        const keyMap = {
            3:'luong',4:'dinhMucChuan',5:'mienGiam',6:'thieuNCKH',7:'dinhMucSauMienGiam',
            8:'hk1_vn',9:'hk1_lao',10:'hk1_cuba',11:'hk1_cpc',12:'hk1_dongHP',
            13:'hk2_vn',14:'hk2_lao',15:'hk2_cuba',16:'hk2_cpc',17:'hk2_dongHP',
            18:'year_vn',19:'year_lao',20:'year_cuba',21:'year_cpc',22:'year_dongHP',
            23:'vuot_vn',24:'vuot_lao',25:'vuot_cuba',26:'vuot_cpc',27:'vuot_dongHP',
            28:'vuot_total',
            30:'money_vn',31:'money_lao',32:'money_cuba',33:'money_cpc',34:'money_dongHP',
            35:'money_total',
        };

        for (let c = 3; c <= 36; c++) {
            const cell = ws.getCell(row, c);
            const key = keyMap[c];
            cell.value = key ? (PaymentCalculator.excelNumber(totals[key] || 0)) : '';
            if (key) cell.numFmt = '#,##0.00';
            cell.font  = { bold: true, size: 11.5 };
            cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            CellFormatter.applyBorder(cell);
        }
    }

    ws.getRow(row).height = 24;
};

/** Accumulate SDO breakdown into running totals object */
const _accumulateTotals = (totals, sdo, bd) => {
    totals.dinhMucChuan       += PaymentCalculator.excelNumber(sdo.dinhMucChuan  || 0);
    totals.luong              += PaymentCalculator.excelNumber(sdo.luong          || 0);
    totals.mienGiam           += PaymentCalculator.excelNumber(sdo.mienGiam      || 0);
    totals.thieuNCKH          += PaymentCalculator.excelNumber(sdo.thieuNCKH     || 0);
    totals.dinhMucSauMienGiam += PaymentCalculator.excelNumber(sdo.dinhMucSauMienGiam || 0);
    ['vn','lao','cuba','cpc','dongHP'].forEach(g => {
        totals[`hk1_${g}`]  += bd.hk1[g];
        totals[`hk2_${g}`]  += bd.hk2[g];
        totals[`year_${g}`] += bd.year[g];
        totals[`vuot_${g}`] += bd.vuot[g];
        totals[`money_${g}`]+= bd.money[g];
    });
    totals.vuot_total  += bd.vuot.total;
    totals.money_total += bd.money.total;
};

const _emptyTotals = () => ({
    luong: 0,
    dinhMucChuan:0, mienGiam:0, thieuNCKH:0, dinhMucSauMienGiam:0,
    hk1_vn:0, hk1_lao:0, hk1_cuba:0, hk1_cpc:0, hk1_dongHP:0,
    hk2_vn:0, hk2_lao:0, hk2_cuba:0, hk2_cpc:0, hk2_dongHP:0,
    year_vn:0, year_lao:0, year_cuba:0, year_cpc:0, year_dongHP:0,
    vuot_vn:0, vuot_lao:0, vuot_cuba:0, vuot_cpc:0, vuot_dongHP:0,
    vuot_total:0,
    money_vn:0, money_lao:0, money_cuba:0, money_cpc:0, money_dongHP:0,
    money_total:0,
});

// ── Public API ─────────────────────────────────────────────────────────────

class MasterSheetGenerator {
    /**
     * Create the TỔNG HỢP sheet in an existing workbook.
     *
     * @param {ExcelJS.Workbook} workbook
     * @param {Object}  opts
     * @param {Array}   opts.departmentList  — output of DataAggregator.groupByDepartment()
     * @param {string}  opts.namHoc
     * @param {boolean} [opts.isExport=false] - true → write Excel formulas; false → static values
     */
    static createMasterSheet(workbook, { departmentList, namHoc, isExport = false }) {
        const ws = WorkbookFactory.createWorksheet(workbook, 'TỔNG HỢP', {
            frozenRows: 5,
            pageSetup : { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1 },
        });

        // Apply same column widths as DepartmentLayout
        DepartmentLayout.applyLayout(ws);

        // ── Title rows ──
        CellFormatter.mergeAndStyle(ws, 1, 1, 1, TOTAL_COLS,
            'BẢNG TỔNG HỢP VƯỢT GIỜ', { title: true, bgColor: '203864', fontSize: 14 });
        CellFormatter.mergeAndStyle(ws, 2, 1, 2, TOTAL_COLS,
            `Năm học: ${namHoc || ''}`, { title: true, bgColor: '2E4D7B', fontSize: 12 });
        ws.getRow(1).height = 28;
        ws.getRow(2).height = 22;

        // ── 3-row column headers ──
        let currentRow = _renderHeaders(ws, 3);

        // ── Data rows grouped by department ──
        const grandTotals = _emptyTotals();
        let globalIndex = 1;

        for (const dept of departmentList) {
            // Group separator
            _groupRow(ws, currentRow, `📂  ${dept.khoa}`);
            currentRow++;

            const groupTotals = _emptyTotals();
            const groupDataStart = currentRow;
            let groupIndex = 1;

            for (const sdo of dept.summaries) {
                const bd = _renderDataRow(ws, currentRow, sdo, groupIndex++, isExport);
                _accumulateTotals(groupTotals, sdo, bd);
                _accumulateTotals(grandTotals, sdo, bd);
                globalIndex++;
                currentRow++;
            }

            const groupDataEnd = currentRow - 1;
            // Sub-total per group
            _renderSubTotal(ws, currentRow, `Tổng cộng — ${dept.khoa}`, groupTotals, COLORS.groupTotal, isExport, groupDataStart, groupDataEnd);
            currentRow++;
        }

        // ── Grand total ──
        _renderSubTotal(ws, currentRow, 'TỔNG CỘNG TOÀN TRƯỜNG', grandTotals, COLORS.grandTotal, false, null, null);

        return ws;
    }
}

module.exports = MasterSheetGenerator;
