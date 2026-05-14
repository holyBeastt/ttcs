const { BORDERS, COLOR, mergeAndStyle, styleCell } = require("../utils/excel-style.utils");
const KeKhaiFormulaGenerator = require("../generators/kekhai-formula.generator");

/**
 * Summary Component Service cho báo cáo Kê khai cá nhân Giảng viên
 * Cô lập toàn bộ các thao tác dựng hình, gộp ô, màu sắc và cấu trúc của Section E và Section F.
 */
class KeKhaiSummaryComponent {
  /**
   * Dựng Section E: Tổng hợp khối lượng đã thực hiện và đề nghị thanh toán vượt giờ
   * @param {Object} sheet Đối tượng Worksheet của ExcelJS
   * @param {number} startRow Dòng bắt đầu vẽ
   * @param {Object} summary Dữ liệu SDO Atomic của giảng viên
   * @param {Array} groupMetas Metadata của các group A, B, C từ block renderer
   * @param {boolean} useFormulas Cờ kích hoạt xuất công thức động
   * @returns {number} Dòng tiếp theo sau khi vẽ xong
   */
  static renderSummarySectionE(sheet, startRow, summary, groupMetas, useFormulas) {
    let row = startRow;

    mergeAndStyle(sheet, row, 1, row, 7, "E. TỔNG HỢP KHỐI LƯỢNG ĐÃ THỰC HIỆN VÀ ĐỀ NGHỊ THANH TOÁN VƯỢT GIỜ", {
      bold: true,
      hAlign: "left",
      borders: BORDERS.noBorder(),
      fontSize: 12,
    });
    row += 1;

    // Header row
    styleCell(sheet.getCell(row, 1), { bgColor: COLOR.HEADER_BG, bold: true, hAlign: "center" });
    sheet.getCell(row, 1).value = "TT";
    mergeAndStyle(sheet, row, 2, row, 4, "Nội dung công việc", {
      bgColor: COLOR.HEADER_BG,
      bold: true,
      hAlign: "center",
      wrapText: true,
    });
    styleCell(sheet.getCell(row, 5), { bgColor: COLOR.HEADER_BG, bold: true, hAlign: "center" });
    sheet.getCell(row, 5).value = "Số tiết";
    mergeAndStyle(sheet, row, 6, row, 7, "Lý do giảm trừ tại mục IV", {
      bgColor: COLOR.HEADER_BG,
      bold: true,
      hAlign: "center",
      wrapText: true,
    });
    row += 1;

    // Lấy bộ dữ liệu chuẩn hóa từ Formula Generator Service
    const tableE = summary.tableE || {};
    const eValues = KeKhaiFormulaGenerator.getSectionEValues(tableE, groupMetas, row, useFormulas);

    const rows = [
      { tt: "I", label: "Tổng số tiết thực hiện (A+B+C)", value: eValues.valI },
      { tt: "II", label: "Số tiết định mức phải giảng", value: eValues.valII },
      { tt: "III", label: "Số tiết chưa hoàn thành NCKH", value: eValues.valIII },
      { tt: "IV", label: "Số tiết được giảm trừ (theo lý do giảm trừ)", value: eValues.valIV },
      { tt: "V", label: "Tổng số tiết vượt giờ (I - II - III + IV)", value: eValues.valV },
      { tt: "VI", label: "Tổng số tiết vượt giờ đề nghị thanh toán", value: eValues.valVI },
    ];

    const dataStartRow = row;
    rows.forEach((item) => {
      sheet.getCell(row, 1).value = item.tt;
      styleCell(sheet.getCell(row, 1), { hAlign: "center" });
      mergeAndStyle(sheet, row, 2, row, 4, item.label, { hAlign: "center" });
      sheet.getCell(row, 5).value = item.value;
      sheet.getCell(row, 5).numFmt = "#,##0.00";
      styleCell(sheet.getCell(row, 5), { hAlign: "center", fontColor: COLOR.BLUE, bold: true });
      // Áp dụng đường viền cho các ô trống ở cột diễn giải lý do
      styleCell(sheet.getCell(row, 6), {});
      styleCell(sheet.getCell(row, 7), {});
      row += 1;
    });

    // Merge cột 6-7 cho toàn bộ phần diễn giải lý do giảm trừ
    mergeAndStyle(sheet, dataStartRow, 6, row - 1, 7, tableE.ly_do || "", {
      hAlign: "center",
      vAlign: "middle",
      wrapText: true,
    });

    return row;
  }

