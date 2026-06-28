/**
 * VUOT GIO V2 - Training System Mapper
 * Centralized logic for classifying and mapping training systems (Hệ đào tạo)
 * to standardized categories (vn, lao, cuba, cpc, dongHP).
 */

/**
 * Core classification logic based on training system names
 * @param {string} tenHeDaoTao 
 * @returns {Object} { isMatMa, vungMien }
 */
const classify = (tenHeDaoTao) => {
    const name = String(tenHeDaoTao || "").toLowerCase();

    let vungMien = "viet_nam";
    if (name.includes("lào")) vungMien = "lao";
    else if (name.includes("campuchia")) vungMien = "campuchia";
    else if (name.includes("cuba")) vungMien = "cuba";

    // Phân loại Đóng học phí
    const isDongHP = name.includes("đóng học phí") || name.includes("đồ án cao học");
    
    // Mật mã bao gồm các hệ có chữ "mật mã" HOẶC hệ của nước ngoài (vì có hệ thiếu chữ mật mã như 'Đồ án ĐH Campuchia')
    const isMatMa = name.includes("mật mã") || vungMien !== "viet_nam";

    return { isMatMa, vungMien, isDongHP };
};

/**
 * Map training system name to standardized category key
 * @param {string} tenHeDaoTao 
 * @returns {string} vn | lao | cuba | cpc | dongHP
 */
const getCategoryKey = (tenHeDaoTao) => {
    const { isMatMa, vungMien, isDongHP } = classify(tenHeDaoTao);
    
    if (isDongHP) return "dongHP";
    
    // Nếu không phải đóng HP, và cũng không phải mật mã (và không có vùng miền) -> rơi vào đóng HP fallback
    if (!isMatMa) return "dongHP";

    const regionToCategory = {
        viet_nam: "vn",
        lao: "lao",
        cuba: "cuba",
        campuchia: "cpc",
    };

    return regionToCategory[vungMien] || "vn";
};

/**
 * Friendly labels for display
 */
const CATEGORY_LABELS = {
    vn: "Việt Nam",
    lao: "Lào",
    cuba: "Cuba",
    cpc: "Campuchia",
    dongHP: "Đóng học phí",
};

const getLabel = (key) => CATEGORY_LABELS[key] || key;

module.exports = {
    classify,
    getCategoryKey,
    getLabel,
    CATEGORY_LABELS
};
