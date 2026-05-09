const pool = require("../config/Pool");
const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Controller xử lý cấp lại Access Token từ Refresh Token
 */
const refresh = async (req, res) => {
  const refreshToken = req.cookies && req.cookies.refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ message: "Không tìm thấy refresh token" });
  }

  try {
    // 1. Kiểm tra refresh token có trong database không và có hết hạn không
    const [tokens] = await pool.query(
      "SELECT * FROM refresh_tokens WHERE token = ?",
      [refreshToken]
    );

    if (tokens.length === 0) {
      return res.status(403).json({ message: "Refresh token không hợp lệ hoặc đã bị thu hồi" });
    }

    const t = tokens[0];
    const now = new Date();
    if (new Date(t.expires_at) < now) {
      // Đã hết hạn -> Xóa khỏi DB để dọn dẹp
      await pool.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken]);
      return res.status(403).json({ message: "Refresh token đã hết hạn, vui lòng đăng nhập lại" });
    }

    // 2. Xác thực Refresh Token với jsonwebtoken
    const refreshSecret = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, refreshSecret);
    } catch (err) {
      return res.status(403).json({ message: "Refresh token không hợp lệ" });
    }

    // 3. Lấy thông tin user để tạo Access Token mới (cần role, MaPhongBan, isKhoa, TenNhanVien ...)
    const userId = decoded.userId;

    const [users] = await pool.query("SELECT * FROM taikhoannguoidung WHERE id_User = ?", [userId]);
    if (users.length === 0) {
      return res.status(404).json({ message: "Tài khoản không tồn tại" });
    }
    const user = users[0];

    const [employeeData] = await pool.query(
      `SELECT TenNhanVien FROM nhanvien WHERE id_User = ?`,
      [userId]
    );
    const TenNhanVien = employeeData[0]?.TenNhanVien || null;

    const [roleData] = await pool.query(
      "SELECT MaPhongBan, Quyen, isKhoa FROM role WHERE TenDangNhap = ?",
      [user.TenDangNhap]
    );
    const roleInfo = roleData[0] || {};
    
    // 4. Sinh Access Token mới
    const token = jwt.sign(
      {
        userId: user.id_User,
        username: user.TenDangNhap,
        role: roleInfo.Quyen || null,
        MaPhongBan: roleInfo.MaPhongBan || null,
        isKhoa: roleInfo.isKhoa || null,
        TenNhanVien
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "15m" }
    );

    // 5. Set new Access Token as cookie
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, // 15 mins
      sameSite: "lax",
    });

    return res.status(200).json({
      message: "Làm mới token thành công"
    });

  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

module.exports = refresh;
