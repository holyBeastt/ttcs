/**
 * Master Layout - Column widths and layout for master summary sheets
 */

class MasterLayout {
  /**
   * Apply master sheet layout
   */
  static applyLayout(worksheet) {
    // Set column widths
    const columnWidths = [
      5,   // STT
      30,  // Khoa/Phòng
      14,  // Số giảng viên
      14,  // Tiết thực hiện
      12,  // Tiết vượt
      14,  // Thanh toán
      20   // Ghi chú
    ];

    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // Set default row height
    worksheet.properties.defaultRowHeight = 22;
  }
}

module.exports = MasterLayout;