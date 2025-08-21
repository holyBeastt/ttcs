const express = require("express");
const createPoolConnection = require("../config/databasePool");
const gvmList = require("../services/gvmServices");
require("dotenv").config();
const path = require("path");
const fs = require("fs");
const readXlsxFile = require("read-excel-file/node");

const getThemFileHocPhan = (req, res) => {
  res.render("adminThemFileHocPhan.ejs", { data: [] });
};

// Đường dẫn đến thư mục cha
const parentDir = path.join(__dirname, "..");
const p = path.join(parentDir, "..");

let duLieu;
const convertExcelToJSON = (req, res) => {
  // Kiểm tra xem file đã được tải lên chưa
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "No file uploaded", status: "error" });
  }

  const filePath = path.join(p, "uploads", req.file.filename);

  // Đọc file Excel
  readXlsxFile(filePath)
    .then((rows) => {
      duLieu = rows;

      // Lấy tiêu đề (headers) từ hàng đầu tiên
      const headers = rows[0];

      // Chuyển đổi các hàng còn lại thành các đối tượng
      const data = rows.slice(1).map((row) => {
        return headers.reduce((acc, header, index) => {
          acc[header] = row[index];
          return acc;
        }, {});
      });

      // Render dữ liệu ra view 'importGvmList.ejs' và truyền dữ liệu vào
      res.render("adminThemFileHocPhan.ejs", { data });
    })
    .catch((error) => {
      console.error("Lỗi khi đọc file:", error);
      res.status(500).send("Đã xảy ra lỗi khi đọc file!");
    });
};

function formatDateForMySQL(date) {
  const dateMacDinh = "1900-01-01";

  if (!date) return dateMacDinh; // Kiểm tra giá trị null hoặc undefined

  // Nếu ngày là chuỗi dạng DD/MM/YYYY
  if (typeof date === "string" && date.includes("/")) {
    const parts = date.split("/");
    if (parts.length === 3) {
      // Đổi thành 'YYYY-MM-DD'
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  // Nếu ngày là chuỗi ISO hoặc đối tượng Date
  const dateObj = new Date(date);
  if (!isNaN(dateObj)) {
    // Trả về chuỗi 'YYYY-MM-DD' từ đối tượng Date
    return dateObj.toISOString().split("T")[0];
  }

  return dateMacDinh; // Trả về null nếu định dạng không hợp lệ
}

// Xử lý
const getArrValue = async (req, res) => {
  // Lấy tiêu đề
  const headers = duLieu[0]; // Lấy hàng tiêu đề

  // Lấy tất cả các hàng dữ liệu
  const rows = data.slice(1); // Lấy các hàng từ chỉ mục 1 đến cuối

  // Chuyển đổi thành mảng các đối tượng
  const result = rows.map((row) => {
    return headers.reduce((acc, header, index) => {
      acc[header] = row[index];
      return acc;
    }, {});
  });
};

const saveToDB = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection(); // Kết nối đến DB
    const data = JSON.parse(req.body.data); // Lấy dữ liệu từ request (dữ liệu đã render ra)

    const [khoaList] = await connection.query(
      "select MaPhongBan from phongban"
    );

    const khoaFalse = [];

    if (data && data.length > 0) {
      for (const row of data) {
        const MaHocPhan = row["Mã học phần"] || "";
        const TenHocPhan = row["Tên môn học"] || "";
        const DVHT = row["Số TC"] || "";
        const Khoa = row["Mã Khoa"] || " ";
        const MaBoMon = row["Mã Bộ môn"] || "";
        const GhiChu = row["Ghi chú"] || "";

        if (Khoa.trim() != "") {
          const isInKhoaList = khoaList.some(
            (kh) => kh.MaPhongBan.trim() === Khoa.trim()
          );

          if (!isInKhoaList) {
            khoaFalse.push(Khoa);
            continue;
          }
        }

        const sql = `
          insert into hocphan (MaHocPhan, TenHocPhan, DVHT, Khoa, MaBoMon, GhiChu) values
          (?, ?, ?, ?, ?, ?)
      `;

        const values = [MaHocPhan, TenHocPhan, DVHT, Khoa, MaBoMon, GhiChu];

        await connection.query(sql, values);
      }

      let mess = "";

      if (khoaFalse.length > 0) {
        mess += `\n<b>Dữ liệu không được lưu cho các giảng viên sau do không đúng khoa:</b> \n${khoaFalse.join(
          "\n "
        )}`;
      }

      if (mess !== "") {
        return res.status(400).json({ message: mess });
      }

      // Ghi log khi admin thêm file học phần
      try {
        const userId = 1;
        const tenNhanVien = 'ADMIN';
        const khoa = 'DAOTAO';
        const logSql = `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES (?, ?, ?, ?, ?, NOW())`;
        const logMessage = `Admin thêm file học phần - ${data.length} bản ghi`;
        await connection.query(logSql, [userId, tenNhanVien, khoa, 'Admin Log', logMessage]);
      } catch (logError) {
        console.error('Lỗi khi ghi log:', logError);
      }

      res.json({ message: "Dữ liệu đã được lưu thành công vào database!" });
    } else {
      res.status(400).json({ message: "Không có dữ liệu để lưu." });
    }
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu vào database:", error);
    if (!res.headersSent) {
      res.status(500).send("Đã xảy ra lỗi khi lưu dữ liệu vào database!");
    }
  } finally {
    if (connection) connection.release();
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getThemFileHocPhan,
  convertExcelToJSON,
  getArrValue,
  saveToDB,
};
