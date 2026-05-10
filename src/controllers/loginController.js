const pool = require("../config/Pool");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

/**
 * Đăng nhập người dùng
 */
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Lấy thông tin user
    const [users] = await pool.query(
      "SELECT * FROM taikhoannguoidung WHERE TenDangNhap = ?",
      [username]
    );

    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "Tên tài khoản hoặc mật khẩu không chính xác" });
    }

    const user = users[0];
    let isMatch = false;

    // Password verification with bcrypt + on-the-fly migration
    if (user.MatKhau && user.MatKhau.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(password, user.MatKhau);
    } else {
      // Logic for plain text migration
      if (user.MatKhau === password) {
        isMatch = true;
        // Migrate to hashed password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        await pool.query(
          "UPDATE taikhoannguoidung SET MatKhau = ? WHERE id_User = ?",
          [hashedPassword, user.id_User]
        );
        user.MatKhau = hashedPassword;
      }
    }

    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Tên tài khoản hoặc mật khẩu không chính xác" });
    }

    // Lấy tên nhân viên
    const [employeeData] = await pool.query(
      `SELECT TenNhanVien 
       FROM nhanvien 
       JOIN taikhoannguoidung ON nhanvien.id_User = taikhoannguoidung.id_User
       WHERE taikhoannguoidung.id_User = ?`,
      [user.id_User]
    );
    const TenNhanVien = employeeData[0]?.TenNhanVien || null;

    // Lấy vai trò
    const [roleData] = await pool.query(
      "SELECT MaPhongBan, Quyen, isKhoa FROM role WHERE TenDangNhap = ?",
      [username]
    );

    const roleInfo = roleData[0] || {};
    const { MaPhongBan = null, Quyen: role = null, isKhoa = null } = roleInfo;

    // 1. Issue Access Token
    const token = jwt.sign(
      {
        userId: user.id_User,
        username,
        role,
        MaPhongBan,
        isKhoa,
        TenNhanVien
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "15m" }
    );

    // 2. Issue Refresh Token
    const refreshToken = jwt.sign(
      { userId: user.id_User },
      process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
      { expiresIn: "30d" }
    );

    // 3. Store Refresh Token in DB
    await pool.query(
      "CREATE TABLE IF NOT EXISTS refresh_tokens (token VARCHAR(500) PRIMARY KEY, id_User INT NOT NULL, expires_at DATETIME NOT NULL)"
    );
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    await pool.query(
      "INSERT INTO refresh_tokens (token, id_User, expires_at) VALUES (?, ?, ?)",
      [refreshToken, user.id_User, expiresAt]
    );

    // 4. Set HttpOnly Cookies for browser clients
    res.cookie("access_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, // 15 mins
      sameSite: "lax",
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/api/mobile/v1/refresh",
    });

    // 5. Still update Session for backward compatibility with existing server-side routes
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

    // 6. Return response (Cookies handle the auth automatically)
    return res.status(200).json({
      url,
      role,
      MaPhongBan,
      isKhoa,
      TenNhanVien,
      username,
      id_User: user.id_User,
      accessToken: token,
      refreshToken: refreshToken
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
