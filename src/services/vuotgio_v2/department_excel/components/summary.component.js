/**
 * Summary Component - Handles summary table creation for department sheets (36 columns)
 *
 * Hybrid mode:
 *   isExport=false (default) → static pre-calculated values (used by preview/PDF)
 *   isExport=true            → Excel formulas for derived columns (used by file export)
 */

const CellFormatter = require("../../shared_excel/core/cell.formatter");
const PaymentCalculator = require("../data/calculator");
const FormulaGenerator = require("../generators/formula.generator");

class SummaryComponent {
  /**
   * Create department summary table with 36 columns
   */
  /**
   * @param {ExcelJS.Worksheet} worksheet
   * @param {Array}  summaries - Array of SDO objects
   * @param {number} startRow  - First data row index
   * @param {object} [options]
   * @param {boolean} [options.isExport=false] - When true, writes Excel formulas for derived columns
   */
  static createDepartmentSummaryTable(worksheet, summaries, startRow, options = {}) {
    const isExport = options.isExport === true;
    let currentRow = startRow;
    const totals = {
      dinhMucChuan: 0,
      mienGiam: 0,
      thieuNCKH: 0,
      dinhMucSauMienGiam: 0,
      hk1_vn: 0, hk1_lao: 0, hk1_cuba: 0, hk1_cpc: 0, hk1_dongHP: 0,
      hk2_vn: 0, hk2_lao: 0, hk2_cuba: 0, hk2_cpc: 0, hk2_dongHP: 0,
      year_vn: 0, year_lao: 0, year_cuba: 0, year_cpc: 0, year_dongHP: 0,
      vuot_vn: 0, vuot_lao: 0, vuot_cuba: 0, vuot_cpc: 0, vuot_dongHP: 0,
      vuot_tong: 0,
      tien_vn: 0, tien_lao: 0, tien_cuba: 0, tien_cpc: 0, tien_dongHP: 0,
      tien_tong: 0,
      thucNhan: 0,
      luong: 0,
    };

    (summaries || []).forEach((summary, index) => {
      // Ưu tiên dùng breakdown đã tính sẵn từ Backend (single source of truth).
      // Nếu chưa có (dữ liệu cũ / snapshot), mới fallback tính lại tại chỗ.
      const bd = summary.breakdown
        ? summary.breakdown
        : PaymentCalculator.computeSdoBreakdown(summary.tableF, summary.thanhToan, summary.luong);

      const tien_vn    = bd.money.vn;
      const tien_lao   = bd.money.lao;
      const tien_cuba  = bd.money.cuba;
      const tien_cpc   = bd.money.cpc;
      const tien_dongHP = bd.money.dongHP;
      const tien_tong  = bd.money.total;

      const overtime = bd.vuot.total;

      const row = worksheet.getRow(currentRow);
      
      // 36 column values (A-AJ)
      const rowValues = {
        1: index + 1,                                                                    // A - STT
        2: summary?.giangVien || "",                                                     // B - Họ tên
        3: PaymentCalculator.excelNumber(summary?.luong || 0),                          // C - Thu nhập
        4: PaymentCalculator.excelNumber(summary?.dinhMucChuan || 0),                   // D - Định mức
        5: PaymentCalculator.excelNumber(summary?.mienGiam || 0),                       // E - Được giảm
        6: PaymentCalculator.excelNumber(summary?.thieuNCKH || 0),                      // F - Thiếu NCKH
        7: PaymentCalculator.excelNumber(summary?.dinhMucSauMienGiam || 0),             // G - Định mức sau miễn giảm
        8: bd.hk1.vn,                                                                   // H - HK1 VN
        9: bd.hk1.lao,                                                                  // I - HK1 Lào
        10: bd.hk1.cuba,                                                                // J - HK1 Cuba
        11: bd.hk1.cpc,                                                                 // K - HK1 CPC
        12: bd.hk1.dongHP,                                                              // L - HK1 Đóng HP
        13: bd.hk2.vn,                                                                  // M - HK2 VN
        14: bd.hk2.lao,                                                                 // N - HK2 Lào
        15: bd.hk2.cuba,                                                                // O - HK2 Cuba
        16: bd.hk2.cpc,                                                                 // P - HK2 CPC
        17: bd.hk2.dongHP,                                                              // Q - HK2 Đóng HP
        18: bd.year.vn,                                                                 // R - Năm VN
        19: bd.year.lao,                                                                // S - Năm Lào
        20: bd.year.cuba,                                                               // T - Năm Cuba
        21: bd.year.cpc,                                                                // U - Năm CPC
        22: bd.year.dongHP,                                                             // V - Năm Đóng HP
        23: bd.vuot.vn,                                                                 // W - Vượt VN
        24: bd.vuot.lao,                                                                // X - Vượt Lào
        25: bd.vuot.cuba,                                                               // Y - Vượt Cuba
        26: bd.vuot.cpc,                                                                // Z - Vượt CPC
        27: bd.vuot.dongHP,                                                             // AA - Vượt Đóng HP
        28: overtime,                                                                   // AB - Tổng vượt
        29: bd.mucTT,                                                                   // AC - Mức TT chuẩn
        30: tien_vn,                                                                    // AD - Tiền VN
        31: tien_lao,                                                                   // AE - Tiền Lào
        32: tien_cuba,                                                                  // AF - Tiền Cuba
        33: tien_cpc,                                                                   // AG - Tiền CPC
        34: tien_dongHP,                                                                // AH - Tiền Đóng HP
        35: tien_tong,                                                                  // AI - Tổng tiền
        36: bd.thucNhan,                                                                // AJ - Thực nhận
      };

      // ── Write static input columns (always written as values) ────────────
      const staticCols = {
        1: rowValues[1], 2: rowValues[2],                  // STT, Name
        3: rowValues[3], 4: rowValues[4],  5: rowValues[5],  // luong, dinhMuc, mienGiam
        6: rowValues[6], 7: rowValues[7],                  // thieuNCKH, dinhMucSauMienGiam
        8: rowValues[8], 9: rowValues[9], 10: rowValues[10], 11: rowValues[11], 12: rowValues[12], // HK1
       13: rowValues[13],14: rowValues[14],15: rowValues[15],16: rowValues[16],17: rowValues[17], // HK2
       28: rowValues[28], // vuot_total (thanhToan — SDO engine source of truth)
       29: rowValues[29], // mucTT (được tính linh hoạt theo lương)
      };
      Object.entries(staticCols).forEach(([colKey, value]) => {
        row.getCell(Number(colKey)).value = value;
      });

      if (isExport) {
        // ── EXPORT MODE: write Excel formulas for derived columns ────────────
        FormulaGenerator.writeDataRowFormulas(worksheet, currentRow, bd);
      } else {
        // ── PREVIEW MODE: write pre-calculated static values ────────────────
        const derivedCols = {
          18: rowValues[18], 19: rowValues[19], 20: rowValues[20],
          21: rowValues[21], 22: rowValues[22], // year
          23: rowValues[23], 24: rowValues[24], 25: rowValues[25],
          26: rowValues[26], 27: rowValues[27], // vuot per group
          30: rowValues[30], 31: rowValues[31], 32: rowValues[32],
          33: rowValues[33], 34: rowValues[34], 35: rowValues[35], // money
          36: rowValues[36], // thucNhan
        };
        Object.entries(derivedCols).forEach(([colKey, value]) => {
          row.getCell(Number(colKey)).value = value;
        });
      }

      // Apply formatting to all 36 columns
      for (let col = 1; col <= 36; col += 1) {
        const cell = row.getCell(col);
        CellFormatter.applyBorder(cell);
        
        const fmtOpts = {
          hAlign: col === 2 ? "left" : "center",
          vAlign: "middle",
          wrapText: true,
          fontSize: 11.5
        };
        
        if (col >= 3) {
          fmtOpts.numFmt = "#,##0.00";
        }
        
        CellFormatter.applyDataStyle(cell, fmtOpts);
      }

      // Update totals (dùng bd đã tính sẵn)
      totals.dinhMucChuan += PaymentCalculator.excelNumber(summary?.dinhMucChuan || 0);
      totals.mienGiam += PaymentCalculator.excelNumber(summary?.mienGiam || 0);
      totals.thieuNCKH += PaymentCalculator.excelNumber(summary?.thieuNCKH || 0);
      totals.dinhMucSauMienGiam += PaymentCalculator.excelNumber(summary?.dinhMucSauMienGiam || 0);
      totals.hk1_vn    += bd.hk1.vn;
      totals.hk1_lao   += bd.hk1.lao;
      totals.hk1_cuba  += bd.hk1.cuba;
      totals.hk1_cpc   += bd.hk1.cpc;
      totals.hk1_dongHP += bd.hk1.dongHP;
      totals.hk2_vn    += bd.hk2.vn;
      totals.hk2_lao   += bd.hk2.lao;
      totals.hk2_cuba  += bd.hk2.cuba;
      totals.hk2_cpc   += bd.hk2.cpc;
      totals.hk2_dongHP += bd.hk2.dongHP;
      totals.year_vn    += bd.year.vn;
      totals.year_lao   += bd.year.lao;
      totals.year_cuba  += bd.year.cuba;
      totals.year_cpc   += bd.year.cpc;
      totals.year_dongHP += bd.year.dongHP;
      totals.vuot_vn    += bd.vuot.vn;
      totals.vuot_lao   += bd.vuot.lao;
      totals.vuot_cuba  += bd.vuot.cuba;
      totals.vuot_cpc   += bd.vuot.cpc;
      totals.vuot_dongHP += bd.vuot.dongHP;
      totals.vuot_tong  += overtime;
      totals.tien_vn    += tien_vn;
      totals.tien_lao   += tien_lao;
      totals.tien_cuba  += tien_cuba;
      totals.tien_cpc   += tien_cpc;
      totals.tien_dongHP += tien_dongHP;
      totals.tien_tong  += tien_tong;
      totals.thucNhan   += (bd.thucNhan || tien_tong || 0);
      totals.luong      += PaymentCalculator.excelNumber(summary?.luong || 0);

      row.height = 22;
      currentRow += 1;
    });

    // ── Footer / TỔNG CỘNG row ──────────────────────────────────────────────
    const totalRow = worksheet.getRow(currentRow);
    const dataEndRow = currentRow - 1; // last data row
    CellFormatter.mergeAndStyle(worksheet, currentRow, 1, currentRow, 2,
      "TỔNG CỘNG",
      { total: true, bold: true }
    );

    if (isExport) {
      // ── EXPORT MODE: SUM range formulas for every numeric column ───────────
      FormulaGenerator.writeFooterFormulas(worksheet, currentRow, startRow, dataEndRow, totals);
    } else {
      // ── PREVIEW MODE: static totals ────────────────────────────────────────
      const totalValues = {
        3: PaymentCalculator.excelNumber(totals.luong),
        4: PaymentCalculator.excelNumber(totals.dinhMucChuan),
        5: PaymentCalculator.excelNumber(totals.mienGiam),
        6: PaymentCalculator.excelNumber(totals.thieuNCKH),
        7: PaymentCalculator.excelNumber(totals.dinhMucSauMienGiam),
        8: PaymentCalculator.excelNumber(totals.hk1_vn),
        9: PaymentCalculator.excelNumber(totals.hk1_lao),
        10: PaymentCalculator.excelNumber(totals.hk1_cuba),
        11: PaymentCalculator.excelNumber(totals.hk1_cpc),
        12: PaymentCalculator.excelNumber(totals.hk1_dongHP),
        13: PaymentCalculator.excelNumber(totals.hk2_vn),
        14: PaymentCalculator.excelNumber(totals.hk2_lao),
        15: PaymentCalculator.excelNumber(totals.hk2_cuba),
        16: PaymentCalculator.excelNumber(totals.hk2_cpc),
        17: PaymentCalculator.excelNumber(totals.hk2_dongHP),
        18: PaymentCalculator.excelNumber(totals.year_vn),
        19: PaymentCalculator.excelNumber(totals.year_lao),
        20: PaymentCalculator.excelNumber(totals.year_cuba),
        21: PaymentCalculator.excelNumber(totals.year_cpc),
        22: PaymentCalculator.excelNumber(totals.year_dongHP),
        23: PaymentCalculator.excelNumber(totals.vuot_vn),
        24: PaymentCalculator.excelNumber(totals.vuot_lao),
        25: PaymentCalculator.excelNumber(totals.vuot_cuba),
        26: PaymentCalculator.excelNumber(totals.vuot_cpc),
        27: PaymentCalculator.excelNumber(totals.vuot_dongHP),
        28: PaymentCalculator.excelNumber(totals.vuot_tong),
        30: PaymentCalculator.excelNumber(totals.tien_vn),
        31: PaymentCalculator.excelNumber(totals.tien_lao),
        32: PaymentCalculator.excelNumber(totals.tien_cuba),
        33: PaymentCalculator.excelNumber(totals.tien_cpc),
        34: PaymentCalculator.excelNumber(totals.tien_dongHP),
        35: PaymentCalculator.excelNumber(totals.tien_tong),
        36: PaymentCalculator.excelNumber(totals.thucNhan),
      };
      Object.entries(totalValues).forEach(([colKey, value]) => {
        totalRow.getCell(Number(colKey)).value = value;
      });
    }

    // Apply total styling to all 36 columns (shared for both modes)
    for (let col = 1; col <= 36; col += 1) {
      const cell = totalRow.getCell(col);
      CellFormatter.applyBorder(cell);
      const styleOpts = {
        bold: true,
        hAlign: col === 2 ? "left" : "center",
        vAlign: "middle"
      };
      if (col >= 3 && col !== 29) {
        styleOpts.numFmt = "#,##0.00";
      }
      CellFormatter.applyTotalStyle(cell, styleOpts);
    }

    totalRow.height = 22;

    return {
      nextRow: currentRow + 1,
      totalThanhToan: totals.tien_tong,
      totalVuot: totals.vuot_tong,
      dataRowCount: (summaries || []).length
    };
  }

