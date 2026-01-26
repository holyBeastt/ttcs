/**
 * NCKH V2 - Hướng dẫn SV NCKH - Index Form Module
 * Entry point cho trang Thêm mới - chỉ load form modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabHuongDan = document.getElementById("tab-huongdansvnckh");
    if (!tabHuongDan) return;

    console.log("HuongDanSvNckh FORM module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

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

    // Setup reset button
    const resetBtn = document.getElementById('resetFormBtnHD');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            // Reset form HTML
            document.getElementById('huongdansvnckhForm')?.reset();
            // Clear danh sách thành viên
            HuongDanSvNckh_Autocomplete.clearMemberList();
            // Reset checkbox và đơn vị
            const thanhVienNgoai = document.getElementById('thanhVienNgoaiHD');
            const thanhVienDonVi = document.getElementById('thanhVienDonViHD');
            if (thanhVienNgoai) thanhVienNgoai.checked = false;
            if (thanhVienDonVi) { thanhVienDonVi.value = ''; thanhVienDonVi.disabled = true; }
            // Hide add button
            const addMemberBtn = document.getElementById('addMemberBtnHD');
            if (addMemberBtn) addMemberBtn.style.display = 'none';
        });
    }

    console.log("HuongDanSvNckh FORM module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.HuongDanSvNckhV2 = {
    removeMember: (index) => HuongDanSvNckh_Autocomplete.removeMember(index)
};

window.HuongDanSvNckh = {
    Form: window.HuongDanSvNckh_Form,
    Autocomplete: window.HuongDanSvNckh_Autocomplete
};
