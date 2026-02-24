/**
 * loc-tim-kiem.js
 * Xu ly loc va tim kiem du lieu trong bang
 */

/**
 * Dieu phoi tim kiem dua tren view hien tai
 */
function filterTable() {
    const searchText = $('#searchGiangVien').val().toLowerCase();
    const isTeacherView = $('#resultsDiv').is(':visible');
    const isHeDaoTaoView = $('#heDaoTaoResultsDiv').is(':visible');

    if (isTeacherView) {
        filterTeacherTable(searchText);
    } else if (isHeDaoTaoView) {
        filterHeDaoTaoTable(searchText);
    }
}

/**
 * Loc bang theo ten giang vien
 * @param {string} searchText - Chuoi tim kiem
 */
function filterTeacherTable(searchText) {
    const summaryTbody = $('#summaryTableBody');
    const summaryRows = summaryTbody.find('tr');

    let totalQC = 0;
    let totalThanhTienAll = 0;
    let totalThueAll = 0;
    let totalThucNhanAll = 0;

    summaryRows.each(function (index) {
        const row = $(this);
        const lecturerName = row.find('td:nth-child(3)').text().toLowerCase();

        if (lecturerName.includes(searchText)) {
            row.show();

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

    // Cap nhat hien thi tong
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
}

/**
 * Loc bang theo he dao tao
 * @param {string} searchText - Chuoi tim kiem
 */
function filterHeDaoTaoTable(searchText) {
    const container = $('#heDaoTaoGroupedContainer');
    const groups = container.find('.training-program-group');

    let totalSoTiet = 0;
    let totalThanhTien = 0;
    let totalThue = 0;
    let totalThucNhan = 0;
    let totalGiangVien = 0;

    const heDaoTaoData = window.heDaoTaoDetailData || [];

    groups.each(function (groupIndex) {
        const group = $(this);
        const teacherRows = group.find('tbody tr');
        let hasVisibleTeacher = false;

        const programData = heDaoTaoData[groupIndex];

        teacherRows.each(function (rowIndex) {
            const row = $(this);
            const teacherName = row.find('td:nth-child(3)').text().toLowerCase();

            if (teacherName.includes(searchText)) {
                row.show();
                hasVisibleTeacher = true;

                if (programData?.chiTietGiangVien?.[rowIndex]) {
                    const teacherData = programData.chiTietGiangVien[rowIndex];
                    totalSoTiet += parseFloat(teacherData.TongTiet) || 0;
                    totalThanhTien += parseFloat(teacherData.ThanhTien) || 0;
                    totalThue += parseFloat(teacherData.Thue) || 0;
                    totalThucNhan += parseFloat(teacherData.ThucNhan) || 0;
                    totalGiangVien += 1;
                }
            } else {
                row.hide();
            }
        });

        if (hasVisibleTeacher) {
            group.show();
        } else {
            group.hide();
        }
    });

    // Cap nhat hien thi tong
    const totalElement = document.getElementById("totalHeDaoTao");
    if (totalElement) {
        totalElement.innerHTML = `
      <div class="row" style="background-color: #6c757d; color: white; padding: 12px; border-radius: 5px; font-weight: bold; border: 2px solid #5a6268;">
        <div class="col-12" style="font-size: 18px; margin-bottom: 8px;"><strong>🔍 KẾT QUẢ LỌC:</strong></div>
        <div class="col-md-3" style="font-size: 16px;">Số tiết: <strong>${formatSoTiet(totalSoTiet)}</strong></div>
        <div class="col-md-3" style="font-size: 16px;">Thành tiền: <strong>${formatCurrency(totalThanhTien)}</strong></div>
        <div class="col-md-3" style="font-size: 16px;">Thuế: <strong>${formatCurrency(totalThue)}</strong></div>
        <div class="col-md-3" style="font-size: 16px;">Thực nhận: <strong>${formatCurrency(totalThucNhan)}</strong></div>
      </div>
    `;
    }
}
