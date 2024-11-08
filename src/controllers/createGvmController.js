// const express = require("express");
// const multer = require("multer");
// const createPoolConnection = require("../config/databasePool");

// const gvmList = require("../services/gvmServices");
// const router = express.Router();

// // Cấu hình multer để lưu file tạm thời trong thư mục 'uploads'
// // const upload = multer({
// //   dest: "uploads/", // Đường dẫn thư mục lưu trữ file
// // });

// const upload = multer().single("truocCCCD");

// let handleUploadFile = async (req, res) => {
//   const connection = await createPoolConnection(); // Sử dụng pool để lấy kết nối
//   try {
//     const gvms = await gvmList.getGvmLists(req, res);

//     const khoa = req.session.MaPhongBan;

//     lengthList = parseInt(gvms.length) + 1;
//     // Lấy các thông tin từ form
//     let MaGvm = khoa + "_GVM_" + lengthList;
//     let HoTen = req.body.HoTen;
//     let GioiTinh = req.body.GioiTinh;
//     let NgaySinh = req.body.NgaySinh;
//     let CCCD = req.body.CCCD;
//     let NgayCapCCCD = req.body.NgayCapCCCD;
//     let NoiCapCCCD = req.body.NoiCapCCCD;
//     let NoiCongTac = req.body.NoiCongTac;
//     let DiaChi = req.body.DiaChi;
//     let DienThoai = req.body.DienThoai;
//     let email = req.body.email;
//     let MaSoThue = req.body.MaSoThue;
//     let HocVi = req.body.HocVi;
//     let ChucVu = req.body.ChucVu;
//     let HeSoLuong = req.body.HeSoLuong;
//     let STK = req.body.STK;
//     let NganHang = req.body.NganHang;
//     let tinhTrangGiangDay = req.body.tinhTrangGiangDay ? 1 : 0;
//     let BangTotNghiepLoai = req.body.BangTotNghiepLoai;

//     const MaPhongBan = Array.isArray(req.body.maPhongBan)
//       ? req.body.maPhongBan.join(",") // Nếu là mảng
//       : req.body.maPhongBan || ""; // Nếu là chuỗi hoặc không có giá trị

//     // let MaPhongBan = req.body.MaPhongBan;

//     // Sử dụng hàm upload để xử lý các file được gửi lên
//     upload(req, res, function (err) {
//       // Kiểm tra lỗi của Multer hoặc các vấn đề liên quan đến file upload
//       if (req.fileValidationError) {
//         return res.send(req.fileValidationError);
//       } else if (!req.files || Object.keys(req.files).length === 0) {
//         return res.send("Please select images to upload");
//       } else if (err instanceof multer.MulterError) {
//         return res.send(err);
//       } else if (err) {
//         return res.send(err);
//       }

//       // Lấy tên file của các file được upload
//       let truocCCCD = req.files["truocCCCD"]
//         ? req.files["truocCCCD"][0].filename
//         : null;
//       let sauCCCD = req.files["sauCCCD"]
//         ? req.files["sauCCCD"][0].filename
//         : null;
//       let bangTotNghiep = req.files["bangTotNghiep"]
//         ? req.files["bangTotNghiep"][0].filename
//         : null;
//       let FileLyLich = req.files["FileLyLich"]
//         ? req.files["FileLyLich"][0].filename
//         : null;

//       // Truy vấn để insert dữ liệu vào cơ sở dữ liệu
//       const query = `INSERT INTO gvmoi (MaGvm, HoTen, GioiTinh, NgaySinh, CCCD, NgayCapCCCD, NoiCapCCCD, NoiCongTac, DiaChi, DienThoai, Email, MaSoThue, HocVi, ChucVu, HSL, STK, NganHang, MatTruocCCCD, MatSauCCCD, BangTotNghiep, FileLyLich, MaPhongBan, TinhTrangGiangDay, BangTotNghiepLoai)
//                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

//       connection.query(
//         query,
//         [
//           MaGvm,
//           HoTen,
//           GioiTinh,
//           NgaySinh,
//           CCCD,
//           NgayCapCCCD,
//           NoiCapCCCD,
//           NoiCongTac,
//           DiaChi,
//           DienThoai,
//           email,
//           MaSoThue,
//           HocVi,
//           ChucVu,
//           HeSoLuong,
//           STK,
//           NganHang,
//           truocCCCD, // Ảnh mặt trước CCCD
//           sauCCCD, // Ảnh mặt sau CCCD
//           bangTotNghiep,
//           FileLyLich, // Giả sử đây là vị trí của FileLyLich (có thể cập nhật sau)
//           MaPhongBan,
//           tinhTrangGiangDay, // Tình trạng giảng dạy
//           BangTotNghiepLoai,
//         ],

//         function (err, results) {
//           if (err) {
//             console.error("Error executing query: ", err);

