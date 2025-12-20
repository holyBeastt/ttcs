/**
 * hien-thi-bang-2.js
 * Phan 2: Xu ly hien thi bang theo giang vien va chi tiet he dao tao
 */

/**
 * Xem chi tiet he dao tao trong modal
 * @param {number} heDaoTaoId - ID he dao tao
 * @param {string} heDaoTaoName - Ten he dao tao
 */
function viewHeDaoTaoDetail(heDaoTaoId, heDaoTaoName) {
    const enhancedData = window.heDaoTaoDetailData || [];
    const heDaoTaoData = enhancedData.find(item => parseInt(item.id) === parseInt(heDaoTaoId));

    if (!heDaoTaoData || !heDaoTaoData.chiTietGiangVien || heDaoTaoData.chiTietGiangVien.length === 0) {
        showError('Không tìm thấy thông tin chi tiết giảng viên cho hệ đào tạo này');
        return;
    }

    let tableRows = '';
    heDaoTaoData.chiTietGiangVien.forEach((gv, index) => {
        tableRows += `<tr>
      <td>${index + 1}</td>
      <td>${gv.GioiTinh && gv.GioiTinh.toLowerCase() === "nam" ? "Ông" : "Bà"}</td>
      <td><strong>${gv.HoTen}</strong></td>
      <td>${gv.TenPhongBan || 'N/A'}</td>
      <td>${gv.HocVi || 'N/A'}</td>
      <td>${gv.TienMoiGiang ? formatCurrency(gv.TienMoiGiang) : 'N/A'}</td>
      <td>${formatSoTiet(gv.SoTiet)}</td>
      <td>${formatCurrency(gv.ThanhTien)}</td>
      <td>${formatCurrency(gv.ThucNhan)}</td>
      <td><small>${gv.Email ? `📧 ${gv.Email}<br>` : ''}${gv.DienThoai ? `📞 ${gv.DienThoai}` : ''}</small></td>
    </tr>`;
    });

    const modalHtml = `
    <div class="modal fade" id="heDaoTaoDetailModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-xl"><div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Chi tiết Hệ đào tạo: ${heDaoTaoName || heDaoTaoData.tenHe}</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3"><h6 class="text-primary">Thông tin tổng quan</h6>
            <div class="row">
              <div class="col-md-3"><strong>Số giảng viên:</strong> ${heDaoTaoData.chiTietGiangVien.length}</div>
              <div class="col-md-3"><strong>Tổng số tiết:</strong> ${heDaoTaoData.SoTiet}</div>
              <div class="col-md-3"><strong>Số tiền:</strong> ${formatCurrency(heDaoTaoData.ThanhTien)}</div>
              <div class="col-md-3"><strong>Thực nhận:</strong> ${formatCurrency(heDaoTaoData.ThucNhan)}</div>
            </div>
          </div>
          <h6 class="text-primary border-bottom pb-2">Danh sách giảng viên</h6>
          <div class="table-responsive"><table class="table table-striped table-sm">
            <thead class="table-dark"><tr>
              <th>STT</th><th>Danh xưng</th><th>Họ tên</th><th>Khoa</th><th>Học hàm, học vị</th>
              <th>Tiền/Tiết</th><th>Số tiết</th><th>Số tiền</th><th>Thực nhận</th><th>Liên hệ</th>
            </tr></thead>
            <tbody>${tableRows}</tbody>
          </table></div>
        </div>
        <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Đóng</button></div>
      </div></div>
    </div>`;

    $('#heDaoTaoDetailModal').remove();
    $('body').append(modalHtml);
    const modal = new bootstrap.Modal($('#heDaoTaoDetailModal')[0]);
    modal.show();
    $('#heDaoTaoDetailModal').on('hidden.bs.modal', function () { $(this).remove(); });
}

/**
 * Xem chi tiet giang vien trong he dao tao
 */
