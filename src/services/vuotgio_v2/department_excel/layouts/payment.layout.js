/**
 * Payment Layout - Column widths and layout for payment sheets
 */

class PaymentLayout {
  /**
   * Apply payment sheet layout
   */
  static applyLayout(worksheet) {
    // Set column widths for payment sheet (7 columns)
    const columnWidths = [
      6,   // A - STT
      26,  // B - Họ tên giảng viên
      12,  // C - Mã phòng ban
      22,  // D - Số tài khoản
      24,  // E - Ngân hàng
      18,  // F - Số tiền chuyển khoản
      26   // G - Ghi chú
    ];

    columnWidths.forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width;
    });

    // Set default row height
    worksheet.properties.defaultRowHeight = 22;
  }

  /**
   * Get color definitions for payment sheet
   */
  static getColors() {
    return {
      titleFill: { type: "pattern", pattern: "solid", fgColor: { argb: "1F4E79" } },
      subFill: { type: "pattern", pattern: "solid", fgColor: { argb: "D9EAF7" } },
      headerFill: { type: "pattern", pattern: "solid", fgColor: { argb: "A9D08E" } }
    };
  }
}

module.exports = PaymentLayout;