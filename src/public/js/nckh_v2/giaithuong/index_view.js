/**
 * NCKH V2 - Giải Thưởng - Index View Module
 * Entry point cho trang Danh sách - chỉ load grid/view modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabGiaiThuong = document.getElementById("tab-giaithuong");
    if (!tabGiaiThuong) return;

    console.log("GiaiThuong VIEW module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Setup grid (đã có event listener cho nút Hiển thị)
    GiaiThuong_Grid.setupGrid();

    console.log("GiaiThuong VIEW module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.GiaiThuongV2 = {
    loadTableData: () => GiaiThuong_Grid.loadTableData()
};

window.GiaiThuong = {
    Grid: window.GiaiThuong_Grid,
    Modal: window.GiaiThuong_Modal
};
