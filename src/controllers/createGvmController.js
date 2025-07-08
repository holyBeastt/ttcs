const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");
const LogService = require("../services/logService"); // Import LogService for logging

//const gvmList = require("../services/gvmServices");
const router = express.Router();

// Cấu hình multer để lưu file tạm thời trong thư mục 'uploads'
// const upload = multer({
//   dest: "uploads/", // Đường dẫn thư mục lưu trữ file
// });

const upload = multer().single("truocCCCD");

const getGvmLists = async (connection) => {
  try {
    const query = "SELECT * FROM `gvmoi`";
    const [results] = await connection.query(query);

    // Gửi danh sách giảng viên dưới dạng mảng
    return results; // Chỉ gửi kết quả mảng
  } catch (error) {
    console.error("Error fetching GVM lists: ", error);
    return;
  }
};

let createGvm = async (req, res) => {
  let connection;

  try {
    connection = await createPoolConnection();

    const gvms = await getGvmLists(connection); // Truyền kết nối vào

    const lengthList = parseInt(gvms.length) + 1; // Đảm bảo biến này được khai báo bằng const

    const khoa = req.session.MaPhongBan;

    // Lấy dữ liệu từ site ejs
    let MaGvm = khoa + "_GVM_" + lengthList;
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
    let tinhTrangGiangDay = req.body.tinhTrangGiangDay ? 1 : 0;
    let BangTotNghiepLoai = req.body.BangTotNghiepLoai;
    let MonGiangDayChinh = req.body.monGiangDayChinh;
    const MaPhongBan = khoa;
    let QrCode = req.body.QrCode;
    let isQuanDoi = req.body.thuocQuanDoi;

    // Kiểm tra HSL
    // Nếu là chuỗi, thay dấu phẩy bằng dấu chấm
    if (typeof HeSoLuong === "string") {
      HeSoLuong = HeSoLuong.replace(",", ".");
    }

    if (isNaN(HeSoLuong)) {
      connection.release(); // Giải phóng kết nối trước khi trả về
      return res.redirect("/gvmList?message=HeSoLuongNotValue");
    }

    // Kiểm tra trùng lặp CCCD
    const checkDuplicateQuery =
      "SELECT COUNT(*) as count FROM gvmoi WHERE CCCD = ?";
    const [duplicateRows] = await connection.query(checkDuplicateQuery, [CCCD]);
    if (duplicateRows[0].count > 0) {
      connection.release(); // Giải phóng kết nối trước khi trả về
      return res.redirect("/gvmList?message=duplicateCCCD");
    }

    // Kiểm tra trùng lặp tên
    let nameExists = true;
    let modifiedName = HoTen; // Biến tạm để lưu tên cuối cùng
    let duplicateName = [];
    let duplicateCount = 0;
    let originalName = HoTen;

    while (nameExists) {
      nameExists = gvms.some((gvm) => gvm.HoTen === modifiedName);
      if (nameExists) {
        duplicateCount++;
        modifiedName = `${originalName} (${String.fromCharCode(
          64 + duplicateCount
        )})`; // A, B, C...
      }
    }
    // Khi xử lý xong, thêm tên cuối cùng vào danh sách trùng
    if (modifiedName !== HoTen) {
      duplicateName.push(`${HoTen} -> ${modifiedName}`); // Ghi lại thay đổi
    }
    HoTen = modifiedName; // Cập nhật tên cuối cùng

    // Xử lý upload file
    upload(req, res, async function (err) {
      if (req.fileValidationError) {
        return res.send(req.fileValidationError);
        // } else if (!req.files || Object.keys(req.files).length === 0) {
        //   return res.send("Please select images to upload");
      } else if (err) {
        return res.send(err);
      }

      let truocCCCD = req.files["truocCCCD"]
        ? req.files["truocCCCD"][0].filename
        : null;
      let sauCCCD = req.files["sauCCCD"]
        ? req.files["sauCCCD"][0].filename
        : null;
      let bangTotNghiep = req.files["bangTotNghiep"]
        ? req.files["bangTotNghiep"][0].filename
        : null;
      let FileLyLich = req.files["FileLyLich"]
        ? req.files["FileLyLich"][0].filename
        : null;
      let fileBoSung = req.files["fileBoSung"]
        ? req.files["fileBoSung"][0].filename
        : null;
      let QrCode = req.files["QrCode"] ? req.files["QrCode"][0].filename : null;

      const query = `INSERT INTO gvmoi (MaGvm, HoTen, GioiTinh, NgaySinh, CCCD, NgayCapCCCD, NoiCapCCCD, NoiCongTac, DiaChi, DienThoai, Email, MaSoThue, HocVi, ChucVu, HSL, STK, NganHang, MatTruocCCCD, MatSauCCCD, BangTotNghiep, FileLyLich, MaPhongBan, TinhTrangGiangDay, BangTotNghiepLoai, MonGiangDayChinh, isQuanDoi, fileBoSung, QrCode)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

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
          truocCCCD,
          sauCCCD,
          bangTotNghiep,
          FileLyLich,
          MaPhongBan,
          tinhTrangGiangDay,
          BangTotNghiepLoai,
          MonGiangDayChinh,
          isQuanDoi,
          fileBoSung,
          QrCode,
        ]);

        // Log the creation of a new guest lecturer
        try {
          const userId = req.session.userId || 0; // Lấy đúng userId từ session
          const userName = req.session.TenNhanVien || req.session.username || 'Unknown User';
          
          console.log('Thông tin session khi thêm GVM mới:', { 
            userId, 
            userName, 
            sessionData: { 
              userId: req.session.userId,
              TenNhanVien: req.session.TenNhanVien,
              username: req.session.username
            } 
          });
          
          await LogService.logChange(
            userId,
            userName,
            'Thêm giảng viên mời',
            `Thêm giảng viên mời mới: ${HoTen} - ${MaGvm}`
          );
          
          console.log(`Đã ghi log thêm mới giảng viên mời: ${HoTen} - ${MaGvm}`);
        } catch (logError) {
          console.error('Error logging new guest lecturer:', logError);
          // Continue with the response even if logging fails
        }

        if (duplicateName.length > 0) {
          const message = "Tên giảng viên bị trùng sẽ được lưu như sau";
          const encodedMessage = encodeURIComponent(message);

          // Mã hóa duplicateName và nối với thông điệp
          const encodedDuplicateNames = encodeURIComponent(
            duplicateName.join(", ")
          );

          // Nối thông điệp và danh sách tên đã mã hóa
          return res.redirect(
            `/gvmList?message=${encodedMessage}&duplicateName=${encodedDuplicateNames}`
          );
        }

        res.redirect("/gvmList?message=insertSuccess");
      } catch (err) {
        console.error("Error executing query: ", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res.redirect("/gvmList?message=duplicateEntry");
        }
        return res.redirect("/gvmList?message=insertFalse");
      } finally {
        connection.release();
      }
    });
  } catch (error) {
    console.error("Lỗi khi xử lý tải lên: ", error);
    res.status(500).send("Lỗi khi xử lý tải lên");
  } finally {
    if (connection) connection.release();
  }
};

const getBoMonList = async (req, res) => {
  let maPhongBan = req.params.maPhongBan;
  let isKhoa = req.params.isKhoa === "true"; // Chuyển đổi isKhoa thành boolean

  let connection;
  try {
    connection = await createPoolConnection();
    let results;
    if (isKhoa) {
      const query = `SELECT * FROM bomon WHERE MaPhongBan = ?`;
      [results] = await connection.query(query, [maPhongBan]);
    } else {
      const query = `SELECT * FROM bomon`;
      [results] = await connection.query(query);
    }

    res.json({
      success: true,
      maBoMon: results,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  createGvm,
  getBoMonList,
};
