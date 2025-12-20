/**
 * hien-thi-bang.js
 * Xu ly hien thi du lieu trong cac bang: theo giang vien va theo he dao tao
 */

/**
 * Hien thi du lieu theo he dao tao
 * @param {Array} data - Du lieu he dao tao
 * @param {Array} enhancedData - Du lieu mo rong voi chi tiet giang vien
 * @param {number} SoTietDinhMuc - Dinh muc so tiet
 * @param {Object} serverTotals - Tong da tinh toan tu server
 */
function displayHeDaoTaoData(data, enhancedData, SoTietDinhMuc, serverTotals) {
    console.log("server total = ", serverTotals);

    window.SoTietDinhMucChuaNghiHuu = window.currentResponse?.SoTietDinhMucChuaNghiHuu || SoTietDinhMuc || 280;
    window.SoTietDinhMucDaNghiHuu = window.currentResponse?.SoTietDinhMucDaNghiHuu || 560;

    hideAllTables();

    const container = $('#heDaoTaoGroupedContainer');
    container.empty();

    if (!enhancedData || enhancedData.length === 0) {
        container.append('<div class="text-center py-4"><h5 class="text-muted">Không có dữ liệu hệ đào tạo để hiển thị</h5></div>');
        $('#heDaoTaoResultsDiv').show();
        return;
    }

    let totalSoTiet = serverTotals?.totalSoTietHeDaoTao || 0;
    let totalThanhTien = serverTotals?.totalThanhTienHeDaoTao || 0;
    let totalThue = serverTotals?.totalThueHeDaoTao || 0;
    let totalThucNhan = serverTotals?.totalThucNhanHeDaoTao || 0;
    let totalGiangVien = 0;

    window.heDaoTaoDetailData = enhancedData || [];

    const getApprovalStatus = (taiChinhDuyet) => taiChinhDuyet == 1 ? 'Đã duyệt' : 'Chưa duyệt';

    enhancedData.forEach((heDaoTao, groupIndex) => {
        const giangVienList = heDaoTao.chiTietGiangVien || [];

        if (!serverTotals) {
            totalSoTiet += parseFloat(heDaoTao.SoTiet) || 0;
            totalThanhTien += parseFloat(heDaoTao.ThanhTien) || 0;
            totalThue += parseFloat(heDaoTao.Thue) || 0;
            totalThucNhan += parseFloat(heDaoTao.ThucNhan) || 0;
        }
        totalGiangVien += giangVienList.length;

        // Tinh tong theo phong ban DTPH va khac
        let dtphThanhTien = 0, dtphThucNhan = 0, dtphSoTiet = 0, dtphGiangVien = 0;
        let otherThanhTien = 0, otherThucNhan = 0, otherSoTiet = 0, otherGiangVien = 0;

        giangVienList.forEach(gv => {
            const thanhTien = parseFloat(gv.ThanhTien) || 0;
            const thucNhan = parseFloat(gv.ThucNhan) || 0;
            const soTiet = parseFloat(gv.TongTiet) || parseFloat(gv.SoTiet) || 0;
            const tenPhongBan = (gv.MaPhongBan || gv.TenPhongBan || 'N/A').toString();

            const normalizedName = tenPhongBan.toLowerCase().trim()
                .replace(/\s+/g, ' ')
                .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
                .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
                .replace(/[ìíịỉĩ]/g, 'i')
                .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
                .replace(/[ùúụủũưừứựửữ]/g, 'u')
                .replace(/[ỳýỵỷỹ]/g, 'y')
                .replace(/đ/g, 'd');

            const isDTPH = normalizedName.includes('dtph') || normalizedName.includes('pho thong') ||
                tenPhongBan.toUpperCase().includes('DTPH') || tenPhongBan.includes('ĐTPH');

            if (isDTPH) {
                dtphThanhTien += thanhTien; dtphThucNhan += thucNhan;
                dtphSoTiet += soTiet; dtphGiangVien++;
            } else {
                otherThanhTien += thanhTien; otherThucNhan += thucNhan;
                otherSoTiet += soTiet; otherGiangVien++;
            }
        });

        const groupContainer = createHeDaoTaoGroupHtml(heDaoTao, giangVienList, dtphGiangVien, dtphThanhTien, dtphThucNhan, dtphSoTiet, otherGiangVien, otherThanhTien, otherThucNhan, otherSoTiet, getApprovalStatus);
        container.append(groupContainer);
    });

    updateHeDaoTaoTotals(serverTotals, totalSoTiet, totalThanhTien, totalThue, totalThucNhan);
    displayQuotaInfo(SoTietDinhMuc);
    $('#heDaoTaoResultsDiv').show();
    checkUserPermissions();
    loadContractStatusForHeDaoTao();
}

