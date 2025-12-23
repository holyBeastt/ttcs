/**
 * chi-tiet-modal.js
 * Các hàm hiển thị modal chi tiết giảng viên cho trang duyệt hợp đồng đồ án
 */

/**
 * Xem chi tiết giảng viên từ bảng theo giảng viên
 * @param {string} teacherName - Tên giảng viên đã encode
 */
function viewTeacherDetail(teacherName) {
    const decodedName = decodeURIComponent(teacherName);
    const data = window.teacherDetailData[decodedName];
    const enhancedData = window.enhancedTeacherData[decodedName];

    if (!data) {
        showError('Không tìm thấy thông tin chi tiết của giảng viên');
        return;
    }

    // Populate modal with basic data
    $('#modal-hoten').text(data.GiangVien);
    $('#modal-ngaysinh').text(data.NgaySinh ? new Date(data.NgaySinh).toLocaleDateString("vi-VN") : 'Chưa có thông tin');
    $('#modal-cccd').text(data.CCCD || 'Chưa có thông tin');
    $('#modal-noicapcccd').text(data.NoiCapCCCD || 'Chưa có thông tin');
    $('#modal-ngaycap').text(data.NgayCapCCCD ? new Date(data.NgayCapCCCD).toLocaleDateString("vi-VN") : 'Chưa có thông tin');
    $('#modal-hocvi').text(data.HocVi || 'Chưa có thông tin');
    $('#modal-chucvu').text(data.ChucVu || 'Chưa có thông tin');
    $('#modal-dienthoai').text(data.DienThoai || 'Chưa có thông tin');
    $('#modal-email').text(data.Email || 'Chưa có thông tin');

    // Financial information totals
    $('#modal-tienmoigiang').text(data.loaiHopDong === "AllHe" ? "Tùy hệ" : formatCurrency(data.TienMoiGiang));
    $('#modal-thanhtien').text(formatCurrency(data.ThanhTien));
    $('#modal-thue').text(formatCurrency(data.Thue));
    $('#modal-thucnhan').text(formatCurrency(data.ThucNhan));
    $('#modal-stk').text(data.STK || 'Chưa có thông tin');
    $('#modal-nganhang').text(data.NganHang || 'Chưa có thông tin');
    $('#modal-masothue').text(data.MaSoThue || 'Chưa có thông tin');

    // Additional information
    $('#modal-ngayky').text(data.NgayBatDau ? new Date(data.NgayBatDau).toLocaleDateString("vi-VN") : 'Chưa có thông tin');
    $('#modal-ngaythanhly').text(data.NgayKetThuc ? new Date(data.NgayKetThuc).toLocaleDateString("vi-VN") : 'Chưa có thông tin');
    $('#modal-diachi').text(data.DiaChi || 'Chưa có thông tin');
    $('#modal-noicongtac').text(data.NoiCongTac || 'Chưa có thông tin');
    $('#modal-bomon').text(data.MonGiangDayChinh || 'Chưa có thông tin');
    $('#modal-khoa').text(data.MaPhongBan || 'Chưa xác định');

    // Contract information
    const hasContract = data.SoHopDong && data.SoHopDong.trim() !== '';
    const contractStatus = hasContract ? 'Đã có hợp đồng' : 'Chưa có hợp đồng';
    $('#modal-trangthai').text(contractStatus);
    $('#modal-sohopdong').text(data.SoHopDong || 'Chưa có');
    $('#modal-tongtiet').text(formatSoTiet(data.TongTiet));
    $('#modal-loaihopdong').text(data.loaiHopDong || 'Chưa xác định');

    // Enhanced: Display training program breakdown if available
    displayTrainingProgramBreakdown(enhancedData, data);

    // Show/hide action buttons based on contract status
    if (hasContract) {
        $('#modal-view-contract').show().off('click').on('click', function () {
            viewContract(data.SoHopDong);
        });
        $('#modal-edit-contract').show().off('click').on('click', function () {
            editContract(data.SoHopDong);
        });
    } else {
        $('#modal-view-contract').hide();
        $('#modal-edit-contract').hide();
    }

    // Show modal
    const modalElement = $('#detailModal')[0];
    let modal = bootstrap.Modal.getInstance(modalElement);

    if (modal) {
        modal.dispose();
    }

    modal = new bootstrap.Modal(modalElement);
    modal.show();
}

/**
 * Xem chi tiết giảng viên từ view hệ đào tạo
 * @param {string} teacherName - Tên giảng viên đã encode
 * @param {number} heDaoTaoId - ID hệ đào tạo
 */