//             // Kiểm tra lỗi trùng MaGVM và CCCD
//             if (err.code === "ER_DUP_ENTRY") {
//               const errorMessage = err.sqlMessage;
//               if (errorMessage.includes("uniq_MaGVM")) {
//                 return res.redirect("/gvmList?message=magiangvien");
//               } else if (errorMessage.includes("uniq_CCCD")) {
//                 // return res.status(400).json({
//                 //   success: false,
//                 //   message: "CCCD đã tồn tại. Vui lòng kiểm tra lại số CCCD.",
//                 // });
//                 return res.redirect("/gvmList?message=cccd");
//               }
//             }

//             return res.redirect("/gvmList?message=insertFalse");
//           }
//           res.redirect("/gvmList?message=insertSuccess");
//         }
//       );
//     });
//   } catch (error) {
//     console.error("Lỗi khi xử lý tải lên: ", error);
//     res.status(500).send("Lỗi khi xử lý tải lên");
//   } finally {
//     if (connection) connection.release(); // Đảm bảo giải phóng kết nối
//   }
// };

// // let handleUploadFile = async (req, res) => {
// //   const gvms = await gvmList.getGvmLists(req, res);

// //   const khoa = req.session.MaPhongBan;

// //   lengthList = parseInt(gvms.length) + 1;
// //   // Lấy các thông tin từ form
// //   let MaGvm = khoa + "_GVM_" + lengthList;
// //   console.log("MaGvm = ", MaGvm);
// //   let HoTen = req.body.HoTen;
// //   let GioiTinh = req.body.GioiTinh;
// //   let NgaySinh = req.body.NgaySinh;
// //   let CCCD = req.body.CCCD;
// //   let NgayCapCCCD = req.body.NgayCapCCCD;
// //   let NoiCapCCCD = req.body.NoiCapCCCD;
// //   let NoiCongTac = req.body.NoiCongTac;
// //   let DiaChi = req.body.DiaChi;
// //   let DienThoai = req.body.DienThoai;
// //   let email = req.body.email;
// //   let MaSoThue = req.body.MaSoThue;
// //   let HocVi = req.body.HocVi;
// //   let ChucVu = req.body.ChucVu;
// //   let HeSoLuong = req.body.HeSoLuong;
// //   let STK = req.body.STK;
// //   let NganHang = req.body.NganHang;
// //   let tinhTrangGiangDay = req.body.tinhTrangGiangDay ? 1 : 0;
// //   let BangTotNghiepLoai = req.body.BangTotNghiepLoai;

// //   const MaPhongBan = Array.isArray(req.body.maPhongBan)
// //     ? req.body.maPhongBan.join(",") // Nếu là mảng
// //     : req.body.maPhongBan || ""; // Nếu là chuỗi hoặc không có giá trị

// //   // let MaPhongBan = req.body.MaPhongBan;

// //   // Sử dụng hàm upload để xử lý các file được gửi lên
// //   upload(req, res, function (err) {
// //     // Kiểm tra lỗi của Multer hoặc các vấn đề liên quan đến file upload
// //     if (req.fileValidationError) {
// //       return res.send(req.fileValidationError);
// //     } else if (!req.files || Object.keys(req.files).length === 0) {
// //       return res.send("Please select images to upload");
// //     } else if (err instanceof multer.MulterError) {
// //       return res.send(err);
// //     } else if (err) {
// //       return res.send(err);
// //     }

// //     // Lấy tên file của các file được upload
// //     let truocCCCD = req.files["truocCCCD"]
// //       ? req.files["truocCCCD"][0].filename
// //       : null;
// //     let sauCCCD = req.files["sauCCCD"]
// //       ? req.files["sauCCCD"][0].filename
// //       : null;
// //     let bangTotNghiep = req.files["bangTotNghiep"]
// //       ? req.files["bangTotNghiep"][0].filename
// //       : null;
// //     let FileLyLich = req.files["FileLyLich"]
// //       ? req.files["FileLyLich"][0].filename
// //       : null;

// //     // Truy vấn để insert dữ liệu vào cơ sở dữ liệu
// //     const query = `INSERT INTO gvmoi (MaGvm, HoTen, GioiTinh, NgaySinh, CCCD, NgayCapCCCD, NoiCapCCCD, NoiCongTac, DiaChi, DienThoai, Email, MaSoThue, HocVi, ChucVu, HSL, STK, NganHang, MatTruocCCCD, MatSauCCCD, BangTotNghiep, FileLyLich, MaPhongBan, TinhTrangGiangDay, BangTotNghiepLoai)
// //                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

// //     connection.query(
// //       query,
// //       [
// //         MaGvm,
// //         HoTen,
// //         GioiTinh,
// //         NgaySinh,
// //         CCCD,
// //         NgayCapCCCD,
// //         NoiCapCCCD,
// //         NoiCongTac,
// //         DiaChi,
// //         DienThoai,
// //         email,
// //         MaSoThue,
// //         HocVi,
// //         ChucVu,
// //         HeSoLuong,
// //         STK,
// //         NganHang,
// //         truocCCCD, // Ảnh mặt trước CCCD
// //         sauCCCD, // Ảnh mặt sau CCCD
// //         bangTotNghiep,
// //         FileLyLich, // Giả sử đây là vị trí của FileLyLich (có thể cập nhật sau)
// //         MaPhongBan,
// //         tinhTrangGiangDay, // Tình trạng giảng dạy
// //         BangTotNghiepLoai,
// //       ],

