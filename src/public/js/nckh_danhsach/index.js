/**
 * NCKH Danh Sách - Index Initialization
 */

document.addEventListener('DOMContentLoaded', function () {
    // Initial load
    initLoad();

    // Event listener for load button
    const loadBtn = document.getElementById("loadDataBtn");
    if (loadBtn) {
        loadBtn.addEventListener("click", () => {
            NCKH_DanhSach_Grid.loadTableData();
        });
    }
});

async function initLoad() {
    try {
        // Load năm học từ API hệ thống
        const response = await fetch('/getNamHoc');
        const result = await response.json();

        if (result.success && result.NamHoc) {
            const namHocSelect = document.getElementById('namHocXem');
            if (namHocSelect) {
                namHocSelect.innerHTML = '';
                result.NamHoc.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.NamHoc;
                    option.textContent = item.NamHoc;
                    namHocSelect.appendChild(option);
                });

                // Auto load data after filling years
                setTimeout(() => {
                    NCKH_DanhSach_Grid.loadTableData();
                }, 200);
            }
        }
    } catch (error) {
        console.error('Lỗi khi khởi tạo:', error);
    }
}
