document
    .getElementById("infome")
    .addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn chặn hành vi mặc định của thẻ a
        const id_User = localStorage.getItem("id_User"); // Lấy id_User từ localStorage\
        if (id_User) {
            // Chuyển hướng đến trang infome và truyền id_User trong URL
            window.location.href = `/infome/${id_User}`;
        } else {
            alert("Không tìm thấy id_User trong localStorage.");
        }
    });


document
    .getElementById("changeMessage")
    .addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn chặn hành vi mặc định của thẻ a
        const MaPhongBan = localStorage.getItem("MaPhongBan"); // Lấy MaPhongBan từ localStorage

        if (MaPhongBan) {
            // Chuyển hướng đến trang changeMessage và truyền MaPhongBan trong URL
            window.location.href = `/changeMessage/${MaPhongBan}`;
        } else {
            alert("Không tìm thấy MaPhongBan trong localStorage.");
        }
    });

document
    .getElementById("changePasswordLink")
    .addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn chặn hành vi mặc định của thẻ a
        const tenDangNhap = localStorage.getItem("TenDangNhap"); // Lấy TenDangNhap từ localStorage

        if (tenDangNhap) {
            // Chuyển hướng đến trang changePassword và truyền TenDangNhap trong URL
            window.location.href = `/changePassword?tenDangNhap=${encodeURIComponent(
                tenDangNhap
            )}`;
        } else {
            alert("Không tìm thấy TenDangNhap trong localStorage.");
        }
    });