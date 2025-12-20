/**
 * tai-du-lieu.js
 * Xu ly tai du lieu tu API
 */

/**
 * Tai du lieu hop dong theo giang vien
 * @param {boolean} isDetailView - Xem chi tiet hay khong
 */
function loadContractData(isDetailView = false) {
    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();

    if (!dot || !ki || !namHoc) {
        showError('Vui lòng chọn đầy đủ Đợt, Kỳ và Năm học');
        return;
    }

    showLoading(true);
    hideAllTables();

    const params = {
        dot: dot,
        ki: ki,
        namHoc: namHoc,
        maPhongBan: $('#MaPhongBan').val(),
        loaiHopDong: $('#loaiHopDong').val()
    };

    $.ajax({
        url: '/api/duyet-hop-dong',
        type: 'POST',
        data: params,
        success: function (response) {
            if (response.groupedByTeacher && Object.keys(response.groupedByTeacher).length > 0) {
                // Luu response de dung cho cac ham khac
                window.currentResponse = response;

                displayContractDataInSeparateTables(
                    response.groupedByTeacher,
                    response.enhancedGroupedByTeacher,
                    response.SoTietDinhMuc || 0,
                    response.totalsByTeacher || null
                );
                console.log("data : " + JSON.stringify(response.groupedByTeacher));
                showSuccess('Tải dữ liệu thành công');
            } else {
                showError('Không có dữ liệu để hiển thị');
                showNoDataMessage();
            }
        },
        error: function () {
            showError('Có lỗi xảy ra khi kết nối với server');
            showNoDataMessage();
        },
        complete: function () {
            showLoading(false);
        }
    });
}

/**
 * Tai du lieu hop dong theo he dao tao
 */
function loadContractDataByHeDaoTao() {
    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();
    const loaiHopDong = $('#loaiHopDong').val();

    if (!dot || !ki || !namHoc) {
        showError('Vui lòng chọn đầy đủ Đợt, Kỳ và Năm học');
        return;
    }

    // Xoa input tim kiem khi chuyen sang view he dao tao
    $('#searchGiangVien').val('');
    showLoading(true);
    hideAllTables();

    const params = {
        dot: dot,
        ki: ki,
        namHoc: namHoc,
        maPhongBan: $('#MaPhongBan').val(),
        loaiHopDong: loaiHopDong
    };

    $.ajax({
        url: '/api/duyet-hop-dong-theo-he-dao-tao',
        type: 'POST',
        data: params,
        success: function (response) {
            if (response.data && response.data.length > 0) {
                showSuccess(`Tải dữ liệu thành công! Tìm thấy ${response.data.length} hệ đào tạo. Xem chi tiết trong bảng bên dưới.`);

                // Luu response de dung cho cac ham khac
                window.currentResponse = response;

                // Hien thi bang he dao tao
                displayHeDaoTaoData(response.data, response.enhancedData, response.SoTietDinhMuc, response.totalsByHeDaoTao);
            } else {
                showError('Không có dữ liệu để hiển thị');
                showNoDataMessage();
            }
        },
        error: function (xhr, status, error) {
            showError('Có lỗi xảy ra khi kết nối với server');
            showNoDataMessage();
        },
        complete: function () {
            showLoading(false);
        }
    });
}