  /**
   * Dựng Section F: Tổng số tiết thống kê theo từng hệ đào tạo
   * @param {Object} sheet Worksheet ExcelJS
   * @param {number} startRow Dòng bắt đầu vẽ
   * @param {Object} summary Dữ liệu SDO
  * @param {boolean} useFormulas Cờ công thức
  * @param {Array|undefined} formulaRows Công thức cho từng dòng F (theo thứ tự VN/Lào/Cuba/CPC/Đóng HP)
   * @returns {number} Dòng tiếp theo
   */
  static renderStatsTableF(sheet, startRow, summary, useFormulas, formulaRows) {
    let row = startRow;
    const tableF = summary.tableF || { rows: [], totals: {} };

    mergeAndStyle(sheet, row, 1, row, 7, "F. TỔNG SỐ TIẾT THỐNG KÊ THEO TỪNG HỆ ĐÀO TẠO", {
      bold: true,
      hAlign: "left",
      borders: BORDERS.noBorder(),
      fontSize: 12,
    });
    row += 1;

    const headers = [
      "TT",
      "Đối tượng",
      "Số tiết thực hiện HK 1",
      "Số tiết thực hiện HK 2",
      "Hướng dẫn ĐATN",
      "Tham quan thực tế",
      "Tổng số tiết cả năm",
    ];
    headers.forEach((label, index) => {
      const cell = sheet.getCell(row, 1 + index);
      cell.value = label;
      styleCell(cell, { bgColor: COLOR.STATS_HEADER_BG, bold: true, hAlign: "center", wrapText: true });
    });
    row += 1;

    const dataStartRow = row;
    (tableF.rows || []).forEach((item, idx) => {
      const rowFormulas = Array.isArray(formulaRows) ? formulaRows[idx] : null;
      sheet.getCell(row, 1).value = item.tt;
      styleCell(sheet.getCell(row, 1), { hAlign: "center" });
      sheet.getCell(row, 2).value = item.doi_tuong || "";
      styleCell(sheet.getCell(row, 2), { hAlign: "center" });
      if (useFormulas && rowFormulas) {
        sheet.getCell(row, 3).value = { formula: rowFormulas.hk1 };
        sheet.getCell(row, 4).value = { formula: rowFormulas.hk2 };
        sheet.getCell(row, 5).value = { formula: rowFormulas.doAn };
        sheet.getCell(row, 6).value = { formula: rowFormulas.thamQuan };
        sheet.getCell(row, 7).value = { formula: `SUM(C${row}:F${row})` };
      } else {
        sheet.getCell(row, 3).value = item.hk1 || 0;
        sheet.getCell(row, 4).value = item.hk2 || 0;
        sheet.getCell(row, 5).value = item.do_an || 0;
        sheet.getCell(row, 6).value = item.tham_quan || 0;
        // Nạp công thức tổng hàng ngang từ Formula Generator Service
        sheet.getCell(row, 7).value = KeKhaiFormulaGenerator.getTableFRowTotal(item.tong, row, useFormulas);
      }

      for (let col = 3; col <= 7; col += 1) {
        sheet.getCell(row, col).numFmt = "#,##0.00";
        styleCell(sheet.getCell(row, col), { hAlign: "center" });
      }
      row += 1;
    });

    // Dòng tổng cộng dọc ở tfoot
    mergeAndStyle(sheet, row, 1, row, 2, "Tổng:", { bold: true, hAlign: "center" });
    const staticTotals = {
      3: tableF.totals?.hk1,
      4: tableF.totals?.hk2,
      5: tableF.totals?.do_an,
      6: tableF.totals?.tham_quan,
      7: tableF.totals?.tong,
    };

    [3, 4, 5, 6, 7].forEach((colIdx) => {
      const cell = sheet.getCell(row, colIdx);
      const colLetter = String.fromCharCode(64 + colIdx);

      if (useFormulas && dataStartRow <= row - 1) {
        cell.value = { formula: `SUM(${colLetter}${dataStartRow}:${colLetter}${row - 1})` };
      } else {
        cell.value = KeKhaiFormulaGenerator.getTableFColumnTotal(
          staticTotals[colIdx],
          colLetter,
          dataStartRow,
          row - 1,
          false
        );
      }
      cell.numFmt = "#,##0.00";
      styleCell(cell, { bold: true, hAlign: "center" });
    });
    row += 1;

    return row;
  }
}

module.exports = KeKhaiSummaryComponent;
