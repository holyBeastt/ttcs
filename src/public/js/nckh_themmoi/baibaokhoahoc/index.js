/**
 * NCKH V2 - Bài Báo Khoa Học - Index Module
 * Entry point - load và khởi tạo tất cả các module
 */

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {
    // Chỉ init khi tab baibaokhoahoc tồn tại
    const tabBaiBao = document.getElementById("tab-baibaokhoahoc");
    if (!tabBaiBao) return;

    console.log("BaiBaoKhoaHoc module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Năm học đã được load từ API bởi hàm loadNamHocFromAPI() trong view
    // cho tất cả các select có class "namHoc"

    // Load loại bài báo options
    await BaiBao_Form.loadLoaiBaiBaoOptions();

    // Load Khoa options
    await BaiBao_Form.loadKhoaOptions();

    // Setup autocomplete
    BaiBao_Autocomplete.initAutocomplete();

    // Setup form submit
    BaiBao_Form.setupFormSubmit();

    // Setup grid (đã có event listener cho nút Hiển thị)
    BaiBao_Grid.setupGrid();

    // Ẩn tab "Nhập dữ liệu" nếu không có quyền
    NCKH_V2_Utils.hideFormTabIfViewOnly("form-panel-bb");

    console.log("BaiBaoKhoaHoc module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.BaiBaoV2 = {
    loadTableData: () => BaiBao_Grid.loadTableData(),
    removeMember: (index) => BaiBao_Autocomplete.removeMember(index)
};

window.BaiBao = {
    Grid: window.BaiBao_Grid,
    Form: window.BaiBao_Form,
    Modal: window.BaiBao_Modal,
    Autocomplete: window.BaiBao_Autocomplete
};