function viewTeacherDetailInHeDaoTao(teacherName, heDaoTaoId, heDaoTaoName) {
    const decodedTeacherName = decodeURIComponent(teacherName);
    const heDaoTaoData = window.heDaoTaoDetailData.find(item => parseInt(item.id) === parseInt(heDaoTaoId));

    if (!heDaoTaoData || !heDaoTaoData.chiTietGiangVien) {
        showError('Không tìm thấy thông tin hệ đào tạo');
        return;
    }

    const teacherData = heDaoTaoData.chiTietGiangVien.find(gv => gv.GiangVien === decodedTeacherName);
    if (!teacherData) {
        showError('Không tìm thấy thông tin giảng viên');
        return;
    }

    const formattedTeacherData = {
        GiangVien: teacherData.GiangVien, NgaySinh: teacherData.NgaySinh, CCCD: teacherData.CCCD,
        NgayCapCCCD: teacherData.NgayCapCCCD, NoiCapCCCD: teacherData.NoiCapCCCD, HocVi: teacherData.HocVi,
        ChucVu: teacherData.ChucVu, DienThoai: teacherData.DienThoai, Email: teacherData.Email,
        TienMoiGiang: teacherData.TienMoiGiang, ThanhTien: teacherData.ThanhTien, Thue: teacherData.Thue,
        ThucNhan: teacherData.ThucNhan, STK: teacherData.STK, NganHang: teacherData.NganHang,
        MaSoThue: teacherData.MaSoThue, NgayBatDau: teacherData.NgayBatDau, NgayKetThuc: teacherData.NgayKetThuc,
        DiaChi: teacherData.DiaChi, NoiCongTac: teacherData.NoiCongTac, MonGiangDayChinh: teacherData.MonGiangDayChinh,
        MaPhongBan: teacherData.MaPhongBan || teacherData.TenPhongBan, SoHopDong: teacherData.SoHopDong,
        TongTiet: teacherData.TongTiet || teacherData.SoTiet, loaiHopDong: heDaoTaoName,
        GioiTinh: teacherData.GioiTinh || 'Nam'
    };

    window.teacherDetailData[decodedTeacherName] = formattedTeacherData;
    viewTeacherDetail(encodeURIComponent(decodedTeacherName));
}

/**
 * Hien thi du lieu hop dong theo giang vien
 */
