const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Middleware để xác thực JWT token
 */
const verifyToken = (req, res, next) => {
  // Lấy token từ header Authorization
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Không tìm thấy token truy cập, vui lòng đăng nhập" });
  }

  try {
    const secret = process.env.JWT_SECRET || "your-secret-key";
    const decoded = jwt.verify(token, secret);
    
    // Gán thông tin user vào request object
    req.user = decoded;
    
    // Tùy chọn: có thể đồng bộ với session nếu cần thiết
    // req.session.userId = decoded.userId;
    // req.session.username = decoded.username;
    // req.session.role = decoded.role;
    // req.session.MaPhongBan = decoded.MaPhongBan;
    // req.session.isKhoa = decoded.isKhoa;
    
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

module.exports = verifyToken;
