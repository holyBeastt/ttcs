/**
 * Header Component - Handles header creation for department sheets (36 columns)
 */

const CellFormatter = require("../../shared_excel/core/cell.formatter");
const DepartmentLayout = require("../layouts/department.layout");

class HeaderComponent {
  /**
   * Create department sheet header with 36 columns (A1:AJ)
   */
  static createDepartmentHeader(worksheet, { khoa, namHoc }) {
    const colors = DepartmentLayout.getColors();

    // Title row (A1:AJ1)
    CellFormatter.mergeAndStyle(worksheet, 1, 1, 1, 36, 
      `DANH SÁCH GIẢNG VIÊN VƯỢT GIỜ NĂM ${namHoc || ""}`, 
      { 
        title: true, 
        bgColor: colors.titleFill.fgColor.argb,
        fontSize: 15
      }
    );

    // Subheader: khoa (A2:AJ2)
    CellFormatter.mergeAndStyle(worksheet, 2, 1, 2, 36, 
      `KHOA : ${khoa || ""}`, 
      { 
        title: true, 
        fontSize: 13, 
        bgColor: colors.titleFill.fgColor.argb
      }
    );

    return 3; // Next available row
  }

  /**
   * Create department column headers (36 columns structure)
   */
  static createDepartmentColumnHeaders(worksheet, startRow) {
    const colors = DepartmentLayout.getColors();

    // Helper function to style headers
    const styleHeader = (cell, fill, wrapText = true) => {
      cell.fill = fill;
      cell.font = { bold: true, size: 12.5, color: { argb: "FFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText };
      CellFormatter.applyBorder(cell);
    };

    const styleSubHeader = (cell, fill) => {
      cell.fill = fill;
      cell.font = { bold: true, size: 11.5 };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      CellFormatter.applyBorder(cell);
    };

    // Row 3-5 headers (main headers)
    // A3:A5 - STT
    CellFormatter.mergeAndStyle(worksheet, startRow, 1, startRow + 2, 1, "STT", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // B3:B5 - Họ tên Giảng viên
    CellFormatter.mergeAndStyle(worksheet, startRow, 2, startRow + 2, 2, "Họ tên Giảng viên", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // C3:C5 - Thu nhập
    CellFormatter.mergeAndStyle(worksheet, startRow, 3, startRow + 2, 3, "Thu nhập", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // D3:D5 - Định mức giờ giảng
    CellFormatter.mergeAndStyle(worksheet, startRow, 4, startRow + 2, 4, "Định mức giờ giảng", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // E3:E5 - Được giảm
    CellFormatter.mergeAndStyle(worksheet, startRow, 5, startRow + 2, 5, "Được giảm", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // F3:F5 - Số tiết chưa hoàn thành NCKH
    CellFormatter.mergeAndStyle(worksheet, startRow, 6, startRow + 2, 6, "Số tiết chưa hoàn thành NCKH", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });
    // G3:G5 - Định mức phải giảng
    CellFormatter.mergeAndStyle(worksheet, startRow, 7, startRow + 2, 7, "Định mức phải giảng", {
      header: true, bgColor: colors.baseFill.fgColor.argb, fontSize: 12.5
    });

    // H3:V3 - Thực tế giảng dạy + coi, ra đề, chấm thi + ĐATN + HDTQ
    CellFormatter.mergeAndStyle(worksheet, startRow, 8, startRow, 22, "Thực tế giảng dạy + coi, ra đề, chấm thi + ĐATN + HDTQ", {
      header: true, bgColor: colors.teachingFill.fgColor.argb, fontSize: 12.5
    });

    // W3:AB3 - Số tiết vượt định mức
    CellFormatter.mergeAndStyle(worksheet, startRow, 23, startRow, 28, "Số tiết vượt định mức", {
      header: true, bgColor: colors.overFill.fgColor.argb, fontSize: 12.5
    });

    // AC3:AC5 - Mức TT chuẩn
    CellFormatter.mergeAndStyle(worksheet, startRow, 29, startRow + 2, 29, "Mức TT chuẩn", {
      header: true, bgColor: colors.rateFill.fgColor.argb, fontSize: 12.5
    });

    // AD3:AI3 - Thành tiền
    CellFormatter.mergeAndStyle(worksheet, startRow, 30, startRow, 35, "Thành tiền", {
      header: true, bgColor: colors.moneyFill.fgColor.argb, fontSize: 12.5
    });

    // AJ3:AJ5 - Thực nhận
    CellFormatter.mergeAndStyle(worksheet, startRow, 36, startRow + 2, 36, "Thực nhận", {
      header: true, bgColor: colors.netFill.fgColor.argb, fontSize: 12.5
    });

    // Row 4 sub-headers
    // H4:L4 - Học kỳ I (bao gồm ĐATN + HDTQ vì không có thông tin HK)
    CellFormatter.mergeAndStyle(worksheet, startRow + 1, 8, startRow + 1, 12, "Học kỳ I (gồm ĐA & TQ)", {
      header: true, bgColor: colors.teachingSubFill.fgColor.argb, fontSize: 12.5, wrapText: false
    });

    // M4:Q4 - Học kỳ II
    CellFormatter.mergeAndStyle(worksheet, startRow + 1, 13, startRow + 1, 17, "Học kỳ II", {
      header: true, bgColor: colors.teachingSubFill.fgColor.argb, fontSize: 12.5, wrapText: false
    });

    // R4:V4 - Cả năm
    CellFormatter.mergeAndStyle(worksheet, startRow + 1, 18, startRow + 1, 22, "Cả năm", {
      header: true, bgColor: colors.teachingSubFill.fgColor.argb, fontSize: 12.5, wrapText: false
    });

    // W4:AB4 - Empty (vượt định mức)
    CellFormatter.mergeAndStyle(worksheet, startRow + 1, 23, startRow + 1, 28, "", {
      header: true, bgColor: colors.overSubFill.fgColor.argb, fontSize: 12.5, wrapText: false
    });

    // AD4:AI4 - Empty (thành tiền)
    CellFormatter.mergeAndStyle(worksheet, startRow + 1, 30, startRow + 1, 35, "", {
      header: true, bgColor: colors.moneySubFill.fgColor.argb, fontSize: 12.5, wrapText: false
    });

    // Row 5 detailed sub-headers
    const subHeaders = [
      [8, "VN"], [9, "Lào"], [10, "Cuba"], [11, "CPC"], [12, "Đóng HP"],        // H5:L5 - HK1
      [13, "VN"], [14, "Lào"], [15, "Cuba"], [16, "CPC"], [17, "Đóng HP"],       // M5:Q5 - HK2
      [18, "VN"], [19, "Lào"], [20, "Cuba"], [21, "CPC"], [22, "Đóng HP"],       // R5:V5 - Cả năm
      [23, "VN"], [24, "Lào"], [25, "Cuba"], [26, "CPC"], [27, "Đóng HP"], [28, "Tổng"], // W5:AB5 - Vượt
      [30, "VN"], [31, "Lào"], [32, "Cuba"], [33, "CPC"], [34, "Đóng HP"], [35, "Tổng"]  // AD5:AI5 - Thành tiền
    ];

    subHeaders.forEach(([colIndex, label]) => {
      const cell = worksheet.getCell(startRow + 2, colIndex);
      cell.value = label;
      
      // Determine fill color based on column position
      let fillColor;
      if (colIndex >= 8 && colIndex <= 22) {
        fillColor = colors.columnSubFill;
      } else if (colIndex >= 23 && colIndex <= 28) {
        fillColor = colors.columnOverSubFill;
      } else if (colIndex >= 30 && colIndex <= 35) {
        fillColor = colors.columnMoneySubFill;
      } else {
        fillColor = colors.baseFill;
      }
      
      styleSubHeader(cell, fillColor);
    });

    return startRow + 3; // Next available row (row 6)
  }

  /**
   * Create master sheet header (simplified version)
   */
  static createMasterHeader(worksheet, { namHoc }) {
    CellFormatter.mergeAndStyle(worksheet, 1, 1, 1, 7, 
      `TỔNG HỢP VƯỢT GIỜ - ${namHoc || ""}`, 
      { title: true, bgColor: "203864" }
    );

    return 2; // Next available row
  }

  /**
   * Create payment sheet header
   */
  static createPaymentHeader(worksheet, { namHoc, khoa }) {
    CellFormatter.mergeAndStyle(worksheet, 1, 1, 1, 7, 
      "TIỀN CHUYỂN KHOẢN", 
      { title: true, bgColor: "1F4E79" }
    );

    if (khoa) {
      CellFormatter.mergeAndStyle(worksheet, 2, 1, 2, 7, 
        `Khoa/Phòng: ${khoa}`, 
        { title: true, fontSize: 12.5, bgColor: "D9EAF7", fontColor: "000000" }
      );
    }

    CellFormatter.mergeAndStyle(worksheet, khoa ? 3 : 2, 1, khoa ? 3 : 2, 7, 
      `Năm học: ${namHoc || ""}`, 
      { title: true, fontSize: 12.5, bgColor: khoa ? "D9EAF7" : "1F4E79", fontColor: khoa ? "000000" : "FFFFFF" }
    );

    return khoa ? 4 : 3; // Next available row
  }

  /**
   * Create master sheet column headers
   */
  static createMasterColumnHeaders(worksheet, startRow) {
    const headers = [
      "STT", "Khoa/Phòng", "Số giảng viên", "Tiết thực hiện", 
      "Tiết vượt", "Thanh toán", "Ghi chú"
    ];

    headers.forEach((label, index) => {
      const cell = worksheet.getCell(startRow, index + 1);
      cell.value = label;
      CellFormatter.applyHeaderStyle(cell, { bgColor: "4472C4" });
    });

    return startRow + 1; // Next available row
  }

  /**
   * Create payment sheet column headers
   */
  static createPaymentColumnHeaders(worksheet, startRow) {
    const headers = [
      "STT", "Khoa/Phòng", "Số tiền", "Ghi chú", "", "", ""
    ];

    headers.forEach((label, index) => {
      const cell = worksheet.getCell(startRow, index + 1);
      cell.value = label;
      CellFormatter.applyHeaderStyle(cell, { bgColor: "A9D08E", fontColor: "000000" });
    });

    return startRow + 1; // Next available row
  }
}

module.exports = HeaderComponent;