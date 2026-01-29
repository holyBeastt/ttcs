/**
 * Logic xử lý giao diện Quản lý Quy định NCKH v2
 * Date: 2026-01-26
 */

$(document).ready(function () {
    // 1. Xử lý chuyển đổi Tab
    $('.nckh-tab-btn').on('click', function () {
        const tabId = $(this).data('tab');

        // Cập nhật trạng thái nút
        $('.nckh-tab-btn').removeClass('active');
        $(this).addClass('active');

        // Cập nhật nội dung hiển thị
        $('.tab-pane').removeClass('active');
        $('#content-' + tabId).addClass('active');

        // Lưu trạng thái tab hiện tại vào sessionStorage
        sessionStorage.setItem('activeNckhTab', tabId);
    });

    // Khôi phục tab đã chọn trước đó
    const savedTab = sessionStorage.getItem('activeNckhTab');
    if (savedTab) {
        $(`.nckh-tab-btn[data-tab="${savedTab}"]`).trigger('click');
    }

    // 2. Xử lý gửi Form (Thêm/Sửa)
    $('#quyDinhForm').on('submit', function (e) {
        e.preventDefault();

        const formData = {
            id: $('#quyDinhId').val(),
            loaiNCKH: $('#loaiNCKH').val(),
            phanLoai: $('#phanLoai').val(),
            soGio: $('#soGio').val(),
            moTa: $('#moTa').val()
        };

        Swal.fire({
            title: 'Đang lưu dữ liệu...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/v2/admin/quy-dinh',
            type: 'POST',
            data: formData,
            success: function (res) {
                if (res.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Thành công',
                        text: res.message,
                        timer: 1500
                    }).then(() => {
                        location.reload();
                    });
                } else {
                    Swal.fire('Lỗi', res.message, 'error');
                }
            },
            error: function (err) {
                console.error("Lỗi AJAX:", err);
                Swal.fire('Lỗi', 'Không thể kết nối tới máy chủ.', 'error');
            }
        });
    });
});

/**
 * Mở modal thêm quy định mới
 */
function openAddModal() {
    $('#quyDinhForm')[0].reset();
    $('#modalTitle').text('Thêm quy định mới');
    $('#quyDinhId').val('');
    $('#loaiNCKH').prop('disabled', false);
    
    // Nếu đang ở tab nào thì tự chọn tab đó luôn
    const activeTab = $('.nckh-tab-btn.active').data('tab');
    if (activeTab) {
        $('#loaiNCKH').val(activeTab);
    }

    $('#quyDinhModal').modal('show');
}

/**
 * Mở modal sửa quy định
 */
function openEditModal(dataStr) {
    try {
        const data = JSON.parse(dataStr);
        $('#modalTitle').text('Cập nhật quy định');
        $('#quyDinhId').val(data.ID);
        $('#loaiNCKH').val(data.LoaiNCKH).prop('disabled', true);
        $('#phanLoai').val(data.PhanLoai);
        $('#soGio').val(data.SoGio);
        $('#moTa').val(data.MoTa);

        $('#quyDinhModal').modal('show');
    } catch (e) {
        console.error("Lỗi parse dữ liệu:", e);
        Swal.fire('Lỗi', 'Không thể đọc dữ liệu bản ghi.', 'error');
    }
}

/**
 * Bật/Tắt trạng thái IsActive
 */
function toggleStatus(id, isChecked) {
    const isActive = isChecked ? 1 : 0;
    const statusText = isChecked ? "bật" : "tắt";

    $.ajax({
        url: `/v2/admin/quy-dinh/toggle/${id}`,
        type: 'PATCH',
        data: JSON.stringify({ isActive: isActive }),
        contentType: 'application/json',
        success: function (res) {
            if (res.success) {
                // Hiển thị toast thông báo nhỏ thay vì Swal lớn
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                });

                Toast.fire({
                    icon: 'success',
                    title: `Đã ${statusText} quy định.`
                });

                // Cập nhật Badge text và màu sắc
                const label = $(`#label-${id}`);
                if (isChecked) {
                    label.text('Bật').removeClass('bg-light text-muted border').addClass('bg-secondary text-white');
                } else {
                    label.text('Tắt').removeClass('bg-secondary text-white').addClass('bg-light text-muted border');
                }
            } else {
                Swal.fire('Lỗi', res.message, 'error');
                $(`#switch-${id}`).prop('checked', !isChecked); // Hoàn tác nếu lỗi
            }
        },
        error: function (err) {
            console.error("Lỗi AJAX:", err);
            Swal.fire('Lỗi', 'Không thể cập nhật trạng thái.', 'error');
            $(`#switch-${id}`).prop('checked', !isChecked); // Hoàn tác nếu lỗi
        }
    });
}