  /**
   * Create master summary table (simplified version)
   */
  static createMasterSummaryTable(worksheet, departmentList, startRow) {
    let currentRow = startRow;
    let totalPayment = 0;

    departmentList.forEach((dept, index) => {
      const row = worksheet.getRow(currentRow);

      row.getCell(1).value = index + 1;
      row.getCell(2).value = dept.khoa || dept.maKhoa || "Khác";
      row.getCell(3).value = dept.dataRowCount || 0;
      row.getCell(4).value = PaymentCalculator.truncDecimals(dept.tongThucHien || 0, 2);
      row.getCell(5).value = PaymentCalculator.truncDecimals(dept.totalVuot || 0, 2);
      row.getCell(6).value = PaymentCalculator.truncDecimals(dept.totalThanhToan || 0, 2);
      row.getCell(7).value = "";

      // Format cells
      for (let col = 1; col <= 7; col += 1) {
        const cell = row.getCell(col);
        const options = {
          hAlign: col === 2 ? "left" : "center",
          vAlign: "middle"
        };
        
        if (col >= 4) {
          options.numFmt = "#,##0.00";
        }
        
        CellFormatter.applyDataStyle(cell, options);
      }

      totalPayment += (dept.totalThanhToan || 0);
      currentRow += 1;
    });

    // Total row
    const totalRow = worksheet.getRow(currentRow);
    CellFormatter.mergeAndStyle(worksheet, currentRow, 1, currentRow, 3, 
      "TỔNG CỘNG", 
      { total: true, bold: true, bgColor: "D9E1F2" }
    );

    const totalCell = totalRow.getCell(6);
    totalCell.value = PaymentCalculator.truncDecimals(totalPayment, 2);
    CellFormatter.applyTotalStyle(totalCell, { bgColor: "D9E1F2" });

    // Apply total style to remaining cells
    for (let col = 4; col <= 7; col += 1) {
      if (col !== 6) {
        CellFormatter.applyTotalStyle(totalRow.getCell(col), { bgColor: "D9E1F2" });
      }
    }

    return {
      nextRow: currentRow + 1,
      totalPayment
    };
  }

