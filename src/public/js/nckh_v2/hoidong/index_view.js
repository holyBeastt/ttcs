/**
 * NCKH V2 - Thành viên Hội đồng - Index View Module
 * Entry point cho trang Danh sách - chỉ load grid/view modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabHoiDong = document.getElementById("tab-hoidong");
    if (!tabHoiDong) return;

    console.log("HoiDong VIEW module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Setup load data button
    const loadDataBtn = document.getElementById('loadDataBtnHoiDong');
    if (loadDataBtn) {
        loadDataBtn.addEventListener('click', () => {
            console.log("Load HoiDong data button clicked");
            HoiDong_Grid.loadTableData();
        });
    }

    // Setup grid
    HoiDong_Grid.setupGrid();

    console.log("HoiDong VIEW module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.HoiDongV2 = {
    loadTableData: () => HoiDong_Grid.loadTableData()
};

window.HoiDong = {
    Grid: window.HoiDong_Grid,
    Modal: window.HoiDong_Modal
};
