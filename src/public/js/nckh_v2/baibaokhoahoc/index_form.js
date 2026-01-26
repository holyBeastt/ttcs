/**
 * NCKH V2 - Bài Báo Khoa Học - Index Form Module
 * Entry point cho trang Thêm mới - chỉ load form modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabBaiBao = document.getElementById("tab-baibaokhoahoc");
    if (!tabBaiBao) return;

    console.log("BaiBaoKhoaHoc FORM module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Load loại bài báo options
    await BaiBao_Form.loadLoaiBaiBaoOptions();

    // Load Khoa options
    await BaiBao_Form.loadKhoaOptions();

    // Setup autocomplete
    BaiBao_Autocomplete.initAutocomplete();

    // Setup form submit
    BaiBao_Form.setupFormSubmit();

    // Setup reset button
    const resetBtn = document.getElementById('resetFormBtnBB');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            // Reset form HTML
            document.getElementById('baibaokhoahocForm')?.reset();
            // Clear danh sách thành viên
            BaiBao_Autocomplete.clearMemberList();
            // Clear danh sách tác giả chính
            if (window.tacGiaListBB) {
                window.tacGiaListBB = [];
                if (typeof updateTacGiaDisplayBB === 'function') {
                    updateTacGiaDisplayBB();
                }
            }
            // Reset checkbox và đơn vị
            const tacGiaNgoai = document.getElementById('tacGiaNgoaiBB');
            const tacGiaDonVi = document.getElementById('tacGiaDonViBB');
            const thanhVienNgoai = document.getElementById('thanhVienNgoaiBB');
            const thanhVienDonVi = document.getElementById('thanhVienDonViBB');
            if (tacGiaNgoai) tacGiaNgoai.checked = false;
            if (tacGiaDonVi) { tacGiaDonVi.value = ''; tacGiaDonVi.disabled = true; }
            if (thanhVienNgoai) thanhVienNgoai.checked = false;
            if (thanhVienDonVi) { thanhVienDonVi.value = ''; thanhVienDonVi.disabled = true; }
            // Hide add buttons
            const addTacGiaBtn = document.getElementById('addTacGiaBtnBB');
            const addMemberBtn = document.getElementById('addMemberBtnBB');
            if (addTacGiaBtn) addTacGiaBtn.style.display = 'none';
            if (addMemberBtn) addMemberBtn.style.display = 'none';
        });
    }

    console.log("BaiBaoKhoaHoc FORM module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.BaiBaoV2 = {
    removeMember: (index) => BaiBao_Autocomplete.removeMember(index)
};

window.BaiBao = {
    Form: window.BaiBao_Form,
    Autocomplete: window.BaiBao_Autocomplete
};
