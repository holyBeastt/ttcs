/**
 * NCKH V2 - Thành viên Hội đồng - Index Module
 * Entry point - load và khởi tạo tất cả các module
 * Hỗ trợ DANH SÁCH thành viên
 * Pattern tham khảo từ: dexuat/index.js
 */

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {
    // Chỉ init khi tab hoidong tồn tại
    const tabHoiDong = document.getElementById("tab-hoidong");
    if (!tabHoiDong) return;

    console.log("HoiDong module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Load loại hội đồng options
    await HoiDong_Form.loadLoaiHoiDongOptions();

    // Load Khoa options
    await HoiDong_Form.loadKhoaOptions();

    // Setup autocomplete
    HoiDong_Autocomplete.initAutocomplete();

    // Setup form submit
    HoiDong_Form.setupFormSubmit();

    // Setup load data button
    const loadDataBtn = document.getElementById('loadDataBtnHoiDong');
    if (loadDataBtn) {
        loadDataBtn.addEventListener('click', () => {
            console.log("Load HoiDong data button clicked");
            HoiDong_Grid.loadTableData();
        });
    }

    // Setup reset button
    const resetBtn = document.getElementById('resetFormBtnHoiDong');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            document.getElementById('hoiDongForm')?.reset();
            HoiDong_Autocomplete.clearMemberList();
            // Reset đơn vị input
            const thanhVienDonVi = document.getElementById('thanhVienDonViHoiDong');
            const thanhVienNgoai = document.getElementById('thanhVienNgoaiHoiDong');
            if (thanhVienDonVi) {
                thanhVienDonVi.value = '';
                thanhVienDonVi.disabled = true;
            }
            if (thanhVienNgoai) thanhVienNgoai.checked = false;
            // Hide add button
            const addBtn = document.getElementById('addMemberBtnHoiDong');
            if (addBtn) addBtn.style.display = 'none';
        });
    }

    // Hide add button by default (only show when "Ngoài học viện" is checked)
    const addMemberBtn = document.getElementById('addMemberBtnHoiDong');
    if (addMemberBtn) addMemberBtn.style.display = 'none';

    // Ẩn tab "Nhập dữ liệu" nếu không có quyền
    NCKH_V2_Utils.hideFormTabIfViewOnly("form-panel-hoidong");

    console.log("HoiDong module initialized successfully");
});

// =====================================================
// CHECKBOX TOGGLE HANDLERS
// =====================================================

window.toggleThanhVienNgoaiHoiDong = function () {
    const checkbox = document.getElementById('thanhVienNgoaiHoiDong');
    const donViInput = document.getElementById('thanhVienDonViHoiDong');
    const suggestionsDiv = document.getElementById('thanhVienHoiDong-suggestions');
    const addBtn = document.getElementById('addMemberBtnHoiDong');

    if (checkbox.checked) {
        // Ngoài học viện: enable đơn vị, tắt autocomplete, hiện nút Thêm
        donViInput.disabled = false;
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.classList.remove('show');
        addBtn.style.display = 'inline-block';
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

window.HoiDongV2 = {
    loadTableData: () => HoiDong_Grid.loadTableData()
};

window.HoiDong = {
    Grid: window.HoiDong_Grid,
    Form: window.HoiDong_Form,
    Modal: window.HoiDong_Modal,
    Autocomplete: window.HoiDong_Autocomplete
};
