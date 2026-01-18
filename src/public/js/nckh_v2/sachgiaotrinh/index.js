/**
 * NCKH V2 - Sách Giáo Trình - Index Module
 * Entry point - load và khởi tạo tất cả các module
 */

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {
    // Chỉ init khi tab sachgiaotrinh tồn tại
    const tabSachGiaoTrinh = document.getElementById("tab-sachgiaotrinh");
    if (!tabSachGiaoTrinh) return;

    console.log("SachGiaoTrinh module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Năm học đã được load từ API bởi hàm loadNamHocFromAPI() trong view
    // cho tất cả các select có class "namHoc"

    // Load phân loại options
    await SachGiaoTrinh_Form.loadPhanLoaiOptions();

    // Setup autocomplete
    SachGiaoTrinh_Autocomplete.initAutocomplete();

    // Setup form submit
    SachGiaoTrinh_Form.setupFormSubmit();

    // Setup grid (đã có event listener cho nút Hiển thị)
    SachGiaoTrinh_Grid.setupGrid();

    // Ẩn tab "Nhập dữ liệu" nếu không có quyền
    NCKH_V2_Utils.hideFormTabIfViewOnly("form-panel-sgt");

    console.log("SachGiaoTrinh module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.SachGiaoTrinhV2 = {
    loadTableData: () => SachGiaoTrinh_Grid.loadTableData(),
    removeMember: (index) => SachGiaoTrinh_Autocomplete.removeMember(index)
};

window.SachGiaoTrinh = {
    Grid: window.SachGiaoTrinh_Grid,
    Form: window.SachGiaoTrinh_Form,
    Modal: window.SachGiaoTrinh_Modal,
    Autocomplete: window.SachGiaoTrinh_Autocomplete
};
