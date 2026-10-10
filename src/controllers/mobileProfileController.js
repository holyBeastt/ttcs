const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const createPoolConnection = require("../config/databasePool");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key";

const getUserId = (req) => {
  const userId = Number(req.user?.userId);
  return Number.isInteger(userId) && userId > 0 ? userId : null;
};

const asTrimmed = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

const getProfile = async (connection, userId) => {
  const [rows] = await connection.query(
    `SELECT
       nv.id_User,
       nv.TenNhanVien,
       nv.DienThoai,
       nv.DiaChiHienNay,
       nv.HocVi,
       nv.ChucVu,
       nv.MaPhongBan,
       tk.TenDangNhap,
       r.Quyen,
       r.isKhoa
     FROM nhanvien nv
     LEFT JOIN taikhoannguoidung tk ON tk.id_User = nv.id_User
     LEFT JOIN role r ON r.TenDangNhap = tk.TenDangNhap
     WHERE nv.id_User = ?
     LIMIT 1`,
    [userId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id_User: row.id_User,
    username: row.TenDangNhap || "",
    TenNhanVien: row.TenNhanVien || "",
    DienThoai: row.DienThoai || "",
    DiaChiHienNay: row.DiaChiHienNay || "",
    HocVi: row.HocVi || null,
    ChucVu: row.ChucVu || null,
    MaPhongBan: row.MaPhongBan || null,
    role: row.Quyen || null,
    isKhoa: row.isKhoa ?? null,
  };
};

const getContactValue = (body, ...keys) => {
  for (const key of keys) {
    if (hasOwn(body, key)) return body[key];
  }
  return undefined;
};

const validateContact = (body, current) => {
  const hasPhone = keysPresent(body, "DienThoai", "phone");
  const hasAddress = keysPresent(body, "DiaChiHienNay", "address");
  if (!hasPhone && !hasAddress) {
    return { error: "Không có thông tin liên hệ nào cần cập nhật." };
  }

  const phone = hasPhone
    ? asTrimmed(getContactValue(body, "DienThoai", "phone"))
    : current.DienThoai;
  const address = hasAddress
    ? asTrimmed(getContactValue(body, "DiaChiHienNay", "address"))
    : current.DiaChiHienNay;

  if (phone && (phone.length > 30 || !/^[0-9+()\-\s.]+$/.test(phone))) {
    return { error: "Số điện thoại không hợp lệ." };
  }
  if (address.length > 255) {
    return { error: "Địa chỉ liên hệ không được vượt quá 255 ký tự." };
  }

  return { phone, address, hasPhone, hasAddress };
};

const keysPresent = (body, ...keys) => keys.some((key) => hasOwn(body, key));

const writeAuditLog = async (connection, { userId, name, department, type, content }) => {
  try {
    await connection.query(
      `INSERT INTO lichsunhaplieu
        (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, name || "", department || "", type, content],
    );
  } catch (error) {
    // Audit failure must not turn a successful profile update into a rollback.
    console.error("[MobileProfile] audit log failed:", error.message);
  }
};

const issueMobileTokens = async (connection, account, profile) => {
  const accessToken = jwt.sign(
    {
      userId: account.id_User,
      username: account.TenDangNhap,
      role: profile.role,
      MaPhongBan: profile.MaPhongBan,
      isKhoa: profile.isKhoa,
      TenNhanVien: profile.TenNhanVien,
    },
    JWT_SECRET,
    { expiresIn: "15m" },
  );

  const refreshToken = jwt.sign(
    { userId: account.id_User, jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: "30d" },
  );
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await connection.query(
    "INSERT INTO refresh_tokens (token, id_User, expires_at) VALUES (?, ?, ?)",
    [refreshToken, account.id_User, expiresAt],
  );

  return { accessToken, refreshToken };
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 15 * 60 * 1000,
    sameSite: "lax",
  });
  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/api/mobile/v1/refresh",
  });
};

const getMe = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ." });

  let connection;
  try {
    connection = await createPoolConnection();
    const profile = await getProfile(connection, userId);
    if (!profile) return res.status(404).json({ message: "Không tìm thấy thông tin tài khoản." });
    return res.json({ success: true, data: profile });
  } catch (error) {
    console.error("[MobileProfile] get me failed:", error);
    return res.status(500).json({ message: "Không thể tải thông tin tài khoản." });
  } finally {
    if (connection) connection.release();
  }
};

const updateContact = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ." });

  let connection;
  try {
    connection = await createPoolConnection();
    const current = await getProfile(connection, userId);
    if (!current) return res.status(404).json({ message: "Không tìm thấy thông tin nhân viên." });

    const validated = validateContact(req.body || {}, current);
    if (validated.error) return res.status(400).json({ message: validated.error });

    await connection.beginTransaction();
    await connection.query(
      "UPDATE nhanvien SET DienThoai = ?, DiaChiHienNay = ? WHERE id_User = ?",
      [validated.phone, validated.address, userId],
    );

    const changes = [];
    if (validated.hasPhone && current.DienThoai !== validated.phone) {
      changes.push("DienThoai");
    }
    if (validated.hasAddress && current.DiaChiHienNay !== validated.address) {
      changes.push("DiaChiHienNay");
    }
    await writeAuditLog(connection, {
      userId,
      name: current.TenNhanVien,
      department: current.MaPhongBan,
      type: "Cập nhật thông tin liên hệ",
      content: changes.length ? `Cập nhật: ${changes.join(", ")}` : "Không có thay đổi",
    });

    await connection.commit();
    const profile = await getProfile(connection, userId);
    return res.json({ success: true, message: "Cập nhật thông tin thành công.", data: profile });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) { /* no-op */ }
    }
    console.error("[MobileProfile] update contact failed:", error);
    return res.status(500).json({ message: "Không thể cập nhật thông tin liên hệ." });
  } finally {
    if (connection) connection.release();
  }
};

const changePassword = async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ message: "Phiên đăng nhập không hợp lệ." });

  const currentPassword = asTrimmed(req.body?.currentPassword);
  const newPassword = asTrimmed(req.body?.newPassword);
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới." });
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    return res.status(400).json({ message: "Mật khẩu mới phải từ 8 đến 128 ký tự." });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: "Mật khẩu mới phải khác mật khẩu hiện tại." });
  }

  let connection;
  try {
    connection = await createPoolConnection();
    const [accounts] = await connection.query(
      "SELECT id_User, TenDangNhap, MatKhau FROM taikhoannguoidung WHERE id_User = ? LIMIT 1",
      [userId],
    );
    const account = accounts[0];
    if (!account) return res.status(404).json({ message: "Không tìm thấy tài khoản." });

    const isBcrypt = String(account.MatKhau || "").startsWith("$2");
    const matches = isBcrypt
      ? await bcrypt.compare(currentPassword, account.MatKhau)
      : account.MatKhau === currentPassword;
    if (!matches) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const profile = await getProfile(connection, userId);
    if (!profile) return res.status(404).json({ message: "Không tìm thấy thông tin nhân viên." });

    await connection.beginTransaction();
    await connection.query(
      "UPDATE taikhoannguoidung SET MatKhau = ? WHERE id_User = ?",
      [hashedPassword, userId],
    );
    // Revoke every old refresh token; the response below issues one fresh pair
    // for the device that just completed the password change.
    await connection.query("DELETE FROM refresh_tokens WHERE id_User = ?", [userId]);
    const tokens = await issueMobileTokens(connection, account, profile);
    await writeAuditLog(connection, {
      userId,
      name: profile.TenNhanVien,
      department: profile.MaPhongBan,
      type: "Đổi mật khẩu",
      content: "Người dùng tự đổi mật khẩu trên ứng dụng mobile",
    });
    await connection.commit();

    setAuthCookies(res, tokens);
    return res.json({
      success: true,
      message: "Đổi mật khẩu thành công.",
      ...tokens,
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (_) { /* no-op */ }
    }
    console.error("[MobileProfile] change password failed:", error);
    return res.status(500).json({ message: "Không thể đổi mật khẩu." });
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  getMe,
  updateContact,
  changePassword,
  // Export pure helpers for focused validation tests.
  validateContact,
};
