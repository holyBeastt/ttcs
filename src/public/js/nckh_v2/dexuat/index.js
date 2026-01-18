/**
 * NCKH V2 - Đề Xuất Nghiên Cứu - Index Module
 * Entry point - load và khởi tạo tất cả các module
 * Refactored: Bỏ Tác giả chính, chỉ giữ Thành viên
 */

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {
    // Chỉ init khi tab dexuat tồn tại
    const tabDeXuat = document.getElementById("tab-dexuat");
    if (!tabDeXuat) return;

    console.log("DeXuat module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Load cấp đề xuất options
    await DeXuat_Form.loadCapDeXuatOptions();

    // Setup autocomplete
    DeXuat_Autocomplete.initAutocomplete();

    // Setup form submit
    DeXuat_Form.setupFormSubmit();

    // Setup load data button
    const loadDataBtn = document.getElementById('loadDataBtnDX');
    if (loadDataBtn) {
        loadDataBtn.addEventListener('click', () => {
            console.log("Load DeXuat data button clicked");
            DeXuat_Grid.loadTableData();
        });
    }

    // Setup reset button
    const resetBtn = document.getElementById('resetFormBtnDX');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            document.getElementById('dexuatForm')?.reset();
            DeXuat_Autocomplete.clearMemberList();
        });
    }

    // Hide add member button by default (only show when "Ngoài học viện" is checked)
    const addMemberBtn = document.getElementById('addMemberBtnDX');
    if (addMemberBtn) addMemberBtn.style.display = 'none';

    // Ẩn tab "Nhập dữ liệu" nếu không có quyền
    NCKH_V2_Utils.hideFormTabIfViewOnly("form-panel-dx");

    console.log("DeXuat module initialized successfully");
});

// =====================================================
// CHECKBOX TOGGLE HANDLER - CHỈ CÒN THÀNH VIÊN
// =====================================================

window.toggleThanhVienNgoaiDX = function () {
    const checkbox = document.getElementById('thanhVienNgoaiDX');
    const donViInput = document.getElementById('thanhVienDonViDX');
    const suggestionsDiv = document.getElementById('thanhVienDX-suggestions');
    const addBtn = document.getElementById('addMemberBtnDX');

    if (checkbox.checked) {
        // Ngoài học viện: enable đơn vị, tắt autocomplete, hiện nút Thêm
        donViInput.disabled = false;
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.classList.remove('show');
        addBtn.style.display = 'block';
    } else {
        // Trong học viện: disable đơn vị, bật autocomplete, ẩn nút Thêm
        donViInput.disabled = true;
        donViInput.value = '';
        addBtn.style.display = 'none';
    }
};

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.DeXuatV2 = {
    loadTableData: () => DeXuat_Grid.loadData(),
    removeMember: (index) => DeXuat_Autocomplete.removeMember(index)
};

window.DeXuat = {
    Grid: window.DeXuat_Grid,
    Form: window.DeXuat_Form,
    Modal: window.DeXuat_Modal,
    Autocomplete: window.DeXuat_Autocomplete
};
