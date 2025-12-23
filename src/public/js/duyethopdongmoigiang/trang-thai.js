/**
 * trang-thai.js
 * Quan ly trang thai hop dong: kiem tra, hien thi, reset trang thai luu/duyet
 */

/**
 * Kiem tra va hien thi trang thai luu hop dong
 */
function checkAndDisplayContractSaveStatus() {
    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();
    const maPhongBan = $('#MaPhongBan').val();
    const loaiHopDong = $('#loaiHopDong').val();

    if (!dot || !ki || !namHoc || !loaiHopDong) {
        $('#contractSaveStatus')
            .text('Vui lòng chọn đầy đủ Đợt, Kỳ, Năm học và Loại hợp đồng')
            .removeClass('badge-success badge-danger badge-warning')
            .addClass('badge-secondary');
        return;
    }

    // Hien thi trang thai dang tai
    $('#contractSaveStatus')
        .text('Đang kiểm tra...')
        .removeClass('badge-success badge-danger badge-warning badge-secondary')
        .addClass('badge-info');

    const params = {
        dot: dot,
        ki: ki,
        namHoc: namHoc,
        maPhongBan: maPhongBan || 'ALL',
        loaiHopDong: loaiHopDong
    };

    $.ajax({
        url: '/api/check-contract-save-status',
        type: 'POST',
        data: params,
        success: function (response) {
            if (response.success && response.message) {
                const statusText = response.message;
                const data = response.data || {};

                console.log(statusText);
                $('#contractSaveStatus').text(statusText);

                if (statusText === 'Đã lưu HĐ') {
                    $('#contractSaveStatus')
                        .removeClass('badge-secondary badge-danger badge-warning badge-info')
                        .addClass('badge-success');
                    $('#unmetRecordsSection').hide();
                } else if (statusText === 'Chưa lưu HĐ') {
                    $('#contractSaveStatus')
                        .removeClass('badge-secondary badge-success badge-warning badge-info')
                        .addClass('badge-danger');

                    if (data.unmetRecords && data.unmetRecords.length > 0) {
                        displayUnmetRecords(data.unmetRecords, data.totalRecords, data.unmetCount, loaiHopDong);
                    } else {
                        $('#unmetRecordsSection').hide();
                    }
                } else {
                    $('#contractSaveStatus')
                        .removeClass('badge-secondary badge-success badge-danger badge-info')
                        .addClass('badge-warning');
                    $('#unmetRecordsSection').hide();
                }

                $('#contractSaveStatus').removeAttr('title');

            } else {
                $('#contractSaveStatus')
                    .text('Lỗi: ' + (response.message || 'Không thể kiểm tra trạng thái'))
                    .removeClass('badge-success badge-danger badge-info')
                    .addClass('badge-warning');
                $('#unmetRecordsSection').hide();
            }
        },
        error: function (xhr, status, error) {
            console.error('Error checking contract save status:', error);
            $('#contractSaveStatus')
                .text('Lỗi kết nối khi kiểm tra trạng thái')
                .removeClass('badge-success badge-danger badge-info')
                .addClass('badge-warning');
            $('#unmetRecordsSection').hide();
        }
    });
}

/**
 * Hien thi chi tiet cac ban ghi chua luu
 * @param {Array} unmetRecords - Danh sach ban ghi chua luu
 * @param {number} totalRecords - Tong so ban ghi
 * @param {number} unmetCount - So ban ghi chua luu
 * @param {string} loaiHopDong - Loai hop dong
 */
