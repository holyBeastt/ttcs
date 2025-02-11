$(document).ready(function () {
    $('#NamHoc option[value=""]').remove();
    $('#comboboxki option[value=""]').remove();
    $('#combobox-dot option[value=""]').remove();

    $.ajax({
        url: "/getNamHoc",
        method: "GET",
        success: function (response) {
            if (response.success) {
                response.NamHoc.forEach(function (item) {
                    console.log(item.NamHoc);
                    $("#NamHoc").append(
                        `<option value="${item.NamHoc}">${item.NamHoc}</option>`
                    );
                });

                response.Ki.forEach(function (item) {
                    console.log(item.Ki);
                    $("#comboboxki").append(
                        `<option value="${item.value}">${item.Ki}</option>`
                    );
                });
                response.Dot.forEach(function (item) {
                    console.log(item.Dot);
                    $("#combobox-dot").append(
                        `<option value="${item.value}">${item.Dot}</option>`
                    );
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
                $("#MaPhongBan").prepend();
                // Lặp qua từng mục trong mảng MaPhongBan
                MaPhongBan.forEach(function (item) {
                    console.log(item);
                    $("#MaPhongBan").append(
                        `<option value="${item.MaPhongBan}">${item.MaPhongBan}</option>`
                    );
                });

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