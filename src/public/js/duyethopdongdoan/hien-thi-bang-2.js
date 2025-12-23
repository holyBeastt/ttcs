/**
 * hien-thi-bang-2.js
 * Hàm hiển thị bảng dữ liệu theo hệ đào tạo cho trang duyệt hợp đồng đồ án
 */

/**
 * Hiển thị dữ liệu theo hệ đào tạo
 * @param {Array} data - Dữ liệu
 * @param {Array} enhancedData - Dữ liệu enhanced
 * @param {number} SoTietDinhMuc - Số tiết định mức
 */
function displayHeDaoTaoData(data, enhancedData, SoTietDinhMuc) {
    // Lưu biến global
    window.SoTietDinhMucChuaNghiHuu = window.currentResponse?.SoTietDinhMucChuaNghiHuu || SoTietDinhMuc || 280;
    window.SoTietDinhMucDaNghiHuu = window.currentResponse?.SoTietDinhMucDaNghiHuu || 560;

    // Hide teacher table and show only training program table
    hideAllTables();

    // Clear container
    const container = $('#heDaoTaoGroupedContainer');
    container.empty();

    if (!enhancedData || enhancedData.length === 0) {
        const noDataMessage = `
            <div class="text-center py-4">
                <h5 class="text-muted">Không có dữ liệu hệ đào tạo để hiển thị</h5>
            </div>
        `;
        container.append(noDataMessage);
        $('#heDaoTaoResultsDiv').show();
        return;
    }

    // Calculate totals
    let totalSoTiet = 0;
    let totalThanhTien = 0;
    let totalThue = 0;
    let totalThucNhan = 0;
    let totalGiangVien = 0;

    // Store enhanced data globally for modal access
    window.heDaoTaoDetailData = enhancedData || [];

    // Create approval status display function
    const getApprovalStatusHeDaoTao = (taiChinhDuyet) => {
        if (taiChinhDuyet == 1) {
            return 'Đã duyệt';
        } else {
            return 'Chưa duyệt';
        }
    };

    // Generate grouped display for each training program
    enhancedData.forEach((heDaoTao, groupIndex) => {
        const giangVienList = heDaoTao.chiTietGiangVien || [];

        // Calculate totals
        totalSoTiet += parseFloat(heDaoTao.SoTiet) || 0;
        totalThanhTien += parseFloat(heDaoTao.ThanhTien) || 0;
        totalThue += parseFloat(heDaoTao.Thue) || 0;
        totalThucNhan += parseFloat(heDaoTao.ThucNhan) || 0;
        totalGiangVien += giangVienList.length;

        // Create group container
        const heDaoTaoName = getHeDaoTaoName(heDaoTao.he_dao_tao);
        const groupContainer = $(`
            <div class="training-program-group">
                <div class="training-program-header">
                    <i class="fas fa-graduation-cap me-2"></i>
                    ${heDaoTaoName}
                    <span class="float-end">${getApprovalStatusHeDaoTao(heDaoTao.TaiChinhDuyet)}</span>
                </div>
                
                <div class="training-program-summary">
                    <div class="summary-item">
                        <i class="fas fa-users me-1"></i>
                        <span class="summary-value">${giangVienList.length}</span> giảng viên
                    </div>
                    <div class="summary-item">
                        <i class="fas fa-clock me-1"></i>
                        <span class="summary-value">${formatSoTiet(heDaoTao.SoTiet)}</span> tiết
                    </div>
                    <div class="summary-item">
                        <i class="fas fa-money-bill-wave me-1"></i>
                        Tổng tiền: <span class="summary-value">${formatCurrency(heDaoTao.ThanhTien)}</span>
                    </div>
                    <div class="summary-item">
                        <i class="fas fa-hand-holding-usd me-1"></i>
                        Tổng thực nhận: <span class="summary-value">${formatCurrency(heDaoTao.ThucNhan)}</span>
                    </div>
                </div>
                
                <div class="training-program-table">
                    <div class="table-responsive">
                        <div class="over-f">
                            <table class="table table-striped table-hover table-bordered">
                                <thead class="table-dark">
                                    <tr>
                                        <th class="narrow-col">STT</th>
                                        <th class="narrow-col">Danh xưng</th>
                                        <th class="name-col">Họ tên</th>
                                        <th class="wide-col">Khoa</th>
                                        <th class="narrow-col">Học hàm, học vị</th>
                                        <th class="wide-col">Tiền/Tiết</th>
                                        <th class="narrow-col">Số tiết</th>
                                        <th class="wide-col">Số tiền</th>
                                        <th class="narrow-col">Trừ thuế</th>
                                        <th class="wide-col">Thực nhận</th>
                                        <th class="status-col">TC Duyệt</th>
                                        <th class="status-col">Trạng thái</th>
                                        <th class="action-col">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `);

        // Add rows for each teacher in this training program
        const tbody = groupContainer.find('tbody');
        giangVienList.forEach((gv, index) => {
            // Get teacher's approval status
            const teacherStatus = getApprovalStatusHeDaoTao(gv.TaiChinhDuyet);

            // Xác định định mức và hiển thị tên
            const isNghiHuu = gv.isNghiHuu == 1;
            const dinhMucGV = isNghiHuu ? window.SoTietDinhMucDaNghiHuu : window.SoTietDinhMucChuaNghiHuu;
            const displayName = isNghiHuu ? `${gv.HoTen} (Đã nghỉ hưu)` : gv.HoTen;
            const rowClass = (parseFloat(gv.SoTiet) || 0) > dinhMucGV ? 'alert-sotiet' : '';

            const teacherRow = $(`
                <tr class="${rowClass}">
                    <td>${index + 1}</td>
                    <td>${gv.GioiTinh && gv.GioiTinh.toLowerCase() === "nam" ? "Ông" : "Bà"}</td>
                    <td><strong>${displayName}</strong></td>
                    <td>${gv.TenPhongBan || gv.MaPhongBan || 'N/A'}</td>
                    <td>${gv.HocVi || 'N/A'}</td>
                    <td>${gv.TienMoiGiang ? formatCurrency(gv.TienMoiGiang) : formatCurrency(100000)}</td>
                    <td>${formatSoTiet(gv.SoTiet)}</td>
                    <td>${formatCurrency(gv.ThanhTien)}</td>
                    <td>${formatCurrency(gv.Thue || (parseFloat(gv.ThanhTien) || 0) * 0.1)}</td>
                    <td>${formatCurrency(gv.ThucNhan)}</td>
                    <td class="contract-tcduyet-cell-hedaotao">
                        ${teacherStatus}
                    </td>
                    <td class="contract-status-cell-hedaotao" data-teacher="${encodeURIComponent(gv.HoTen)}" data-hedaotao="${heDaoTao.he_dao_tao}">
                        Đang tải...
                    </td>
                    <td class="action-col">
                        <button class="btn btn-sm btn-info me-1" onclick="viewTeacherDetailInHeDaoTao('${encodeURIComponent(gv.HoTen)}', '${heDaoTao.he_dao_tao}')">
                            Xem chi tiết
                        </button>
                        <button class="btn btn-sm btn-success" onclick="previewContractInHeDaoTao('${encodeURIComponent(gv.HoTen)}', ${heDaoTao.he_dao_tao || 0}, '${encodeURIComponent(heDaoTaoName)}')">
                            Xem trước HĐ
                        </button>
                    </td>
                </tr>
            `);
            tbody.append(teacherRow);
        });

        container.append(groupContainer);
    });

    // Update total display
    const totalElement = document.getElementById("totalHeDaoTao");
    if (totalElement) {
        totalElement.innerHTML = `
            <div class="row">
                <div class="col-md-3">Tổng số tiết QC: ${formatSoTiet(totalSoTiet)}</div>
                <div class="col-md-3">Tổng số tiền: ${formatCurrency(totalThanhTien)}</div>
                <div class="col-md-3">Tổng trừ thuế: ${formatCurrency(totalThue)}</div>
                <div class="col-md-3">Tổng thực nhận: ${formatCurrency(totalThucNhan)}</div>
            </div>
        `;
    }

    // Display quota information
    const chuaNghiHuu = window.SoTietDinhMucChuaNghiHuu || SoTietDinhMuc || 280;
    const daNghiHuu = window.SoTietDinhMucDaNghiHuu || 560;
    $('#quotaInfo').html(`
        <div class="alert alert-info">
            <strong>Định mức giảng dạy:</strong><br>
            • Giảng viên chưa nghỉ hưu: <strong>${chuaNghiHuu}</strong> tiết/năm<br>
            • Giảng viên đã nghỉ hưu: <strong>${daNghiHuu}</strong> tiết/năm
        </div>
    `);

    // Show training program results
    $('#heDaoTaoResultsDiv').show();

    // Apply action column visibility
    showActionColumnsHeDaoTao();

    // Update contract status for teachers in heDaoTao view
    updateContractStatusForTeachersHeDaoTao();
}
