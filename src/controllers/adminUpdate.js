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

    // Lấy dữ liệu cũ để so sánh thay đổi
    const [nhanVien] = await connection.execute(
      "SELECT * FROM nhanvien WHERE id_User = ?",
      [Id_User]
    );
    const oldRecord = nhanVien[0];

    // Kiểm tra nhân viên có tồn tại không
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

    // Ghi log chi tiết các trường thay đổi
    const logQuery = `
      INSERT INTO lichsunhaplieu 
      (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    const userId = 1;
    const tenNhanVien = 'ADMIN';
    const khoa = 'DAOTAO';
    const loaiThongTin = 'Admin Log';
    
    // Chuẩn hóa định dạng ngày sinh để so sánh (YYYY-MM-DD)
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Chuẩn hóa định dạng ngày sinh cho dữ liệu mới (+1 ngày)
    const formatNewDate = (dateStr) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      date.setDate(date.getDate() + 1); // Thêm 1 ngày
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    // Chuẩn hóa định dạng phần trăm miễn giảm (x.xx)
    const formatPercent = (percent) => {
      if (percent === null || percent === undefined) return '0.00';
      return parseFloat(percent).toFixed(2);
    };
    
    const formattedOldNgaySinh = formatDate(oldRecord.NgaySinh);
    const formattedNewNgaySinh = formatNewDate(NgaySinh);
    const formattedOldPhanTram = formatPercent(oldRecord.PhanTramMienGiam);
    const formattedNewPhanTram = formatPercent(phanTram);
    
    // Chuẩn hóa tên nhân viên (loại bỏ khoảng trắng thừa)
    const trimmedOldTenNhanVien = (oldRecord.TenNhanVien || '').trim();
    const trimmedNewTenNhanVien = (TenNhanVien || '').trim();
    
    let changes = [];
    if (trimmedOldTenNhanVien !== trimmedNewTenNhanVien) {
      changes.push(`TenNhanVien: "${trimmedOldTenNhanVien}" -> "${trimmedNewTenNhanVien}"`);
    }
    if (oldRecord.GioiTinh !== GioiTinh) {
      changes.push(`GioiTinh: "${oldRecord.GioiTinh}" -> "${GioiTinh}"`);
    }
    if (formattedOldNgaySinh !== formattedNewNgaySinh) {
      changes.push(`NgaySinh: "${formattedOldNgaySinh}" -> "${formattedNewNgaySinh}"`);
    }
    if (oldRecord.CCCD !== CCCD) {
      changes.push(`CCCD: "${oldRecord.CCCD}" -> "${CCCD}"`);
    }
    if (oldRecord.DienThoai !== DienThoai) {
      changes.push(`DienThoai: "${oldRecord.DienThoai}" -> "${DienThoai}"`);
    }
    if (oldRecord.HocVi !== HocVi) {
      changes.push(`HocVi: "${oldRecord.HocVi}" -> "${HocVi}"`);
    }
    if (oldRecord.ChucVu !== ChucVu) {
      changes.push(`ChucVu: "${oldRecord.ChucVu}" -> "${ChucVu}"`);
    }
    if (oldRecord.MaPhongBan !== MaPhongBan) {
      changes.push(`MaPhongBan: "${oldRecord.MaPhongBan}" -> "${MaPhongBan}"`);
    }
    if (formattedOldPhanTram !== formattedNewPhanTram) {
      changes.push(`PhanTramMienGiam: "${formattedOldPhanTram}" -> "${formattedNewPhanTram}"`);
    }
    if (oldRecord.Luong !== Luong) {
      changes.push(`Luong: "${oldRecord.Luong}" -> "${Luong}"`);
    }
    
    const changeMessage = changes.length > 0 
      ? `Admin cập nhật nhân viên ID ${Id_User}: ${changes.join(', ')}`
      : `Admin cập nhật nhân viên ID ${Id_User}: Không có thay đổi`;
    
    await connection.query(logQuery, [
      userId,
      tenNhanVien,
      khoa,
      loaiThongTin,
      changeMessage
    ]);

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

    // Lấy dữ liệu cũ trước khi cập nhật
    const getOldDataQuery = `SELECT * FROM phongban WHERE MaPhongBan = ?`;
    const [oldData] = await connection.query(getOldDataQuery, [MaPhongBan]);
    const oldRecord = oldData[0];

    const query = `UPDATE phongban SET TenPhongBan = ?, GhiChu = ?, isKhoa = ? WHERE MaPhongBan = ?`;
    await connection.query(query, [tenPhongBan, ghiChu, isKhoa, MaPhongBan]);

    // Ghi log chi tiết các trường thay đổi
    const logQuery = `
      INSERT INTO lichsunhaplieu 
      (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    
    const userId = 1;
    const tenNhanVien = 'ADMIN';
    const khoaLog = 'DAOTAO';
    const loaiThongTin = 'Admin Log';
    
    let changes = [];
    if (oldRecord.TenPhongBan !== tenPhongBan) {
      changes.push(`TenPhongBan: "${oldRecord.TenPhongBan}" -> "${tenPhongBan}"`);
    }
    if (oldRecord.GhiChu !== ghiChu) {
      changes.push(`GhiChu: "${oldRecord.GhiChu}" -> "${ghiChu}"`);
    }
    if (oldRecord.isKhoa !== isKhoa) {
      changes.push(`isKhoa: "${oldRecord.isKhoa}" -> "${isKhoa}"`);
    }
    
    const changeMessage = changes.length > 0 
      ? `Admin cập nhật phòng ban ${MaPhongBan}: ${changes.join(', ')}`
      : `Admin cập nhật phòng ban ${MaPhongBan}: Không có thay đổi`;
    
    await connection.query(logQuery, [
      userId,
      tenNhanVien,
      khoaLog,
      loaiThongTin,
      changeMessage
    ]);

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

    // Ghi log đơn giản
    try {
      const userId = 1;
      const tenNhanVien = 'ADMIN';
      const khoaLog = 'DAOTAO';
      const logSql = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, ?, NOW())`;
      
      const logMessage = `Admin đã thay đổi mật khẩu cho tài khoản: ${TenDangNhap}`;
        
      await connection.query(logSql, [userId, tenNhanVien, khoaLog, 'Admin Log', logMessage]);
    } catch (logError) {
      console.error('Lỗi khi ghi log:', logError);
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
    
    // Lấy dữ liệu cũ trước khi cập nhật
    const getOldDataQuery = "SELECT * FROM bomon WHERE id_BoMon = ?";
    const [oldData] = await connection.query(getOldDataQuery, [id]);
    const oldRecord = oldData[0];
    
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

    // Ghi log chi tiết các trường thay đổi
    try {
      const userId = 1;
      const tenNhanVien = 'ADMIN';
      const khoaLog = 'DAOTAO';
      const logSql = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, ?, NOW())`;
      
      let changes = [];
      if (oldRecord.MaBoMon !== MaBoMon) {
        changes.push(`MaBoMon: "${oldRecord.MaBoMon}" -> "${MaBoMon}"`);
      }
      if (oldRecord.MaPhongBan !== MaPhongBan) {
        changes.push(`MaPhongBan: "${oldRecord.MaPhongBan}" -> "${MaPhongBan}"`);
      }
      if (oldRecord.TenBoMon !== TenBoMon) {
        changes.push(`TenBoMon: "${oldRecord.TenBoMon}" -> "${TenBoMon}"`);
      }
      if (oldRecord.TruongBoMon !== TruongBoMon) {
        changes.push(`TruongBoMon: "${oldRecord.TruongBoMon}" -> "${TruongBoMon}"`);
      }
      
      const logMessage = changes.length > 0 
        ? `Admin cập nhật bộ môn ID ${id}: ${changes.join(', ')}`
        : `Admin cập nhật bộ môn ID ${id}: Không có thay đổi`;
        
      await connection.query(logSql, [userId, tenNhanVien, khoaLog, 'Admin Log', logMessage]);
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
