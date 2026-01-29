/**
 * NCKH V2 - Sáng Kiến - Index Module
 * Entry point - load và khởi tạo tất cả các module
 */

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {
    // Chỉ init khi tab sangkien được active
    const tabSangKien = document.getElementById("tab-sangkien");
    if (!tabSangKien) return;

    console.log("SangKien module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Năm học đã được load từ API bởi hàm loadNamHocFromAPI() trong view
    // cho tất cả các select có class "namHoc"

    // Load loai sang kien options
    await SangKien_Form.loadLoaiSangKienOptions();

    // Load Khoa options
    await SangKien_Form.loadKhoaOptions();

    // Setup autocomplete
    SangKien_Autocomplete.setupFormAutocomplete();

    // Setup form submit
    SangKien_Form.setupFormSubmit();

    // Setup member list
    SangKien_Autocomplete.setupMemberList();

    // Setup load data button
    const loadDataBtn = document.getElementById("loadDataBtnSK");
    if (loadDataBtn) {
        loadDataBtn.addEventListener("click", () => {
            console.log("Load SangKien data button clicked");
            SangKien_Grid.loadTableData();
        });
    }

    // Ẩn tab "Nhập dữ liệu" nếu không có quyền
    NCKH_V2_Utils.hideFormTabIfViewOnly("form-panel-sk");

    console.log("SangKien module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.SangKienV2 = {
    loadTableData: () => SangKien_Grid.loadTableData(),
    removeMember: (index) => SangKien_Autocomplete.removeMember(index)
};

window.SangKien = {
    Grid: window.SangKien_Grid,
    Form: window.SangKien_Form,
    Modal: window.SangKien_Modal,
    Autocomplete: window.SangKien_Autocomplete
};
