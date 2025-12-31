/**
 * tien-ich.js
 * Các hàm tiện ích chung cho trang duyệt hợp đồng đồ án
 * Bao gồm: định dạng tiền tệ, số tiết, hiển thị loading, toast thông báo
 */

/**
 * Định dạng giá trị thành tiền tệ VND
 * @param {number} value - Giá trị cần định dạng
 * @returns {string} Chuỗi tiền tệ đã định dạng
 */
function formatCurrency(value) {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (typeof numValue === "number" && !isNaN(numValue)) {
        return numValue.toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
        });
    }
    return "0 ₫";
}

/**
 * Định dạng số tiết với 2 chữ số thập phân
 * @param {number|string} value - Số tiết cần định dạng
 * @returns {string} Chuỗi số tiết đã định dạng
 */
function formatSoTiet(value) {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (typeof numValue !== "number" || isNaN(numValue)) return "0.00";

    // Số nguyên sử dụng dấu chấm
    if (numValue % 1 === 0) {
        return numValue.toFixed(2);
    } else {
        // Số thập phân sử dụng dấu phẩy
        return numValue.toFixed(2).replace('.', ',');
    }
}

/**
 * Hiển thị hoặc ẩn loading spinner
 * @param {boolean} show - True để hiển thị, false để ẩn
 */
function showLoading(show) {
    $('#loadingSpinner').toggle(show);
}

/**
 * Hiển thị thông báo thành công
 * @param {string} message - Nội dung thông báo
 */
function showSuccess(message) {
    $('#successMessage').text(message);
    new bootstrap.Toast($('#successToast')[0]).show();
}

/**
 * Hiển thị thông báo lỗi
 * @param {string} message - Nội dung thông báo lỗi
 */
function showError(message) {
    $('#errorMessage').text(message);
    new bootstrap.Toast($('#errorToast')[0]).show();
}

/**
 * Ẩn tất cả các bảng dữ liệu
 * Đảm bảo chỉ hiển thị một bảng tại một thời điểm
 */
function hideAllTables() {
    $('#resultsDiv').hide(); // Bảng theo giảng viên
    $('#heDaoTaoResultsDiv').hide(); // Bảng theo hệ đào tạo
    $('#noDataMessage').hide();
}

/**
 * Hiển thị thông báo không có dữ liệu và ẩn tất cả các bảng
 */
function showNoDataMessage() {
    hideAllTables();
    $('#noDataMessage').show();
}

/**
 * Lấy tên hệ đào tạo từ ID
 * @param {number|string} id - ID của hệ đào tạo
 * @returns {string} Tên hệ đào tạo hoặc placeholder
 */
function getHeDaoTaoName(id) {
    return window.heDaoTaoMap[id] || `Hệ ${id}`;
}

/**
 * Hiển thị thông báo không có dữ liệu kèm lỗi
 * @param {string} message - Thông báo lỗi
 */
function showNoDataWithError(message) {
    showError(message);
    showNoDataMessage();
    $('#approveContractBtn, #unapproveContractBtn, #saveDataDoAn, #unsaveDataDoAn').hide();
}