function viewTeacherDetailInHeDaoTao(teacherName, heDaoTaoId) {
    const decodedName = decodeURIComponent(teacherName);
    const heDaoTaoName = getHeDaoTaoName(heDaoTaoId);

    // Find teacher in heDaoTaoDetailData
    let teacherData = null;
    for (const he of window.heDaoTaoDetailData) {
        if (parseInt(he.he_dao_tao) === parseInt(heDaoTaoId) && he.chiTietGiangVien) {
            teacherData = he.chiTietGiangVien.find(gv => gv.HoTen === decodedName);
            if (teacherData) break;
        }
    }

    if (!teacherData) {
        showError('Không tìm thấy thông tin chi tiết của giảng viên');
        return;
    }

    // Populate modal with basic data
    $('#modal-hoten').text(teacherData.HoTen);
    $('#modal-ngaysinh').text(teacherData.NgaySinh ? new Date(teacherData.NgaySinh).toLocaleDateString("vi-VN") : 'Chưa có thông tin');
    $('#modal-cccd').text(teacherData.CCCD || 'Chưa có thông tin');
    $('#modal-noicapcccd').text(teacherData.NoiCapCCCD || 'Chưa có thông tin');
    $('#modal-ngaycap').text(teacherData.NgayCapCCCD ? new Date(teacherData.NgayCapCCCD).toLocaleDateString("vi-VN") : 'Chưa có thông tin');
    $('#modal-hocvi').text(teacherData.HocVi || 'Chưa có thông tin');
    $('#modal-chucvu').text(teacherData.ChucVu || 'Chưa có thông tin');
    $('#modal-dienthoai').text(teacherData.DienThoai || 'Chưa có thông tin');
    $('#modal-email').text(teacherData.Email || 'Chưa có thông tin');

    // Financial information
    $('#modal-tienmoigiang').text(formatCurrency(teacherData.TienMoiGiang || 100000));
    $('#modal-thanhtien').text(formatCurrency(teacherData.ThanhTien));
    $('#modal-thue').text(formatCurrency(teacherData.Thue));
    $('#modal-thucnhan').text(formatCurrency(teacherData.ThucNhan));
    $('#modal-stk').text(teacherData.STK || 'Chưa có thông tin');
    $('#modal-nganhang').text(teacherData.NganHang || 'Chưa có thông tin');
    $('#modal-masothue').text(teacherData.MaSoThue || 'Chưa có thông tin');

    // Additional information
    $('#modal-diachi').text(teacherData.DiaChi || 'Chưa có thông tin');
    $('#modal-noicongtac').text(teacherData.NoiCongTac || 'Chưa có thông tin');
    $('#modal-khoa').text(teacherData.TenPhongBan || teacherData.MaPhongBan || 'Chưa xác định');

    // Contract information
    $('#modal-tongtiet').text(formatSoTiet(teacherData.SoTiet));
    $('#modal-loaihopdong').text(heDaoTaoName);

    // Show modal
    const modalElement = $('#detailModal')[0];
    let modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.dispose();
    modal = new bootstrap.Modal(modalElement);
    modal.show();
}

/**
 * Hiển thị chi tiết breakdown theo chương trình đào tạo
 * @param {Object} enhancedData - Dữ liệu enhanced
 * @param {Object} fallbackData - Dữ liệu fallback
 */
function displayTrainingProgramBreakdown(enhancedData, fallbackData) {
    const breakdownContainer = $('#modal-training-breakdown');

    if (!breakdownContainer.length) {
        // If container doesn't exist, create it in the modal
        const breakdownHtml = `
            <div id="modal-training-breakdown" class="mb-4">
                <h6 class="text-primary border-bottom pb-2">Chi tiết theo chương trình đào tạo</h6>
                <div id="training-programs-table"></div>
            </div>
        `;
        $('#modal-content-additional').append(breakdownHtml);
    }

    const tableContainer = $('#training-programs-table');

    if (enhancedData && enhancedData.trainingPrograms && enhancedData.trainingPrograms.length > 0) {
        let tableHtml = `
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Chương trình đào tạo</th>
                            <th>Số tiết</th>
                            <th>Tiền/tiết</th>
                            <th>Số tiền</th>
                            <th>Thuế 10%</th>
                            <th>Thực nhận</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        enhancedData.trainingPrograms.forEach(program => {
            // Map ID sang tên hệ đào tạo
            const heDaoTaoName = getHeDaoTaoName(program.he_dao_tao);
            tableHtml += `
                <tr>
                    <td><strong>${heDaoTaoName}</strong></td>
                    <td>${formatSoTiet(program.SoTiet)}</td>
                    <td>${formatCurrency(program.TienMoiGiang)}</td>
                    <td>${formatCurrency(program.ThanhTien)}</td>
                    <td>${formatCurrency(program.Thue)}</td>
                    <td>${formatCurrency(program.ThucNhan)}</td>
                </tr>
            `;
        });

        // Add totals row
        tableHtml += `
                    <tr class="table-warning">
                        <td><strong>Tổng cộng</strong></td>
                        <td><strong>${formatSoTiet(enhancedData.totalFinancials.totalSoTiet)}</strong></td>
                        <td>-</td>
                        <td><strong>${formatCurrency(enhancedData.totalFinancials.totalThanhTien)}</strong></td>
                        <td><strong>${formatCurrency(enhancedData.totalFinancials.totalThue)}</strong></td>
                        <td><strong>${formatCurrency(enhancedData.totalFinancials.totalThucNhan)}</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>
        `;

        tableContainer.html(tableHtml);
    } else {
        // Fallback: show simple summary when detailed data is not available
        tableContainer.html(`
            <div class="alert alert-info">
                Chi tiết theo chương trình đào tạo không khả dụng. Hiển thị tổng hợp:
                <br><strong>Tổng số tiết:</strong> ${formatSoTiet(fallbackData.TongTiet || 0)}
                <br><strong>Tổng số tiền:</strong> ${formatCurrency(fallbackData.ThanhTien)}
                <br><strong>Tổng thuế:</strong> ${formatCurrency(fallbackData.Thue)}
                <br><strong>Tổng thực nhận:</strong> ${formatCurrency(fallbackData.ThucNhan)}
            </div>
        `);
    }
}

/**
 * Đóng modal
 */
function closeModal() {
    const modalElement = $('#detailModal')[0];
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) modal.hide();
}
