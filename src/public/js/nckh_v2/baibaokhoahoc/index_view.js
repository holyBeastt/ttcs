/**
 * NCKH V2 - Bài Báo Khoa Học - Index View Module
 * Entry point cho trang Danh sách - chỉ load grid/view modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabBaiBao = document.getElementById("tab-baibaokhoahoc");
    if (!tabBaiBao) return;

    console.log("BaiBaoKhoaHoc VIEW module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Setup grid (đã có event listener cho nút Hiển thị)
    BaiBao_Grid.setupGrid();

    console.log("BaiBaoKhoaHoc VIEW module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.BaiBaoV2 = {
    loadTableData: () => BaiBao_Grid.loadTableData()
};

window.BaiBao = {
    Grid: window.BaiBao_Grid,
    Modal: window.BaiBao_Modal
};
