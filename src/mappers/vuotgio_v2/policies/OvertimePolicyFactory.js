const PolicyV1 = require("./PolicyV1");
const PolicyV2 = require("./PolicyV2");

class OvertimePolicyFactory {
    /**
     * Lấy ra bộ tính toán vượt giờ dựa trên năm học
     * @param {string} namHoc - Năm học (VD: "2024-2025")
     */
    static getCalculator(namHoc) {
        // Áp dụng V2 (luật 80%) từ năm học "2026-2027" trở đi
        const newPolicyYears = ["2025 - 2026", "2026 - 2027", "2027 - 2028", "2028 - 2029"];

        if (newPolicyYears.includes(namHoc)) {
            console.log('[PolicyV2 - Vượt giờ quy định luôn map theo 80% nếu có giảm trừ]');
            return PolicyV2;
        }

        // Mặc định các năm trước đó dùng V1 (logic % giảm trừ trực tiếp)
        console.log('[PolicyV1 - Giảm trừ theo % trăm miễn giảm]');
        return PolicyV1;
    }
}

module.exports = OvertimePolicyFactory;
