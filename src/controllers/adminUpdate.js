const express = require("express");
const mysql = require("mysql2/promise"); // Ensure you have mysql2 installed
const createPoolConnection = require("../config/databasePool");
const connection = require("../config/database"); // Adjust the path as necessary

// const postUpdateNV = async (req, res) => {
//   // Lấy các thông tin từ form
//   let connection;

//   let TenNhanVien = req.body.TenNhanVien;
//   let GioiTinh = req.body.GioiTinh;
//   let NgaySinh = req.body.NgaySinh;
//   let CCCD = req.body.CCCD;
//   let NgayCapCCCD = req.body.NgayCapCCCD;
//   let NoiCapCCCD = req.body.NoiCapCCCD;
//   let NoiCongTac = req.body.NoiCongTac;
//   let DiaChiCCCD = req.body.DiaChiCCCD;
//   let DiaChiHienNay = req.body.DiaChiHienNay;
//   let DienThoai = req.body.DienThoai;
//   // let email = req.body.email;
//   let MaSoThue = req.body.MaSoThue;
//   let HocVi = req.body.HocVi;
//   let ChucVu = req.body.ChucVu;
//   // let HeSoLuong = req.body.HeSoLuong;
//   let SoTaiKhoan = req.body.SoTaiKhoan;
//   let NganHang = req.body.NganHang;
//   let ChiNhanh = req.body.ChiNhanh;
//   let MonGiangDayChinh = req.body.MonGiangDayChinh;
//   let CacMonLienQuan = req.body.CacMonLienQuan;
//   let MaPhongBan = req.body.MaPhongBan;
//   let Id_User = req.body.Id_User; // Đảm bảo có giá trị này
//   let TenDangNhap = req.body.TenDangNhap;
//   let Quyen = req.body.Quyen;
//   console.log(Id_User);
//   console.log("TenNhanVien:", TenNhanVien);

//   // upload(req, res, function (err) {
//   // Truy vấn để update dữ liệu vào cơ sở dữ liệu
//   const query = `UPDATE nhanvien SET
//       TenNhanVien = ?,
//       GioiTinh = ?,
//       NgaySinh = ?,
//       CCCD = ?,
//       NgayCapCCCD = ?,
//       NoiCapCCCD = ?,
//       DiaChiHienNay = ?,
//       DienThoai = ?,
//       MaSoThue = ?,
//       HocVi = ?,
//       ChucVu = ?,
//       SoTaiKhoan = ?,
//       NganHang = ?,
//       ChiNhanh = ?,
//       MaPhongBan = ?,
//       NoiCongTac = ? ,
//       DiaChiCCCD = ?,
//       MonGiangDayChinh = ?,
//       CacMonLienQuan = ?
//       WHERE id_User = ?`;

//   await createPoolConnection.query(
//     query,
//     [
//       TenNhanVien,
//       GioiTinh,
//       NgaySinh,
//       CCCD,
//       NgayCapCCCD,
//       NoiCapCCCD,
//       DiaChiHienNay,
//       DienThoai,
//       MaSoThue,
//       HocVi,
//       ChucVu,
//       SoTaiKhoan,
//       NganHang,
//       ChiNhanh,
//       MaPhongBan,
//       NoiCongTac,
//       DiaChiCCCD,
//       MonGiangDayChinh,
//       CacMonLienQuan,
//       Id_User,
//     ],

//     function (err, results) {
//       if (err) {
//         console.error("Error executing query: ", err);
//         return res.redirect("/nhanVien?message=insertFalse");
//       }
//       // Sau khi cập nhật nhanvien thành công, cập nhật bảng role
//       const queryRole = `UPDATE role SET MaPhongBan = ?, Quyen = ? WHERE TenDangNhap = ?`;
//       connection.query(
//         queryRole,
//         [MaPhongBan, Quyen, TenDangNhap],
//         function (errRole, resultsRole) {
//           if (errRole) {
//             console.error("Error executing query for role: ", errRole);
//             return res.redirect("/nhanVien?message=updateRoleFalse");
//           }
//           console.log("Query Results: ", results);
//           res.redirect("/nhanVien?message=insertSuccess");
//         }
//       );
//     }
//   );
// };

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
  } = req.body;

  const MaNhanVien = `${MaPhongBan}${Id_User}`;
  try {
    // Kiểm tra giá trị của HSL và PhanTramMienGiam
    // Chuẩn hóa giá trị của HSL
    const validHSL = HSL === "" ? 0 : Number(HSL.toString().replace(",", "."));

    const validPhanTramMienGiam =
      PhanTramMienGiam === "" ? 0 : Number(PhanTramMienGiam);

    connection = await createPoolConnection(); // Lấy kết nối từ pool

    // Kiểm tra nhân viên có tồn tại không
    const [nhanVien] = await connection.execute("SELECT * FROM nhanvien WHERE id_User = ?", [Id_User]);
    if (nhanVien.length === 0) {
      return res.status(404).json({ message: "Nhân viên không tồn tại" });
    }

    // Kiểm tra trùng CCCD
    const [checkCCCD] = await connection.execute("SELECT COUNT(*) AS count FROM nhanvien WHERE CCCD = ? AND id_User != ?", [CCCD, Id_User]);
    if (checkCCCD[0].count > 0) {
      return res.status(409).json({ message: "CCCD đã tồn tại. Vui lòng kiểm tra lại." });
    }

    // Kiểm tra trùng Tên đăng nhập
    const [checkTenDangNhap] = await connection.execute("SELECT COUNT(*) AS count FROM taikhoannguoidung WHERE TenDangNhap = ? AND id_User != ?", [TenDangNhap, Id_User]);
    if (checkTenDangNhap[0].count > 0) {
      return res.status(409).json({ message: "Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác." });
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
    const phanTram = parseFloat(PhanTramMienGiam); // Chuyển thành số thực
    if (isNaN(phanTram) || phanTram < 0 || phanTram > 100) {
      connection.release();
      return res.status(400).json({
        message: "Phần trăm miễn giảm phải là số từ 0 đến 100. Vui lòng kiểm tra lại.",
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
      Luong = ?
      WHERE id_User = ?`;

    await connection.execute(query, [
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
      req.body.NoiCongTac, // Lấy từ req.body
      req.body.DiaChiCCCD, // Lấy từ req.body
      req.body.MonGiangDayChinh, // Lấy từ req.body
      req.body.CacMonLienQuan, // Lấy từ req.body
      MaNhanVien,
      validHSL,
      validPhanTramMienGiam,
      Luong,
      Id_User,
    ]);

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

    res.status(200).json({ message: "Cập nhật nhân viên thành công", MaNhanVien });
  } catch (error) {
    console.error("Lỗi khi cập nhật nhân viên:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi cập nhật nhân viên", error: error.message });
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