// Ham phu tro tao HTML cho nhom he dao tao
function createHeDaoTaoGroupHtml(heDaoTao, giangVienList, dtphGiangVien, dtphThanhTien, dtphThucNhan, dtphSoTiet, otherGiangVien, otherThanhTien, otherThucNhan, otherSoTiet, getApprovalStatus) {
    const groupContainer = $(`
    <div class="training-program-group">              
      <div class="training-program-header"><i class="fas fa-graduation-cap me-2"></i>${heDaoTao.he_dao_tao}</div>
      <div class="training-program-summary">
        <div class="summary-item"><i class="fas fa-users me-1"></i><span class="summary-value">${giangVienList.length}</span> giảng viên</div>
        <div class="summary-item"><i class="fas fa-clock me-1"></i><span class="summary-value">${formatSoTiet(dtphSoTiet + otherSoTiet)}</span> tiết</div>
        ${dtphGiangVien > 0 ? `<div class="summary-item">ĐTPH (${dtphGiangVien} GV): Tiền <strong>${formatCurrency(dtphThanhTien)}</strong> - Thực nhận <strong>${formatCurrency(dtphThucNhan)}</strong></div>` : ''}
        ${otherGiangVien > 0 ? `<div class="summary-item">Miền bắc (${otherGiangVien} GV): Tiền <strong>${formatCurrency(otherThanhTien)}</strong> - Thực nhận <strong>${formatCurrency(otherThucNhan)}</strong></div>` : ''}
        <div class="summary-item"><i class="fas fa-money-bill-wave me-1"></i>Tổng tiền: <span class="summary-value">${formatCurrency(dtphThanhTien + otherThanhTien)}</span></div>
        <div class="summary-item"><i class="fas fa-hand-holding-usd me-1"></i>Tổng thực nhận: <span class="summary-value">${formatCurrency(dtphThucNhan + otherThucNhan)}</span></div>
      </div>
      <div class="training-program-table"><div class="table-responsive"><div class="over-f">
        <table class="table table-striped table-hover table-bordered">
          <thead class="table-dark"><tr>
            <th class="narrow-col">STT</th><th class="narrow-col">Danh xưng</th><th class="name-col">Họ tên</th>
            <th class="wide-col">Khoa</th><th class="narrow-col">Học hàm, học vị</th><th class="wide-col">Tiền/Tiết</th>
            <th class="narrow-col">Số tiết</th><th class="wide-col">Số tiền</th><th class="narrow-col">Trừ thuế</th>
            <th class="wide-col">Thực nhận</th><th class="status-col">TC Duyệt</th><th class="status-col">Trạng thái</th>
            <th class="action-col">Thao tác</th>
          </tr></thead>
          <tbody></tbody>
        </table>
      </div></div></div>
    </div>
  `);

    const tbody = groupContainer.find('tbody');
    giangVienList.forEach((gv, index) => {
        const isNghiHuu = gv.isNghiHuu == 1;
        const dinhMucGV = isNghiHuu ? window.SoTietDinhMucDaNghiHuu : window.SoTietDinhMucChuaNghiHuu;
        const displayName = isNghiHuu ? `${gv.GiangVien} (Đã nghỉ hưu)` : gv.GiangVien;
        const rowClass = (parseFloat(gv.TongTiet) || parseFloat(gv.SoTiet) || 0) > dinhMucGV ? 'alert-sotiet' : '';

        tbody.append(`
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td>${gv.GioiTinh && gv.GioiTinh.toLowerCase() === "nam" ? "Ông" : "Bà"}</td>
        <td><strong>${displayName}</strong></td>
        <td>${gv.MaPhongBan || gv.TenPhongBan || 'N/A'}</td>
        <td>${gv.HocVi || 'N/A'}</td>
        <td>${gv.TienMoiGiang ? formatCurrency(gv.TienMoiGiang) : 'N/A'}</td>
        <td>${formatSoTiet(gv.TongTiet || gv.SoTiet)}</td>
        <td>${formatCurrency(gv.ThanhTien)}</td>
        <td>${formatCurrency(gv.Thue || (parseFloat(gv.ThanhTien) || 0) * 0.1)}</td>
        <td>${formatCurrency(gv.ThucNhan)}</td>
        <td class="contract-tcduyet-cell-hedaotao">${getApprovalStatus(gv.TaiChinhDuyet)}</td>
        <td class="contract-status-cell-hedaotao" data-teacher="${encodeURIComponent(gv.GiangVien)}" data-hedaotao="${heDaoTao.id}">Đang tải...</td>
        <td class="action-col">
          <button class="btn btn-sm btn-info me-1" onclick="viewTeacherDetailInHeDaoTao('${encodeURIComponent(gv.GiangVien)}', ${heDaoTao.id}, '${heDaoTao.he_dao_tao}')">Xem chi tiết</button>
          <button class="btn btn-sm btn-success" onclick="previewContractInHeDaoTao('${encodeURIComponent(gv.GiangVien)}', ${heDaoTao.id}, '${heDaoTao.he_dao_tao}')">Xem trước HĐ</button>
        </td>
      </tr>
    `);
    });

    return groupContainer;
}

