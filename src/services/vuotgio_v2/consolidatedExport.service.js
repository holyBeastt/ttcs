/**
 * VUOT GIO V2 - Consolidated Export Service (Type B: Tổng hợp Khoa/Phòng)
 *
 * Cấu trúc file xuất:
 *   1. Các Sheet Khoa/Phòng (36 cột): chi tiết từng đơn vị
 *   2. Sheet TỔNG HỢP (Master): danh sách tất cả khoa, liên kết dữ liệu
 *   3. Sheet TIỀN THANH TOÁN (Payment): bảng kê chuyển khoản toàn trường
 *
 * Folder: src/services/vuotgio_v2/department_excel/  (ConsolidatedGenerator)
 */

const { ConsolidatedGenerator, PaymentCalculator } = require('./department_excel');

// ─── Re-export constants (backward-compat) ──────────────────────────────────
const PAYMENT_RATE    = PaymentCalculator.PAYMENT_RATE;
const STANDARD_HOURS  = PaymentCalculator.STANDARD_HOURS;
const MAX_PAYABLE_HOURS = PaymentCalculator.MAX_PAYABLE_HOURS;

/**
 * Xuất workbook tổng hợp toàn trường theo Khoa/Phòng.
 * Bao gồm đầy đủ 3 loại sheet (Khoa + Tổng hợp + Tiền chuyển khoản).
 *
 * @param {string} namHoc
 * @returns {Promise<ExcelJS.Workbook>}
 */
const exportConsolidatedByDepartment = async (namHoc) => {
    return ConsolidatedGenerator.generateConsolidatedWorkbook(namHoc);
};

/**
 * Lấy dữ liệu preview tổng hợp (không tạo file Excel).
 * Dùng cho frontend hiển thị trước khi xuất.
 *
 * @param {string} namHoc
 * @returns {Promise<Object>}
 */
const getConsolidatedPreviewData = async (namHoc) => {
    return ConsolidatedGenerator.getConsolidatedPreviewData(namHoc);
};

/** @deprecated Dùng PaymentCalculator.truncDecimals */
const truncDecimals = (value, digits = 2) => PaymentCalculator.truncDecimals(value, digits);

module.exports = {
    exportConsolidatedByDepartment,
    getConsolidatedPreviewData,
    truncDecimals,
    PAYMENT_RATE,
    STANDARD_HOURS,
    MAX_PAYABLE_HOURS,
};
