/**
 * VUOT GIO V2 - Base Mapper
 * Tập hợp các hàm tiện ích chuyển đổi dữ liệu dùng chung
 */

/**
 * Lấy giá trị đầu tiên không rỗng từ danh sách các key
 */
const pick = (source, ...keys) => {
    if (!source) return undefined;
    for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
            return source[key];
        }
    }
    return undefined;
};

/**
 * Ép kiểu số nguyên an toàn
 */
const toInt = (value, fallback = 0) => {
    if (value === undefined || value === null) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Ép kiểu số thập phân an toàn
 */
const toDecimal = (value, fallback = 0) => {
    if (value === undefined || value === null) return fallback;
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Làm sạch chuỗi
 */
const trim = (value) => {
    if (typeof value !== 'string') return value;
    return value.trim();
};

module.exports = {
    pick,
    toInt,
    toDecimal,
    trim
};
