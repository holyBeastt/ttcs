/**
 * NCKH V2 - Hướng dẫn SV NCKH - Index Module
 * Entry point - load và khởi tạo tất cả các module
 */

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {
    // Chỉ init khi tab huongdansvnckh được active
    const tabHuongDan = document.getElementById("tab-huongdansvnckh");
    if (!tabHuongDan) return;

    console.log("HuongDanSvNckh module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Năm học đã được load từ API bởi hàm loadNamHocFromAPI() trong view
    // cho tất cả các select có class "namHoc"

    // Load loai huong dan options
    await HuongDanSvNckh_Form.loadLoaiHuongDanOptions();

    // Load Khoa options
    await HuongDanSvNckh_Form.loadKhoaOptions();

    // Setup autocomplete
    HuongDanSvNckh_Autocomplete.setupFormAutocomplete();

    // Setup form submit
    HuongDanSvNckh_Form.setupFormSubmit();

    // Setup member list
    HuongDanSvNckh_Autocomplete.setupMemberList();

    // Setup load data button
    const loadDataBtn = document.getElementById("loadDataBtnHD");
    if (loadDataBtn) {
        loadDataBtn.addEventListener("click", () => {
            console.log("Load HuongDanSvNckh data button clicked");
            HuongDanSvNckh_Grid.loadTableData();
        });
    }

    // Ẩn tab "Nhập dữ liệu" nếu không có quyền
    NCKH_V2_Utils.hideFormTabIfViewOnly("form-panel-hd");

    console.log("HuongDanSvNckh module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.HuongDanSvNckhV2 = {
    loadTableData: () => HuongDanSvNckh_Grid.loadTableData(),
    removeMember: (index) => HuongDanSvNckh_Autocomplete.removeMember(index)
};

window.HuongDanSvNckh = {
    Grid: window.HuongDanSvNckh_Grid,
    Form: window.HuongDanSvNckh_Form,
    Modal: window.HuongDanSvNckh_Modal,
    Autocomplete: window.HuongDanSvNckh_Autocomplete
};
