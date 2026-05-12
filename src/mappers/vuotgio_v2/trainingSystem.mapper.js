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
    const isMatMa = name.includes("mật mã");

    let vungMien = "viet_nam";
    if (name.includes("lào")) vungMien = "lao";
    else if (name.includes("campuchia")) vungMien = "campuchia";
    else if (name.includes("cuba")) vungMien = "cuba";

    return { isMatMa, vungMien };
};

/**
 * Map training system name to standardized category key
 * @param {string} tenHeDaoTao 
 * @returns {string} vn | lao | cuba | cpc | dongHP
 */
const getCategoryKey = (tenHeDaoTao) => {
    const { isMatMa, vungMien } = classify(tenHeDaoTao);
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