function displayContractDataInSeparateTables(groupedByTeacher, enhancedGroupedByTeacher, SoTietDinhMuc, serverTotals) {
    window.SoTietDinhMucChuaNghiHuu = window.currentResponse?.SoTietDinhMucChuaNghiHuu || SoTietDinhMuc || 280;
    window.SoTietDinhMucDaNghiHuu = window.currentResponse?.SoTietDinhMucDaNghiHuu || 560;

    hideAllTables();
    const summaryTbody = $('#summaryTableBody');
    summaryTbody.empty();

    if (Object.keys(groupedByTeacher).length === 0) {
        summaryTbody.append('<tr><td colspan="10" class="text-center text-muted"><i class="fas fa-inbox"></i> Không có dữ liệu để hiển thị</td></tr>');
        $('#resultsDiv').show();
        return;
    }

    let totalQC = serverTotals?.totalQC || 0;
    let totalThanhTienAll = serverTotals?.totalThanhTienAll || 0;
    let totalThueAll = serverTotals?.totalThueAll || 0;
    let totalThucNhanAll = serverTotals?.totalThucNhanAll || 0;
    let rowIndex = 1;

    window.teacherDetailData = {};
    window.enhancedTeacherData = enhancedGroupedByTeacher || {};
    window.teacherTableData = [];

    const getApprovalStatus = (taiChinhDuyet) => taiChinhDuyet == 1 ? 'Đã duyệt' : 'Chưa duyệt';

    Object.keys(groupedByTeacher).forEach((teacherName) => {
        const courses = groupedByTeacher[teacherName];
        const teacherData = courses[0];
        const enhancedData = enhancedGroupedByTeacher ? enhancedGroupedByTeacher[teacherName] : null;
        const teacherInfo = enhancedData?.teacherInfo || teacherData;
        const totalTeacherHours = courses.reduce((total, course) => total + (parseFloat(course.SoTiet) || 0), 0);

        if (!serverTotals) totalQC += totalTeacherHours;

        let totalThanhTien, totalThue, totalThucNhan;
        if (enhancedData?.totalFinancials) {
            totalThanhTien = enhancedData.totalFinancials.totalThanhTien;
            totalThue = enhancedData.totalFinancials.totalThue;
            totalThucNhan = enhancedData.totalFinancials.totalThucNhan;
        } else {
            totalThanhTien = teacherData.ThanhTien || 0;
            totalThue = teacherData.Thue || 0;
            totalThucNhan = teacherData.ThucNhan || 0;
        }

        if (!serverTotals) {
            totalThanhTienAll += parseFloat(totalThanhTien) || 0;
            totalThueAll += parseFloat(totalThue) || 0;
            totalThucNhanAll += parseFloat(totalThucNhan) || 0;
        }

        const mergedData = {
            STT: rowIndex, TongTiet: totalTeacherHours, TongSoTiet: totalTeacherHours,
            NgayBatDau: teacherData.NgayBatDau, NgayKetThuc: teacherData.NgayKetThuc,
            GioiTinh: teacherData.GioiTinh || 'Nam', GiangVien: teacherName,
            TienMoiGiang: teacherData.TienMoiGiang || 0, ThanhTien: totalThanhTien,
            Thue: totalThue, ThucNhan: totalThucNhan, NgaySinh: teacherData.NgaySinh,
            CCCD: teacherData.CCCD, NgayCapCCCD: teacherData.NgayCapCCCD, NoiCapCCCD: teacherData.NoiCapCCCD,
            HocVi: teacherData.HocVi, ChucVu: teacherData.ChucVu, HSL: teacherData.HSL || 1.0,
            DienThoai: teacherData.DienThoai, Email: teacherData.Email, STK: teacherData.STK,
            NganHang: teacherData.NganHang, MaSoThue: teacherData.MaSoThue, DiaChi: teacherData.DiaChi,
            NoiCongTac: teacherData.NoiCongTac, MonGiangDayChinh: teacherData.MonGiangDayChinh,
            SoHopDong: teacherData.SoHopDong, loaiHopDong: teacherData.he_dao_tao || $('#loaiHopDong').val(),
            MaPhongBan: teacherData.MaPhongBan || teacherData.TenPhongBan, TenPhongBan: teacherData.TenPhongBan,
            isNghiHuu: teacherInfo.isNghiHuu, trainingPrograms: enhancedData?.trainingPrograms || [],
            hasEnhancedData: !!enhancedData,
            TaiChinhDuyet: enhancedData?.trainingPrograms?.[0]?.TaiChinhDuyet || teacherData.TaiChinhDuyet || 0,
            Dot: $('#combobox-dot').val(), Ki: $('#comboboxki').val(), NamHoc: $('#NamHoc').val()
        };

        window.teacherDetailData[teacherName] = mergedData;
        window.teacherTableData.push(mergedData);

        const hasContract = mergedData.SoHopDong && mergedData.SoHopDong.trim() !== '';
        const isNghiHuu = mergedData.isNghiHuu == 1;
        const dinhMucGV = isNghiHuu ? window.SoTietDinhMucDaNghiHuu : window.SoTietDinhMucChuaNghiHuu;
        const displayTeacherName = isNghiHuu ? `${mergedData.GiangVien} (Đã nghỉ hưu)` : mergedData.GiangVien;
        const shouldHighlight = (parseFloat(mergedData.TongSoTiet) || 0) > dinhMucGV;

        const tienTiet = (() => {
            if (enhancedData?.trainingPrograms?.length > 1) return 'Xem ở chi tiết';
            if (enhancedData?.trainingPrograms?.length === 1) return formatCurrency(enhancedData.trainingPrograms[0].TienMoiGiang);
            if (mergedData.TienMoiGiang > 0) return formatCurrency(mergedData.TienMoiGiang);
            return 'N/A';
        })();

        summaryTbody.append(`
      <tr ${shouldHighlight ? 'class="alert-sotiet"' : ''}>
        <td>${rowIndex}</td>
        <td>${mergedData.GioiTinh.toLowerCase() == "nam" ? "Ông" : "Bà"}</td>
        <td>${displayTeacherName}</td>
        <td>${mergedData.MaPhongBan || 'Chưa xác định'}</td>
        <td>${mergedData.HocVi || 'N/A'}</td>
        <td>${tienTiet}</td>
        <td>${formatSoTiet(mergedData.TongTiet)}</td>
        <td>${formatCurrency(mergedData.ThanhTien)}</td>
        <td>${formatCurrency(mergedData.Thue)}</td>
        <td>${formatCurrency(mergedData.ThucNhan)}</td>
        <td class="contract-tcduyet-cell">${getApprovalStatus(mergedData.TaiChinhDuyet)}</td>
        <td class="contract-status-cell" data-teacher="${encodeURIComponent(teacherName)}">Đang tải...</td>
        <td class="action-col">
          <button class="btn btn-sm btn-info me-1" onclick="viewTeacherDetail('${encodeURIComponent(teacherName)}')">Xem chi tiết</button>
          <button class="btn btn-sm btn-success me-1" onclick="previewContract('${encodeURIComponent(teacherName)}')">Xem trước HĐ</button>
          ${hasContract ? `<button class="btn btn-sm btn-secondary" onclick="editContract('${mergedData.SoHopDong}')">Sửa</button>` : ''}
        </td>
      </tr>
    `);
        rowIndex++;
    });

    updateTeacherTotals(serverTotals, totalQC, totalThanhTienAll, totalThueAll, totalThucNhanAll);
    displayQuotaInfo(SoTietDinhMuc);
    $('#resultsDiv').show();
    checkUserPermissions();
    loadContractStatusForTeachers();
}