  /**
   * Create payment summary table
   */
  static createPaymentSummaryTable(worksheet, summaries, startRow) {
    let currentRow = startRow;
    let totalTien = 0;
    const PAYMENT_RATE = PaymentCalculator.PAYMENT_RATE;

    (summaries || []).forEach((summary, index) => {
      const soTien = PaymentCalculator.excelNumber((summary.thanhToan || 0) * PAYMENT_RATE);
      totalTien += soTien;

      const row = worksheet.getRow(currentRow);
      const values = [
        index + 1,
        summary.giangVien || "",
        summary.maKhoa || summary.khoa || "",
        summary.soTaiKhoan || "",
        summary.nganHang || "",
        soTien,
        "Thanh toán vượt giờ",
      ];

      values.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        
        const options = {
          hAlign: colIndex === 1 || colIndex === 6 ? "left" : "center",
          vAlign: "middle",
          wrapText: true
        };
        
        if (colIndex === 5) {
          options.numFmt = "#,##0.00";
        }
        
        CellFormatter.applyDataStyle(cell, options);
      });

      row.height = 22;
      currentRow += 1;
    });

    // Total row
    const totalRow = worksheet.getRow(currentRow);
    CellFormatter.mergeAndStyle(worksheet, currentRow, 1, currentRow, 5, 
      "TỔNG CỘNG", 
      { total: true, bold: true, bgColor: "EEF3FF" }
    );

    const totalCell = totalRow.getCell(6);
    totalCell.value = totalTien;
    CellFormatter.applyTotalStyle(totalCell, { 
      numFmt: "#,##0.00", 
      bgColor: "EEF3FF" 
    });

    const noteCell = totalRow.getCell(7);
    noteCell.value = "";
    CellFormatter.applyTotalStyle(noteCell, { bgColor: "EEF3FF" });

    return {
      nextRow: currentRow + 1,
      totalPayment: totalTien
    };
  }

  /**
   * Create department payment summary table (for consolidated reports)
   */
  static createDepartmentPaymentSummaryTable(worksheet, departmentList, startRow) {
    let currentRow = startRow;
    let totalPayment = 0;

    departmentList.forEach((dept, index) => {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = index + 1;
      row.getCell(2).value = dept.khoa || dept.maKhoa || "Khác";
      row.getCell(3).value = PaymentCalculator.truncDecimals(dept.totalThanhToan || 0, 2);

      for (let col = 1; col <= 7; col += 1) {
        const cell = row.getCell(col);
        const options = {
          hAlign: col === 2 ? "left" : "center",
          vAlign: "middle"
        };
        
        if (col === 3) {
          options.numFmt = "#,##0.00";
        }
        
        CellFormatter.applyDataStyle(cell, options);
      }

      totalPayment += (dept.totalThanhToan || 0);
      currentRow += 1;
    });

    // Total row
    const totalRow = worksheet.getRow(currentRow);
    CellFormatter.mergeAndStyle(worksheet, currentRow, 1, currentRow, 2, 
      "TỔNG CỘNG", 
      { total: true, bold: true }
    );

    const totalCell = totalRow.getCell(3);
    totalCell.value = PaymentCalculator.truncDecimals(totalPayment, 2);
    CellFormatter.applyTotalStyle(totalCell);

    // Apply total style to remaining cells
    for (let col = 4; col <= 7; col += 1) {
      CellFormatter.applyTotalStyle(totalRow.getCell(col));
    }

    return {
      nextRow: currentRow + 1,
      totalPayment
    };
  }
}

module.exports = SummaryComponent;