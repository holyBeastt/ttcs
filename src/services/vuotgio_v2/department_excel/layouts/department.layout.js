/**
 * Department Layout - Column widths and layout for department sheets (36 columns)
 */

class DepartmentLayout {
  /**
   * Apply department sheet layout with 36 columns
   */
  static applyLayout(worksheet) {
    // Set column widths for 36 columns (A-AJ)
    const columnWidths = [
      4,    // A - STT
      18,   // B - Họ tên Giảng viên
      8.5,  // C - Thu nhập
      9.5,  // D - Định mức giờ giảng
      7.5,  // E - Được giảm
      9.5,  // F - Số tiết chưa hoàn thành NCKH
      9.5,  // G - Định mức phải giảng
      5.5,  // H - HK1 VN
      5.5,  // I - HK1 Lào
      5.5,  // J - HK1 Cuba
      5.5,  // K - HK1 CPC
      7,    // L - HK1 Đóng HP
      5.5,  // M - HK2 VN
      5.5,  // N - HK2 Lào
      5.5,  // O - HK2 Cuba
      5.5,  // P - HK2 CPC
      7,    // Q - HK2 Đóng HP
      5.5,  // R - Cả năm VN
      5.5,  // S - Cả năm Lào
      5.5,  // T - Cả năm Cuba
      5.5,  // U - Cả năm CPC
      7,    // V - Cả năm Đóng HP
      5.5,  // W - Vượt VN
      5.5,  // X - Vượt Lào
      5.5,  // Y - Vượt Cuba
      5.5,  // Z - Vượt CPC
      7,    // AA - Vượt Đóng HP
      7,    // AB - Tổng vượt
      8.5,  // AC - Mức TT chuẩn
      8.5,  // AD - Thành tiền VN
      8.5,  // AE - Thành tiền Lào
      8.5,  // AF - Thành tiền Cuba
      8.5,  // AG - Thành tiền CPC
      8.5,  // AH - Thành tiền Đóng HP
      11,   // AI - Tổng thành tiền
      11    // AJ - Thực nhận
    ];

    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // Set default row height
    worksheet.properties.defaultRowHeight = 22;
    
    // Set print titles (repeat header rows when printing)
    worksheet.pageSetup.printTitlesRow = "1:5";
  }

  /**
   * Get color definitions for different sections
   * Synchronized with vuotgio.tongHopGV.ejs styles
   */
  static getColors() {
    return {
      // Main headers
      baseFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF64748B" } }, // s-base, s-action
      teachingFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } }, // s-teaching
      overFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF059669" } }, // s-over
      rateFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C3AED" } }, // s-rate
      moneyFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFB45309" } }, // s-money
      netFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } }, // s-net

      // Sub headers (HK1, HK2, Cả năm)
      teachingSubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF3B82F6" } }, // s-teaching-hk1/2/year
      overSubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } }, // s-over-sub
      moneySubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD97706" } }, // s-money-sub

      // Column headers (VN, Lào, Cuba, ...)
      columnSubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF60A5FA" } }, // s-teaching-sub (light blue)
      columnOverSubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF34D399" } }, // light emerald
      columnMoneySubFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF59E0B" } }, // light amber

      // Title row
      titleFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF475569" } } // default header
    };
  }
}

module.exports = DepartmentLayout;