function displayUnmetRecords(unmetRecords, totalRecords, unmetCount, loaiHopDong) {
    $('#unmetRecordsCount').html(`
      <strong>Tổng số bản ghi:</strong> ${totalRecords} | 
      <strong>Số bản ghi chưa lưu:</strong> <span class="text-danger">${unmetCount}</span>
    `);

    $('#unmetRecordsTableHeader').empty();
    $('#unmetRecordsTableBody').empty();

    if (unmetRecords.length === 0) {
        $('#unmetRecordsSection').hide();
        return;
    }

    // Tao header cho bang - chi co loai hop dong Moi giang
    const headers = [
        'STT',
        'Khoa',
        'Mã học phần',
        'Lớp học phần',
        'Tên lớp',
        'Giảng viên',
        'Quy chuẩn',
        'Trạng thái lưu',
        'Ngày bắt đầu',
        'Ngày kết thúc'
    ];

    const headerRow = headers.map(header => `<th class="text-center">${header}</th>`).join('');
    $('#unmetRecordsTableHeader').html(headerRow);

    // Them cac dong du lieu
    unmetRecords.forEach((record, index) => {
        let row = `<tr>`;
        row += `<td class="text-center">${index + 1}</td>`;

        const daLuuText = record.DaLuu === null ? 'NULL' : (record.DaLuu == 1 ? 'Đã lưu' : 'Chưa lưu');
        const daLuuClass = record.DaLuu === null ? 'text-muted' : (record.DaLuu == 1 ? 'text-success' : 'text-danger');

        row += `<td>${record.TenKhoa || record.Khoa || ''}</td>`;
        row += `<td>${record.MaHocPhan || ''}</td>`;
        row += `<td>${record.LopHocPhan || ''}</td>`;
        row += `<td>${record.TenLop || ''}</td>`;
        row += `<td>${record.GiaoVienGiangDay || ''}</td>`;
        row += `<td class="text-center">${record.QuyChuan || ''}</td>`;
        row += `<td class="text-center"><span class="${daLuuClass}">${daLuuText}</span></td>`;
        row += `<td class="text-center">${record.NgayBatDau ? new Date(record.NgayBatDau).toLocaleDateString('vi-VN') : ''}</td>`;
        row += `<td class="text-center">${record.NgayKetThuc ? new Date(record.NgayKetThuc).toLocaleDateString('vi-VN') : ''}</td>`;

        row += `</tr>`;
        $('#unmetRecordsTableBody').append(row);
    });

    $('#unmetRecordsSection').show();
}

/**
 * Tu dong kiem tra trang thai khi thay doi bo loc
 */
function autoCheckContractStatus() {
    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();
    const loaiHopDong = $('#loaiHopDong').val();

    if (dot && ki && namHoc && loaiHopDong) {
        checkAndDisplayContractSaveStatus();
    } else {
        resetContractStatus();
    }
}

/**
 * Reset trang thai hop dong ve trang thai ban dau
 */
function resetContractStatus() {
    $('#contractSaveStatus')
        .text('Chưa kiểm tra')
        .removeClass('badge-success badge-danger badge-warning badge-info')
        .addClass('badge-secondary');
    $('#unmetRecordsSection').hide();

    // Reset cac o TC Duyet
    $('.contract-tcduyet-cell, .contract-tcduyet-cell-hedaotao').each(function () {
        $(this).text('Chưa kiểm tra');
    });
    // Reset cac o trang thai hop dong
    $('.contract-status-cell, .contract-status-cell-hedaotao').each(function () {
        $(this).text('Chưa kiểm tra');
    });
}

/**
 * Tai trang thai hop dong cho tung giang vien trong bang
 * @returns {Promise} Promise cho viec tai trang thai
 */
function loadContractStatusForTeachers() {
    return new Promise((resolve, reject) => {
        console.log('loadContractStatusForTeachers called');
        const teacherCells = $('.contract-status-cell');
        console.log('Found teacher cells:', teacherCells.length);

        const dot = $('#combobox-dot').val();
        const ki = $('#comboboxki').val();
        const namHoc = $('#NamHoc').val();
        const maPhongBan = $('#MaPhongBan').val();
        const loaiHopDong = $('#loaiHopDong').val();

        console.log('Parameters:', { dot, ki, namHoc, maPhongBan, loaiHopDong });

        if (!dot || !ki || !namHoc || !loaiHopDong) {
            console.log('Missing required parameters');
            teacherCells.each(function () {
                $(this).html('Thiếu tham số');
            });
            reject('Missing required parameters');
            return;
        }

        const params = {
            dot: dot,
            ki: ki,
            namHoc: namHoc,
            maPhongBan: maPhongBan || 'ALL',
            loaiHopDong: loaiHopDong
        };

        teacherCells.each(function () {
            $(this).html('Đang tải...');
        });

        $.ajax({
            url: '/api/check-contract-save-status',
            type: 'POST',
            data: params,
            success: function (response) {
                if (response.success && response.message) {
                    const statusText = response.message;
                    console.log('Setting status HTML:', statusText);
                    teacherCells.each(function () {
                        $(this).html(statusText);
                    });
                    resolve(response);
                } else {
                    console.log('API response error:', response);
                    teacherCells.each(function () {
                        $(this).html('Lỗi: ' + (response.message || 'Không thể kiểm tra'));
                    });
                    resolve(response);
                }
            },
            error: function (xhr, status, error) {
                console.error('Error checking contract status:', error);
                teacherCells.each(function () {
                    $(this).html('Lỗi kết nối');
                });
                reject(error);
            }
        });
    });
}

/**
 * Du lieu duyet tai chinh da duoc tai cung voi du lieu hop dong ban dau
 * Khong can goi API rieng
 * @returns {Promise} Promise resolve ngay
 */
