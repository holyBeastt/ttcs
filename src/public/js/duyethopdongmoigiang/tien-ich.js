/**
 * tien-ich.js
 * Cac ham tien ich chung cho trang duyet hop dong moi giang
 * Bao gom: dinh dang tien te, so tiet, hien thi loading, toast thong bao
 */

/**
 * Dinh dang gia tri thanh tien te VND
 * @param {number} value - Gia tri can dinh dang
 * @returns {string} Chuoi tien te da dinh dang
 */
function formatCurrency(value) {
    if (typeof value === "number" && !isNaN(value)) {
        return value.toLocaleString("vi-VN", {
            style: "currency",
            currency: "VND",
        });
    }
    return "0 ₫";
}

/**
 * Dinh dang so tiet voi 2 chu so thap phan
 * @param {number|string} value - So tiet can dinh dang
 * @returns {string} Chuoi so tiet da dinh dang
 */
function formatSoTiet(value) {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (typeof numValue !== "number" || isNaN(numValue)) return "0.00";

    // So nguyen su dung dau cham
    if (numValue % 1 === 0) {
        return numValue.toFixed(2);
    } else {
        // So thap phan su dung dau phay
        return numValue.toFixed(2).replace('.', ',');
    }
}

/**
 * Hien thi hoac an loading spinner
 * @param {boolean} show - True de hien thi, false de an
 * @param {string} message - Thong bao hien thi (tuy chon)
 */
function showLoading(show, message) {
    if (show) {
        const loadingText = message || 'Đang tải dữ liệu...';
        $('#loadingSpinner p').text(loadingText);
        $('#loadingSpinner').css('display', 'flex');
    } else {
        $('#loadingSpinner').css('display', 'none');
        $('#loadingSpinner p').text('Đang tải dữ liệu...');
    }
}

/**
 * Hien thi thong bao thanh cong
 * @param {string} message - Noi dung thong bao
 */
function showSuccess(message) {
    $('#successMessage').text(message);
    const toast = new bootstrap.Toast($('#successToast')[0]);
    toast.show();
}

/**
 * Hien thi thong bao loi
 * @param {string} message - Noi dung thong bao loi
 */
function showError(message) {
    $('#errorMessage').text(message);
    const toast = new bootstrap.Toast($('#errorToast')[0]);
    toast.show();
}

/**
 * An tat ca cac bang du lieu
 * Dam bao chi hien thi mot bang tai mot thoi diem
 */
function hideAllTables() {
    $('#resultsDiv').hide(); // Bang theo giang vien
    $('#heDaoTaoResultsDiv').hide(); // Bang theo he dao tao
    $('#noDataMessage').hide();
}

/**
 * Hien thi thong bao khong co du lieu va an tat ca cac bang
 */
function showNoDataMessage() {
    hideAllTables();
    $('#noDataMessage').show();
}
