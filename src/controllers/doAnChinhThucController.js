const express = require("express");
const pool = require("../config/Pool");
const createPoolConnection = require("../config/databasePool");
require("dotenv").config();

// Tạo biến chung để lưu dữ liệu
let tableData;
let uniqueGV; // Danh sách giảng viên không bị trùng tên

// Tạo mảng riêng để truyền dữ liệu giảng viên bị trùng
// const getInfoGiangVien = async (req, res) => {
//   let connection;
//   try {
//     connection = await createPoolConnection();

//     // Lấy dữ liệu giảng viên mời
//     let query = `SELECT HoTen, CCCD FROM GVMOI`;
//     const [gvms] = await connection.query(query);

//     // Lấy dữ liệu giảng viên cơ hữu
//     query = `SELECT TenNhanVien, CCCD FROM NHANVIEN`;
//     const [nvs] = await connection.query(query);

//     // Gộp giảng viên mời và giảng viên cơ hữu vào 1 mảng để so sánh
//     let arr = [];

//     // Thêm giảng viên mời vào arr
//     gvms.forEach((item) => {
//       const normalizedName = item.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();
//       arr.push({
//         HoTen: item.HoTen,
//         CCCD: item.CCCD,
//         BienChe: "Giảng viên mời", // Phân biệt loại
//         HoTenReal: normalizedName,
//       });
//     });

//     // Thêm nhân viên vào arr
//     nvs.forEach((item) => {
//       const normalizedName = item.TenNhanVien.replace(
//         /\s*\(.*?\)\s*/g,
//         ""
//       ).trim();
//       arr.push({
//         HoTen: item.TenNhanVien,
//         CCCD: item.CCCD,
//         BienChe: "Cơ hữu", // Phân biệt loại
//         HoTenReal: normalizedName,
//       });
//     });

//     // Đếm số lần xuất hiện của mỗi tên chuẩn hóa
//     const nameCount = {};

//     arr.forEach((item) => {
//       // Chuẩn hóa tên bằng cách loại bỏ nội dung trong ngoặc đơn
//       const normalizedName = item.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

//       if (!nameCount[normalizedName]) {
//         nameCount[normalizedName] = { count: 0, items: [] };
//       }

//       nameCount[normalizedName].count += 1;
//       nameCount[normalizedName].items.push(item);
//     });

//     // Phân loại giảng viên thành trùng và không trùng
//     const allGV = [];
//     const duplicateGV = [];
//     const uniqueGV = [];

//     Object.values(nameCount).forEach((entry) => {
//       allGV.push(...entry.items);
//       if (entry.count > 1) {
//         duplicateGV.push(...entry.items);
//       } else {
//         uniqueGV.push(...entry.items);
//       }
//     });

//     // Trả về danh sách giảng viên trùng và không trùng
//     return { duplicateGV, uniqueGV, allGV };
//   } catch (error) {
//     console.error("Error in duplicateGiangVien:", error);
//     throw error;
//   } finally {
//     if (connection) connection.release();
//   }
// };

