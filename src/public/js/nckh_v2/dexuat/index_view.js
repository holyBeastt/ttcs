/**
 * NCKH V2 - Đề Xuất Nghiên Cứu - Index View Module
 * Entry point cho trang Danh sách - chỉ load grid/view modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabDeXuat = document.getElementById("tab-dexuat");
    if (!tabDeXuat) return;

    console.log("DeXuat VIEW module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Setup load data button
    const loadDataBtn = document.getElementById('loadDataBtnDX');
    if (loadDataBtn) {
        loadDataBtn.addEventListener('click', () => {
            console.log("Load DeXuat data button clicked");
            DeXuat_Grid.loadTableData();
        });
    }

    // Setup grid
    DeXuat_Grid.setupGrid();

    console.log("DeXuat VIEW module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.DeXuatV2 = {
    loadTableData: () => DeXuat_Grid.loadTableData()
};

window.DeXuat = {
    Grid: window.DeXuat_Grid,
    Modal: window.DeXuat_Modal
};
