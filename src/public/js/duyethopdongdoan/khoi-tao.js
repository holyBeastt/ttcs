/**
 * khoi-tao.js
 * Khởi tạo các biến global và event handlers cho trang duyệt hợp đồng đồ án
 * File này phải được load cuối cùng sau tất cả các file JS khác
 */

// Khai báo biến global để lưu trữ dữ liệu
window.teacherTableData = [];
window.teacherDetailData = {};
window.enhancedTeacherData = {};
window.heDaoTaoDetailData = [];
window.heDaoTaoMap = {}; // Mapping ID -> tên hệ đào tạo
window.currentResponse = null;

// Biến global cho định mức
window.SoTietDinhMucChuaNghiHuu = 280;
window.SoTietDinhMucDaNghiHuu = 560;

/**
 * Khởi tạo khi document ready
 */
$(document).ready(function () {
    // Load he_dao_tao mapping
    fetchHeDaoTaoList();

    // Khởi tạo dropdowns và event handlers
    initializeDropdowns();
    initializeEventHandlers();

    // Hiển thị thông báo mặc định
    showNoDataMessage();

    // Kiểm tra quyền người dùng
    const role = localStorage.getItem("userRole");
    const MaPhongBan = localStorage.getItem("MaPhongBan");
    hideBtn(role, MaPhongBan);
    showActionColumns();
    checkUserPermissions();

    console.log('[DEBUG] Page initialized');
});

/**
 * Khởi tạo Bootstrap dropdowns
 */
function initializeDropdowns() {
    // Initialize Bootstrap dropdowns
    document.querySelectorAll('.dropdown-toggle').forEach(el => new bootstrap.Dropdown(el));

    // Manual dropdown toggle
    $('.dropdown-toggle').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const dropdownMenu = $(this).next('.dropdown-menu');
        $('.dropdown-menu').not(dropdownMenu).removeClass('show');
        dropdownMenu.toggleClass('show');
    });

    $(document).on('click', function (e) {
        if (!$(e.target).closest('.btn-group').length) {
            $('.dropdown-menu').removeClass('show');
        }
    });
}

/**
 * Khởi tạo event handlers
 */
function initializeEventHandlers() {
    // Search functionality
    $('#searchGiangVien').on('input', filterTable);

    // View data handlers
    $('#viewDataByTeacher').on('click', function (e) {
        console.log('[DEBUG] viewDataByTeacher clicked');
        handleViewChange(e, 'Theo giảng viên', 'Tìm theo tên giảng viên', loadContractData);
    });

    // Handle view data by training program dropdown menu click
    $('#viewDataByHeDaoTao').on('click', function (e) {
        console.log('[DEBUG] viewDataByHeDaoTao clicked');
        e.preventDefault();
        e.stopPropagation();
        $('.dropdown-menu').removeClass('show');

        $(this).closest('.btn-group').find('.dropdown-toggle').html('Hiển thị: Theo hệ đào tạo');
        $('#searchGiangVien').attr('placeholder', 'Tìm theo tên giảng viên');
        $(this).addClass('active').siblings().removeClass('active');

        loadContractDataByHeDaoTao();
        checkAndDisplayContractSaveStatus();
    });

    // Contract type change
    $('#loaiHopDong').on('change', function () {
        checkUserPermissions();
        if ($(this).val() !== 'Đồ án') {
            $('#saveDataDoAn').hide();
            $('#unsaveDataDoAn').hide();
        }
    });

    // Button handlers
    $('#approveContractBtn').on('click', approveContract);
    $('#unapproveContractBtn').on('click', unapproveContract);
    $('#saveDataDoAn').on('click', saveContractDataDoAn);
    $('#unsaveDataDoAn').on('click', unsaveContractDataDoAn);
    $('#checkContractStatusBtn').on('click', checkAndDisplayContractSaveStatus);

    // Modal cleanup
    $('#detailModal').on('hidden.bs.modal', function () {
        $(this).find('.modal-body').scrollTop(0);
    });

    // Filter change handlers
    $('#combobox-dot, #comboboxki, #NamHoc, #loaiHopDong, #MaPhongBan').on('change', resetContractStatus);
}

/**
 * Xử lý thay đổi view
 * @param {Event} e - Event object
 * @param {string} displayText - Text hiển thị trên button
 * @param {string} placeholder - Placeholder cho input tìm kiếm
 * @param {Function} loadFunction - Hàm load dữ liệu
 */
function handleViewChange(e, displayText, placeholder, loadFunction) {
    console.log('[DEBUG] handleViewChange called with:', displayText);
    e.preventDefault();
    e.stopPropagation();
    $('.dropdown-menu').removeClass('show');

    $(e.target).closest('.btn-group').find('.dropdown-toggle').html(`Hiển thị: ${displayText}`);
    $('#searchGiangVien').attr('placeholder', placeholder);
    $(e.target).addClass('active').siblings().removeClass('active');

    console.log('[DEBUG] About to call loadFunction');
    loadFunction();
    resetContractStatus();
}

/**
 * Phím tắt đóng modal bằng phím Escape
 */
$(document).keydown(function (e) {
    if (e.key === "Escape") {
        closeModal();
    }
});
