/**
 * chi-tiet-modal.js
 * Xu ly modal chi tiet giang vien va chuong trinh dao tao
 */

/**
 * Hien thi modal chi tiet giang vien voi thong tin day du
 * @param {string} teacherName - Ten giang vien (da encode URI)
 */
function viewTeacherDetail(teacherName) {
    const decodedName = decodeURIComponent(teacherName);
    const data = window.teacherDetailData[decodedName];
    const enhancedData = window.enhancedTeacherData[decodedName];

    if (!data) {
        showError('Không tìm thấy thông tin chi tiết của giảng viên');
        return;
    }

    // Dien thong tin co ban vao modal
    $('#modal-hoten').text(data.GiangVien);
    $('#modal-ngaysinh').text(data.NgaySinh ? new Date(data.NgaySinh).toLocaleDateString("vi-VN") : 'Chưa có thông tin');
    $('#modal-cccd').text(data.CCCD || 'Chưa có thông tin');
    $('#modal-ngaycap').text(data.NgayCapCCCD ? new Date(data.NgayCapCCCD).toLocaleDateString("vi-VN") : 'Chưa có thông tin');
    $('#modal-noicapcccd').text(data.NoiCapCCCD || 'Chưa có thông tin');
    $('#modal-hocvi').text(data.HocVi || 'Chưa có thông tin');
    $('#modal-chucvu').text(data.ChucVu || 'Chưa có thông tin');
    $('#modal-dienthoai').text(data.DienThoai || 'Chưa có thông tin');
    $('#modal-email').text(data.Email || 'Chưa có thông tin');

    // Thong tin tai chinh tong hop
    $('#modal-tienmoigiang').text(data.loaiHopDong === "AllHe" ? "Tùy hệ" : formatCurrency(data.TienMoiGiang));
    $('#modal-thanhtien').text(formatCurrency(data.ThanhTien));
    $('#modal-thue').text(formatCurrency(data.Thue));
    $('#modal-thucnhan').text(formatCurrency(data.ThucNhan));
    $('#modal-stk').text(data.STK || 'Chưa có thông tin');
    $('#modal-nganhang').text(data.NganHang || 'Chưa có thông tin');
    $('#modal-masothue').text(data.MaSoThue || 'Chưa có thông tin');

    // Thong tin bo sung
    $('#modal-ngayky').text(data.NgayBatDau ? new Date(data.NgayBatDau).toLocaleDateString("vi-VN") : 'Chưa có thông tin');
    $('#modal-ngaythanhly').text(data.NgayKetThuc ? new Date(data.NgayKetThuc).toLocaleDateString("vi-VN") : 'Chưa có thông tin');
    $('#modal-diachi').text(data.DiaChi || 'Chưa có thông tin');
    $('#modal-noicongtac').text(data.NoiCongTac || 'Chưa có thông tin');
    $('#modal-bomon').text(data.MonGiangDayChinh || 'Chưa có thông tin');
    $('#modal-khoa').text(data.MaPhongBan || 'Chưa xác định');

    // Thong tin hop dong
    const hasContract = data.SoHopDong && data.SoHopDong.trim() !== '';
    const contractStatus = hasContract ?
        '<span class="badge bg-success">Đã có hợp đồng</span>' :
        '<span class="badge bg-warning">Chưa có hợp đồng</span>';
    $('#modal-trangthai').html(contractStatus);
    $('#modal-sohopdong').text(data.SoHopDong || 'Chưa có');
    $('#modal-tongtiet').text(formatSoTiet(data.TongTiet));
    $('#modal-loaihopdong').text(data.loaiHopDong || 'Chưa xác định');

    // Hien thi chi tiet theo chuong trinh dao tao neu co
    displayTrainingProgramBreakdown(enhancedData, data);

    // Hien thi/an cac nut hanh dong theo trang thai hop dong
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

    // Hien thi modal - xu ly modal instance hien co
    const modalElement = $('#detailModal')[0];
    let modal = bootstrap.Modal.getInstance(modalElement);

    if (modal) {
        modal.dispose();
    }

    modal = new bootstrap.Modal(modalElement);
    modal.show();
}

/**
 * Hien thi chi tiet tai chinh theo chuong trinh dao tao
 * @param {Object} enhancedData - Du lieu mo rong voi thong tin chuong trinh dao tao
 * @param {Object} fallbackData - Du lieu du phong khi khong co du lieu mo rong
 */
function displayTrainingProgramBreakdown(enhancedData, fallbackData) {
    const breakdownContainer = $('#modal-training-breakdown');

    if (!breakdownContainer.length) {
        // Tao container neu chua ton tai
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
                <th>Thực nhận </th>
              </tr>
            </thead>
            <tbody>
      `;

        enhancedData.trainingPrograms.forEach(program => {
            tableHtml += `
          <tr>
            <td><strong>${program.tenHe}</strong></td>
            <td>${formatSoTiet(program.SoTiet)}</td>
            <td>${formatCurrency(program.TienMoiGiang)}</td>
            <td>${formatCurrency(program.ThanhTien)}</td>
            <td>${formatCurrency(program.Thue)}</td>
            <td>${formatCurrency(program.ThucNhan)}</td>
          </tr>
        `;
        });

        // Them dong tong cong
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
        // Du phong: hien thi tom tat khi khong co du lieu chi tiet
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
 * Dong modal chi tiet
 */
function closeModal() {
    const modalElement = $('#detailModal')[0];
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
}
