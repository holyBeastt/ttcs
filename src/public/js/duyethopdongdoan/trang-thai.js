/**
 * trang-thai.js
 * Các hàm kiểm tra và cập nhật trạng thái hợp đồng đồ án
 */

/**
 * Lấy text trạng thái duyệt
 * @param {number} taiChinhDuyet - Giá trị duyệt (0 hoặc 1)
 * @returns {string} Text trạng thái
 */
function getApprovalStatus(taiChinhDuyet) {
    if (taiChinhDuyet == 1) {
        return 'Đã duyệt';
    }
    return 'Chưa duyệt';
}

/**
 * Kiểm tra và hiển thị trạng thái lưu hợp đồng
 */
function checkAndDisplayContractSaveStatus() {
    const params = getFilterParams();
    if (!validateParams(params) || !params.loaiHopDong) {
        $('#contractSaveStatus').text('Vui lòng chọn đầy đủ Đợt, Kỳ, Năm học và Loại hợp đồng');
        return;
    }

    $('#contractSaveStatus').text('Đang kiểm tra...');
    const requestParams = { ...params, maPhongBan: params.maPhongBan || 'ALL' };

    $.ajax({
        url: '/api/check-contract-save-status-do-an',
        type: 'POST',
        data: requestParams,
        success: function (response) {
            if (response.success && response.message) {
                $('#contractSaveStatus').text(response.message);
                $('#unmetRecordsSection').toggle(response.message === 'Chưa lưu HĐ' && response.data?.unmetRecords?.length > 0);
                updateContractStatusForTeachers();
            } else {
                $('#contractSaveStatus').text('Lỗi: ' + (response.message || 'Không thể kiểm tra trạng thái'));
                $('#unmetRecordsSection').hide();
            }
        },
        error: function () {
            $('#contractSaveStatus').text('Lỗi kết nối khi kiểm tra trạng thái');
            $('#unmetRecordsSection').hide();
        }
    });
}

/**
 * Cập nhật trạng thái hợp đồng cho các giảng viên trong bảng
 */
function updateContractStatusForTeachers() {
    const params = getFilterParams();
    if (!validateParams(params) || !params.loaiHopDong) return;

    const statusCells = document.querySelectorAll('.contract-status-cell');
    const tcDuyetCells = document.querySelectorAll('.contract-tcduyet-cell');

    if (statusCells.length === 0) return;

    // Set loading state only for contract status cells
    statusCells.forEach(cell => cell.textContent = 'Đang kiểm tra...');

    const requestParams = { ...params, maPhongBan: params.maPhongBan || 'ALL' };

    // Check contract save status
    $.ajax({
        url: '/api/check-contract-save-status-do-an',
        type: 'POST',
        data: requestParams,
        success: (response) => {
            const message = response.success && response.message ? response.message : 'Lỗi kiểm tra';
            statusCells.forEach(cell => cell.textContent = message);
        },
        error: () => {
            statusCells.forEach(cell => cell.textContent = 'Lỗi kết nối');
        }
    });
}

/**
 * Cập nhật trạng thái hợp đồng cho view hệ đào tạo
 */
function updateContractStatusForTeachersHeDaoTao() {
    const params = getFilterParams();
    if (!validateParams(params) || !params.loaiHopDong) return;

    const statusCells = document.querySelectorAll('.contract-status-cell-hedaotao');
    if (statusCells.length === 0) return;

    statusCells.forEach(cell => cell.textContent = 'Đang kiểm tra...');

    const requestParams = { ...params, maPhongBan: params.maPhongBan || 'ALL' };

    $.ajax({
        url: '/api/check-contract-save-status-do-an',
        type: 'POST',
        data: requestParams,
        success: (response) => {
            const message = response.success && response.message ? response.message : 'Lỗi kiểm tra';
            statusCells.forEach(cell => cell.textContent = message);
        },
        error: () => {
            statusCells.forEach(cell => cell.textContent = 'Lỗi kết nối');
        }
    });
}

/**
 * Reset trạng thái hợp đồng về mặc định
 */
function resetContractStatus() {
    $('#contractSaveStatus').text('Chưa kiểm tra');
    $('#unmetRecordsSection').hide();

    const statusCells = document.querySelectorAll('.contract-status-cell');
    statusCells.forEach(cell => cell.textContent = 'Chưa kiểm tra');
}
