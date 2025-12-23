/**
 * duyet-hop-dong.js
 * Các hàm duyệt và bỏ duyệt hợp đồng đồ án
 */

/**
 * Duyệt hợp đồng
 */
function approveContract() {
    handleContractApproval('/api/approve-contracts-do-an', 'duyệt');
}

/**
 * Bỏ duyệt hợp đồng
 */
function unapproveContract() {
    handleContractApproval('/api/unapprove-contracts-do-an', 'bỏ duyệt');
}

/**
 * Xử lý duyệt/bỏ duyệt hợp đồng
 * @param {string} url - URL API
 * @param {string} action - Hành động ('duyệt' hoặc 'bỏ duyệt')
 */
function handleContractApproval(url, action) {
    const params = getFilterParams();
    if (!validateParams(params) || !params.loaiHopDong) {
        Swal.fire({
            title: 'Lỗi!',
            text: 'Vui lòng chọn đầy đủ Đợt, Kỳ, Năm học và Loại hợp đồng',
            icon: 'error'
        });
        return;
    }

    if (action === 'bỏ duyệt' && params.loaiHopDong !== 'Đồ án') {
        Swal.fire({
            title: 'Lỗi!',
            text: 'Chỉ có thể bỏ duyệt hợp đồng đồ án',
            icon: 'error'
        });
        return;
    }

    const message = `Bạn có chắc chắn muốn ${action} hợp đồng đồ án cho đợt ${params.dot}, kỳ ${params.ki}, năm học ${params.namHoc}${params.maPhongBan ? `, khoa: ${$('#MaPhongBan option:selected').text()}` : ''}?`;

    Swal.fire({
        title: `Xác nhận ${action} hợp đồng`,
        text: message,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: action === 'duyệt' ? '#3085d6' : '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: `Có, ${action} hợp đồng`,
        cancelButtonText: 'Hủy bỏ'
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: url,
                type: 'POST',
                data: params,
                success: function (response) {
                    if (response.success) {
                        Swal.fire({
                            title: 'Thành công!',
                            text: response.message || `${action.charAt(0).toUpperCase() + action.slice(1)} hợp đồng thành công`,
                            icon: 'success'
                        }).then(() => loadContractData());
                    } else {
                        Swal.fire({
                            title: 'Lỗi!',
                            text: response.message || `Có lỗi xảy ra khi ${action} hợp đồng`,
                            icon: 'error'
                        });
                    }
                },
                error: function () {
                    Swal.fire({
                        title: 'Lỗi!',
                        text: 'Có lỗi xảy ra khi kết nối với server',
                        icon: 'error'
                    });
                }
            });
        }
    });
}

/**
 * Cập nhật trạng thái browser sau khi bỏ duyệt
 */
function updateBrowserStatus() {
    const params = getFilterParams();

    $.ajax({
        url: "/api/unapprove-contracts-do-an",
        type: 'POST',
        data: params,
        success: function (response) {
            if (response.success) {
                loadContractData();
            }
        },
        error: function () {
            console.error("Lỗi kết nối với server khi bỏ duyệt contract.");
        }
    });
}
