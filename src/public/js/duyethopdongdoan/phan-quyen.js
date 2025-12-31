/**
 * phan-quyen.js
 * Các hàm phân quyền hiển thị cho trang duyệt hợp đồng đồ án
 */

/**
 * Kiểm tra quyền người dùng và hiển thị/ẩn các nút
 */
function checkUserPermissions() {
    const role = localStorage.getItem("userRole");
    const MaPhongBan = localStorage.getItem("MaPhongBan");
    const loaiHopDong = $('#loaiHopDong').val();

    // Nút duyệt và bỏ duyệt: chỉ hiển thị với role Trợ lý của Văn phòng
    if (role == APP_ROLES.troLy_phong && MaPhongBan == APP_DEPARTMENTS.vanPhong) {
        $('#approveContractBtn').show();
        $('#unapproveContractBtn').show();
    } else {
        $('#approveContractBtn').hide();
        $('#unapproveContractBtn').hide();
    }

    // Nút lưu hợp đồng: chỉ hiển thị với role Lãnh đạo của Văn phòng và khi loại hợp đồng là "Đồ án"
    if (role == APP_ROLES.lanhDao_phong && MaPhongBan == APP_DEPARTMENTS.vanPhong && loaiHopDong === 'Đồ án') {
        $('#saveDataDoAn').show();
        $('#unsaveDataDoAn').show();
    } else {
        $('#saveDataDoAn').hide();
        $('#unsaveDataDoAn').hide();
    }
}

/**
 * Ẩn các controls theo role
 * @param {string} role - Role của người dùng
 * @param {string} MaPhongBan - Mã phòng ban
 */
function hideBtn(role, MaPhongBan) {
    if ((role == APP_ROLES.troLy_phong || role == APP_ROLES.lanhDao_phong) && MaPhongBan == APP_DEPARTMENTS.vanPhong) {
        const control = document.getElementById("control");
        if (control) {
            control.style.display = "none";
        }
    }
    // Show/hide action columns and content based on role and department
    showActionColumns();
}

/**
 * Hiển thị/ẩn các cột action trong bảng theo giảng viên
 */
function showActionColumns() {
    const role = localStorage.getItem("userRole");
    const MaPhongBan = localStorage.getItem("MaPhongBan");

    // Mở rộng quyền xem chi tiết và xem trước cho cả phòng và khoa
    const shouldShowActions = ((role == APP_ROLES.troLy_phong || role == APP_ROLES.lanhDao_phong) ||
        (role == APP_ROLES.lanhDao_khoa || role == APP_ROLES.gv_cnbm_khoa));

    // Control action column header (only teacher table)
    const actionHeader1 = document.getElementById("action-header-1");

    if (actionHeader1) {
        actionHeader1.style.display = shouldShowActions ? "" : "none";
    }

    // Control action cell content (only teacher table)
    const actionCells1 = document.querySelectorAll('.action-cell-content');

    actionCells1.forEach(cell => {
        cell.style.display = shouldShowActions ? "" : "none";
    });
}

/**
 * Hiển thị/ẩn các cột action trong bảng theo hệ đào tạo
 */
function showActionColumnsHeDaoTao() {
    const role = localStorage.getItem("userRole");
    const MaPhongBan = localStorage.getItem("MaPhongBan");
    const shouldShowActions = ((role == APP_ROLES.troLy_phong || role == APP_ROLES.lanhDao_phong) ||
        (role == APP_ROLES.lanhDao_khoa || role == APP_ROLES.gv_cnbm_khoa));

    // Control action cells in heDaoTao tables
    $('#heDaoTaoGroupedContainer .action-col').each(function () {
        $(this).css('display', shouldShowActions ? '' : 'none');
    });
}
