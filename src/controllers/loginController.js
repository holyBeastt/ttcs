const pool = require("../config/Pool");
require("dotenv").config();

/**
 * Đăng nhập người dùng
 */
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Lấy thông tin user
    const [users] = await pool.query(
      "SELECT * FROM taikhoannguoidung WHERE TenDangNhap = ? AND MatKhau = ?",
      [username, password]
    );

    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "Tên tài khoản hoặc mật khẩu không chính xác" });
    }

    const user = users[0];

    // Lấy tên nhân viên
    const [employeeData] = await pool.query(
      `SELECT TenNhanVien 
       FROM nhanvien 
       JOIN taikhoannguoidung ON nhanvien.id_User = taikhoannguoidung.id_User
       WHERE taikhoannguoidung.TenDangNhap = ?`,
      [username]
    );
    const TenNhanVien = employeeData[0]?.TenNhanVien || null;

    // Lấy vai trò
    const [roleData] = await pool.query(
      "SELECT MaPhongBan, Quyen, isKhoa FROM role WHERE TenDangNhap = ?",
      [username]
    );

    const roleInfo = roleData[0] || {};
    const { MaPhongBan = null, Quyen: role = null, isKhoa = null } = roleInfo;

    // Lưu session
    Object.assign(req.session, {
      userId: user.id_User,
      username,
      TenNhanVien,
      role,
      MaPhongBan,
      isKhoa,
      tmp: 0,
    });

    // Xác định URL redirect
    const url = getRedirectUrl(role, isKhoa);

    // Trả response
    return res.status(200).json({
      url,
      role,
      MaPhongBan,
      isKhoa,
      TenNhanVien,
      username,
      id_User: user.id_User,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

/**
 * Xác định URL redirect dựa vào role và isKhoa
 */
function getRedirectUrl(role, isKhoa) {
  if (role === "ADMIN") return "/admin";
  if (isKhoa === 1) return "/mainkhoa";
  if (isKhoa === 0) return "/maindt";
  return "/";
}

module.exports = login;
