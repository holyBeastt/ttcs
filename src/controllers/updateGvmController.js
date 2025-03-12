const express = require("express");
const multer = require("multer");
const router = express.Router();
const createConnection = require("../config/databaseAsync");
const createPoolConnection = require("../config/databasePool");

const getUpdateGvm = async (req, res) => {
  const id_Gvm = parseInt(req.params.id);
  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Lấy dữ liệu
    const query = "SELECT * FROM `gvmoi` WHERE id_Gvm = ?";
    const [results] = await connection.query(query, [id_Gvm]);

    let user = results && results.length > 0 ? results[0] : {};

    // Lấy dữ liệu phòng ban
    const query1 = "SELECT MaPhongBan FROM phongban where isKhoa = 1";
    const [phongBanList] = await connection.query(query1);

    // Render trang updateGvm.ejs với dữ liệu người dùng
    res.render("updateGvm.ejs", { value: user, phongBanList: phongBanList });
  } catch (err) {
    console.error(err);
    // Xử lý lỗi, có thể trả về phản hồi lỗi cho client
    res.status(500).send("Lỗi khi lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// const getViewGvm = async (req, res) => {
//   const id_Gvm = parseInt(req.params.id) + 1;

//   // lấy dữ liệu
//   const connection2 = await createConnection();
//   const query = "SELECT * FROM `gvmoi` WHERE id_Gvm = ?";
//   const [results, fields] = await connection2.query(query, [id_Gvm]);
//   //   console.log("id=", id_Gvm);
//   //   console.log("results = ", results);

//   let user = results && results.length > 0 ? results[0] : {};

//   res.render("viewGvm.ejs", { value: user });
// };

const getViewGvm = async (req, res) => {
  const id_Gvm = parseInt(req.params.id) + 1;
  console.log("id = ", id_Gvm);
  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Lấy dữ liệu
    const query = "SELECT * FROM `gvmoi` WHERE id_Gvm = ?";
    const [results] = await connection.query(query, [id_Gvm]);

    const query1 = `SELECT * FROM phongban`;
    const [phongban] = await connection.query(query1);

    let user = results && results.length > 0 ? results[0] : {};
    console.log("result = ", user);
    // Render trang viewGvm.ejs với dữ liệu người dùng
    res.render("viewGvm.ejs", { value: user, phongban: phongban });
  } catch (err) {
    console.error(err);
    // Xử lý lỗi, có thể trả về phản hồi lỗi cho client
    res.status(500).send("Lỗi khi lấy dữ liệu");
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const upload = multer().single("truocCCCD");

const postUpdateGvm = async (req, res) => {
  // Lấy các thông tin từ form
  let IdGvm = req.body.IdGvm;
  let HoTen = req.body.HoTen;
  let GioiTinh = req.body.GioiTinh;
  let NgaySinh = req.body.NgaySinh;
  let CCCD = req.body.CCCD;
  let NgayCapCCCD = req.body.NgayCapCCCD;
  let NoiCapCCCD = req.body.NoiCapCCCD;
  let NoiCongTac = req.body.NoiCongTac;
  let DiaChi = req.body.DiaChi;
  let DienThoai = req.body.DienThoai;
  let email = req.body.email;
  let MaSoThue = req.body.MaSoThue;
  let HocVi = req.body.HocVi;
  let ChucVu = req.body.ChucVu;
  let HeSoLuong = req.body.HeSoLuong;
  let STK = req.body.STK;
  let NganHang = req.body.NganHang;
  let BangTotNghiepLoai = req.body.BangTotNghiepLoai;
  let MonGiangDayChinh = req.body.monGiangDayChinh;
  let QrCode = req.body.QrCode;

  let oldTruocCCCD = req.body.oldTruocCCCD;
  let oldSauCCCD = req.body.oldSauCCCD;
  let oldFileLyLich = req.body.oldFileLyLich;
  let oldbangTotNghiep = req.body.oldbangTotNghiep;
  let oldFileBoSung = req.body.oldFileBoSung;
  let oldQrCode = req.body.oldQrCode;

  let isQuanDoi = req.body.thuocQuanDoi;

  // Khởi tạo connection
  const connection = await createPoolConnection();

  // Kiểm tra HSL
  // Nếu là chuỗi, thay dấu phẩy bằng dấu chấm
  if (typeof HeSoLuong === "string") {
    HeSoLuong = HeSoLuong.replace(",", ".");
  }

  if (isNaN(HeSoLuong)) {
    connection.release(); // Giải phóng kết nối trước khi trả về
    return res.redirect(`/updateGvm/${IdGvm}?message=HeSoLuongNotValue`);
  }

  // Kiểm tra trùng lặp CCCD
  const checkDuplicateQuery =
    "SELECT COUNT(*) as count FROM gvmoi WHERE CCCD = ? AND HoTen != ?";
  const [duplicateRows] = await connection.query(checkDuplicateQuery, [
    CCCD,
    HoTen,
  ]);
  if (duplicateRows[0].count > 0) {
    connection.release(); // Giải phóng kết nối trước khi trả về
    return res.redirect("/gvmList?message=duplicateCCCD");
  }

  const MaPhongBan = Array.isArray(req.body.maPhongBan)
    ? req.body.maPhongBan.join(",") // Nếu là mảng
    : req.body.maPhongBan || ""; // Nếu là chuỗi hoặc không có giá trị
  const parts = IdGvm.split("_"); // Chia chuỗi theo dấu gạch dưới
  const lastPart = parts[parts.length - 1]; // Lấy phần cuối cùng của mảng

  const MaGvm = MaPhongBan + "_GVM_" + lastPart;

  let tinhTrangGiangDay = req.body.tinhTrangGiangDay;
  // let tinhTrangGiangDay =
  //   parseInt(req.body.tinhTrangGiangDay, 10) === 1 ? 1 : 0;
  if (tinhTrangGiangDay.includes("true")) {
    tinhTrangGiangDay = 1;
  } else {
    tinhTrangGiangDay = 0;
  }

  //let tinhTrangGiangDay = req.body.tinhTrangGiangDay ? 1 : 0;

  upload(req, res, async function (err) {
    if (err) {
      console.error("Error uploading files: ", err);
      return res.redirect("/gvmList?message=uploadError");
    }

    let truocCCCD = req.files["truocCCCD"]
      ? req.files["truocCCCD"][0].filename
      : oldTruocCCCD; // Giữ nguyên đường dẫn cũ nếu không chọn file mới
    let sauCCCD = req.files["sauCCCD"]
      ? req.files["sauCCCD"][0].filename
      : oldSauCCCD; // Giữ nguyên đường dẫn cũ nếu không chọn file mới
    let bangTotNghiep = req.files["bangTotNghiep"]
      ? req.files["bangTotNghiep"][0].filename
      : oldbangTotNghiep;
    let FileLyLich = req.files["FileLyLich"]
      ? req.files["FileLyLich"][0].filename
      : oldFileLyLich;
    let fileBoSung = req.files["fileBoSung"]
      ? req.files["fileBoSung"][0].filename
      : oldFileBoSung;
    let QrCode = req.files["QrCode"]
      ? req.files["QrCode"][0].filename
      : oldQrCode;

    // Truy vấn để update dữ liệu vào cơ sở dữ liệu
    const query = `UPDATE gvmoi SET 
      MaGvm = ?,
      HoTen = ?,
      GioiTinh = ?,
      NgaySinh = ?,
      CCCD = ?,
      NgayCapCCCD = ?,
      NoiCapCCCD = ?,
      NoiCongTac = ?,
      DiaChi = ?,
      DienThoai = ?,
      Email = ?,
      MaSoThue = ?,
      HocVi = ?,
      ChucVu = ?,
      HSL = ?,
      STK = ?,
      NganHang = ?,
      BangTotNghiepLoai = ?,
      MatTruocCCCD = ?,
      MatSauCCCD = ?,
      BangTotNghiep = ?,
      FileLyLich = ?,
      MaPhongBan = ?,
      TinhTrangGiangDay = ?, 
      MonGiangDayChinh = ?,
      isQuanDoi = ?,
      fileBoSung = ?,
      QrCode = ?
    WHERE id_Gvm = ?`;

    try {
      await connection.query(query, [
        MaGvm,
        HoTen,
        GioiTinh,
        NgaySinh,
        CCCD,
        NgayCapCCCD,
        NoiCapCCCD,
        NoiCongTac,
        DiaChi,
        DienThoai,
        email,
        MaSoThue,
        HocVi,
        ChucVu,
        HeSoLuong,
        STK,
        NganHang,
        BangTotNghiepLoai,
        truocCCCD,
        sauCCCD,
        bangTotNghiep,
        FileLyLich,
        MaPhongBan,
        tinhTrangGiangDay,
        MonGiangDayChinh,
        isQuanDoi,
        fileBoSung,
        QrCode,
        IdGvm,
      ]);
      res.redirect("/gvmList?message=insertSuccess");
    } catch (err) {
      console.error("Error executing query: ", err);
      res.redirect("/gvmList?message=insertFalse");
    } finally {
      connection.release(); // Giải phóng kết nối
    }
  });
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getUpdateGvm,
  postUpdateGvm,
  getViewGvm,
};
