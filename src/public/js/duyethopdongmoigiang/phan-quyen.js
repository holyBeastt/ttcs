/**
 * phan-quyen.js
 * Xu ly phan quyen nguoi dung cho trang duyet hop dong moi giang
 * Kiem tra role va hien thi/an cac nut theo quyen
 */

/**
 * Kiem tra quyen nguoi dung va hien thi/an cac nut tuong ung
 * - Nut duyet/bo duyet: Chi hien thi voi role Tro ly cua Van phong
 * - Nut luu hop dong: Chi hien thi voi role Lanh dao cua Van phong
 * - Cot thao tac: Hien thi voi role phong hoac khoa
 */
function checkUserPermissions() {
    const role = localStorage.getItem("userRole");
    const MaPhongBan = localStorage.getItem("MaPhongBan");

    // Nut duyet va bo duyet: chi hien thi voi role Tro ly cua Van phong
    if (role == APP_ROLES.troLy_phong && MaPhongBan == APP_DEPARTMENTS.vanPhong) {
        $('#approveContractBtn').show();
        $('#unapproveContractBtn').show();
    } else {
        $('#approveContractBtn').hide();
        $('#unapproveContractBtn').hide();
    }

    // Nut luu hop dong: chi hien thi voi role Lanh dao cua Van phong
    if (role == APP_ROLES.lanhDao_phong && MaPhongBan == APP_DEPARTMENTS.vanPhong) {
        $('#saveDataMoiGiang').show();
        $('#unsaveDataMoiGiang').show();
    } else {
        $('#saveDataMoiGiang').hide();
        $('#unsaveDataMoiGiang').hide();
    }

    // Hien thi/an cot thao tac dua tren quyen nguoi dung - mo rong cho ca phong va khoa
    if ((role == APP_ROLES.troLy_phong || role == APP_ROLES.lanhDao_phong) ||
        (role == APP_ROLES.lanhDao_khoa || role == APP_ROLES.gv_cnbm_khoa)) {
        // Hien thi cot thao tac trong bang tong hop
        $('#summaryTable th.action-col, #summaryTable td.action-col').show();

        // Hien thi cot thao tac trong bang he dao tao
        $('.training-program-table th.action-col, .training-program-table td.action-col').show();
    } else {
        // An cot thao tac trong bang tong hop
        $('#summaryTable th.action-col, #summaryTable td.action-col').hide();

        // An cot thao tac trong bang he dao tao
        $('.training-program-table th.action-col, .training-program-table td.action-col').hide();
    }
}
