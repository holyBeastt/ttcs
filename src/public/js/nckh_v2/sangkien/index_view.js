/**
 * NCKH V2 - Sáng Kiến - Index View Module
 * Entry point cho trang Danh sách - chỉ load grid/view modules
 */

document.addEventListener("DOMContentLoaded", async function () {
    const tabSangKien = document.getElementById("tab-sangkien");
    if (!tabSangKien) return;

    console.log("SangKien VIEW module initializing...");

    // Load danh sách giảng viên (nếu chưa load)
    if (!window.giangVienCoHuu || window.giangVienCoHuu.length === 0) {
        await NCKH_V2_Utils.loadGiangVienCoHuu();
    }

    // Setup load data button
    const loadDataBtn = document.getElementById("loadDataBtnSK");
    if (loadDataBtn) {
        loadDataBtn.addEventListener("click", () => {
            console.log("Load SangKien data button clicked");
            SangKien_Grid.loadTableData();
        });
    }

    console.log("SangKien VIEW module initialized successfully");
});

// =====================================================
// GLOBAL EXPORTS
// =====================================================

window.SangKienV2 = {
    loadTableData: () => SangKien_Grid.loadTableData()
};

window.SangKien = {
    Grid: window.SangKien_Grid,
    Modal: window.SangKien_Modal
};
