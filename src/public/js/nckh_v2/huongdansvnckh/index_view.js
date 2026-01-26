/**
 * NCKH V2 - Hướng dẫn SV NCKH - Index View Module
 * Entry point cho trang Danh sách - chỉ load grid/view modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabHuongDan = document.getElementById("tab-huongdansvnckh");
    if (!tabHuongDan) return;

    console.log("HuongDanSvNckh VIEW module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Setup load data button
    const loadDataBtn = document.getElementById("loadDataBtnHD");
    if (loadDataBtn) {
        loadDataBtn.addEventListener("click", () => {
            console.log("Load HuongDanSvNckh data button clicked");
            HuongDanSvNckh_Grid.loadTableData();
        });
    }

    console.log("HuongDanSvNckh VIEW module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.HuongDanSvNckhV2 = {
    loadTableData: () => HuongDanSvNckh_Grid.loadTableData()
};

window.HuongDanSvNckh = {
    Grid: window.HuongDanSvNckh_Grid,
    Modal: window.HuongDanSvNckh_Modal
};
