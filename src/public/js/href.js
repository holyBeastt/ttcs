// trang đổi mk
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


// phân quyền chia site info, info2
document.addEventListener("DOMContentLoaded", () => {
    // Thêm sự kiện click cho phần tử có id="ThongTinGD"
    const ThongTinGD = document.getElementById("ThongTinGD");

    ThongTinGD.addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn chặn hành vi mặc định của liên kết

        const isKhoa = localStorage.getItem("isKhoa"); // Lấy role từ localStorage

        if (isKhoa == 0) {
            // Nếu là đào tạo hoặc tài chính
            window.location.href = "/info2";
        } else {
            window.location.href = "/info";
        }
    });

    // Thêm sự kiện click cho phần tử có id="Home"

    const Home = document.getElementById("Home");

    Home.addEventListener("click", function (event) {
        event.preventDefault(); // Ngăn chặn hành vi mặc định của liên kết

        const isKhoa = localStorage.getItem("isKhoa");

        if (isKhoa == 0) {
            // Nếu là đào tạo hoặc tài chính
            window.location.href = "/maindt";
        } else {
            window.location.href = "/mainkhoa";
        }
    });
});


// thông tin của tôi
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

// trang thêm thông báo
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