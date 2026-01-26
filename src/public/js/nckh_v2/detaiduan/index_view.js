/**
 * NCKH V2 - Đề Tài Dự Án - Index View Module
 * Entry point cho trang Danh sách - chỉ load grid/view modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    console.log("DeTaiDuAn VIEW module initializing...");

    // Load danh sách giảng viên
    await NCKH_V2_Utils.loadGiangVienCoHuu();

    // Setup load data button
    const loadDataBtn = document.getElementById("loadDataBtn");
    if (loadDataBtn) {
        loadDataBtn.addEventListener("click", () => {
            console.log("Load data button clicked");
            DeTaiDuAn_Grid.loadTableData();
        });
    }

    console.log("DeTaiDuAn VIEW module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.DeTaiDuAnV2 = {
    loadTableData: () => DeTaiDuAn_Grid.loadTableData()
};

window.DeTaiDuAn = {
    Grid: window.DeTaiDuAn_Grid,
    Modal: window.DeTaiDuAn_Modal
};
