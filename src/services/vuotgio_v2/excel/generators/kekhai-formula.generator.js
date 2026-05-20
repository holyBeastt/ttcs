/**
 * Formula Generator Service cho báo cáo Kê khai cá nhân Giảng viên
 * Chịu trách nhiệm cô lập toàn bộ các chuỗi công thức Excel động nhằm đảm bảo nguyên tắc SRP.
 */
class KeKhaiFormulaGenerator {
  /**
   * Đóng gói giá trị gán cho Cell (giữ nguyên tĩnh nếu useFormulas = false)
   * @param {number|string} staticVal Giá trị tĩnh fallback
   * @param {string} formulaStr Chuỗi công thức Excel
   * @param {boolean} useFormulas Cờ quyết định xuất công thức hay giá trị
   */
  static getCellValue(staticVal, formulaStr, useFormulas) {
    if (useFormulas && formulaStr) {
      return { formula: formulaStr };
    }
    return Number(staticVal) || 0;
  }

  /**
   * Lấy công thức tính Tổng A + B + C (dùng cho dòng tổng sau Block C và dòng I Mục E)
   * @param {Array} groupMetas Metadata của các group đã render từ renderBlockGroups
   * @returns {string|null} Chuỗi công thức SUM
   */
  static getSumABCFormula(groupMetas) {
    if (!Array.isArray(groupMetas)) return null;
    const gMeta = (code) => groupMetas.find((m) => m.code === code);
    const metaA = gMeta("A");
    const metaB = gMeta("B");
    const metaC = gMeta("C");

    const cells = [];
    if (metaA?.finalRow) cells.push(`G${metaA.finalRow}`);
    if (metaB?.finalRow) cells.push(`G${metaB.finalRow}`);
    if (metaC?.finalRow) cells.push(`G${metaC.finalRow}`);

    return cells.length > 0 ? `SUM(${cells.join(",")})` : null;
  }

  /**
   * Sinh toàn bộ công thức hoặc giá trị tĩnh cho 6 dòng của Mục E (Tổng hợp khối lượng)
   * @param {Object} tableE Dữ liệu tĩnh từ SDO
   * @param {Array} groupMetas Metadata các group A, B, C
   * @param {number} startRow Dòng Excel bắt đầu của bảng E (dòng I)
   * @param {boolean} useFormulas Cờ bật công thức
   */
  static getSectionEValues(tableE = {}, groupMetas = [], startRow, useFormulas) {
    const rI = startRow;
    const rII = startRow + 1;
    const rIII = startRow + 2;
    const rIV = startRow + 3;
    const rV = startRow + 4;
    const rVI = startRow + 5;

    // Dòng I: Tổng số tiết thực hiện (A+B+C)
    const fI = this.getSumABCFormula(groupMetas);
    const valI = this.getCellValue(tableE.i, fI, useFormulas);

    // Dòng II: Số tiết định mức phải giảng (Tĩnh)
    const valII = Number(tableE.ii) || 0;

    // Dòng III: Số tiết chưa hoàn thành NCKH (Tĩnh)
    const valIII = Number(tableE.iii) || 0;

    // Dòng IV: Số tiết được giảm trừ (Tĩnh)
    const valIV = Number(tableE.iv) || 0;

    // Dòng V: Tổng số tiết vượt giờ (I - II - III + IV)
    const fV = `MAX(0,E${rI}-E${rII}-E${rIII}+E${rIV})`;
    const valV = this.getCellValue(tableE.v, fV, useFormulas);

    // Dòng VI: Tổng số tiết vượt giờ đề nghị thanh toán
    // Giới hạn thanh toán <= Định mức sau miễn giảm (II - IV)
    const fVI = `MIN(E${rV},E${rII}-E${rIV})`;
    const valVI = this.getCellValue(tableE.vi, fVI, useFormulas);

    return { valI, valII, valIII, valIV, valV, valVI };
  }

  /**
   * Lấy công thức tổng dòng cho bảng F (Thống kê theo hệ đào tạo)
   * Tổng = HK1 (Col C) + HK2 (Col D) + ĐATN (Col E) + TQTT (Col F)
   */
  static getTableFRowTotal(staticTong, rowIdx, useFormulas) {
    const formula = `SUM(C${rowIdx}:F${rowIdx})`;
    return this.getCellValue(staticTong, formula, useFormulas);
  }

  /**
   * Lấy công thức tổng cột cho dòng Tổng cộng ở footer bảng F
   */
  static getTableFColumnTotal(staticTotal, colLetter, startRow, endRow, useFormulas) {
    const formula = startRow <= endRow ? `SUM(${colLetter}${startRow}:${colLetter}${endRow})` : null;
    return this.getCellValue(staticTotal, formula, useFormulas);
  }
}

module.exports = KeKhaiFormulaGenerator;
