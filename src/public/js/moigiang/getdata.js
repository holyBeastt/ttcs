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
          $("#NamHoc").append(
            `<option value="${item.NamHoc}">${item.NamHoc}</option>`
          );
        });

        response.Ki.forEach(function (item) {
          $("#comboboxki").append(
            `<option value="${item.value}">${item.Ki}</option>`
          );
        });
        response.Dot.forEach(function (item) {
          $("#combobox-dot").append(
            `<option value="${item.value}">${item.Dot}</option>`
          );
        });
      } else {
        console.error("Không lấy được dữ liệu năm học:", response.message);
      }
    },
    error: function (error) {
      console.error("Lỗi khi lấy dữ liệu năm học:", error);
    },
  });
});

$(document).ready(function () {
  // Gọi AJAX để lấy dữ liệu JSON từ API
  $.ajax({
    url: "/api/shared/faculty-code-list", // Đường dẫn tới API getPhongBan
    method: "GET",
    success: function (response) {
      // Kiểm tra nếu response thành công
      const MaPhongBan = response.MaPhongBan;
      if (response.success) {
        // Giữ lại option "Tất cả khoa" và thêm các khoa khác
        // Lặp qua từng mục trong mảng MaPhongBan
        MaPhongBan.forEach(function (item) {
          $("#MaPhongBan").append(
            `<option value="${item.MaPhongBan}">${item.MaPhongBan}</option>`
          );
        });
      } else {
        console.error("Không lấy được dữ liệu phongBan:", response.message);
      }
    },
    error: function (error) {
      console.error("Lỗi khi lấy dữ liệu phongBan:", error);
    },
  });
});
