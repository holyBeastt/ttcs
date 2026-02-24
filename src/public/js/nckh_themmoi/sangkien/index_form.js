/**
 * NCKH V2 - Sáng Kiến - Index Form Module
 * Entry point cho trang Thêm mới - chỉ load form modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabSangKien = document.getElementById("tab-sangkien");
    if (!tabSangKien) return;

    console.log("SangKien FORM module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

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

    // Setup reset button
    const resetBtn = document.getElementById('resetFormBtnSK');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            // Reset form HTML
            document.getElementById('sangkienForm')?.reset();
            // Clear danh sách thành viên
            SangKien_Autocomplete.clearMemberList();
            // Clear danh sách tác giả chính
            if (window.tacGiaListSK) {
                window.tacGiaListSK = [];
                if (typeof updateTacGiaDisplaySK === 'function') {
                    updateTacGiaDisplaySK();
                }
            }
            // Reset checkbox và đơn vị
            const tacGiaNgoai = document.getElementById('tacGiaNgoaiSK');
            const tacGiaDonVi = document.getElementById('tacGiaDonViSK');
            const thanhVienNgoai = document.getElementById('thanhVienNgoaiSK');
            const thanhVienDonVi = document.getElementById('thanhVienDonViSK');
            if (tacGiaNgoai) tacGiaNgoai.checked = false;
            if (tacGiaDonVi) { tacGiaDonVi.value = ''; tacGiaDonVi.disabled = true; }
            if (thanhVienNgoai) thanhVienNgoai.checked = false;
            if (thanhVienDonVi) { thanhVienDonVi.value = ''; thanhVienDonVi.disabled = true; }
            // Hide add buttons
            const addTacGiaBtn = document.getElementById('addTacGiaBtnSK');
            const addMemberBtn = document.getElementById('addMemberBtnSK');
            if (addTacGiaBtn) addTacGiaBtn.style.display = 'none';
            if (addMemberBtn) addMemberBtn.style.display = 'none';
        });
    }

    console.log("SangKien FORM module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.SangKienV2 = {
    removeMember: (index) => SangKien_Autocomplete.removeMember(index)
};

window.SangKien = {
    Form: window.SangKien_Form,
    Autocomplete: window.SangKien_Autocomplete
};
