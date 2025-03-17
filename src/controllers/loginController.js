const createPoolConnection = require("../config/databasePool");
const { use } = require("../routes/adminRoute");
require("dotenv").config();

const login = async (req, res) => {
  const { username, password } = req.body;
  let connection;

  try {
    connection = await createPoolConnection(); // Đảm bảo dùng await

    // Truy vấn người dùng từ cơ sở dữ liệu
    const [users] = await connection.query(
      "SELECT * FROM taikhoannguoidung WHERE TenDangNhap = ?",
      [username]
    );

    // Kiểm tra nếu có người dùng
    if (users.length > 0) {
      const user = users[0];

      // So sánh mật khẩu
      if (user.MatKhau == password) {
        req.session.userId = user.id_User; // Lưu id_User vào session

        // Lấy tên người dùng
        const query = `SELECT TenNhanVien FROM nhanvien 
            JOIN taikhoannguoidung ON nhanvien.id_User = taikhoannguoidung.id_User
            WHERE TenDangNhap = ?`;
        const [TenNhanViens] = await connection.query(query, [username]);
        const TenNhanVien = TenNhanViens[0]?.TenNhanVien;

        // Phân quyền người dùng
        const [roles] = await connection.query(
          "SELECT MaPhongBan, Quyen, isKhoa FROM role WHERE TenDangNhap = ?",
          [username]
        );

        const MaPhongBan = roles[0]?.MaPhongBan; // Kiểm tra an toàn
        const role = roles[0]?.Quyen; // Kiểm tra an toàn
        const isKhoa = roles[0]?.isKhoa; // Kiểm tra an toàn
        req.session.role = role;
        req.session.MaPhongBan = MaPhongBan;
        req.session.isKhoa = isKhoa;

        // Tạo 1 req.session để dùng làm mẫu
        req.session.tmp = 0;

        let url;

        if (role === "ADMIN" || role === "") {
          req.session.role = "ADMIN"; // Gán vai trò admin nếu không có vai trò
          req.session.MaPhongBan = null;
          url = "/admin"; // Đăng nhập vào trang admin
        } else if (isKhoa === 1) {
          url = "/mainkhoa";
        } else {
          url = "/maindt";
        }
        //

        // Trả về phản hồi thành công với url
        return res
          .status(200)
          .json({
            url,
            role,
            MaPhongBan,
            isKhoa,
            TenNhanVien,
            username,
            id_User: user.id_User,
          });
      } else {
        return res.status(401).json({ message: "Mật khẩu không chính xác" });
      }
    } else {
      return res.status(404).json({ message: "Tên tài khoản không chính xác" });
    }
  } catch (err) {
    // Xử lý lỗi
    console.error(err);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

module.exports = login;
