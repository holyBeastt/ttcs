const express = require("express");
const mysql = require("mysql2/promise"); // Ensure you have mysql2 installed
const createPoolConnection = require("../config/databasePool");

const postUpdateNV = async (req, res) => {
  // Lấy các thông tin từ form
  let connection; // Khai báo biến connection

  const {
    TenNhanVien,
    GioiTinh,
    NgaySinh,
    CCCD,
    NgayCapCCCD,
    NoiCapCCCD,
    DiaChiHienNay,
    DienThoai,
    MaSoThue,
    HocVi,
    ChucVu,
    SoTaiKhoan,
    NganHang,
    ChiNhanh,
    MaPhongBan,
    Id_User,
    TenDangNhap,
    Quyen,
    HSL,
    PhanTramMienGiam,
    Luong,
    LyDo,
    tinhTrangGiangDay,
  } = req.body;

  const MaNhanVien = `${MaPhongBan}${Id_User}`;
  try {
    // Kiểm tra giá trị của HSL và PhanTramMienGiam
    // Chuẩn hóa giá trị của HSL
    const validHSL = HSL === "" ? 0 : Number(HSL.toString().replace(",", "."));

    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Kiểm tra nhân viên có tồn tại không
    const [nhanVien] = await connection.execute(
      "SELECT * FROM nhanvien WHERE id_User = ?",
      [Id_User]
    );
    if (nhanVien.length === 0) {
      return res.status(404).json({ message: "Nhân viên không tồn tại" });
    }

    // Kiểm tra trùng CCCD
    const [checkCCCD] = await connection.execute(
      "SELECT COUNT(*) AS count FROM nhanvien WHERE CCCD = ? AND id_User != ?",
      [CCCD, Id_User]
    );
    if (checkCCCD[0].count > 0) {
      return res
        .status(409)
        .json({ message: "CCCD đã tồn tại. Vui lòng kiểm tra lại." });
    }

    // Kiểm tra trùng Tên đăng nhập
    const [checkTenDangNhap] = await connection.execute(
      "SELECT COUNT(*) AS count FROM taikhoannguoidung WHERE TenDangNhap = ? AND id_User != ?",
      [TenDangNhap, Id_User]
    );
    if (checkTenDangNhap[0].count > 0) {
      return res
        .status(409)
        .json({ message: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." });
    }
    const ModeHSL = parseFloat(HSL); // Chuyển thành số thực
    if (isNaN(ModeHSL) || ModeHSL < 0) {
      connection.release();
      return res.status(400).json({
        message: "Hệ số lương phải là số lớn hơn 0. Vui lòng kiểm tra lại.",
      });
    }
    if (!/^\d*$/.test(Luong)) {
      // Kiểm tra nếu Luong không phải là chuỗi số
      connection.release(); // Giải phóng kết nối trước khi trả về
      return res.status(400).json({
        message: "Lương phải là một dãy số hợp lệ. Vui lòng kiểm tra lại.",
      });
    }
    const cleanedPhanTram = PhanTramMienGiam.replace("%", "").trim(); // Xóa dấu %
    const phanTram = parseFloat(cleanedPhanTram); // Chuyển thành số thực
    if (isNaN(phanTram) || phanTram < 0 || phanTram > 100) {
      connection.release();
      return res.status(400).json({
        message:
          "Phần trăm miễn giảm phải là số từ 0 đến 100. Vui lòng kiểm tra lại.",
      });
    }

    // Truy vấn để update dữ liệu vào cơ sở dữ liệu
    const query = `UPDATE nhanvien SET 
      TenNhanVien = ?,
      GioiTinh = ?,
      NgaySinh = ?,
      CCCD = ?,
      NgayCapCCCD = ?,
      NoiCapCCCD = ?,
      DiaChiHienNay = ?,
      DienThoai = ?,
      MaSoThue = ?,
      HocVi = ?,
      ChucVu = ?,
      SoTaiKhoan = ?,
      NganHang = ?,
      ChiNhanh = ?,
      MaPhongBan = ?,
      NoiCongTac = ?,
      DiaChiCCCD = ?,
      MonGiangDayChinh = ?,
      CacMonLienQuan = ?,
      MaNhanVien = ?,
      HSL = ?,
      PhanTramMienGiam = ?,
      Luong = ?,
      LyDoMienGiam = ?,
      TinhTrangGiangDay = ?
      WHERE id_User = ?`;

    const params = [
      TenNhanVien,
      GioiTinh,
      NgaySinh,
      CCCD,
      NgayCapCCCD,
      NoiCapCCCD,
      DiaChiHienNay,
      DienThoai,
      MaSoThue,
      HocVi,
      ChucVu,
      SoTaiKhoan,
      NganHang,
      ChiNhanh,
      MaPhongBan,
      req.body.NoiCongTac,
      req.body.DiaChiCCCD,
      req.body.MonGiangDayChinh,
      req.body.CacMonLienQuan,
      MaNhanVien,
      validHSL,
      phanTram,
      Luong,
      LyDo,
      tinhTrangGiangDay,
      Id_User,
    ];

    await connection.execute(query, params);

    await connection.execute(
      "UPDATE taikhoannguoidung SET TenDangNhap = ? WHERE id_User = ?",
      [TenDangNhap, Id_User]
    );

    // Cập nhật bảng role
    const [resultIsKhoa] = await connection.execute(
      "SELECT isKhoa FROM phongban WHERE MaPhongBan = ?",
      [MaPhongBan]
    );
    const isKhoa = resultIsKhoa.length > 0 ? resultIsKhoa[0].isKhoa : 0;

    await connection.execute(
      "UPDATE role SET MaPhongBan = ?, Quyen = ?, isKhoa = ? WHERE TenDangNhap = ?",
      [MaPhongBan, Quyen, isKhoa, TenDangNhap]
    );

    // Ghi log cập nhật nhân viên thành công
    // --- Ghi log chi tiết cho postUpdateNV ---
    {
      const logQuery = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, NOW())`;
      const userId = 'DAOTAO';
      const tenNhanVien = 'ADMIN';
      const loaiThongTin = 'Admin Log';
      let changes = [];
      function formatDate(val) {
        if (!val) return '';
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          return d.toISOString().slice(0, 10);
        }
        return val;
      }
      if (nhanVien && nhanVien[0]) {
        const oldData = nhanVien[0];
        const newData = {
          TenNhanVien,
          GioiTinh,
          NgaySinh: formatDate(NgaySinh),
          CCCD,
          NgayCapCCCD: formatDate(NgayCapCCCD),
          NoiCapCCCD,
          DiaChiHienNay,
          DienThoai,
          MaSoThue,
          HocVi,
          ChucVu,
          SoTaiKhoan,
          NganHang,
          ChiNhanh,
          MaPhongBan,
          HSL: validHSL,
          PhanTramMienGiam: phanTram,
          Luong,
          LyDo,
          TinhTrangGiangDay: tinhTrangGiangDay,
          TenDangNhap,
          Quyen
        };
        for (const key in newData) {
          let oldVal = oldData[key];
          let newVal = newData[key];
          if (key === 'NgaySinh' || key === 'NgayCapCCCD') {
            oldVal = formatDate(oldVal);
            newVal = formatDate(newVal);
          }
          if (oldVal != undefined && oldVal != newVal) {
            changes.push(`${key}: \"${oldVal}\" → \"${newVal}\"`);
          }
        }
      }
      let changeMessage = `${tenNhanVien} đã cập nhật thông tin nhân viên \"${TenNhanVien}\" (CCCD: ${CCCD}, Mã NV: ${MaNhanVien})`;
      if (changes.length > 0) {
        changeMessage += ": " + changes.join(", ");
      }
      try {
        console.log('[LOG DEBUG] Query:', logQuery);
        console.log('[LOG DEBUG] Params:', userId, tenNhanVien, loaiThongTin, changeMessage);
        const result = await connection.query(logQuery, [userId, tenNhanVien, loaiThongTin, changeMessage]);
        console.log('[LOG DEBUG] Log ghi thành công:', result);
      } catch (err) {
        console.error('[LOG DEBUG] Lỗi khi ghi log:', err);
      }
    }

    res
      .status(200)
      .json({ message: "Cập nhật nhân viên thành công", MaNhanVien });
  } catch (error) {
    console.error("Lỗi khi cập nhật nhân viên:", error);
    res.status(500).json({
      message: "Đã xảy ra lỗi khi cập nhật nhân viên",
      error: error.message,
    });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const postUpdatePhongBan = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const MaPhongBan = req.params.MaPhongBan;
    const { tenPhongBan, ghiChu, khoa } = req.body;
    const isKhoa = khoa ? 1 : 0;

    const query = `UPDATE phongban SET TenPhongBan = ?, GhiChu = ?, isKhoa = ? WHERE MaPhongBan = ?`;
    await connection.query(query, [tenPhongBan, ghiChu, isKhoa, MaPhongBan]);

    // Ghi log cập nhật phòng ban thành công
    // --- Ghi log chi tiết cho postUpdatePhongBan ---
    {
      const logQuery = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, NOW())`;
      const userId = 'DAOTAO';
      const tenNhanVien = 'ADMIN';
      const loaiThongTin = 'Admin Log';
      const [oldPB] = await connection.query("SELECT * FROM phongban WHERE MaPhongBan = ?", [MaPhongBan]);
      let changes = [];
      if (oldPB && oldPB[0]) {
        if (oldPB[0].TenPhongBan != tenPhongBan) changes.push(`TenPhongBan: \"${oldPB[0].TenPhongBan}\" → \"${tenPhongBan}\"`);
        if (oldPB[0].GhiChu != ghiChu) changes.push(`GhiChu: \"${oldPB[0].GhiChu}\" → \"${ghiChu}\"`);
        if (oldPB[0].isKhoa != isKhoa) changes.push(`isKhoa: \"${oldPB[0].isKhoa}\" → \"${isKhoa}\"`);
      }
      let changeMessage = `${tenNhanVien} đã cập nhật phòng ban: \"${tenPhongBan}\" (Mã: ${MaPhongBan})`;
      if (changes.length > 0) {
        changeMessage += ": " + changes.join(", ");
      }
      try {
        console.log('[LOG DEBUG] Query:', logQuery);
        console.log('[LOG DEBUG] Params:', userId, tenNhanVien, loaiThongTin, changeMessage);
        const result = await connection.query(logQuery, [userId, tenNhanVien, loaiThongTin, changeMessage]);
        console.log('[LOG DEBUG] Log ghi thành công:', result);
      } catch (err) {
        console.error('[LOG DEBUG] Lỗi khi ghi log:', err);
      }
    }

    res.redirect("/phongBan?message=True"); // Điều hướng về danh sách phòng ban sau khi cập nhật
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu: ", error);
    res.redirect("/phongBan?message=False"); // Điều hướng về danh sách phòng ban sau khi cập nhật
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const postUpdateTK = async (req, res) => {
  const TenDangNhap = req.params.TenDangNhap;
  let connection;
  const id_User = req.body.id_User;
  const MatKhau = req.body.MatKhau;
  const MaPhongBan = req.body.MaPhongBan;
  const Quyen = req.body.Quyen;
  const Khoa = req.body.isKhoa;
  // const isKhoa = Khoa ? 0 : 1;
  console.log(TenDangNhap, id_User, MatKhau, MaPhongBan, Quyen, Khoa);

  try {
    // Cập nhật bảng đầu tiên
    connection = await createPoolConnection();
    const query1 =
      "UPDATE role SET MaPhongBan = ?, Quyen = ?, isKhoa = ? WHERE TenDangNhap = ?";
    await connection.query(query1, [MaPhongBan, Quyen, Khoa, TenDangNhap]);

    // Cập nhật bảng thứ hai
    const query2 =
      "UPDATE taikhoannguoidung SET id_User = ?, MatKhau = ? WHERE TenDangNhap = ?";
    await connection.query(query2, [id_User, MatKhau, TenDangNhap]);

    // Ghi log cập nhật tài khoản thành công
    // --- Ghi log chi tiết cho postUpdateTK ---
    {
      const [oldRole] = await connection.query("SELECT * FROM role WHERE TenDangNhap = ?", [TenDangNhap]);
      const [oldTK] = await connection.query("SELECT * FROM taikhoannguoidung WHERE TenDangNhap = ?", [TenDangNhap]);
      const logQuery = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, NOW())`;
      const userId = 'DAOTAO';
      const tenNhanVien = 'ADMIN';
      const loaiThongTin = 'Admin Log';
      let changes = [];
      if (oldRole && oldRole[0]) {
        if (oldRole[0].MaPhongBan != MaPhongBan) changes.push(`MaPhongBan: \"${oldRole[0].MaPhongBan}\" → \"${MaPhongBan}\"`);
        if (oldRole[0].Quyen != Quyen) changes.push(`Quyen: \"${oldRole[0].Quyen}\" → \"${Quyen}\"`);
        if (oldRole[0].isKhoa != Khoa) changes.push(`isKhoa: \"${oldRole[0].isKhoa}\" → \"${Khoa}\"`);
      }
      if (oldTK && oldTK[0]) {
        if (oldTK[0].id_User != id_User) changes.push(`id_User: \"${oldTK[0].id_User}\" → \"${id_User}\"`);
        if (oldTK[0].MatKhau != MatKhau) changes.push(`MatKhau: \"***\" → \"***\"`);
      }
      let changeMessage = `${tenNhanVien} đã cập nhật tài khoản: \"${TenDangNhap}\"`;
      if (changes.length > 0) {
        changeMessage += ": " + changes.join(", ");
      }
      try {
        console.log('[LOG DEBUG] Query:', logQuery);
        console.log('[LOG DEBUG] Params:', userId, tenNhanVien, loaiThongTin, changeMessage);
        const result = await connection.query(logQuery, [userId, tenNhanVien, loaiThongTin, changeMessage]);
        console.log('[LOG DEBUG] Log ghi thành công:', result);
      } catch (err) {
        console.error('[LOG DEBUG] Lỗi khi ghi log:', err);
      }
    }

    res.redirect("/thongTinTK?UpdateTK=Success");
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu: ", error.message);
    res.redirect("/thongTinTK?UpdateTK=False");
  } finally {
    if (connection) {
      connection.release(); // Đảm bảo luôn giải phóng kết nối
    }
  }
};

