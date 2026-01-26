/**
 * NCKH V2 - Sách Giáo Trình - Index View Module
 * Entry point cho trang Danh sách - chỉ load grid/view modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabSachGiaoTrinh = document.getElementById("tab-sachgiaotrinh");
    if (!tabSachGiaoTrinh) return;

    console.log("SachGiaoTrinh VIEW module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Setup grid (đã có event listener cho nút Hiển thị)
    SachGiaoTrinh_Grid.setupGrid();

    console.log("SachGiaoTrinh VIEW module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.SachGiaoTrinhV2 = {
    loadTableData: () => SachGiaoTrinh_Grid.loadTableData()
};

window.SachGiaoTrinh = {
    Grid: window.SachGiaoTrinh_Grid,
    Modal: window.SachGiaoTrinh_Modal
};
