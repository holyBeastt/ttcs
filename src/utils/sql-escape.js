/**
 * Tiện ích hỗ trợ escape các chuỗi đầu vào dùng trong mệnh đề SQL LIKE.
 */

/**
 * Escape các ký tự đặc biệt của SQL LIKE (%, _, \)
 * 
 * @param {string} query Chuỗi cần escape
 * @returns {string} Chuỗi đã được escape
 */
function escapeLikePattern(query) {
    if (query === null || query === undefined) return '';
    
    // Ép kiểu về string
    const str = String(query);

    // Escape các ký tự đặc biệt của LIKE
    // 1. Dấu backslash \ phải chuyển thành \\
    // 2. Dấu % phải chuyển thành \%
    // 3. Dấu _ phải chuyển thành \_
    return str
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
}

/**
 * Escape chuỗi để sử dụng với toán tử LIKE trong SQL.
 * Tự động thêm '%' vào hai đầu chuỗi.
 * Yêu cầu: Câu lệnh SQL cần phải thêm `ESCAPE '\\'`
 * 
 * @param {string} query Chuỗi cần tìm kiếm
 * @param {object} options Tùy chọn prefix và suffix
 * @returns {string} Chuỗi đã được escape và bọc '%'
 */
function buildLikePattern(query, options = {}) {
    const escapedStr = escapeLikePattern(query);
    
    const prefix = options.prefix !== false ? '%' : '';
    const suffix = options.suffix !== false ? '%' : '';
    
    return `${prefix}${escapedStr}${suffix}`;
}

module.exports = {
    escapeLikePattern,
    buildLikePattern
};
