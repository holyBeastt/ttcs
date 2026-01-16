/**
 * NCKH V2 - Đề Tài Dự Án - Index Module
 * Entry point - load và khởi tạo tất cả các module
 */

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener("DOMContentLoaded", async function () {
    console.log("DeTaiDuAn module initializing...");

    // Load danh sách giảng viên
    await NCKH_V2_Utils.loadGiangVienCoHuu();

    // Populate year selects
    const namHocSelects = document.querySelectorAll(".namHoc");
    namHocSelects.forEach(select => {
        NCKH_V2_Utils.populateYearSelect(select);
    });

    // Load cap de tai options
    await DeTaiDuAn_Form.loadCapDeTaiOptions();

    // Setup autocomplete
    DeTaiDuAn_Autocomplete.setupFormAutocomplete();

    // Setup form submit
    DeTaiDuAn_Form.setupFormSubmit();

    // Setup member list
    DeTaiDuAn_Autocomplete.setupMemberList();

    // Setup load data button
    const loadDataBtn = document.getElementById("loadDataBtn");
    if (loadDataBtn) {
        loadDataBtn.addEventListener("click", () => {
            console.log("Load data button clicked");
            DeTaiDuAn_Grid.loadTableData();
        });
    } else {
        console.error("loadDataBtn not found!");
    }

    console.log("DeTaiDuAn module initialized successfully");
});

// =====================================================
// TAB HANDLING (legacy support)
// =====================================================

function toggleTabs(event, tabId, tabLinkId) {
    event.preventDefault();

    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach(tab => {
        tab.classList.add("hidden");
    });

    // Remove active from all tab links
    document.querySelectorAll(".tab-link").forEach(link => {
        link.classList.remove("active");
    });

    // Show selected tab
    document.getElementById(tabId).classList.remove("hidden");
    document.getElementById(tabLinkId).classList.add("active");
}

// =====================================================
// GLOBAL EXPORTS
// =====================================================

// Export for global access (backwards compatibility)
window.DeTaiDuAnV2 = {
    loadTableData: () => DeTaiDuAn_Grid.loadTableData(),
    toggleTabs,
    removeMember: (index) => DeTaiDuAn_Autocomplete.removeMember(index)
};

// Also expose individual modules
window.DeTaiDuAn = {
    Grid: window.DeTaiDuAn_Grid,
    Form: window.DeTaiDuAn_Form,
    Modal: window.DeTaiDuAn_Modal,
    Autocomplete: window.DeTaiDuAn_Autocomplete
};
