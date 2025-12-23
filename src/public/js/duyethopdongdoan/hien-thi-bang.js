/**
 * hien-thi-bang.js
 * Hàm hiển thị bảng dữ liệu theo giảng viên cho trang duyệt hợp đồng đồ án
 */

/**
 * Hiển thị dữ liệu hợp đồng trong bảng theo giảng viên
 * @param {Object} groupedByTeacher - Dữ liệu nhóm theo giảng viên
 * @param {Object} enhancedGroupedByTeacher - Dữ liệu enhanced
 * @param {number} SoTietDinhMuc - Số tiết định mức
 */
function displayContractDataInSeparateTables(groupedByTeacher, enhancedGroupedByTeacher, SoTietDinhMuc) {
    // Lưu biến global
    window.SoTietDinhMucChuaNghiHuu = window.currentResponse?.SoTietDinhMucChuaNghiHuu || SoTietDinhMuc || 280;
    window.SoTietDinhMucDaNghiHuu = window.currentResponse?.SoTietDinhMucDaNghiHuu || 560;

    // Hide training program table and show only teacher table
    hideAllTables();

    // Clear table body
    const summaryTbody = $('#summaryTableBody');
    summaryTbody.empty();

    if (Object.keys(groupedByTeacher).length === 0) {
        const noDataRow = `
            <tr>
                <td colspan="13" class="text-center text-muted">
                    <i class="fas fa-inbox"></i> Không có dữ liệu để hiển thị
                </td>
            </tr>
        `;
        summaryTbody.append(noDataRow);
        $('#resultsDiv').show();
        showActionColumns();
        return;
    }

    let totalQC = 0;
    let totalThanhTienAll = 0;
    let totalThueAll = 0;
    let totalThucNhanAll = 0;
    let rowIndex = 1;

    // Store enhanced data globally for modal access
    window.teacherDetailData = {};
    window.enhancedTeacherData = enhancedGroupedByTeacher || {};

    // Clear and initialize teacher table data array
    window.teacherTableData = [];

    // Convert grouped data to flat array
    Object.keys(groupedByTeacher).forEach((teacherName) => {
        const courses = groupedByTeacher[teacherName];
        const teacherData = courses[0];
        const enhancedData = enhancedGroupedByTeacher ? enhancedGroupedByTeacher[teacherName] : null;

        // Calculate total hours for this teacher
        const totalTeacherHours = courses.reduce((total, course) => total + (parseFloat(course.SoTiet) || 0), 0);
        totalQC += totalTeacherHours;

        // Use enhanced financial data if available
        let totalThanhTien, totalThue, totalThucNhan;

        if (enhancedData && enhancedData.totalFinancials) {
            totalThanhTien = enhancedData.totalFinancials.totalThanhTien;
            totalThue = enhancedData.totalFinancials.totalThue;
            totalThucNhan = enhancedData.totalFinancials.totalThucNhan;
        } else if (teacherData.he_dao_tao === 'Đồ án') {
            totalThanhTien = courses.reduce((total, course) => total + (parseFloat(course.ThanhTien) || 0), 0);
            totalThue = courses.reduce((total, course) => total + (parseFloat(course.Thue) || 0), 0);
            totalThucNhan = courses.reduce((total, course) => total + (parseFloat(course.ThucNhan) || 0), 0);
        } else {
            totalThanhTien = teacherData.ThanhTien || 0;
            totalThue = teacherData.Thue || 0;
            totalThucNhan = teacherData.ThucNhan || 0;
        }

        // Add to grand totals
        totalThanhTienAll += parseFloat(totalThanhTien) || 0;
        totalThueAll += parseFloat(totalThue) || 0;
        totalThucNhanAll += parseFloat(totalThucNhan) || 0;

        // Create a merged data object
        const mergedData = {
            STT: rowIndex,
            TongTiet: totalTeacherHours,
            TongSoTiet: totalTeacherHours,
            NgayBatDau: teacherData.NgayBatDau,
            NgayKetThuc: teacherData.NgayKetThuc,
            GioiTinh: teacherData.GioiTinh || 'Nam',
            GiangVien: teacherName,
            TienMoiGiang: teacherData.TienMoiGiang || 0,
            ThanhTien: totalThanhTien,
            Thue: totalThue,
            ThucNhan: totalThucNhan,
            NgaySinh: teacherData.NgaySinh,
            CCCD: teacherData.CCCD,
            NgayCapCCCD: teacherData.NgayCapCCCD,
            NoiCapCCCD: teacherData.NoiCapCCCD,
            HocVi: teacherData.HocVi,
            ChucVu: teacherData.ChucVu,
            HSL: teacherData.HSL || 1.0,
            DienThoai: teacherData.DienThoai,
            Email: teacherData.Email,
            STK: teacherData.STK,
            NganHang: teacherData.NganHang,
            MaSoThue: teacherData.MaSoThue,
            DiaChi: teacherData.DiaChi,
            NoiCongTac: teacherData.NoiCongTac,
            MonGiangDayChinh: teacherData.MonGiangDayChinh,
            SoHopDong: teacherData.SoHopDong,
            loaiHopDong: getHeDaoTaoName(teacherData.he_dao_tao) || $('#loaiHopDong').val(),
            MaPhongBan: teacherData.MaPhongBan || teacherData.TenPhongBan,
            TenPhongBan: teacherData.TenPhongBan,
            KhoaSinhVien: teacherData.KhoaSinhVien,
            Nganh: teacherData.Nganh,
            isNghiHuu: teacherData.isNghiHuu || 0,
            trainingPrograms: enhancedData ? enhancedData.trainingPrograms.map(p => ({
                ...p,
                tenHe: getHeDaoTaoName(p.he_dao_tao || p.id)
            })) : [],
            hasEnhancedData: !!enhancedData,
            DaoTaoDuyet: teacherData.DaoTaoDuyet || 0,
            TaiChinhDuyet: teacherData.TaiChinhDuyet || 0,
            he_dao_tao: teacherData.he_dao_tao,
            id_he_dao_tao: teacherData.he_dao_tao,
            ten_he_dao_tao: getHeDaoTaoName(teacherData.he_dao_tao),
            Dot: $('#combobox-dot').val(),
            Ki: $('#comboboxki').val(),
            NamHoc: $('#NamHoc').val()
        };

        // Store for modal access
        window.teacherDetailData[teacherName] = mergedData;

        // Add to teacher table data array
        window.teacherTableData.push(mergedData);

        const hasContract = mergedData.SoHopDong && mergedData.SoHopDong.trim() !== '';

        // Create approval status display
        const getApprovalStatusDisplay = (daoTaoDuyet, taiChinhDuyet) => {
            if (taiChinhDuyet == 1) {
                return 'Đã duyệt';
            } else {
                return 'Chưa duyệt';
            }
        };

        // Xác định định mức và hiển thị tên
        const isNghiHuu = mergedData.isNghiHuu == 1;
        const dinhMucGV = isNghiHuu ? window.SoTietDinhMucDaNghiHuu : window.SoTietDinhMucChuaNghiHuu;
        const displayTeacherName = isNghiHuu ? `${mergedData.GiangVien} (Đã nghỉ hưu)` : mergedData.GiangVien;
        const shouldHighlight = (parseFloat(mergedData.TongSoTiet) || 0) > dinhMucGV;

        const summaryRow = `
            <tr ${shouldHighlight ? 'class="alert-sotiet"' : ''}>
                <td>${rowIndex}</td>
                <td>${mergedData.GioiTinh.toLowerCase() == "nam" ? "Ông" : "Bà"}</td>
                <td>${displayTeacherName}</td>
                <td>${mergedData.MaPhongBan || 'Chưa xác định'}</td>
                <td>${mergedData.HocVi || 'N/A'}</td>
                <td>${(() => {
                if (enhancedData && enhancedData.trainingPrograms && enhancedData.trainingPrograms.length > 1) {
                    return 'Xem ở chi tiết';
                } else if (enhancedData && enhancedData.trainingPrograms && enhancedData.trainingPrograms.length === 1) {
                    return formatCurrency(enhancedData.trainingPrograms[0].TienMoiGiang);
                } else if (mergedData.TienMoiGiang && mergedData.TienMoiGiang > 0) {
                    return formatCurrency(mergedData.TienMoiGiang);
                } else {
                    return 'N/A';
                }
            })()}</td>
                <td>${formatSoTiet(mergedData.TongTiet)}</td>
                <td>${formatCurrency(mergedData.ThanhTien)}</td>
                <td>${formatCurrency(mergedData.Thue)}</td>
                <td>${formatCurrency(mergedData.ThucNhan)}</td>
                <td class="contract-tcduyet-cell">${getApprovalStatusDisplay(mergedData.DaoTaoDuyet, mergedData.TaiChinhDuyet)}</td>
                <td class="contract-status-cell">${getApprovalStatusDisplay(mergedData.DaoTaoDuyet, mergedData.TaiChinhDuyet)}</td>
                <td class="action-cell-content" id="action-cell-1-${rowIndex}">
                    <button class="btn btn-sm btn-info me-1" onclick="viewTeacherDetail('${encodeURIComponent(teacherName)}')">
                        Xem chi tiết
                    </button>
                    <button class="btn btn-sm btn-success me-1" onclick="previewContract('${encodeURIComponent(teacherName)}')">
                        Xem trước HĐ
                    </button>
                    ${hasContract ?
                `<button class="btn btn-sm btn-secondary" onclick="editContract('${mergedData.SoHopDong}')">
                            Sửa
                        </button>` :
                ''
            }
                </td>
            </tr>
        `;
        summaryTbody.append(summaryRow);
        rowIndex++;
    });

    // Update total display
    const totalElement = document.getElementById("totalQC");
    totalElement.innerHTML = `
        <div class="row">
            <div class="col-md-3">Tổng số tiết QC: ${formatSoTiet(totalQC)}</div>
            <div class="col-md-3">Tổng số tiền: ${formatCurrency(totalThanhTienAll)}</div>
            <div class="col-md-3">Tổng trừ thuế: ${formatCurrency(totalThueAll)}</div>
            <div class="col-md-3">Tổng thực nhận: ${formatCurrency(totalThucNhanAll)}</div>
        </div>
    `;

    // Display quota information
    if (SoTietDinhMuc > 0) {
        const chuaNghiHuu = window.SoTietDinhMucChuaNghiHuu || SoTietDinhMuc || 280;
        const daNghiHuu = window.SoTietDinhMucDaNghiHuu || 560;
        $('#quotaInfo').html(`
            <div class="alert alert-info">
                <strong>Định mức giảng dạy:</strong><br>
                • Giảng viên chưa nghỉ hưu: <strong>${chuaNghiHuu}</strong> tiết/năm<br>
                • Giảng viên đã nghỉ hưu: <strong>${daNghiHuu}</strong> tiết/năm
            </div>
        `);
    }

    // Show teacher results table
    $('#resultsDiv').show();

    // Apply action column visibility
    showActionColumns();

    // Automatically check contract status for teachers
    updateContractStatusForTeachers();
}
