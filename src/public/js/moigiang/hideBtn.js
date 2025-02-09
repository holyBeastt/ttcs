document.addEventListener("DOMContentLoaded", () => {
    const isKhoa = localStorage.getItem("isKhoa");
    const role = localStorage.getItem("userRole");
    const importQuyChuan = document.getElementById("quychuandukien");
    const MaPhongBan = localStorage.getItem("MaPhongBan");
    const Home = document.getElementById("Home");
    const ThongTinGD = document.getElementById("ThongTinGD");
    const actionButton = document.getElementById("actionButton");
    const actionButton1 = document.getElementById("actionButton1");
    const actionButton2 = document.getElementById("actionButton2");
    const actionButton3 = document.getElementById("actionButton3");

    importQuyChuan.addEventListener("click", function (event) {
        window.location.href = "/import";
    });

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

    if (isKhoa == 0) {
        actionButton1.style.display = "none"; // Ẩn actionButton1 nếu isKhoa = 0
        actionButton2.style.display = "inline-block"; // Hiện actionButton2
    } else {
        actionButton1.style.display = "inline-block"; // Hiện actionButton1 nếu isKhoa khác 0
        actionButton2.style.display = "none"; // Ẩn actionButton2
        if (role.toLowerCase() == "gv") {
            actionButton1.style.display = "none"; // Hiện actionButton1 nếu isKhoa khác 0
        }
    }
    //Ẩn site duyệt lớp gk
    if (role === "Lãnh đạo khoa" || role === "Duyệt") {
        actionButton3.style.display = "";
    } else {
        actionButton3.style.display = "none";
    }

    // Ẩn nút thêm thông báo ngay khi trang được tải
    const changeMessageBtn = document.getElementById("changeMessage");
    //Ẩn site thêm thông báo
    if (role === "Duyệt") {
        changeMessageBtn.style.display = "";
    } else {
        changeMessageBtn.style.display = "none";
    }
});