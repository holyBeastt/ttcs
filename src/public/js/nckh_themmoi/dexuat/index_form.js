/**
 * NCKH V2 - Đề Xuất Nghiên Cứu - Index Form Module
 * Entry point cho trang Thêm mới - chỉ load form modules
 * Refactored: Bỏ Tác giả chính, chỉ giữ Thành viên
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabDeXuat = document.getElementById("tab-dexuat");
    if (!tabDeXuat) return;

    console.log("DeXuat FORM module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Load cấp đề xuất options
    await DeXuat_Form.loadCapDeXuatOptions();

    // Load Khoa options
    await DeXuat_Form.loadKhoaOptions();

    // Setup autocomplete
    DeXuat_Autocomplete.initAutocomplete();

    // Setup form submit
    DeXuat_Form.setupFormSubmit();

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

    console.log("DeXuat FORM module initialized successfully");
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
    removeMember: (index) => DeXuat_Autocomplete.removeMember(index)
};

window.DeXuat = {
    Form: window.DeXuat_Form,
    Autocomplete: window.DeXuat_Autocomplete
};
