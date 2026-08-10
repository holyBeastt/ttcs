const PolicyV1 = require("./PolicyV1");
const PolicyV2 = require("./PolicyV2");

class OvertimePolicyFactory {
    /**
     * Lấy ra bộ tính toán vượt giờ dựa trên năm học
     * @param {string} namHoc - Năm học (VD: "2024 - 2025")
     */
    static getCalculator(namHoc) {
        // Chuẩn hệ thống: "YYYY - YYYY". Vẫn chấp nhận dữ liệu cũ thiếu khoảng trắng.
        const yearMatch = String(namHoc || "").match(/^\s*(\d{4})\s*-\s*(\d{4})\s*$/);
        const normalizedNamHoc = yearMatch ? `${yearMatch[1]} - ${yearMatch[2]}` : "";

        // Áp dụng V2 (luật 80%) cho các năm học được cấu hình.
        const newPolicyYears = ["2025 - 2026", "2026 - 2027", "2027 - 2028", "2028 - 2029", "2029 - 2030", "2030 - 2031", "2031 - 2032"];

        if (newPolicyYears.includes(normalizedNamHoc)) {
            console.log('[PolicyV2] - Vượt giờ quy định luôn map theo 80% nếu có giảm trừ');
            return PolicyV2;
        }

        // Mặc định các năm trước đó dùng V1 (logic % giảm trừ trực tiếp)
        console.log('[PolicyV1] - Giảm trừ theo % trăm miễn giảm');
        return PolicyV1;
    }
}

module.exports = OvertimePolicyFactory;