const postUpdateBoMon = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const id_BoMon = req.params;
    const id = id_BoMon.id_BoMon;
    const { MaPhongBan, MaBoMon, TenBoMon, TruongBoMon } = req.body;
    console.log(MaPhongBan, MaBoMon, TenBoMon, TruongBoMon, id);
    const query =
      "UPDATE bomon set MaBoMon = ?, MaPhongBan = ?, TenBoMon = ?, TruongBoMon = ? WHERE id_BoMon = ?";
    await connection.query(query, [
      MaBoMon,
      MaPhongBan,
      TenBoMon,
      TruongBoMon,
      id,
    ]);

    // Ghi log khi admin cập nhật bộ môn
    // --- Ghi log chi tiết cho postUpdateBoMon ---
    try {
      const userId = 'DAOTAO';
      const tenNhanVien = 'ADMIN';
      const logSql = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, NOW())`;
      const [oldBM] = await connection.query("SELECT * FROM bomon WHERE id_BoMon = ?", [id]);
      let changes = [];
      if (oldBM && oldBM[0]) {
        if (oldBM[0].MaBoMon != MaBoMon) changes.push(`MaBoMon: \"${oldBM[0].MaBoMon}\" → \"${MaBoMon}\"`);
        if (oldBM[0].MaPhongBan != MaPhongBan) changes.push(`MaPhongBan: \"${oldBM[0].MaPhongBan}\" → \"${MaPhongBan}\"`);
        if (oldBM[0].TenBoMon != TenBoMon) changes.push(`TenBoMon: \"${oldBM[0].TenBoMon}\" → \"${TenBoMon}\"`);
        if (oldBM[0].TruongBoMon != TruongBoMon) changes.push(`TruongBoMon: \"${oldBM[0].TruongBoMon}\" → \"${TruongBoMon}\"`);
      }
      let logMessage = `ADMIN cập nhật bộ môn ${MaBoMon}: ${TenBoMon}`;
      if (changes.length > 0) {
        logMessage += ": " + changes.join(", ");
      }
      try {
        console.log('[LOG DEBUG] Query:', logSql);
        console.log('[LOG DEBUG] Params:', userId, tenNhanVien, 'Admin Log', logMessage);
        const result = await connection.query(logSql, [userId, tenNhanVien, 'Admin Log', logMessage]);
        console.log('[LOG DEBUG] Log ghi thành công:', result);
      } catch (err) {
        console.error('[LOG DEBUG] Lỗi khi ghi log:', err);
      }
    } catch (logError) {
      console.error('Lỗi khi ghi log:', logError);
    }

    res.redirect("/boMon?Success");
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu: ", error.message);
    res
      .status(500)
      .send(
        `Lỗi server, không thể cập nhật dữ liệu. Chi tiết: ${error.message}`
      );
  } finally {
    if (connection) {
      connection.release();
    } // Đảm bảo giải phóng kết nối
  }
};

module.exports = {
  postUpdateNV,
  postUpdatePhongBan,
  postUpdateTK,
  postUpdateBoMon,
};
