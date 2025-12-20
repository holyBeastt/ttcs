/**
 * duyet-hop-dong.js
 * Xu ly duyet va bo duyet hop dong
 */

/**
 * Duyet hop dong
 */
function approveContract() {
    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();
    const maPhongBan = $('#MaPhongBan').val();
    const loaiHopDong = $('#loaiHopDong').val();

    if (!dot || !ki || !namHoc || !loaiHopDong) {
        Swal.fire({ title: 'Lỗi!', text: 'Vui lòng chọn đầy đủ Đợt, Kỳ, Năm học và Loại hợp đồng', icon: 'error', confirmButtonText: 'OK' });
        return;
    }

    // Kiem tra phai chon Tat ca khoa
    if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
        Swal.fire({ title: 'Lỗi!', text: 'Với hợp đồng mời giảng, chỉ được chọn "Tất cả khoa", không thể duyệt từng khoa riêng lẻ', icon: 'error', confirmButtonText: 'OK' });
        return;
    }

    const message = `Bạn có chắc chắn muốn duyệt tất cả hợp đồng mời giảng cho đợt ${dot}, kỳ ${ki}, năm học ${namHoc}?`;

    Swal.fire({
        title: 'Xác nhận duyệt hợp đồng', text: message, icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#3085d6', cancelButtonColor: '#d33',
        confirmButtonText: 'Có, duyệt hợp đồng', cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            showLoading(true, 'Đang xử lý duyệt hợp đồng...');
            $.ajax({
                url: '/api/approve-contracts', type: 'POST',
                data: { dot, ki, namHoc, maPhongBan, loaiHopDong },
                success: function (response) {
                    if (response.success) {
                        Swal.fire({ title: 'Thành công!', text: response.message || 'Duyệt hợp đồng thành công', icon: 'success', confirmButtonText: 'OK' })
                            .then(() => { loadContractData(); });
                    } else {
                        Swal.fire({ title: 'Lỗi!', text: response.message || 'Có lỗi xảy ra khi duyệt hợp đồng', icon: 'error', confirmButtonText: 'OK' });
                    }
                },
                error: function () {
                    Swal.fire({ title: 'Lỗi!', text: 'Có lỗi xảy ra khi kết nối với server', icon: 'error', confirmButtonText: 'OK' });
                },
                complete: function () {
                    showLoading(false);
                }
            });
        }
    });
}

/**
 * Bo duyet hop dong
 */
function unapproveContract() {
    const dot = $('#combobox-dot').val();
    const ki = $('#comboboxki').val();
    const namHoc = $('#NamHoc').val();
    const maPhongBan = $('#MaPhongBan').val();
    const loaiHopDong = $('#loaiHopDong').val();

    if (!dot || !ki || !namHoc || !loaiHopDong) {
        Swal.fire({ title: 'Lỗi!', text: 'Vui lòng chọn đầy đủ Đợt, Kỳ, Năm học và Loại hợp đồng', icon: 'error', confirmButtonText: 'OK' });
        return;
    }

    if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
        Swal.fire({ title: 'Lỗi!', text: 'Với hợp đồng mời giảng, chỉ được chọn "Tất cả khoa", không thể bỏ duyệt từng khoa riêng lẻ', icon: 'error', confirmButtonText: 'OK' });
        return;
    }

    const message = `Bạn có chắc chắn muốn BỎ DUYỆT tất cả hợp đồng mời giảng cho đợt ${dot}, kỳ ${ki}, năm học ${namHoc}?`;

    Swal.fire({
        title: 'Xác nhận bỏ duyệt hợp đồng', text: message, icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#ffc107', cancelButtonColor: '#d33',
        confirmButtonText: 'Có, bỏ duyệt hợp đồng', cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            showLoading(true, 'Đang xử lý bỏ duyệt hợp đồng...');
            $.ajax({
                url: '/api/unapprove-contracts', type: 'POST',
                data: { dot, ki, namHoc, maPhongBan, loaiHopDong },
                success: function (response) {
                    if (response.success) {
                        Swal.fire({ title: 'Thành công!', text: response.message || 'Bỏ duyệt hợp đồng thành công', icon: 'success', confirmButtonText: 'OK' })
                            .then(() => { loadContractData(); });
                    } else {
                        Swal.fire({ title: 'Lỗi!', text: response.message || 'Có lỗi xảy ra khi bỏ duyệt hợp đồng', icon: 'error', confirmButtonText: 'OK' });
                    }
                },
                error: function () {
                    Swal.fire({ title: 'Lỗi!', text: 'Có lỗi xảy ra khi kết nối với server', icon: 'error', confirmButtonText: 'OK' });
                },
                complete: function () {
                    showLoading(false);
                }
            });
        }
    });
}

/**
 * Cap nhat trang thai trinh duyet
 * @param {string} dot - Dot
 * @param {string} ki - Ki
 * @param {string} namHoc - Nam hoc
 */
function updateBrowserStatus(dot, ki, namHoc) {
    const loaiHopDong = $('#loaiHopDong').val();

    $.ajax({
        url: '/api/unapprove-contracts', type: 'POST',
        data: { dot, ki, namHoc, maPhongBan: "ALL", loaiHopDong },
        success: function (response) {
            if (response.success) {
                loadContractData();
            } else {
                console.error('Lỗi bỏ duyệt:', response.message);
            }
        },
        error: function () {
            console.error('Lỗi kết nối server khi gọi unapprove-contracts');
        }
    });
}
