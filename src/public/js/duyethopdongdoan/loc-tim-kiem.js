/**
 * loc-tim-kiem.js
 * Các hàm lọc và tìm kiếm cho trang duyệt hợp đồng đồ án
 */

/**
 * Lấy tham số filter từ các dropdown
 * @returns {Object} Các tham số filter
 */
function getFilterParams() {
    return {
        dot: $('#combobox-dot').val(),
        ki: $('#comboboxki').val(),
        namHoc: $('#NamHoc').val(),
        maPhongBan: $('#MaPhongBan').val(),
        loaiHopDong: $('#loaiHopDong').val()
    };
}

/**
 * Validate các tham số filter
 * @param {Object} params - Các tham số cần validate
 * @returns {boolean} True nếu hợp lệ
 */
function validateParams(params) {
    if (!params.dot || !params.ki || !params.namHoc) {
        showError('Vui lòng chọn đầy đủ Đợt, Kỳ và Năm học');
        return false;
    }
    return true;
}

/**
 * Filter bảng dựa trên input tìm kiếm
 */
function filterTable() {
    const searchText = $('#searchGiangVien').val().toLowerCase();

    // Check which view is active
    if ($('#resultsDiv').is(':visible')) {
        filterTeacherTable(searchText);
    } else if ($('#heDaoTaoResultsDiv').is(':visible')) {
        filterHeDaoTaoTable(searchText);
    }
}

/**
 * Filter bảng theo giảng viên
 * @param {string} searchText - Text tìm kiếm
 */
function filterTeacherTable(searchText) {
    const summaryTbody = $('#summaryTableBody');
    const summaryRows = summaryTbody.find('tr');

    let totalQC = 0;
    let totalThanhTienAll = 0;
    let totalThueAll = 0;
    let totalThucNhanAll = 0;

    // Filter summary table rows (teacher name is in column 3 - Họ tên)
    summaryRows.each(function (index) {
        const row = $(this);
        const lecturerName = row.find('td:nth-child(3)').text().toLowerCase();

        if (lecturerName.includes(searchText)) {
            row.show();

            // Use data from original array instead of parsing HTML
            const teacherData = window.teacherTableData[index];

            if (teacherData) {
                totalQC += parseFloat(teacherData.TongSoTiet) || 0;
                totalThanhTienAll += parseFloat(teacherData.ThanhTien) || 0;
                totalThueAll += parseFloat(teacherData.Thue) || 0;
                totalThucNhanAll += parseFloat(teacherData.ThucNhan) || 0;
            }
        } else {
            row.hide();
        }
    });

    // Update total display for teacher view
    const totalElement = document.getElementById("totalQC");
    if (totalElement) {
        totalElement.innerHTML = `
            <div class="row">
                <div class="col-md-3">Tổng số tiết QC: ${formatSoTiet(totalQC)}</div>
                <div class="col-md-3">Tổng số tiền: ${formatCurrency(totalThanhTienAll)}</div>
                <div class="col-md-3">Tổng trừ thuế: ${formatCurrency(totalThueAll)}</div>
                <div class="col-md-3">Tổng thực nhận: ${formatCurrency(totalThucNhanAll)}</div>
            </div>
        `;
    }

    // Maintain action column visibility after filtering
    showActionColumns();
}

/**
 * Filter bảng theo hệ đào tạo
 * @param {string} searchText - Text tìm kiếm
 */
function filterHeDaoTaoTable(searchText) {
    let totalSoTiet = 0;
    let totalThanhTien = 0;
    let totalThue = 0;
    let totalThucNhan = 0;

    // Filter rows in all training program tables
    $('#heDaoTaoGroupedContainer .training-program-group').each(function () {
        const group = $(this);
        const tbody = group.find('tbody');
        const rows = tbody.find('tr');
        let visibleCount = 0;

        rows.each(function () {
            const row = $(this);
            const lecturerName = row.find('td:nth-child(3)').text().toLowerCase();

            if (lecturerName.includes(searchText)) {
                row.show();
                visibleCount++;

                // Parse values from visible rows
                const soTietText = row.find('td:nth-child(7)').text().replace(',', '.');
                const thanhTienText = row.find('td:nth-child(8)').text().replace(/[^\d]/g, '');
                const thueText = row.find('td:nth-child(9)').text().replace(/[^\d]/g, '');
                const thucNhanText = row.find('td:nth-child(10)').text().replace(/[^\d]/g, '');

                totalSoTiet += parseFloat(soTietText) || 0;
                totalThanhTien += parseFloat(thanhTienText) || 0;
                totalThue += parseFloat(thueText) || 0;
                totalThucNhan += parseFloat(thucNhanText) || 0;
            } else {
                row.hide();
            }
        });

        // Show/hide entire group based on visible rows
        if (visibleCount === 0 && searchText !== '') {
            group.hide();
        } else {
            group.show();
        }
    });

    // Update total display for heDaoTao view
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
}
