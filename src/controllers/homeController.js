const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

const router = express.Router();

// Cấu hình multer để lưu file tạm thời trong thư mục 'uploads'
const upload = multer({
  dest: "uploads/", // Đường dẫn thư mục lưu trữ file
});

const getLogin = (req, res) => {
  res.render("login.ejs");
};

const getIndex = (req, res) => {
  res.render("index.ejs");
};

const getImport = (req, res) => {
  res.render("import.ejs");
};
const getDtaoduyet = (req, res) => {
  res.render("daotaoduyet.ejs");
};

const getlog = (req, res) => {
  res.render("log.ejs");
};
// const getDtaoxemhd = (req, res) => {
//   res.render("maindt.ejs");
// };
const getDtaonhap = (req, res) => {
  res.render("daotaonhap.ejs");
};
const getPhongTaiChinh = (req, res) => {
  res.render("mainTC.ejs");
};
const gethomePage = (req, res) => {
  res.render("homepage.ejs");
};
const getHomeMainDaoTao = (req, res) => {
  res.render("maindt.ejs");
};
const getTeachingInfo = (req, res) => {
  res.render("teachingInfo.ejs");
};
const getXemBangQC = (req, res) => {
  res.render("tableQC.ejs");
};

// Khoa
const getMainKhoa = (req, res) => {
  res.render("mainkhoa.ejs");
};
//log
const getthongkemg = (req, res) => {
  res.render("thongkemg.ejs");
};
const getthongkenckh = (req, res) => {
  res.render("thongkenckh.ejs");
};
const getthongkedoan = (req, res) => {
  res.render("thongkedoan.ejs");
};
const getthongtonghop = (req, res) => {
  res.render("thongketonghop.ejs");
};
// Hàm postFile xử lý upload file Excel
const postFile = (req, res) => {
  // Sử dụng multer để upload file
  upload.single("excelFile")(req, res, function (err) {
    // Xử lý file sau khi upload thành công
    console.log(req.file); // Thông tin về file được upload

    // Bạn có thể thực hiện thêm các bước xử lý khác tại đây, ví dụ đọc dữ liệu từ file Excel

    res.send("File uploaded and processed successfully.");
  });
};

// Controller dùng chung
const getBoMonShared = async (req, res) => {
  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Xác định truy vấn dựa vào MaPhongBan
    let query = `
      SELECT 
        bomon.MaPhongBan, 
        bomon.MaBoMon, 
        bomon.TenBoMon
      FROM 
        bomon
  `;

    // Thực hiện truy vấn với kết nối
    const [results] = await connection.query(query);

    // Trả về kết quả truy vấn
    return res.status(200).json(results);
  } catch (error) {
    console.error("Lỗi trong hàm getBoMon:", error);
    return res
      .status(500)
      .json({ error: "Đã xảy ra lỗi trong quá trình xử lý dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối khi hoàn thành
  }
};

const getPhongBanInfoShared = async (req, res) => {
  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Xác định truy vấn dựa vào MaPhongBan
    let query = `
      SELECT TenPhongBan, MaPhongBan from phongban where isKhoa = 1`;

    // Thực hiện truy vấn với kết nối
    const [results] = await connection.query(query);

    // Trả về kết quả truy vấn
    return res.status(200).json(results);
  } catch (error) {
    console.error("Lỗi trong hàm getBoMon:", error);
    return res
      .status(500)
      .json({ error: "Đã xảy ra lỗi trong quá trình xử lý dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối khi hoàn thành
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  gethomePage,
  getLogin,
  getIndex,
  getImport,
  getDtaoduyet,
  //getDtaoxemhd,
  getDtaonhap,
  getPhongTaiChinh,
  postFile,
  getHomeMainDaoTao,
  getTeachingInfo,
  getXemBangQC,
  // Khoa
  getMainKhoa,
  getlog,
  // Lấy role
  //thong ke
  getthongkemg,
  getthongkenckh,
  getthongkedoan,
  getthongtonghop,

  // Controller chung
  getBoMonShared,
  getPhongBanInfoShared,
};