// Hien thi thong tin dinh muc
function displayQuotaInfo(SoTietDinhMuc) {
    if (SoTietDinhMuc > 0) {
        const chuaNghiHuu = window.SoTietDinhMucChuaNghiHuu || SoTietDinhMuc || 280;
        const daNghiHuu = window.SoTietDinhMucDaNghiHuu || 560;
        $('#quotaInfo').html(`<div class="alert alert-info mb-2" style="padding: 10px 15px;">
      <strong>Định mức giảng dạy:</strong> Chưa nghỉ hưu: <strong>${chuaNghiHuu}</strong> tiết/năm | Đã nghỉ hưu: <strong>${daNghiHuu}</strong> tiết/năm
    </div>`);
    }
}

// Cap nhat tong he dao tao
function updateHeDaoTaoTotals(serverTotals, totalSoTiet, totalThanhTien, totalThue, totalThucNhan) {
    const totalElement = document.getElementById("totalHeDaoTao");
    if (!totalElement) return;

    let totalHtml = '';
    if (serverTotals?.DTPH) {
        totalHtml += `<div class="row mb-2" style="background-color: #1976d2; color: white; padding: 12px; border-radius: 5px; font-weight: bold; border: 2px solid #1565c0;">
      <div class="col-12" style="font-size: 18px; margin-bottom: 8px;"><strong>🏢 TỔNG ĐTPH:</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Số tiết: <strong>${formatSoTiet(serverTotals.DTPH.totalSoTietHeDaoTao)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thành tiền: <strong>${formatCurrency(serverTotals.DTPH.totalThanhTienHeDaoTao)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thuế: <strong>${formatCurrency(serverTotals.DTPH.totalThueHeDaoTao)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thực nhận: <strong>${formatCurrency(serverTotals.DTPH.totalThucNhanHeDaoTao)}</strong></div>
    </div>`;
    }
    if (serverTotals?.MIEN_BAC) {
        totalHtml += `<div class="row mb-2" style="background-color: #f57c00; color: white; padding: 12px; border-radius: 5px; font-weight: bold; border: 2px solid #ef6c00;">
      <div class="col-12" style="font-size: 18px; margin-bottom: 8px;"><strong>🌏 TỔNG MIỀN BẮC:</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Số tiết: <strong>${formatSoTiet(serverTotals.MIEN_BAC.totalSoTietHeDaoTao)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thành tiền: <strong>${formatCurrency(serverTotals.MIEN_BAC.totalThanhTienHeDaoTao)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thuế: <strong>${formatCurrency(serverTotals.MIEN_BAC.totalThueHeDaoTao)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thực nhận: <strong>${formatCurrency(serverTotals.MIEN_BAC.totalThucNhanHeDaoTao)}</strong></div>
    </div>`;
    }
    if (serverTotals?.TONG_CHUNG) {
        totalHtml += `<div class="row" style="background-color: #388e3c; color: white; padding: 15px; border-radius: 5px; font-weight: bold; border: 3px solid #2e7d32;">
      <div class="col-12" style="font-size: 20px; margin-bottom: 10px;"><strong>📊 TỔNG CHUNG:</strong></div>
      <div class="col-md-3" style="font-size: 17px;">Số tiết: <strong>${formatSoTiet(serverTotals.TONG_CHUNG.totalSoTietHeDaoTao)}</strong></div>
      <div class="col-md-3" style="font-size: 17px;">Thành tiền: <strong>${formatCurrency(serverTotals.TONG_CHUNG.totalThanhTienHeDaoTao)}</strong></div>
      <div class="col-md-3" style="font-size: 17px;">Thuế: <strong>${formatCurrency(serverTotals.TONG_CHUNG.totalThueHeDaoTao)}</strong></div>
      <div class="col-md-3" style="font-size: 17px;">Thực nhận: <strong>${formatCurrency(serverTotals.TONG_CHUNG.totalThucNhanHeDaoTao)}</strong></div>
    </div>`;
    } else {
        totalHtml = `<div class="row">
      <div class="col-md-3">Tổng số tiết: ${formatSoTiet(totalSoTiet)}</div>
      <div class="col-md-3">Tổng số tiền: ${formatCurrency(totalThanhTien)}</div>
      <div class="col-md-3">Tổng trừ thuế: ${formatCurrency(totalThue)}</div>
      <div class="col-md-3">Tổng thực nhận: ${formatCurrency(totalThucNhan)}</div>
    </div>`;
    }
    totalElement.innerHTML = totalHtml;
}
