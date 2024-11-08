const express = require("express");
const mysql = require("mysql2/promise"); // Ensure you have mysql2 installed
const createPoolConnection = require("../config/databasePool");
const connection = require("../config/database"); // Adjust the path as necessary
// cu
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
  } = req.body;

  const MaNhanVien = `${MaPhongBan}${Id_User}`;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

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
      HSL = ?
      WHERE id_User = ?`;

    const [updateResult] = await connection.query(query, [
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
      HSL,
      Id_User,
    ]);

    // Cập nhật bảng role sau khi cập nhật nhân viên thành công
    const queryRole = `UPDATE role SET MaPhongBan = ?, Quyen = ? WHERE TenDangNhap = ?`;
    const [roleUpdateResult] = await connection.query(queryRole, [
      MaPhongBan,
      Quyen,
      TenDangNhap,
    ]);

    console.log("Nhân viên đã được cập nhật:", updateResult);
    console.log("Bảng role đã được cập nhật:", roleUpdateResult);
    res.redirect("/nhanVien?message=insertSuccess");
  } catch (error) {
    console.error("Error executing query: ", error);
    res.redirect("/nhanVien?message=insertFalse");
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

    res.redirect("/phongBan"); // Điều hướng về danh sách phòng ban sau khi cập nhật
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu: ", error);
    res.status(500).send("Lỗi server, không thể cập nhật dữ liệu");
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

    res.redirect("/thongTinTK?Success");
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu: ", error.message);
    res
      .status(500)
      .send(
        `Lỗi server, không thể cập nhật dữ liệu. Chi tiết: ${error.message}`
      );
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
    console.log(MaPhongBan, MaBoMon, TenBoMon, TruongBoMon, id );
    const query =
      "UPDATE bomon set MaBoMon = ?, MaPhongBan = ?, TenBoMon = ?, TruongBoMon = ? WHERE id_BoMon = ?";
    await connection.query(query, [MaBoMon, MaPhongBan, TenBoMon, TruongBoMon, id]);
    res.redirect("/boMon?Success");
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu: ", error.message);
    res
      .status(500)
      .send(
        `Lỗi server, không thể cập nhật dữ liệu. Chi tiết: ${error.message}`
      );
  } finally {
      if (connection){connection.release();}  // Đảm bảo giải phóng kết nối
  }
};

module.exports = {
  postUpdateNV,
  postUpdatePhongBan,
  postUpdateTK,
  postUpdateBoMon,
};
