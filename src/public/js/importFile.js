document.getElementById("chosseFile").addEventListener("click", function () {
  // Tạo một input để chọn file
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".xlsx"; // Chỉ cho phép chọn file Excel

  // Khi có file được chọn
  fileInput.addEventListener("change", function () {
    const formData = new FormData();
    formData.append("excelFile", fileInput.files[0]); // Thêm file vào FormData

    // Gửi yêu cầu POST đến server
    fetch("http://localhost:3000/index/import", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Import thất bại");
        }
        return response.json(); // Chuyển đổi phản hồi sang JSON
      })
      .then((data) => {
        if (!data || data.length === 0) {
          throw new Error("Dữ liệu trả về trống");
        }

        // Tạo bảng HTML từ dữ liệu JSON, bỏ qua cột "Ghi chú"
        let tableHtml = '<table class="table table-bordered"><thead><tr>';

        // Lấy tiêu đề từ đối tượng JSON đầu tiên (trừ "Ghi chú")
        const headers = Object.keys(data[0]).filter((key) => key !== "Ghi chú");
        headers.forEach((header) => {
          tableHtml += `<th>${header}</th>`;
        });
        tableHtml += "</tr></thead><tbody>";

        // Duyệt qua từng mục trong dữ liệu
        data.forEach((item) => {
          tableHtml += "<tr>";
          headers.forEach((key) => {
            tableHtml += `<td>${item[key] !== null ? item[key] : ""}</td>`;
          });
          tableHtml += "</tr>";
        });
        tableHtml += "</tbody></table>";

        // Chèn bảng vào thẻ div có id="dataTableContainer"
        document.getElementById("dataTableContainer").innerHTML = tableHtml;

        // Lưu dữ liệu JSON để sử dụng sau
        window.receivedJsonData = data; // Lưu vào biến toàn cục
      })
      .catch((error) => {
        document.getElementById("uploadStatus").innerHTML = `
      <span style="color: red;">Import thất bại!</span>
    `;
        console.error(error);
      });
  });

  // Tự động mở dialog chọn file
  fileInput.click();
});

// Xử lý khi nhấn nút checkAccecpt
document.getElementById("checkAccecpt").addEventListener("click", function () {
  // Kiểm tra xem dữ liệu JSON đã nhận có tồn tại không
  if (window.receivedJsonData) {
    // Gửi dữ liệu JSON lên server
    fetch("http://localhost:3000/accept", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(window.receivedJsonData), // Gửi dữ liệu đã nhận
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Gửi dữ liệu thất bại");
        }
        return response.json(); // Chuyển đổi phản hồi sang JSON
      })
      .then((data) => {
        alert("Xin duyệt gửi thành công!");
      })
      .catch((error) => {
        console.error("Lỗi:", error);
        alert("Gửi dữ liệu thất bại!");
      });
  } else {
    alert("Không có dữ liệu để gửi.");
  }
});
