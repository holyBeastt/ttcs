/**
 * NCKH V2 - Giải Thưởng - Index Form Module
 * Entry point cho trang Thêm mới - chỉ load form modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabGiaiThuong = document.getElementById("tab-giaithuong");
    if (!tabGiaiThuong) return;

    console.log("GiaiThuong FORM module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Load loại giải thưởng options
    await GiaiThuong_Form.loadLoaiGiaiThuongOptions();

    // Load Khoa options
    await GiaiThuong_Form.loadKhoaOptions();

    // Setup autocomplete
    GiaiThuong_Autocomplete.initAutocomplete();

    // Setup form submit
    GiaiThuong_Form.setupFormSubmit();

    // Setup reset button
    const resetBtn = document.getElementById('resetFormBtnGT');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            // Reset form HTML
            document.getElementById('giaithuongForm')?.reset();
            // Clear danh sách thành viên
            GiaiThuong_Autocomplete.clearMemberList();
            // Clear danh sách tác giả chính
            if (window.tacGiaListGT) {
                window.tacGiaListGT = [];
                if (typeof updateTacGiaDisplayGT === 'function') {
                    updateTacGiaDisplayGT();
                }
            }
            // Reset checkbox và đơn vị
            const tacGiaNgoai = document.getElementById('tacGiaNgoaiGT');
            const tacGiaDonVi = document.getElementById('tacGiaDonViGT');
            const thanhVienNgoai = document.getElementById('thanhVienNgoaiGT');
            const thanhVienDonVi = document.getElementById('thanhVienDonViGT');
            if (tacGiaNgoai) tacGiaNgoai.checked = false;
            if (tacGiaDonVi) { tacGiaDonVi.value = ''; tacGiaDonVi.disabled = true; }
            if (thanhVienNgoai) thanhVienNgoai.checked = false;
            if (thanhVienDonVi) { thanhVienDonVi.value = ''; thanhVienDonVi.disabled = true; }
            // Hide add buttons
            const addTacGiaBtn = document.getElementById('addTacGiaBtnGT');
            const addMemberBtn = document.getElementById('addMemberBtnGT');
            if (addTacGiaBtn) addTacGiaBtn.style.display = 'none';
            if (addMemberBtn) addMemberBtn.style.display = 'none';
        });
    }

    console.log("GiaiThuong FORM module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.GiaiThuongV2 = {
    removeMember: (index) => GiaiThuong_Autocomplete.removeMember(index)
};

window.GiaiThuong = {
    Form: window.GiaiThuong_Form,
    Autocomplete: window.GiaiThuong_Autocomplete
};