// //       function (err, results) {
// //         if (err) {
// //           console.error("Error executing query: ", err);

// //           // Kiểm tra lỗi trùng MaGVM và CCCD
// //           if (err.code === "ER_DUP_ENTRY") {
// //             const errorMessage = err.sqlMessage;
// //             if (errorMessage.includes("uniq_MaGVM")) {
// //               // return res.status(400).json({
// //               //   success: false,
// //               //   message: "Mã giảng viên đã tồn tại. Vui lòng nhập mã khác.",
// //               // });
// //               return res.redirect("/gvmList?message=magiangvien");
// //             } else if (errorMessage.includes("uniq_CCCD")) {
// //               // return res.status(400).json({
// //               //   success: false,
// //               //   message: "CCCD đã tồn tại. Vui lòng kiểm tra lại số CCCD.",
// //               // });
// //               return res.redirect("/gvmList?message=cccd");
// //             }
// //           }

// //           return res.redirect("/gvmList?message=insertFalse");
// //         }
// //         res.redirect("/gvmList?message=insertSuccess");
// //       }
// //     );
// //   });
// // };

// // Xuất các hàm để sử dụng trong router
// module.exports = {
//   //  createGVM,
//   handleUploadFile,
// };

const express = require("express");
const multer = require("multer");
const connection = require("../config/database");
const createPoolConnection = require("../config/databasePool");
const mysql = require("mysql2/promise");

const gvmList = require("../services/gvmServices");
const router = express.Router();

// Cấu hình multer để lưu file tạm thời trong thư mục 'uploads'
// const upload = multer({
//   dest: "uploads/", // Đường dẫn thư mục lưu trữ file
// });

const upload = multer().single("truocCCCD");

const getGvmLists = async (req, res) => {
  try {
    const connection2 = await createPoolConnection();
    const query = "SELECT * FROM `gvmoi`";
    const [results] = await connection2.query(query);

    // Gửi danh sách giảng viên dưới dạng mảng
    return results; // Chỉ gửi kết quả mảng
  } catch (error) {
    console.error("Error fetching GVM lists: ", error);
    return res.status(500).send("Internal server error"); // Trả về chuỗi thông báo lỗi
  }
};

let handleUploadFile = async (req, res) => {
  let con2;

  try {
    con2 = await createPoolConnection();

    const gvms = await gvmList.getGvmLists(req, res, con2); // Truyền kết nối vào

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
    // const MaPhongBan = Array.isArray(req.body.maPhongBan)
    //   ? req.body.maPhongBan.join(",")
    //   : req.body.maPhongBan || "";

    // Kiểm tra trùng lặp CCCD
    const checkDuplicateQuery =
      "SELECT COUNT(*) as count FROM gvmoi WHERE CCCD = ?";
    const [duplicateRows] = await con2.query(checkDuplicateQuery, [CCCD]);
    if (duplicateRows[0].count > 0) {
      con2.release(); // Giải phóng kết nối trước khi trả về
      return res.redirect("/gvmList?message=duplicateCCCD");
    }

    // Xử lý upload file
    upload(req, res, async function (err) {
      if (req.fileValidationError) {
        return res.send(req.fileValidationError);
      } else if (!req.files || Object.keys(req.files).length === 0) {
        return res.send("Please select images to upload");
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

      const query = `INSERT INTO gvmoi (MaGvm, HoTen, GioiTinh, NgaySinh, CCCD, NgayCapCCCD, NoiCapCCCD, NoiCongTac, DiaChi, DienThoai, Email, MaSoThue, HocVi, ChucVu, HSL, STK, NganHang, MatTruocCCCD, MatSauCCCD, BangTotNghiep, FileLyLich, MaPhongBan, TinhTrangGiangDay, BangTotNghiepLoai, MonGiangDayChinh)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      try {
        await con2.query(query, [
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
        ]);
        res.redirect("/gvmList?message=insertSuccess");
      } catch (err) {
        console.error("Error executing query: ", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res.redirect("/gvmList?message=duplicateEntry");
        }
        return res.redirect("/gvmList?message=insertFalse");
      } finally {
        con2.release();
      }
    });
  } catch (error) {
    console.error("Lỗi khi xử lý tải lên: ", error);
    res.status(500).send("Lỗi khi xử lý tải lên");
  }
};
const getBoMonList = async (req, res) => {
  let maPhongBan = req.params.maPhongBan;
  let isKhoa = req.params.isKhoa === "true"; // Chuyển đổi isKhoa thành boolean

  let connection = await createPoolConnection();
  try {
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
  //  createGVM,
  handleUploadFile,
  getBoMonList,
};
