/**
 * NCKH V2 - Đề Tài Dự Án - Index Form Module
 * Entry point cho trang Thêm mới - chỉ load form modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    console.log("DeTaiDuAn FORM module initializing...");

    // Load danh sách giảng viên
    await NCKH_V2_Utils.loadGiangVienCoHuu();

    // Load cap de tai options
    await DeTaiDuAn_Form.loadCapDeTaiOptions();

    // Load Khoa options
    await DeTaiDuAn_Form.loadKhoaOptions();

    // Setup autocomplete
    DeTaiDuAn_Autocomplete.setupFormAutocomplete();

    // Setup form submit
    DeTaiDuAn_Form.setupFormSubmit();

    // Setup member list
    DeTaiDuAn_Autocomplete.setupMemberList();

    // Setup reset button
    const resetBtn = document.getElementById('resetFormBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            // Reset form HTML
            document.getElementById('detaiduanForm')?.reset();
            // Clear danh sách thành viên
            DeTaiDuAn_Autocomplete.clearMemberList();
            // Clear danh sách chủ nhiệm
            if (window.chuNhiemList) {
                window.chuNhiemList = [];
                if (typeof updateChuNhiemDisplay === 'function') {
                    updateChuNhiemDisplay();
                }
            }
            // Reset checkbox và đơn vị
            const chuNhiemNgoai = document.getElementById('chuNhiemNgoai');
            const chuNhiemDonVi = document.getElementById('chuNhiemDonVi');
            const thanhVienNgoai = document.getElementById('thanhVienNgoai');
            const thanhVienDonVi = document.getElementById('thanhVienDonVi');
            if (chuNhiemNgoai) chuNhiemNgoai.checked = false;
            if (chuNhiemDonVi) { chuNhiemDonVi.value = ''; chuNhiemDonVi.disabled = true; }
            if (thanhVienNgoai) thanhVienNgoai.checked = false;
            if (thanhVienDonVi) { thanhVienDonVi.value = ''; thanhVienDonVi.disabled = true; }
            // Hide add buttons
            const addChuNhiemBtn = document.getElementById('addChuNhiemBtn');
            const addMemberBtn = document.getElementById('addMemberBtn');
            if (addChuNhiemBtn) addChuNhiemBtn.style.display = 'none';
            if (addMemberBtn) addMemberBtn.style.display = 'none';
        });
    }

    console.log("DeTaiDuAn FORM module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.DeTaiDuAnV2 = {
    removeMember: (index) => DeTaiDuAn_Autocomplete.removeMember(index)
};

window.DeTaiDuAn = {
    Form: window.DeTaiDuAn_Form,
    Autocomplete: window.DeTaiDuAn_Autocomplete
};
