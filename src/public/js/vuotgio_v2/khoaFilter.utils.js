/**
 * Khoa Filter Utilities - Frontend
 * Dùng chung cho các trang vượt giờ (LNQC, KTHP, HDTQ)
 * 
 * Logic:
 * - Nếu user có isKhoa = 1: lock dropdown khoa = MaPhongBan, không cho chọn khoa khác
 * - Nếu user không phải khoa: hiển thị bình thường
 */

const KhoaFilterUtils = {
    /**
     * Kiểm tra user có phải là khoa không
     */
    isKhoaUser() {
        const isKhoa = localStorage.getItem('isKhoa');
        return isKhoa === '1' || isKhoa === 1;
    },

    /**
     * Lấy MaPhongBan của user
     */
    getUserKhoa() {
        return localStorage.getItem('MaPhongBan') || '';
    },

    /**
     * Áp dụng filter khoa cho dropdown select element.
     * Nếu user là khoa: set value = MaPhongBan, disable dropdown.
     * 
     * @param {string|HTMLElement} selectElement - ID hoặc element của dropdown khoa
     * @param {Object} options - Tùy chọn
     * @param {boolean} options.removeOtherOptions - Xóa các option khác (default: false)
     */
    applyKhoaFilter(selectElement, options = {}) {
        if (typeof selectElement === 'string') {
            selectElement = document.getElementById(selectElement);
        }
        if (!selectElement) return;

        if (!this.isKhoaUser()) return;

        const userKhoa = this.getUserKhoa();
        if (!userKhoa) return;

        // Set value = MaPhongBan của user
        selectElement.value = userKhoa;

        // Disable dropdown để không cho chọn khoa khác
        selectElement.disabled = true;

        // Nếu cần xóa các option khác
        if (options.removeOtherOptions) {
            const currentOption = selectElement.querySelector(`option[value="${userKhoa}"]`);
            const label = currentOption ? currentOption.textContent : userKhoa;
            selectElement.innerHTML = `<option value="${userKhoa}">${label}</option>`;
        }
    },

    /**
     * Lấy giá trị khoa để gửi API.
     * Nếu user là khoa → luôn trả về MaPhongBan, bất kể dropdown chọn gì.
     * 
     * @param {string|HTMLElement} selectElement - ID hoặc element của dropdown khoa
     * @returns {string} Giá trị khoa
     */
    getKhoaValue(selectElement) {
        if (this.isKhoaUser()) {
            return this.getUserKhoa();
        }

        if (typeof selectElement === 'string') {
            selectElement = document.getElementById(selectElement);
        }
        return selectElement ? selectElement.value : '';
    }
};

// Export cho cả module và global
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KhoaFilterUtils;
}
