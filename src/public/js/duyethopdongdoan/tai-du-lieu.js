/**
 * tai-du-lieu.js
 * Các hàm tải dữ liệu từ API cho trang duyệt hợp đồng đồ án
 */

/**
 * Tải danh sách hệ đào tạo để mapping ID -> tên
 */
function fetchHeDaoTaoList() {
    $.ajax({
        url: '/api/gvm/v1/he-dao-tao',
        method: 'GET',
        success: function (response) {
            if (response.success && response.data) {
                response.data.forEach(item => {
                    window.heDaoTaoMap[item.id] = item.he_dao_tao;
                });
                console.log('[DEBUG] HeDaoTaoMap loaded:', window.heDaoTaoMap);
            }
        },
        error: function (error) {
            console.error('[DEBUG] Failed to load heDaoTaoList:', error);
        }
    });
}

/**
 * Tải dữ liệu hợp đồng theo giảng viên
 * @param {boolean} isDetailView - Có phải view chi tiết không
 */
function loadContractData(isDetailView = false) {
    console.log('[DEBUG] loadContractData called');
    const params = getFilterParams();
    console.log('[DEBUG] params:', params);
    if (!validateParams(params)) return;

    showLoading(true);
    hideAllTables();

    $.ajax({
        url: '/api/duyet-hop-dong-do-an',
        type: 'POST',
        data: params,
        success: (response) => {
            console.log('[DEBUG] Response received:', response);
            handleContractDataSuccess(response, 'teacher');
        },
        error: (xhr, status, error) => {
            console.error('[DEBUG] Error:', error);
            handleContractDataError();
        },
        complete: () => showLoading(false)
    });
}

/**
 * Tải dữ liệu hợp đồng theo hệ đào tạo
 */
function loadContractDataByHeDaoTao() {
    console.log('[DEBUG] loadContractDataByHeDaoTao called');
    const params = getFilterParams();
    if (!validateParams(params)) return;

    // Clear search input when switching to training program view
    $('#searchGiangVien').val('');
    showLoading(true);
    hideAllTables();

    $.ajax({
        url: '/api/duyet-hop-dong-do-an-theo-he-dao-tao',
        type: 'POST',
        data: params,
        success: function (response) {
            console.log('[DEBUG] HeDaoTao Response:', response);
            if (response.data && response.data.length > 0) {
                showSuccess(`Tải dữ liệu thành công! Tìm thấy ${response.data.length} hệ đào tạo.`);

                // Lưu response để dùng cho các hàm khác
                window.currentResponse = response;

                // Hiển thị bảng hệ đào tạo
                displayHeDaoTaoData(response.data, response.enhancedData, response.SoTietDinhMuc);
            } else {
                showError('Không có dữ liệu để hiển thị');
                showNoDataMessage();
            }
        },
        error: function (xhr, status, error) {
            console.error('[DEBUG] HeDaoTao Error:', error);
            showError('Có lỗi xảy ra khi kết nối với server');
            showNoDataMessage();
        },
        complete: function () {
            showLoading(false);
        }
    });
}

/**
 * Xử lý response thành công
 * @param {Object} response - Response từ API
 * @param {string} type - Loại dữ liệu ('teacher' hoặc 'heDaoTao')
 */
function handleContractDataSuccess(response, type) {
    const role = localStorage.getItem("userRole");
    const MaPhongBan = localStorage.getItem("MaPhongBan");

    if (type === 'teacher') {
        if (response.groupedByTeacher && Object.keys(response.groupedByTeacher).length > 0) {
            // Lưu response để dùng cho các hàm khác
            window.currentResponse = response;

            displayContractDataInSeparateTables(response.groupedByTeacher, response.enhancedGroupedByTeacher, response.SoTietDinhMuc || 0);
            showSuccess('Tải dữ liệu thành công');
            // Check permissions for buttons
            checkUserPermissions();
        } else {
            showNoDataWithError('Không có dữ liệu để hiển thị');
        }
    }
}

/**
 * Xử lý lỗi khi tải dữ liệu
 * @param {Object} xhr - XMLHttpRequest object
 */
function handleContractDataError(xhr) {
    const errorMsg = xhr?.responseJSON?.message || 'Có lỗi xảy ra khi kết nối với server';
    showNoDataWithError(errorMsg);
}
