/**
 * khoi-tao.js
 * Khoi tao cac bien global va event handlers cho trang duyet hop dong moi giang
 * File nay phai duoc load cuoi cung sau tat ca cac file JS khac
 */

// Khai bao bien global de luu tru du lieu bang
window.teacherTableData = [];
window.teacherDetailData = {};
window.enhancedTeacherData = {};
window.heDaoTaoDetailData = [];

/**
 * Khoi tao khi document ready
 */
$(document).ready(function () {
    // Kiem tra quyen nguoi dung khi load trang
    checkUserPermissions();

    // Khoi tao Bootstrap dropdowns
    var dropdownElementList = [].slice.call(document.querySelectorAll('.dropdown-toggle'));
    var dropdownList = dropdownElementList.map(function (dropdownToggleEl) {
        return new bootstrap.Dropdown(dropdownToggleEl);
    });

    // Xu ly dropdown thu cong lam du phong
    $('.dropdown-toggle').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const dropdownMenu = $(this).next('.dropdown-menu');
        $('.dropdown-menu').not(dropdownMenu).removeClass('show');
        dropdownMenu.toggleClass('show');
    });

    // Dong dropdown khi click ben ngoai
    $(document).on('click', function (e) {
        if (!$(e.target).closest('.btn-group').length) {
            $('.dropdown-menu').removeClass('show');
        }
    });

    // Khoi tao trang thai bang - hien thi thong bao khong co du lieu mac dinh
    showNoDataMessage();

    // Khoi tao chuc nang tim kiem
    $('#searchGiangVien').on('input', function () {
        filterTable();
    });

    // Xu ly click menu dropdown xem du lieu theo giang vien
    $('#viewDataByTeacher').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('.dropdown-menu').removeClass('show');

        $(this).closest('.btn-group').find('.dropdown-toggle').html('Hiển thị: Theo giảng viên');
        $('#searchGiangVien').attr('placeholder', 'Tìm theo tên giảng viên');
        $(this).addClass('active').siblings().removeClass('active');

        loadContractData();
        resetContractStatus();
    });

    // Xu ly click menu dropdown xem du lieu theo he dao tao
    $('#viewDataByHeDaoTao').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('.dropdown-menu').removeClass('show');

        $(this).closest('.btn-group').find('.dropdown-toggle').html('Hiển thị: Theo hệ đào tạo');
        $('#searchGiangVien').attr('placeholder', 'Tìm theo tên giảng viên');
        $(this).addClass('active').siblings().removeClass('active');

        loadContractDataByHeDaoTao();
        checkAndDisplayContractSaveStatus();
    });

    // Xu ly nut xuat du lieu
    $('#exportHDDK').on('click', function () {
        exportContractData();
    });

    // Xu ly nut duyet hop dong
    $('#approveContractBtn').on('click', function () {
        approveContract();
    });

    // Xu ly nut bo duyet hop dong
    $('#unapproveContractBtn').on('click', function () {
        unapproveContract();
    });

    // Xu ly luu du lieu hop dong moi giang
    $('#saveDataMoiGiang').on('click', function () {
        saveContractDataMoiGiang();
    });

    // Xu ly bo luu du lieu hop dong moi giang
    $('#unsaveDataMoiGiang').on('click', function () {
        unsaveContractDataMoiGiang();
    });

    // Xu ly su kien dong modal
    $('#detailModal').on('hidden.bs.modal', function () {
        $(this).find('.modal-body').scrollTop(0);
    });

    // Xu ly nut kiem tra trang thai hop dong
    $('#checkContractStatusBtn').on('click', function () {
        checkAndDisplayContractSaveStatus();
    });

    // Reset trang thai hop dong khi thay doi bo loc (nhung khong tu dong kiem tra)
    $('#combobox-dot, #comboboxki, #NamHoc, #loaiHopDong, #MaPhongBan').on('change', function () {
        resetContractStatus();
    });
});

/**
 * Phim tat dong modal bang phim Escape
 */
$(document).keydown(function (e) {
    if (e.key === "Escape") {
        closeModal();
    }
});