const getInfoGiangVien = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy dữ liệu giảng viên mời
    let query = `SELECT HoTen, CCCD FROM GVMOI`;
    const [gvms] = await connection.query(query);

    // Lấy dữ liệu giảng viên cơ hữu
    query = `SELECT TenNhanVien, CCCD FROM NHANVIEN`;
    const [nvs] = await connection.query(query);

    // Gộp giảng viên mời và giảng viên cơ hữu vào 1 mảng để so sánh
    let arr = [];

    // Thêm giảng viên mời vào arr
    gvms.forEach((item) => {
      const normalizedName = item.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();
      arr.push({
        HoTen: item.HoTen,
        CCCD: item.CCCD,
        BienChe: "Giảng viên mời", // Phân biệt loại
        HoTenReal: normalizedName,
      });
    });

    // Thêm nhân viên vào arr
    nvs.forEach((item) => {
      const normalizedName = item.TenNhanVien.replace(
        /\s*\(.*?\)\s*/g,
        ""
      ).trim();
      arr.push({
        HoTen: item.TenNhanVien,
        CCCD: item.CCCD,
        BienChe: "Cơ hữu", // Phân biệt loại
        HoTenReal: normalizedName,
      });
    });

    // Đếm số lần xuất hiện của mỗi tên chuẩn hóa
    const nameCount = {};

    arr.forEach((item) => {
      // Chuẩn hóa tên bằng cách loại bỏ nội dung trong ngoặc đơn
      const normalizedName = item.HoTen.replace(/\s*\(.*?\)\s*/g, "").trim();

      if (!nameCount[normalizedName]) {
        nameCount[normalizedName] = { count: 0, items: [] };
      }

      nameCount[normalizedName].count += 1;
      nameCount[normalizedName].items.push(item);
    });

    // Phân loại giảng viên thành trùng và không trùng
    const allGV = [];
    const duplicateGV = [];
    const uniqueGV = [];

    Object.values(nameCount).forEach((entry) => {
      allGV.push(...entry.items);
      if (entry.count > 1) {
        duplicateGV.push(...entry.items);
      } else {
        uniqueGV.push(...entry.items);
      }
    });

    // Trả về danh sách giảng viên trùng và không trùng cho client
    res.status(200).json({
      success: true,
      message: "Lấy dữ liệu thành công",
      data: {
        duplicateGV,
        uniqueGV,
        allGV,
      },
    });
  } catch (error) {
    console.error("Error in getInfoGiangVien:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi xử lý dữ liệu",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
};

//Lưu vào bảng doantotnghiep
const updateDoAn = async (req, res) => {
  const isKhoa = req.session.isKhoa;
  const jsonData = req.body;
  const Dot = req.query.Dot;
  const NamHoc = req.query.NamHoc;
  const MaPhongBan = req.query.MaPhongBan;

  let connection;

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Duyệt qua từng phần tử trong jsonData
    for (let item of jsonData) {
      const {
        ID,
        TT,
        GiangVien1,
        GiangVien2,
        NamHoc,
        MaPhongBan,
        GhiChu,
        KhoaDuyet,
        DaoTaoDuyet,
        TaiChinhDuyet,
        NgayBatDau,
        NgayKetThuc,
      } = item;

      if (KhoaDuyet == 1) {
        if (!GiangVien1 || GiangVien1.length === 0) {
          return res.status(200).json({
            message: `Dòng thứ ${TT} chưa được điền giảng viên hướng dẫn`,
          });
        }

        if (GiangVien2 == "" || GiangVien2 == null) {
          return res.status(200).json({
            message: `Dòng thứ ${TT} chưa được điền giảng viên hướng dẫn`,
          });
        }
      }

      let updateQuery, updateValues;
      if (isKhoa == 1) {
        // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
        updateQuery = `
      UPDATE doantotnghiep
      SET 
        GiangVien1 = ?,
        GiangVien2 = ?,
        GhiChu = ?,
        KhoaDuyet = ?,
        DaoTaoDuyet = ?,
        TaiChinhDuyet = ?,
        NgayBatDau = ?,
        NgayKetThuc = ?
      WHERE ID = ?
    `;

        updateValues = [
          GiangVien1,
          GiangVien2,
          GhiChu,
          KhoaDuyet,
          DaoTaoDuyet,
          TaiChinhDuyet,
          isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
          isNaN(new Date(NgayKetThuc).getTime()) ? null : NgayKetThuc,
          ID,
        ];
      } else {
        // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
        updateQuery = `
      UPDATE doantotnghiep
      SET 
        KhoaDuyet = ?,
        DaoTaoDuyet = ?,
        TaiChinhDuyet = ?
      WHERE ID = ?
    `;

        updateValues = [KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet, ID];
      }

      await connection.query(updateQuery, updateValues);
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// const saveToDB = async (req, res) => {
//   const NamHoc = req.query.namHoc;
//   const MaPhongBan = req.query.MaPhongBan;
//   const data = req.body;

//   let connection;
//   try {
//     connection = await createPoolConnection(); // Kết nối đến DB
//     const errors = []; // Tích lũy lỗi

//     // Tạo mảng 2 chiều chứa tất cả các bản ghi
//     const values = data.map((row) => {
//       // Tạo một mảng tạm cho từng bản ghi
//       const rowValues = [];

//       let SoQD = "không";
//       // Lưu lần 1

//       // Giá trị Khóa đào tạo
//       const KhoaDaoTao = row.MaSV.slice(0, 4);

//       // Giá trị Số người
//       let SoNguoi = 2;
//       if (row.GiangVien1.trim() == "" || row.GiangVien1 == undefined) {
//         errors.push(
//           `Không tìm thấy giảng viên 1: ${row.GiangVien1} của sinh viên ${row.SinhVien}`
//         );
//         return;
//       }
//       if (
//         row.GiangVien2 == "null" ||
//         row.GiangVien2 == null ||
//         row.GiangVien2 == "" ||
//         row.GiangVien2 == undefined
//       ) {
//         SoNguoi = 1;
//       }
//       // Giá trị is hướng dẫn chính
//       let isHDChinh = 1;

//       // Giá trị Giảng viên
//       let GiangVien;

//       // Giá trị CCCD và is mời giảng
//       let CCCD, isMoiGiang;
//       if (row.GiangVien1.includes("-")) {
//         GiangVien = row.GiangVien1.split(" - ")[0];
//         CCCD = row.GiangVien1.split(" - ")[2];

//         if (row.GiangVien1.split(" - ")[1].toLowerCase == "cơ hữu") {
//           isMoiGiang = 0;
//         } else {
//           isMoiGiang = 1;
//         }
//       } else {
//         const matchedItem = uniqueGV.find(
//           (item) => item.HoTen.trim() == row.GiangVien1.trim()
//         );

//         if (!matchedItem) {
//           // Trả về phản hồi nếu không tìm thấy giảng viên
//           errors.push(
//             `Không tìm thấy giảng viên 1: ${row.GiangVien1} của sinh viên ${row.SinhVien}`
//           );
//           return;
//         }

//         CCCD = matchedItem.CCCD;
//         if (matchedItem.BienChe.toLowerCase == "cơ hữu") isMoiGiang = 0;
//         else isMoiGiang = 1;
//       }

//       // Giá trị Số tiêt
//       let SoTiet = 25;

//       if (SoNguoi == 2) SoTiet = 15;

//       // Push các giá trị vào mảng tạm
//       rowValues.push(
//         row.SinhVien,
//         row.MaSV,
//         KhoaDaoTao,
//         SoQD,
//         row.TenDeTai,
//         SoNguoi,
//         isHDChinh,
//         GiangVien,
//         CCCD,
//         isMoiGiang,
//         SoTiet,
//         row.NgayBatDau,
//         row.NgayKetThuc,
//         MaPhongBan,
//         NamHoc
//       );

//       // Nếu số người là 2, lưu giảng viên 2
//       if (SoNguoi == 1) return rowValues; // Nếu số người là 1 thì trả về luôn

//       // Đặt lại các giá trị thay đổi
//       // Giá trị is hướng dẫn chính
//       isHDChinh = 0;

//       // Giá trị CCCD và is mời giảng
//       if (row.GiangVien2.includes("-")) {
//         GiangVien = row.GiangVien2.split(" - ")[0];
//         CCCD = row.GiangVien2.split(" - ")[2];

//         if (row.GiangVien1.split(" - ")[1].toLowerCase == "cơ hữu") {
//           isMoiGiang = 0;
//         } else {
//           isMoiGiang = 1;
//         }
//       } else {
//         const matchedItem = uniqueGV.find(
//           (item) => item.HoTen.trim() == row.GiangVien2.trim()
//         );

//         if (!matchedItem) {
//           // Trả về phản hồi nếu không tìm thấy giảng viên
//           errors.push(
//             `Không tìm thấy giảng viên 2: ${row.GiangVien2} của sinh viên ${row.SinhVien}`
//           );
//           return;
//         }

//         CCCD = matchedItem.CCCD;
//         if (matchedItem.BienChe.toLowerCase == "cơ hữu") isMoiGiang = 0;
//         else isMoiGiang = 1;
//       }

//       // Giá trị Số tiêt
//       SoTiet = 10;

//       rowValues.push(
//         row.SinhVien,
//         row.MaSV,
//         KhoaDaoTao,
//         SoQD,
//         row.TenDeTai,
//         SoNguoi,
//         isHDChinh,
//         GiangVien,
//         CCCD,
//         isMoiGiang,
//         SoTiet,
//         row.NgayBatDau,
//         row.NgayKetThuc,
//         MaPhongBan,
//         NamHoc
//       );

//       // Trả về mảng tạm này
//       return rowValues;
//     });

//     // Nếu có lỗi, trả về thông báo lỗi
//     if (errors.length > 0) {
//       return res.status(400).json({ message: "Có lỗi xảy ra", errors });
//     }

//     // Câu lệnh SQL để chèn tất cả dữ liệu vào bảng
//     const sql = `INSERT INTO exportdoantotnghiep (SinhVien, MaSV, KhoaDaoTao, SoQD, TenDeTai, SoNguoi, isHDChinh, GiangVien, CCCD, isMoiGiang, SoTiet, NgayBatDau, NgayKetThuc, MaPhongBan, NamHoc)
//                    VALUES ?`;

//     // Thực thi câu lệnh SQL với mảng values
//     const [result] = await connection.query(sql, [values]);

//     // Gửi phản hồi thành công
//     res.status(200).json({
//       message: "Dữ liệu đã được lưu thành công vào cơ sở dữ liệu.",
//       insertedRows: result.affectedRows,
//     });
//   } catch (error) {
//     console.error("Lỗi khi lưu dữ liệu vào database:", error);
//     if (!res.headersSent) {
//       res.status(500).send("Đã xảy ra lỗi khi lưu dữ liệu vào database!");
//     }
//   } finally {
//     if (connection) connection.release(); // Giải phóng kết nối
//   }
// };

const saveToDB = async (req, res) => {
  const NamHoc = req.query.namHoc;
  const MaPhongBan = req.query.MaPhongBan;
  const data = req.body;

  let connection;
  try {
    connection = await createPoolConnection(); // Kết nối đến DB
    const errors = []; // Tích lũy lỗi

    // Tạo mảng 2 chiều chứa tất cả các bản ghi
    const values = [];

    data.forEach((row) => {
      let SoQD = "không";
      const KhoaDaoTao = row.MaSV.slice(0, 4);
      let SoNguoi = 2; // Mặc định là 2 giảng viên

      if (
        row.GiangVien2 == "null" ||
        row.GiangVien2 == undefined ||
        row.GiangVien2 == "không"
      ) {
        SoNguoi = 1;
      }

      if (row.GiangVien1.trim() == "" || row.GiangVien1 == undefined) {
        errors.push(
          `\nKhông tìm thấy giảng viên 1: ${row.GiangVien1} của sinh viên ${row.SinhVien}`
        );
        return;
      }

      let isHDChinh = 1;
      let GiangVien, CCCD, isMoiGiang;

      // Xử lý giảng viên 1
      if (row.GiangVien1.includes("-")) {
        GiangVien = row.GiangVien1.split(" - ")[0];
        CCCD = row.GiangVien1.split(" - ")[2];
        isMoiGiang =
          row.GiangVien1.split(" - ")[1].toLowerCase() == "cơ hữu" ? 0 : 1;
      } else {
        const matchedItem = uniqueGV.find(
          (item) => item.HoTen.trim() == row.GiangVien1.trim()
        );
        if (!matchedItem) {
          errors.push(
            `\nKhông tìm thấy giảng viên 1: ${row.GiangVien1} của sinh viên ${row.SinhVien}`
          );
          return;
        }
        GiangVien = matchedItem.HoTen.trim();
        CCCD = matchedItem.CCCD;
        isMoiGiang = matchedItem.BienChe.toLowerCase() == "cơ hữu" ? 0 : 1;
      }

      let SoTiet = 25;

      if (SoNguoi == 2) {
        SoTiet = 15;
      }

      values.push([
        row.SinhVien,
        row.MaSV,
        KhoaDaoTao,
        SoQD,
        row.TenDeTai,
        SoNguoi,
        isHDChinh,
        GiangVien,
        CCCD,
        isMoiGiang,
        SoTiet,
        row.NgayBatDau,
        row.NgayKetThuc,
        MaPhongBan,
        NamHoc,
      ]);

      // Nếu có giảng viên thứ 2, xử lý giảng viên 2 và thêm bản ghi thứ hai
      if (SoNguoi == 2) {
        let isHDChinh = 0; // Hướng dẫn phụ
        let GiangVien, CCCD, isMoiGiang;

        if (row.GiangVien2.includes("-")) {
          GiangVien = row.GiangVien2.split(" - ")[0];
          CCCD = row.GiangVien2.split(" - ")[2];
          isMoiGiang =
            row.GiangVien2.split(" - ")[1].toLowerCase() == "cơ hữu" ? 0 : 1;
        } else {
          const matchedItem = uniqueGV.find(
            (item) => item.HoTen.trim() == row.GiangVien2.trim()
          );
          if (!matchedItem) {
            errors.push(
              `\nKhông tìm thấy giảng viên 2: ${row.GiangVien2} của sinh viên ${row.SinhVien}`
            );
            return;
          }
          GiangVien = matchedItem.HoTen.trim();
          CCCD = matchedItem.CCCD;
          isMoiGiang = matchedItem.BienChe.toLowerCase() == "cơ hữu" ? 0 : 1;
        }

        SoTiet = 10; // Giảm số tiết cho giảng viên thứ 2
        values.push([
          row.SinhVien,
          row.MaSV,
          KhoaDaoTao,
          SoQD,
          row.TenDeTai,
          SoNguoi,
          isHDChinh,
          GiangVien,
          CCCD,
          isMoiGiang,
          SoTiet,
          row.NgayBatDau,
          row.NgayKetThuc,
          MaPhongBan,
          NamHoc,
        ]);
      }
    });

    // Nếu có lỗi, trả về thông báo lỗi
    if (errors.length > 0) {
      return res.status(400).json({ message: "Có lỗi xảy ra", errors });
    }

    // Câu lệnh SQL để chèn tất cả dữ liệu vào bảng
    const sql = `INSERT INTO exportdoantotnghiep (SinhVien, MaSV, KhoaDaoTao, SoQD, TenDeTai, SoNguoi, isHDChinh, GiangVien, CCCD, isMoiGiang, SoTiet, NgayBatDau, NgayKetThuc, MaPhongBan, NamHoc)
                 VALUES ?`;

    // Thực thi câu lệnh SQL với mảng values
    const [result] = await connection.query(sql, [values]);

    // Gửi phản hồi thành công
    res.status(200).json({
      message: "Dữ liệu đã được lưu thành công vào cơ sở dữ liệu.",
      insertedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu vào database:", error);
    if (!res.headersSent) {
      res.status(500).send("Đã xảy ra lỗi khi lưu dữ liệu vào database!");
    }
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const getthongTinDoAnTotNghiep = (req, res) => {
  res.render("thongTinDoAnTotNghiep.ejs");
};

const getInfoDoAn = async (req, res) => {
  const Dot = req.body.Dot;
  const NamHoc = req.body.NamHoc;
  const MaPhongBan = req.body.MaPhongBan;

  let connection;
  try {
    connection = await createPoolConnection();

    let query, values;
    if (MaPhongBan == "ALL") {
      query = "SELECT * FROM doantotnghiep where Dot = ? AND NamHoc = ?";
      values = [Dot, NamHoc];
    } else {
      query =
        "SELECT * FROM doantotnghiep where Dot = ? AND NamHoc = ? AND MaPhongBan = ?";
      values = [Dot, NamHoc, MaPhongBan];
    }
    const [result] = await connection.query(query, values); // Dùng destructuring để lấy dữ liệu
    // Trả dữ liệu về client dưới dạng JSON
    res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ database:", error);

    // Trả lỗi về client
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy dữ liệu" });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const KhoaCheckAll = async (req, Dot, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả
  let connection;

  try {
    const query = `SELECT MaPhongBan FROM phongban where isKhoa = 1`;
    connection = await createPoolConnection();
    const [results, fields] = await connection.query(query);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const innerQuery = `SELECT KhoaDuyet FROM doantotnghiep WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?`;
      const [check, innerFields] = await connection.query(innerQuery, [
        MaPhongBan,
        NamHoc,
        Dot,
      ]);

      let checkAll = true;
      for (let j = 0; j < check.length; j++) {
        if (check[j].KhoaDuyet == 0) {
          checkAll = false;
          break;
        }
      }
      if (checkAll) {
        kq += MaPhongBan + ",";
      }
    }
  } catch (error) {
    console.error("Error in KhoaCheckAll:", error);
    throw error; // Throw lại lỗi để xử lý ở nơi gọi hàm này
  } finally {
    if (connection) connection.release();
  }

  // Trả về kết quả có dấu phẩy cuối cùng
  return kq;
};

const DaoTaoCheckAll = async (req, Dot, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả

  const queryPhongBan = `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`;
  const connection1 = await createPoolConnection();

  try {
    const [results] = await connection1.query(queryPhongBan);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const queryDuyet = `
        SELECT DaoTaoDuyet 
        FROM doantotnghiep 
        WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?
      `;
      const connection = await createPoolConnection();

      try {
        const [check] = await connection.query(queryDuyet, [
          MaPhongBan,
          NamHoc,
          Dot,
        ]);

        let checkAll = true;
        for (let j = 0; j < check.length; j++) {
          if (check[j].DaoTaoDuyet == 0) {
            checkAll = false;
            break;
          }
        }
        if (checkAll) {
          kq += MaPhongBan + ",";
        }
      } finally {
        connection.release(); // Giải phóng kết nối sau khi truy vấn xong
      }
    }
  } finally {
    connection1.release(); // Giải phóng kết nối sau khi lấy danh sách phòng ban
  }

  return kq;
};

// Mới
const TaiChinhCheckAll = async (req, Dot, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả

  const connection = await createPoolConnection();

  try {
    const query = `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`;
    const [results, fields] = await connection.query(query);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const checkQuery = `
        SELECT TaiChinhDuyet FROM doantotnghiep 
        WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?`;
      const [check, checkFields] = await connection.query(checkQuery, [
        MaPhongBan,
        NamHoc,
        Dot,
      ]);

      let checkAll = true;
      for (let j = 0; j < check.length; j++) {
        if (check[j].TaiChinhDuyet == 0) {
          checkAll = false;
          break;
        }
      }
      if (checkAll === true) {
        kq += MaPhongBan + ",";
      }
    }
  } finally {
    if (connection) connection.release();
  }

  return kq;
};

const getCheckAllDoantotnghiep = async (req, res) => {
  const NamHoc = req.body.NamHoc;
  const Dot = req.body.Dot;
  const KhoaCheck = await KhoaCheckAll(req, Dot, NamHoc);
  const DaoTaoCheck = await DaoTaoCheckAll(req, Dot, NamHoc);
  const TaiChinhCheck = await TaiChinhCheckAll(req, Dot, NamHoc);

  return res.status(200).json({
    KhoaCheck: KhoaCheck,
    DaoTaoCheck: DaoTaoCheck,
    TaiChinhCheck: TaiChinhCheck,
  });
};

const getDuplicateUniqueGV = async () => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Hàm chuẩn hóa tên
    const normalizeName = (name) => name.replace(/\s*\(.*?\)\s*/g, "").trim();

    // Lấy dữ liệu giảng viên mời và cơ hữu
    const [gvms] = await connection.query(`SELECT HoTen, CCCD FROM GVMOI`);
    const [nvs] = await connection.query(
      `SELECT TenNhanVien, CCCD FROM NHANVIEN`
    );

    // Gộp và chuẩn hóa danh sách
    const combinedList = [
      ...gvms.map((item) => ({
        HoTen: item.HoTen,
        CCCD: item.CCCD,
        BienChe: "Giảng viên mời",
        HoTenReal: normalizeName(item.HoTen),
      })),
      ...nvs.map((item) => ({
        HoTen: item.TenNhanVien,
        CCCD: item.CCCD,
        BienChe: "Cơ hữu",
        HoTenReal: normalizeName(item.TenNhanVien),
      })),
    ];

    // Đếm số lần xuất hiện của mỗi tên chuẩn hóa
    const nameCount = {};
    combinedList.forEach((item) => {
      const normalizedName = item.HoTenReal;

      if (!nameCount[normalizedName]) {
        nameCount[normalizedName] = { count: 0, items: [] };
      }

      nameCount[normalizedName].count += 1;
      nameCount[normalizedName].items.push(item);
    });

    // Phân loại giảng viên
    const allGV = [];
    const duplicateGV = [];
    const uniqueGV = [];

    Object.values(nameCount).forEach((entry) => {
      allGV.push(...entry.items);
      if (entry.count > 1) {
        duplicateGV.push(...entry.items);
      } else {
        uniqueGV.push(...entry.items);
      }
    });

    // Trả về dữ liệu
    return {
      duplicateGV,
      uniqueGV,
      allGV,
    };
  } catch (error) {
    console.error("Error in getDuplicateUniqueGV:", error);
    throw new Error("Có lỗi xảy ra khi xử lý dữ liệu: " + error.message);
  } finally {
    if (connection) await connection.release();
  }
};

const saveToExportDoAn = async (req, res) => {
  const Dot = req.body.Dot;
  const NamHoc = req.body.NamHoc;
  const MaKhoa = req.body.MaPhongBan;

  let connection;
  try {
    connection = await createPoolConnection(); // Kết nối đến DB
    const errors = []; // Tích lũy lỗi
    let count = 0; // Đếm xem bao nhiêu dòng được chèn

    const uniqueGV = (await getDuplicateUniqueGV()).uniqueGV;
    const daDuyetHet = await TaiChinhCheckAll(req, Dot, NamHoc);
    const daDuyetHetArray = daDuyetHet.split(",").filter((item) => item !== ""); // Chuyển đổi thành mảng và loại bỏ phần tử rỗng

    let queryData, data;

    if (MaKhoa == "ALL") {
      queryData = "select * from doantotnghiep where Dot = ? AND NamHoc = ?";

      [data] = await connection.query(queryData, [Dot, NamHoc]);
    } else {
      queryData =
        "select * from doantotnghiep where Dot = ? AND NamHoc = ? AND MaPhongBan = ?";

      [data] = await connection.query(queryData, [Dot, NamHoc, MaKhoa]);
    }

    // Tạo mảng 2 chiều chứa tất cả các bản ghi
    const values = [];
    let isHDChinh, isMoiGiang;

    await Promise.all(
      data
        .filter(
          (item) =>
            item.TaiChinhDuyet != 0 &&
            item.DaLuu != 1 &&
            daDuyetHetArray.includes(item.MaPhongBan)
        ) // Bỏ qua các mục có TaiChinhDuyet = 0
        .map(async (item) => {
          let SoQD = "không";
          let SoNguoi = 2; // Mặc định là 2 giảng viên

          if (
            item.GiangVien2.toLowerCase() == "null" ||
            item.GiangVien2.toLowerCase() == "không" ||
            item.GiangVien2 == ""
          ) {
            SoNguoi = 1;
          }

          isHDChinh = 1;
          let GiangVien, CCCD;

          // Xử lý giảng viên 1
          if (item.GiangVien1.includes("-")) {
            GiangVien = item.GiangVien1.split(" - ")[0];
            CCCD = item.GiangVien1.split(" - ")[2];
            isMoiGiang =
              item.GiangVien1.split(" - ")[1].toLowerCase() == "cơ hữu" ? 0 : 1;
          } else {
            const matchedItem = uniqueGV.find(
              (arr) => arr.HoTen.trim() == item.GiangVien1.trim()
            );
            if (!matchedItem) {
              errors.push(
                `\nKhông tìm thấy giảng viên 1: ${item.GiangVien1} của sinh viên ${item.SinhVien}`
              );
              return;
            }

            GiangVien = matchedItem.HoTen.trim();
            CCCD = matchedItem.CCCD;
            isMoiGiang = matchedItem.BienChe.toLowerCase() == "cơ hữu" ? 0 : 1;
          }

          let SoTiet = 25;

          if (SoNguoi == 2) {
            SoTiet = 15;
          }

          values.push([
            item.SinhVien || null,
            item.MaSV || null,
            item.KhoaDaoTao || null,
            SoQD || null,
            item.TenDeTai || null,
            SoNguoi || null,
            isHDChinh || null,
            GiangVien || null,
            CCCD || null,
            isMoiGiang,
            SoTiet || null,
            item.NgayBatDau || null,
            item.NgayKetThuc || null,
            item.MaPhongBan || null,
            NamHoc || null,
            item.Dot || null,
            item.TT || null,
          ]);

          count++;
          // Nếu có giảng viên thứ 2, xử lý giảng viên 2 và thêm bản ghi thứ hai
          if (SoNguoi == 2) {
            isHDChinh = 0; // Hướng dẫn phụ

            if (item.GiangVien2.includes("-")) {
              GiangVien = item.GiangVien2.split(" - ")[0];
              CCCD = item.GiangVien2.split(" - ")[2];
              isMoiGiang =
                item.GiangVien2.split(" - ")[1].toLowerCase() == "cơ hữu"
                  ? 0
                  : 1;
            } else {
              const matchedItem = uniqueGV.find(
                (arr) => arr.HoTen.trim() == item.GiangVien2.trim()
              );
              if (!matchedItem) {
                errors.push(
                  `\nKhông tìm thấy giảng viên 2: ${item.GiangVien2} của sinh viên ${item.SinhVien}`
                );
                return;
              }
              GiangVien = matchedItem.HoTen.trim();
              CCCD = matchedItem.CCCD;

              isMoiGiang =
                matchedItem.BienChe.toLowerCase() == "cơ hữu" ? 0 : 1;
            }

            SoTiet = 10; // Giảm số tiết cho giảng viên thứ 2
            values.push([
              item.SinhVien || null,
              item.MaSV || null,
              item.KhoaDaoTao || null,
              SoQD || null,
              item.TenDeTai || null,
              SoNguoi || null,
              isHDChinh,
              GiangVien || null,
              CCCD || null,
              isMoiGiang,
              SoTiet || null,
              item.NgayBatDau || null,
              item.NgayKetThuc || null,
              item.MaPhongBan || null,
              NamHoc || null,
              item.Dot || null,
              item.TT || null,
            ]);
          }
        })
    );

    // Nếu có lỗi, trả về thông báo lỗi
    if (errors.length > 0) {
      return res.status(400).json({ message: "Có lỗi xảy ra", errors });
    }

    if (count == 0) {
      // Dữ liệu đã được lưu hết
      return res.json({ message: "Dữ liệu đã được cập nhật đầy đủ" });
    } else {
      const placeholders = daDuyetHetArray.map(() => "?").join(", ");
      const updateQuery = `UPDATE doantotnghiep SET DaLuu = 1 WHERE MaPhongBan IN (${placeholders});`;
      await connection.query(updateQuery, [...daDuyetHetArray]);
    }

    // Câu lệnh SQL để chèn tất cả dữ liệu vào bảng
    const sql = `INSERT INTO exportdoantotnghiep (SinhVien, MaSV, KhoaDaoTao, SoQD, TenDeTai, SoNguoi, isHDChinh, GiangVien, CCCD, isMoiGiang, SoTiet, NgayBatDau, NgayKetThuc, MaPhongBan, NamHoc, Dot, TT)
                 VALUES ?`;

    // Thực thi câu lệnh SQL với mảng values
    const [result] = await connection.query(sql, [values]);

    // Gửi phản hồi thành công
    res.status(200).json({
      message: "Dữ liệu đã được lưu thành công vào cơ sở dữ liệu.",
      insertedRows: result.affectedRows,
    });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu vào database:", error);
    if (!res.headersSent) {
      res.status(500).send("Đã xảy ra lỗi khi lưu dữ liệu vào database!");
    }
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const updateDoAnDateAll = async (req, res) => {
  const jsonData = req.body;

  let connection;

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Duyệt qua từng phần tử trong jsonData
    for (let item of jsonData) {
      const { ID, NgayBatDau, NgayKetThuc } = item;

      let updateQuery, updateValues;

      // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
      updateQuery = `
      UPDATE doantotnghiep
      SET 
        NgayBatDau = ?,
        NgayKetThuc = ?
      WHERE ID = ?
    `;

      updateValues = [
        isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
        isNaN(new Date(NgayKetThuc).getTime()) ? null : NgayKetThuc,
        ID,
      ];

      await connection.query(updateQuery, updateValues);
    }

    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const SaveNote = async (req, res) => {
  let connection = await createPoolConnection();
  try {
    const { id, ghiChu, deadline } = req.body;
    const HoanThanh = false;
    const deadlineValue = deadline || null; // Nếu deadline rỗng, sẽ gán null

    const query = `
        UPDATE doantotnghiep 
        SET GhiChu = ?, Deadline = ?, HoanThanh = ?
        WHERE ID = ?
      `;
    await connection.query(query, [ghiChu, deadlineValue, HoanThanh, id]);
    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu vào bảng doantotnghiep:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  }
};
const DoneNote = async (req, res) => {
  let connection = await createPoolConnection();
  try {
    const { id, ghiChu, deadline } = req.body;
    const HoanThanh = true;
    const mGhiChu = ghiChu + " Đã sửa";
    const deadlineValue = deadline || null; // Nếu deadline rỗng, sẽ gán null

    const query = `
          UPDATE doantotnghiep 
          SET GhiChu = ?, Deadline = ?, HoanThanh = ? 
          WHERE ID = ?
      `;
    await connection.query(query, [mGhiChu, deadlineValue, HoanThanh, id]);
    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu vào bảng doantotnghiep:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  }
};

const getDoAnChinhThuc = async (req, res) => {
  res.render("doAnChinhThuc.ejs");
};

// Lấy dữ liệu để hiển thị site đồ án chính thức
const getDataDoAnChinhThuc = async (req, res) => {
  const Dot = req.body.Dot;
  const NamHoc = req.body.Nam;
  const MaPhongBan = req.body.Khoa;

  let connection;
  try {
    connection = await createPoolConnection();

    let query, values;
    if (MaPhongBan == "ALL") {
      query = "SELECT * FROM doantotnghiep where Dot = ? AND NamHoc = ?";
      values = [Dot, NamHoc];
    } else {
      query =
        "SELECT * FROM doantotnghiep where Dot = ? AND NamHoc = ? AND MaPhongBan = ?";
      values = [Dot, NamHoc, MaPhongBan];
    }
    const [result] = await connection.query(query, values);

    // Trả dữ liệu về client dưới dạng JSON
    res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ database:", error);

    // Trả lỗi về client
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy dữ liệu" });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getDoAnChinhThuc,
  getDataDoAnChinhThuc,
  getthongTinDoAnTotNghiep,
  getInfoDoAn,
  updateDoAn,
  saveToDB,
  getInfoGiangVien,
  getCheckAllDoantotnghiep,
  saveToExportDoAn,
  updateDoAnDateAll,
  SaveNote,
  DoneNote,
};