function loadContractFinanceApprovalForTeachers() {
    return new Promise((resolve) => {
        console.log('loadContractFinanceApprovalForTeachers called - using data already loaded');
        resolve();
    });
}

/**
 * Tai trang thai hop dong cho tung giang vien trong bang he dao tao
 * @returns {Promise} Promise cho viec tai trang thai
 */
function loadContractStatusForHeDaoTao() {
    return new Promise((resolve, reject) => {
        const teacherCells = $('.contract-status-cell-hedaotao');
        const dot = $('#combobox-dot').val();
        const ki = $('#comboboxki').val();
        const namHoc = $('#NamHoc').val();
        const maPhongBan = $('#MaPhongBan').val();
        const loaiHopDong = $('#loaiHopDong').val();

        console.log('HeDaoTao Parameters:', { dot, ki, namHoc, maPhongBan, loaiHopDong });

        if (!dot || !ki || !namHoc || !loaiHopDong) {
            console.log('Missing required parameters for HeDaoTao');
            teacherCells.each(function () {
                $(this).html('Thiếu tham số');
            });
            reject('Missing required parameters for HeDaoTao');
            return;
        }

        const params = {
            dot: dot,
            ki: ki,
            namHoc: namHoc,
            maPhongBan: maPhongBan || 'ALL',
            loaiHopDong: loaiHopDong
        };

        teacherCells.each(function () {
            $(this).html('Đang tải...');
        });

        $.ajax({
            url: '/api/check-contract-save-status',
            type: 'POST',
            data: params,
            success: function (response) {
                if (response.success && response.message) {
                    const statusText = response.message;
                    console.log('Setting HeDaoTao status HTML:', statusText);
                    teacherCells.each(function () {
                        $(this).html(statusText);
                    });
                    resolve(response);
                } else {
                    console.log('HeDaoTao API response error:', response);
                    teacherCells.each(function () {
                        $(this).html('Lỗi: ' + (response.message || 'Không thể kiểm tra'));
                    });
                    resolve(response);
                }
            },
            error: function (xhr, status, error) {
                console.error('Error checking contract status for training programs:', error);
                teacherCells.each(function () {
                    $(this).html('Lỗi kết nối');
                });
                reject(error);
            }
        });
    });
}

/**
 * Tai trang thai duyet tai chinh cho tung giang vien trong bang he dao tao
 * @returns {Promise} Promise cho viec tai trang thai
 */
function loadContractFinanceApprovalForHeDaoTao() {
    return new Promise((resolve, reject) => {
        console.log('loadContractFinanceApprovalForHeDaoTao called');
        const teacherCells = $('.contract-tcduyet-cell-hedaotao');
        console.log('Found heDaoTao TC Duyệt cells:', teacherCells.length);

        const dot = $('#combobox-dot').val();
        const ki = $('#comboboxki').val();
        const namHoc = $('#NamHoc').val();
        const maPhongBan = $('#MaPhongBan').val();
        const loaiHopDong = $('#loaiHopDong').val();

        console.log('HeDaoTao TC Duyệt Parameters:', { dot, ki, namHoc, maPhongBan, loaiHopDong });

        if (!dot || !ki || !namHoc || !loaiHopDong) {
            console.log('Missing required parameters for HeDaoTao TC Duyệt');
            teacherCells.each(function () {
                $(this).html('Thiếu tham số');
            });
            reject('Missing required parameters for HeDaoTao TC Duyệt');
            return;
        }

        const params = {
            dot: dot,
            ki: ki,
            namHoc: namHoc,
            maPhongBan: maPhongBan || 'ALL',
            loaiHopDong: loaiHopDong
        };

        teacherCells.each(function () {
            $(this).html('Đang tải...');
        });

        console.log('Making HeDaoTao TC Duyệt API call with params:', params);

        $.ajax({
            url: '/api/check-contract-finance-approval-status',
            type: 'POST',
            data: params,
            success: function (response) {
                console.log('HeDaoTao TC Duyệt API response:', response);
                if (response.success && response.message) {
                    const statusText = response.message;
                    teacherCells.each(function () {
                        $(this).html(statusText);
                    });
                    resolve(response);
                } else {
                    console.log('HeDaoTao TC Duyệt API response error:', response);
                    teacherCells.each(function () {
                        $(this).html('Lỗi: ' + (response.message || 'Không thể kiểm tra TC'));
                    });
                    resolve(response);
                }
            },
            error: function (xhr, status, error) {
                console.error('Error checking HeDaoTao TC Duyệt status:', error);
                teacherCells.each(function () {
                    $(this).html('Lỗi kết nối TC');
                });
                reject(error);
            }
        });
    });
}
