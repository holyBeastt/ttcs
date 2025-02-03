/* Lấy dữ liệu năm học, mã phòng ban */;
$(document).ready(function () {
    // Xóa các option trống trong tất cả các select có class .namHoc
    $('.namHoc option[value=""]').remove();

    // Gửi yêu cầu AJAX để lấy danh sách năm học
    $.ajax({
        url: "/getNamHoc",
        method: "GET",
        success: function (response) {
            if (response.success) {
                // Lặp qua mỗi select có class .namHoc
                $(".namHoc").each(function () {
                    const selectElement = $(this); // Lấy select hiện tại
                    response.NamHoc.forEach(function (item) {
                        console.log(item.NamHoc);
                        selectElement.append(
                            `<option value="${item.NamHoc}">${item.NamHoc}</option>`
                        );
                    });
                });
            } else {
                console.error(
                    "Không lấy được dữ liệu năm học:",
                    response.message
                );
            }
        },
        error: function (error) {
            console.error("Lỗi khi lấy dữ liệu năm học:", error);
        },
    });
});

$(document).ready(function () {
    $('#MaPhongBan option[value=""]').remove();
    // Gọi AJAX để lấy dữ liệu JSON từ API
    $.ajax({
        url: "/getPhongBan", // Đường dẫn tới API getPhongBan
        method: "GET",
        success: function (response) {
            // Kiểm tra nếu response thành công
            const MaPhongBan = response.MaPhongBan;
            if (response.success) {
                // $('#MaPhongBan').prepend('<option value="ALL">Tất cả khoa</option>');
                // Lặp qua từng mục trong mảng MaPhongBan
                response.MaPhongBan.forEach(function (item) {
                    // Nếu item.MaPhongBan bằng boMon.MaPhongBan, hiển thị trước
                    console.log(item);
                    $(".MaPhongBan").append(
                        `<option value="${item.MaPhongBan}">${item.MaPhongBan}</option>`
                    );
                });

                // Nếu không có phòng ban nào tương ứng, bạn có thể thêm tùy chọn mặc định ở đây
                if (!$("#MaPhongBan option:selected").length) {
                    $("#MaPhongBan").prepend(
                        '<option value="">Chọn Phòng Ban</option>'
                    );
                }
            } else {
                console.error(
                    "Không lấy được dữ liệu phongBan:",
                    response.message
                );
            }
        },
        error: function (error) {
            console.error("Lỗi khi lấy dữ liệu phongBan:", error);
        },
    });
});