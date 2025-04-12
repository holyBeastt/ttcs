const express = require("express");
const pool = require("../config/Pool");
const createPoolConnection = require("../config/databasePool");
require("dotenv").config();
const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  PageOrientation,
  VerticalAlign,
} = require("docx");

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
    let query = `SELECT HoTen, CCCD FROM gvmoi WHERE TinhTrangGiangDay = 1 AND id_Gvm != 1`;
    const [gvms] = await connection.query(query);

    // Lấy dữ liệu giảng viên cơ hữu
    query = `SELECT TenNhanVien, CCCD FROM nhanvien`;
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
  const ki = req.query.ki;
  const NamHoc = req.query.NamHoc;
  const MaPhongBan = req.query.MaPhongBan;

  let connection, GiangVien, BienChe, CCCD;
  const errors = []; // Tích lũy lỗi

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    const gvData = await getDuplicateUniqueGV();
    const uniqueGV = gvData.uniqueGV;
    const allGV = gvData.allGV;

    const updates = [];
    const updateIDs = [];

    // Nếu là khoa
    if (isKhoa == 1) {
      for (let item of jsonData) {
        const {
          ID,
          TT,
          GiangVien1,
          GiangVien2,
          GhiChu,
          KhoaDuyet,
          NgayBatDau,
          NgayKetThuc,
        } = item;

        if (KhoaDuyet == 1) {
          // Xử lý giảng viên 1
          if (item.GiangVien1.includes("-")) {
            GiangVien = item.GiangVien1.split("-")[0].trim();
            BienChe = item.GiangVien1.split("-")[1].trim();
            CCCD = item.GiangVien1.split("-")[2].trim();

            const matchedItem = allGV.find(
              (arr) =>
                arr.HoTen?.trim() === GiangVien?.trim() &&
                arr.BienChe?.trim().toLowerCase() === BienChe?.toLowerCase() &&
                arr.CCCD?.trim() === CCCD?.trim()
            );

            if (!matchedItem) {
              errors.push(
                `\nKhông tìm thấy giảng viên 1: ${item.GiangVien1} của sinh viên ${item.SinhVien} ở dòng ${TT}`
              );
              continue;
            }
          } else {
            const matchedItem = uniqueGV.find(
              (arr) => arr.HoTen.trim() == item.GiangVien1.trim()
            );

            if (!matchedItem) {
              errors.push(
                `\nKhông tìm thấy giảng viên 1: ${item.GiangVien1} của sinh viên ${item.SinhVien} ở dòng ${TT}`
              );
              continue;
            }
          }

          if (!GiangVien1 || GiangVien1.length === 0) {
            errors.push(`\nDòng thứ ${TT} chưa được điền giảng viên hướng dẫn`);
            continue;
          }

          if (GiangVien2 == "" || GiangVien2 == null) {
            errors.push(`\nDòng thứ ${TT} chưa được điền giảng viên hướng dẫn`);
            continue;
          } else if (item.GiangVien2.toLowerCase().trim() != "không") {
            if (item.GiangVien2.includes("-")) {
              GiangVien = item.GiangVien2.split("-")[0].trim();
              BienChe = item.GiangVien2.split("-")[1].trim();
              CCCD = item.GiangVien2.split("-")[2].trim();

              const matchedItem = allGV.find(
                (arr) =>
                  arr.HoTen?.trim() === GiangVien?.trim() &&
                  arr.BienChe?.trim().toLowerCase() ===
                  BienChe?.toLowerCase() &&
                  arr.CCCD?.trim() === CCCD?.trim()
              );

              if (!matchedItem) {
                errors.push(
                  `\nKhông tìm thấy giảng viên 2: ${item.GiangVien2} của sinh viên ${item.SinhVien} ở dòng ${TT}`
                );
                continue;
              }
            } else {
              const matchedItem = uniqueGV.find(
                (arr) => arr.HoTen.trim() == item.GiangVien2.trim()
              );

              if (!matchedItem) {
                errors.push(
                  `\nKhông tìm thấy giảng viên 2: ${item.GiangVien2} của sinh viên ${item.SinhVien} ở dòng ${TT}`
                );
                continue;
              }
            }
          }
        }

        updateIDs.push(ID);
        updates.push({
          ID,
          GiangVien1,
          GiangVien2,
          GhiChu,
          KhoaDuyet,
          NgayBatDau: isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
          NgayKetThuc: isNaN(new Date(NgayKetThuc).getTime())
            ? null
            : NgayKetThuc,
        });
      }
    } else {
      // Giới hạn số lượng bản ghi mỗi batch (tránh quá tải)
      const batchSize = 100;
      const batches = [];
      for (let i = 0; i < jsonData.length; i += batchSize) {
        batches.push(jsonData.slice(i, i + batchSize));
      }

      // Xử lý từng batch
      for (const batch of batches) {
        let updateQuery = `
      UPDATE doantotnghiep
      SET
        KhoaDuyet = CASE
    `;
        const updateValues = [];
        const ids = [];

        batch.forEach(({ ID, KhoaDuyet }) => {
          // Thêm logic cập nhật cho NgayBatDau
          updateQuery += ` WHEN ID = ? THEN ? `;
          updateValues.push(ID, KhoaDuyet);

          // Thêm logic cập nhật cho NgayKetThuc
          if (!ids.includes(ID)) ids.push(ID);
        });

        // Phần đào tạo duyệt
        updateQuery += `
          END, 
          DaoTaoDuyet = CASE
        `;

        batch.forEach(({ ID, DaoTaoDuyet }) => {
          updateQuery += ` WHEN ID = ? THEN ? `;
          updateValues.push(ID, DaoTaoDuyet);
        });

        // Phần tài chính duyệt
        updateQuery += `
        END, 
        TaiChinhDuyet = CASE
      `;

        batch.forEach(({ ID, TaiChinhDuyet }) => {
          updateQuery += ` WHEN ID = ? THEN ? `;
          updateValues.push(ID, TaiChinhDuyet);
        });

        // Hoàn thiện truy vấn
        updateQuery += ` END WHERE ID IN (${ids.map(() => "?").join(", ")})`;
        updateValues.push(...ids);

        // Thực hiện truy vấn cập nhật
        await connection.query(updateQuery, updateValues);
      }
    }

    if (updates.length > 0) {
      const updateQuery = `
        UPDATE doantotnghiep
        SET
          GiangVien1 = CASE ID
            ${updates
          .map(
            (u) => `WHEN ${u.ID} THEN ${connection.escape(u.GiangVien1)}`
          )
          .join(" ")}
          END,
          GiangVien2 = CASE ID
            ${updates
          .map(
            (u) => `WHEN ${u.ID} THEN ${connection.escape(u.GiangVien2)}`
          )
          .join(" ")}
          END,
          GhiChu = CASE ID
            ${updates
          .map((u) => `WHEN ${u.ID} THEN ${connection.escape(u.GhiChu)}`)
          .join(" ")}
          END,
          KhoaDuyet = CASE ID
            ${updates.map((u) => `WHEN ${u.ID} THEN ${u.KhoaDuyet}`).join(" ")}
          END,
          NgayBatDau = CASE ID
            ${updates
          .map((u) =>
            u.NgayBatDau
              ? `WHEN ${u.ID} THEN ${connection.escape(u.NgayBatDau)}`
              : `WHEN ${u.ID} THEN NULL`
          )
          .join(" ")}
          END,
          NgayKetThuc = CASE ID
            ${updates
          .map((u) =>
            u.NgayKetThuc
              ? `WHEN ${u.ID} THEN ${connection.escape(u.NgayKetThuc)}`
              : `WHEN ${u.ID} THEN NULL`
          )
          .join(" ")}
          END
        WHERE ID IN (${updateIDs.join(", ")});
      `;

      await connection.query(updateQuery);
    }

    // Nếu có lỗi, trả về thông báo lỗi
    if (errors.length > 0) {
      return res.status(200).json({ message: `Có lỗi xảy ra ${errors}` });
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
  const ki = req.body.ki;
  const NamHoc = req.body.NamHoc;
  const MaPhongBan = req.body.MaPhongBan;

  let connection;
  try {
    connection = await createPoolConnection();

    let query, values, SoQDList;

    const SoQDquery = `SELECT DISTINCT SoQD from doantotnghiep where SoQD != 'NULL' AND Dot = ? AND ki = ? AND NamHoc = ? AND MaPhongBan = ?`;

    if (MaPhongBan == "ALL") {
      query =
        "SELECT * FROM doantotnghiep where Dot = ? AND ki = ? AND NamHoc = ?";
      values = [Dot, ki, NamHoc];
    } else {
      query =
        "SELECT * FROM doantotnghiep where Dot = ? AND ki = ? AND NamHoc = ? AND MaPhongBan = ?";
      values = [Dot, ki, NamHoc, MaPhongBan];

      [SoQDList] = await connection.query(SoQDquery, values);
    }
    const [result] = await connection.query(query, values); // Dùng destructuring để lấy dữ liệu

    // Trả dữ liệu về client dưới dạng JSON
    res.status(200).json({ result, SoQDList });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu từ database:", error);

    // Trả lỗi về client
    res.status(500).json({ message: "Đã xảy ra lỗi khi lấy dữ liệu" });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const KhoaCheckAll = async (req, Dot, ki, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả
  let connection;

  try {
    const query = `SELECT MaPhongBan FROM phongban where isKhoa = 1`;
    connection = await createPoolConnection();
    const [results, fields] = await connection.query(query);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const innerQuery = `SELECT KhoaDuyet FROM doantotnghiep WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND ki = ?`;
      const [check, innerFields] = await connection.query(innerQuery, [
        MaPhongBan,
        NamHoc,
        Dot,
        ki,
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

const DaoTaoCheckAll = async (req, Dot, ki, NamHoc) => {
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
        WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND ki = ?
      `;
      const connection = await createPoolConnection();

      try {
        const [check] = await connection.query(queryDuyet, [
          MaPhongBan,
          NamHoc,
          Dot,
          ki,
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
const TaiChinhCheckAll = async (req, Dot, ki, NamHoc) => {
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
        WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND ki = ?`;
      const [check, checkFields] = await connection.query(checkQuery, [
        MaPhongBan,
        NamHoc,
        Dot,
        ki,
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
  const ki = req.body.ki;
  const Dot = req.body.Dot;
  const KhoaCheck = await KhoaCheckAll(req, Dot, ki, NamHoc);
  const DaoTaoCheck = await DaoTaoCheckAll(req, Dot, ki, NamHoc);
  const TaiChinhCheck = await TaiChinhCheckAll(req, Dot, ki, NamHoc);

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
    const [gvms] = await connection.query(`SELECT HoTen, CCCD FROM gvmoi`);
    const [nvs] = await connection.query(
      `SELECT TenNhanVien, CCCD FROM nhanvien`
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
    if (connection) connection.release();
  }
};

const getGVData = async () => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Hàm chuẩn hóa tên
    const normalizeName = (name) => name.replace(/\s*\(.*?\)\s*/g, "").trim();

    // Lấy dữ liệu giảng viên mời và cơ hữu
    const [gvms] = await connection.query(`SELECT * FROM gvmoi`);
    const [nvs] = await connection.query(`SELECT * FROM nhanvien`);

    // Gộp và chuẩn hóa danh sách
    const combinedList = [
      ...gvms.map((item) => ({
        HoTen: item.HoTen,
        CCCD: item.CCCD,
        BienChe: "Giảng viên mời",
        HoTenReal: normalizeName(item.HoTen),
        GioiTinh: item.GioiTinh,
        NgaySinh: item.NgaySinh,
        NgayCapCCCD: item.NgayCapCCCD,
        NoiCapCCCD: item.NoiCapCCCD,
        DiaChi: item.DiaChi,
        DienThoai: item.DienThoai,
        Email: item.Email,
        MaSoThue: item.MaSoThue,
        HocVi: item.HocVi,
        NoiCongTac: item.NoiCongTac,
        ChucVu: item.ChucVu,
        HSL: item.HSL,
        STK: item.STK,
        NganHang: item.NganHang,
        MonGiangDayChinh: item.MonGiangDayChinh,
      })),
      ...nvs.map((item) => ({
        HoTen: item.TenNhanVien,
        CCCD: item.CCCD,
        BienChe: "Cơ hữu",
        HoTenReal: normalizeName(item.TenNhanVien),
        GioiTinh: null,
        NgaySinh: null,
        NgayCapCCCD: null,
        NoiCapCCCD: null,
        DiaChi: null,
        DienThoai: null,
        Email: null,
        MaSoThue: null,
        HocVi: null,
        NoiCongTac: null,
        ChucVu: null,
        HSL: null,
        STK: null,
        NganHang: null,
        MonGiangDayChinh: null,
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
    if (connection) connection.release();
  }
};

const saveToExportDoAn = async (req, res) => {
  const Dot = req.body.Dot;
  const ki = req.body.ki;
  const NamHoc = req.body.NamHoc;
  const MaKhoa = req.body.MaPhongBan;

  let connection;
  try {
    connection = await createPoolConnection(); // Kết nối đến DB
    const errors = []; // Tích lũy lỗi
    let count = 0; // Đếm xem bao nhiêu dòng được chèn

    const gvData = await getGVData();
    const uniqueGV = gvData.uniqueGV;
    const allGV = gvData.allGV;

    const daDuyetHet = await TaiChinhCheckAll(req, Dot, NamHoc);
    const daDuyetHetArray = daDuyetHet.split(",").filter((item) => item !== ""); // Chuyển đổi thành mảng và loại bỏ phần tử rỗng

    let queryData, data;

    if (MaKhoa == "ALL") {
      queryData =
        "select * from doantotnghiep where Dot = ? AND ki = ? AND NamHoc = ?";

      [data] = await connection.query(queryData, [Dot, ki, NamHoc]);
    } else {
      queryData =
        "select * from doantotnghiep where Dot = ? AND ki = ? AND NamHoc = ? AND MaPhongBan = ?";

      [data] = await connection.query(queryData, [Dot, ki, NamHoc, MaKhoa]);
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
          let matchedItem1;

          // Xử lý giảng viên 1
          if (item.GiangVien1.includes("-")) {
            GiangVien = item.GiangVien1.split("-")[0].trim();
            CCCD = item.GiangVien1.split("-")[2].trim();
            isMoiGiang =
              item.GiangVien1.split("-")[1].toLowerCase() == "cơ hữu" ? 0 : 1;
            matchedItem1 = allGV.find((arr) => arr.HoTen.trim() == GiangVien);
          } else {
            matchedItem1 = uniqueGV.find(
              (arr) => arr.HoTen.trim() == item.GiangVien1.trim()
            );
            if (!matchedItem1) {
              errors.push(
                `\nKhông tìm thấy giảng viên 1: ${item.GiangVien1} của sinh viên ${item.SinhVien}`
              );
              return;
            }

            GiangVien = matchedItem1.HoTen.trim();
            CCCD = matchedItem1.CCCD;
            isMoiGiang = matchedItem1.BienChe.toLowerCase() == "cơ hữu" ? 0 : 1;
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
            item.ki || null,
            item.Dot || null,
            item.TT || null,
            matchedItem1.GioiTinh || null,
            matchedItem1.NgaySinh || null,
            matchedItem1.NgayCapCCCD || null,
            matchedItem1.NoiCapCCCD || null,
            matchedItem1.DiaChi || null,
            matchedItem1.DienThoai || null,
            matchedItem1.Email,
            matchedItem1.MaSoThue,
            matchedItem1.HocVi,
            matchedItem1.NoiCongTac,
            matchedItem1.ChucVu,
            matchedItem1.STK,
            matchedItem1.NganHang,
            matchedItem1.MonGiangDayChinh,
            matchedItem1.HSL,
          ]);

          let matchedItem2;
          count++;
          // Nếu có giảng viên thứ 2, xử lý giảng viên 2 và thêm bản ghi thứ hai
          if (SoNguoi == 2) {
            isHDChinh = 0; // Hướng dẫn phụ

            if (item.GiangVien2.includes("-")) {
              GiangVien = item.GiangVien2.split("-")[0].trim();
              CCCD = item.GiangVien2.split("-")[2].trim();
              isMoiGiang =
                item.GiangVien2.split("-")[1].toLowerCase() == "cơ hữu" ? 0 : 1;

              matchedItem2 = allGV.find((arr) => arr.HoTen.trim() == GiangVien);
            } else {
              matchedItem2 = uniqueGV.find(
                (arr) => arr.HoTen.trim() == item.GiangVien2.trim()
              );
              if (!matchedItem2) {
                errors.push(
                  `\nKhông tìm thấy giảng viên 2: ${item.GiangVien2} của sinh viên ${item.SinhVien}`
                );
                return;
              }
              GiangVien = matchedItem2.HoTen.trim();
              CCCD = matchedItem2.CCCD;

              isMoiGiang =
                matchedItem2.BienChe.toLowerCase() == "cơ hữu" ? 0 : 1;
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
              item.ki || null,
              item.Dot || null,
              item.TT || null,
              matchedItem2.GioiTinh || null,
              matchedItem2.NgaySinh || null,
              matchedItem2.NgayCapCCCD || null,
              matchedItem2.NoiCapCCCD || null,
              matchedItem2.DiaChi || null,
              matchedItem2.DienThoai || null,
              matchedItem2.Email,
              matchedItem2.MaSoThue,
              matchedItem2.HocVi,
              matchedItem2.NoiCongTac,
              matchedItem2.ChucVu,
              matchedItem2.STK,
              matchedItem2.NganHang,
              matchedItem2.MonGiangDayChinh,
              matchedItem2.HSL,
            ]);
          }
        })
    );

    // Nếu có lỗi, trả về thông báo lỗi
    if (errors.length > 0) {
      return res.status(200).json({ message: `Có lỗi xảy ra ${errors}` });
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
    const sql = `INSERT INTO exportdoantotnghiep (SinhVien, MaSV, KhoaDaoTao, SoQD, TenDeTai, SoNguoi, 
    isHDChinh, GiangVien, CCCD, isMoiGiang, SoTiet, NgayBatDau, NgayKetThuc, MaPhongBan, NamHoc, ki, Dot, TT,
    GioiTinh, NgaySinh, NgayCapCCCD, NoiCapCCCD, DiaChi, DienThoai, Email, MaSoThue, HocVi, NoiCongTac,
    ChucVu, STK, NganHang, MonGiangDayChinh, HSL)
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

// const updateDoAnDateAll = async (req, res) => {
//   const jsonData = req.body;

//   let connection;

//   try {
//     // Lấy kết nối từ createPoolConnection
//     connection = await createPoolConnection();

//     // Duyệt qua từng phần tử trong jsonData
//     for (let item of jsonData) {
//       const { ID, NgayBatDau, NgayKetThuc } = item;

//       let updateQuery, updateValues;

//       // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
//       updateQuery = `
//       UPDATE doantotnghiep
//       SET
//         NgayBatDau = ?,
//         NgayKetThuc = ?
//       WHERE ID = ?
//     `;

//       updateValues = [
//         isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
//         isNaN(new Date(NgayKetThuc).getTime()) ? null : NgayKetThuc,
//         ID,
//       ];

//       await connection.query(updateQuery, updateValues);
//     }

//     res.status(200).json({ message: "Cập nhật thành công" });
//   } catch (error) {
//     console.error("Lỗi cập nhật:", error);
//     res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//   } finally {
//     if (connection) connection.release(); // Trả kết nối về pool
//   }
// };

const updateDoAnDateAll = async (req, res) => {
  const jsonData = req.body;

  let connection;

  try {
    // Kiểm tra dữ liệu đầu vào
    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ message: "Dữ liệu đầu vào trống" });
    }

    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Giới hạn số lượng bản ghi mỗi batch (tránh quá tải)
    const batchSize = 100;
    const batches = [];
    for (let i = 0; i < jsonData.length; i += batchSize) {
      batches.push(jsonData.slice(i, i + batchSize));
    }

    // Xử lý từng batch
    for (const batch of batches) {
      let updateQuery = `
        UPDATE doantotnghiep
        SET
          NgayBatDau = CASE
      `;
      const updateValues = [];
      const ids = [];

      batch.forEach(({ ID, NgayBatDau, NgayKetThuc }) => {
        // Chuẩn hóa dữ liệu
        const validNgayBatDau = isNaN(new Date(NgayBatDau).getTime())
          ? null
          : NgayBatDau;
        const validNgayKetThuc = isNaN(new Date(NgayKetThuc).getTime())
          ? null
          : NgayKetThuc;

        // Thêm logic cập nhật cho NgayBatDau
        updateQuery += ` WHEN ID = ? THEN ? `;
        updateValues.push(ID, validNgayBatDau);

        // Thêm logic cập nhật cho NgayKetThuc
        if (!ids.includes(ID)) ids.push(ID);
      });

      updateQuery += `
        END, 
        NgayKetThuc = CASE
      `;

      batch.forEach(({ ID, NgayKetThuc }) => {
        const validNgayKetThuc = isNaN(new Date(NgayKetThuc).getTime())
          ? null
          : NgayKetThuc;
        updateQuery += ` WHEN ID = ? THEN ? `;
        updateValues.push(ID, validNgayKetThuc);
      });

      // Hoàn thiện truy vấn
      updateQuery += ` END WHERE ID IN (${ids.map(() => "?").join(", ")})`;
      updateValues.push(...ids);

      // Thực hiện truy vấn cập nhật
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
  const Ki = req.body.Ki;
  const NamHoc = req.body.Nam;
  const MaPhongBan = req.body.Khoa;

  let connection;
  try {
    connection = await createPoolConnection();

    let query, values;
    if (MaPhongBan == "ALL") {
      query = "SELECT * FROM doantotnghiep where Dot = ? AND Ki = ? AND NamHoc = ?";
      values = [Dot, Ki, NamHoc];
    } else {
      query =
        "SELECT * FROM doantotnghiep where Dot = ? AND Ki = ? AND NamHoc = ? AND MaPhongBan = ?";
      values = [Dot, Ki, NamHoc, MaPhongBan];
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

const exportToWord = async (req, res) => {
  const data = req.body;
  const NamHoc = data[0].NamHoc;
  const Khoa = data[0].Khoa;

  try {
    // Lấy dữ liệu từ client

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ. Cần mảng các đối tượng sinh viên.",
      });
    }

    // Tạo style cho font chữ Times New Roman, cỡ 13, căn giữa
    const defaultStyle = {
      font: "Times New Roman",
      size: 26, // 13pt = 26 half-points
      alignment: AlignmentType.CENTER,
    };

    // Tạo header cho bảng
    const headerRow = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              text: "STT",
              bold: true,
              ...defaultStyle,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Sinh viên",
              bold: true,
              ...defaultStyle,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Mã SV",
              bold: true,
              ...defaultStyle,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Tên đề tài",
              bold: true,
              ...defaultStyle,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Họ tên Cán bộ giảng viên hướng dẫn",
              bold: true,
              ...defaultStyle,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [
            new Paragraph({
              text: "Đơn vị công tác",
              bold: true,
              ...defaultStyle,
            }),
          ],
          verticalAlign: VerticalAlign.CENTER,
        }),
      ],
    });

    // Tạo các dòng dữ liệu
    const dataRows = data.map((item, index) => {
      return new TableRow({
        children: [
          // STT
          new TableCell({
            children: [
              new Paragraph({
                text: String(index + 1),
                ...defaultStyle,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          // Sinh viên
          new TableCell({
            children: [
              new Paragraph({
                text: item.SinhVien || "",
                ...defaultStyle,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          // Mã SV
          new TableCell({
            children: [
              new Paragraph({
                text: item.MaSV || "",
                ...defaultStyle,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          // Tên đề tài
          new TableCell({
            children: [
              new Paragraph({
                text: item.TenDeTai || "",
                ...defaultStyle,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
          // Giảng viên hướng dẫn
          new TableCell({
            children: createGiangVienParagraphs(
              item.GiangVienHuongDan,
              defaultStyle
            ),
            verticalAlign: VerticalAlign.CENTER,
          }),
          // Đơn vị công tác - sử dụng trường Khoa
          new TableCell({
            children: [
              new Paragraph({
                text: "",
                ...defaultStyle,
              }),
            ],
            verticalAlign: VerticalAlign.CENTER,
          }),
        ],
      });
    });

    // Hàm tạo đoạn văn bản cho giảng viên hướng dẫn (có thể có nhiều giảng viên)
    function createGiangVienParagraphs(giangVien, style) {
      if (!giangVien) return [new Paragraph({ text: "", ...style })];

      // Nếu là chuỗi, kiểm tra xem có nhiều dòng không
      if (typeof giangVien === "string") {
        // Nếu chuỗi có định dạng "1. TS. Nguyễn Văn A\n2. ThS. Trần Văn B"
        if (giangVien.includes("\n")) {
          return giangVien.split("\n").map(
            (gv) =>
              new Paragraph({
                text: gv.trim(),
                ...style,
              })
          );
        }
        return [new Paragraph({ text: giangVien, ...style })];
      }

      return [new Paragraph({ text: "", ...style })];
    }

    // Thiết lập chiều rộng cột
    const table = new Table({
      rows: [headerRow, ...dataRows],
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      columnWidths: [5, 15, 10, 35, 25, 10], // Phần trăm chiều rộng cho mỗi cột
    });

    // Tạo tài liệu Word với bảng vừa tạo
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Times New Roman",
              size: 26, // 13pt = 26 half-points
            },
            paragraph: {
              alignment: AlignmentType.CENTER,
            },
          },
        },
      },
      sections: [
        {
          properties: {
            page: {
              size: {
                orientation: PageOrientation.LANDSCAPE,
              },
              margin: {
                top: 1000,
                right: 1000,
                bottom: 1000,
                left: 1000,
              },
            },
          },
          children: [
            new Paragraph({
              text: `ĐỒ ÁN CHÍNH THỨC KHOA ${Khoa} NĂM HỌC ${NamHoc}`,
              bold: true,
              alignment: AlignmentType.CENTER,
              font: "Times New Roman",
              size: 26, // 13pt = 26 half-points
            }),
            new Paragraph({
              text: "",
              font: "Times New Roman",
              size: 26, // 13pt = 26 half-points
            }),
            table,
          ],
        },
      ],
    });

    // Chuyển tài liệu sang buffer
    const buffer = await Packer.toBuffer(doc);

    // Đặt tên file
    const fileName = `do_an_chinh_thuc_khoa_${Khoa}_nam_${NamHoc}.docx`;

    // Thiết lập header và gửi file về client
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.send(buffer);
  } catch (error) {
    console.error("Lỗi khi xuất file docx:", error);
    res.status(500).json({ message: "Đã xảy ra lỗi khi xuất file docx." });
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
  exportToWord,
};
