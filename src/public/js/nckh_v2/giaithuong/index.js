/**
 * NCKH V2 - Giải Thưởng KHCN - Index Module
 * Entry point - load và khởi tạo tất cả các module
 */

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {
    // Chỉ init khi tab giaithuong tồn tại
    const tabGiaiThuong = document.getElementById("tab-giaithuong");
    if (!tabGiaiThuong) return;

    console.log("GiaiThuong module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Năm học đã được load từ API bởi hàm loadNamHocFromAPI() trong view
    // cho tất cả các select có class "namHoc"

    // Load loại giải thưởng options
    await GiaiThuong_Form.loadLoaiGiaiThuongOptions();

    // Setup autocomplete
    GiaiThuong_Autocomplete.initAutocomplete();

    // Setup form submit
    GiaiThuong_Form.setupFormSubmit();

    // Setup grid (đã có event listener cho nút Hiển thị)
    GiaiThuong_Grid.setupGrid();

    // Ẩn tab "Nhập dữ liệu" nếu không có quyền
    NCKH_V2_Utils.hideFormTabIfViewOnly("form-panel-gt");

    console.log("GiaiThuong module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.GiaiThuongV2 = {
    loadTableData: () => GiaiThuong_Grid.loadTableData(),
    removeMember: (index) => GiaiThuong_Autocomplete.removeMember(index)
};

window.GiaiThuong = {
    Grid: window.GiaiThuong_Grid,
    Form: window.GiaiThuong_Form,
    Modal: window.GiaiThuong_Modal,
    Autocomplete: window.GiaiThuong_Autocomplete
};
