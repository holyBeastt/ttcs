/**
 * NCKH V2 - Sách Giáo Trình - Index Form Module
 * Entry point cho trang Thêm mới - chỉ load form modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabSachGiaoTrinh = document.getElementById("tab-sachgiaotrinh");
    if (!tabSachGiaoTrinh) return;

    console.log("SachGiaoTrinh FORM module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Load phân loại options
    await SachGiaoTrinh_Form.loadPhanLoaiOptions();

    // Load Khoa options
    await SachGiaoTrinh_Form.loadKhoaOptions();

    // Setup autocomplete
    SachGiaoTrinh_Autocomplete.initAutocomplete();

    // Setup form submit
    SachGiaoTrinh_Form.setupFormSubmit();

    // Setup reset button
    const resetBtn = document.getElementById('resetFormBtnSGT');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            // Reset form HTML
            document.getElementById('sachgiaotrinhForm')?.reset();
            // Clear danh sách thành viên
            SachGiaoTrinh_Autocomplete.clearMemberList();
            // Clear danh sách tác giả chính
            if (window.tacGiaListSGT) {
                window.tacGiaListSGT = [];
                if (typeof updateTacGiaDisplaySGT === 'function') {
                    updateTacGiaDisplaySGT();
                }
            }
            // Reset checkbox và đơn vị
            const tacGiaNgoai = document.getElementById('tacGiaNgoaiSGT');
            const tacGiaDonVi = document.getElementById('tacGiaDonViSGT');
            const thanhVienNgoai = document.getElementById('thanhVienNgoaiSGT');
            const thanhVienDonVi = document.getElementById('thanhVienDonViSGT');
            if (tacGiaNgoai) tacGiaNgoai.checked = false;
            if (tacGiaDonVi) { tacGiaDonVi.value = ''; tacGiaDonVi.disabled = true; }
            if (thanhVienNgoai) thanhVienNgoai.checked = false;
            if (thanhVienDonVi) { thanhVienDonVi.value = ''; thanhVienDonVi.disabled = true; }
            // Hide add buttons
            const addTacGiaBtn = document.getElementById('addTacGiaBtnSGT');
            const addMemberBtn = document.getElementById('addMemberBtnSGT');
            if (addTacGiaBtn) addTacGiaBtn.style.display = 'none';
            if (addMemberBtn) addMemberBtn.style.display = 'none';
        });
    }

    console.log("SachGiaoTrinh FORM module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.SachGiaoTrinhV2 = {
    removeMember: (index) => SachGiaoTrinh_Autocomplete.removeMember(index)
};

window.SachGiaoTrinh = {
    Form: window.SachGiaoTrinh_Form,
    Autocomplete: window.SachGiaoTrinh_Autocomplete
};