// Cap nhat tong theo giang vien
function updateTeacherTotals(serverTotals, totalQC, totalThanhTienAll, totalThueAll, totalThucNhanAll) {
    const totalElement = document.getElementById("totalQC");
    if (!totalElement) return;

    let totalHtml = '';
    if (serverTotals?.DTPH) {
        totalHtml += `<div class="row mb-2" style="background-color: #1976d2; color: white; padding: 12px; border-radius: 5px; font-weight: bold; border: 2px solid #1565c0;">
      <div class="col-12" style="font-size: 18px; margin-bottom: 8px;"><strong>🏢 TỔNG ĐTPH:</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Số tiết QC: <strong>${formatSoTiet(serverTotals.DTPH.totalSoTiet)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thành tiền: <strong>${formatCurrency(serverTotals.DTPH.totalThanhTien)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thuế: <strong>${formatCurrency(serverTotals.DTPH.totalThue)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thực nhận: <strong>${formatCurrency(serverTotals.DTPH.totalThucNhan)}</strong></div>
    </div>`;
    }
    if (serverTotals?.MIEN_BAC) {
        totalHtml += `<div class="row mb-2" style="background-color: #f57c00; color: white; padding: 12px; border-radius: 5px; font-weight: bold; border: 2px solid #ef6c00;">
      <div class="col-12" style="font-size: 18px; margin-bottom: 8px;"><strong>🌏 TỔNG MIỀN BẮC:</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Số tiết QC: <strong>${formatSoTiet(serverTotals.MIEN_BAC.totalSoTiet)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thành tiền: <strong>${formatCurrency(serverTotals.MIEN_BAC.totalThanhTien)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thuế: <strong>${formatCurrency(serverTotals.MIEN_BAC.totalThue)}</strong></div>
      <div class="col-md-3" style="font-size: 16px;">Thực nhận: <strong>${formatCurrency(serverTotals.MIEN_BAC.totalThucNhan)}</strong></div>
    </div>`;
    }
    if (serverTotals?.TONG_CHUNG) {
        totalHtml += `<div class="row" style="background-color: #388e3c; color: white; padding: 15px; border-radius: 5px; font-weight: bold; border: 3px solid #2e7d32;">
      <div class="col-12" style="font-size: 20px; margin-bottom: 10px;"><strong>📊 TỔNG CHUNG:</strong></div>
      <div class="col-md-3" style="font-size: 17px;">Số tiết QC: <strong>${formatSoTiet(serverTotals.TONG_CHUNG.totalSoTiet)}</strong></div>
      <div class="col-md-3" style="font-size: 17px;">Thành tiền: <strong>${formatCurrency(serverTotals.TONG_CHUNG.totalThanhTien)}</strong></div>
      <div class="col-md-3" style="font-size: 17px;">Thuế: <strong>${formatCurrency(serverTotals.TONG_CHUNG.totalThue)}</strong></div>
      <div class="col-md-3" style="font-size: 17px;">Thực nhận: <strong>${formatCurrency(serverTotals.TONG_CHUNG.totalThucNhan)}</strong></div>
    </div>`;
    } else {
        totalHtml = `<div class="row">
      <div class="col-md-3">Tổng số tiết QC: ${formatSoTiet(totalQC)}</div>
      <div class="col-md-3">Tổng số tiền: ${formatCurrency(totalThanhTienAll)}</div>
      <div class="col-md-3">Tổng trừ thuế: ${formatCurrency(totalThueAll)}</div>
      <div class="col-md-3">Tổng thực nhận: ${formatCurrency(totalThucNhanAll)}</div>
    </div>`;
    }
    totalElement.innerHTML = totalHtml;
}
