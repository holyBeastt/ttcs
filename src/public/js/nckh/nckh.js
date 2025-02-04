function toggleTabs(event, tabId, activeTabId) {
    event.preventDefault(); // Ngừng hành động mặc định của thẻ <a>

    // Loại bỏ lớp 'active' khỏi tất cả các tab link
    const allTabs = document.querySelectorAll('.tab-link');
    allTabs.forEach(tab => {
        tab.classList.remove('active');
    });

    // Thêm lớp 'active' cho tab được chỉ định bằng activeTabId
    const activeTab = document.getElementById(activeTabId);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Ẩn tất cả các nội dung tab
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(content => {
        content.classList.add('hidden');
    });

    // Hiển thị nội dung của tab được chọn
    const activeContent = document.getElementById(tabId);
    if (activeContent) {
        activeContent.classList.remove('hidden');
    }
}

// Đảm bảo khi trang tải, tab đầu tiên được chọn mặc định
document.addEventListener('DOMContentLoaded', function () {
    const firstTab = document.querySelector('.tab-link');
    if (firstTab) {
        firstTab.classList.add('active');
    }
});

