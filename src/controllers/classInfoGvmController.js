//const { require } = require("app-root-path");
const express = require("express");
//const connection = require("../config/database");
const createPoolConnection = require("../config/databasePool");

const router = express.Router();

//Lấy danh sách giảng viên mời để show chi tiết

const getClassInfoGvm = async (req, res) => {
  let query;
  const role = req.session.role;
  const MaPhongBan = req.session.MaPhongBan;
  const isKhoa = req.session.isKhoa;
  let connection; // Khai báo biến connection

  if (isKhoa == 0) {
    query = `
    SELECT 
    *
    FROM quychuan
    JOIN gvmoi 
    ON SUBSTRING_INDEX(quychuan.GiaoVienGiangDay, '-', 1) = gvmoi.HoTen;
    `;
  } else {
    query = `SELECT * 
    FROM quychuan 
    JOIN gvmoi ON SUBSTRING_INDEX(quychuan.GiaoVienGiangDay, '-', 1) = gvmoi.HoTen
    WHERE MaHocPhan LIKE '${MaPhongBan}%'`;
  }

  try {
    connection = await createPoolConnection();
    const [results, fields] = await connection.query(query);

    // Nhóm các môn học theo giảng viên
    const groupedByTeacher = results.reduce((acc, current) => {
      const teacher = current.GiaoVienGiangDay;
      if (!acc[teacher]) {
        acc[teacher] = [];
      }
      acc[teacher].push(current);
      return acc;
    }, {});

    res.render("classInfoGvm.ejs", { GiangDay: groupedByTeacher });
  } catch (error) {
    console.error("Error fetching class info:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getGvm = async (req, res) => {
  let connection; // Khai báo biến connection
  const query2 = `SELECT * FROM gvmoi`; // Sử dụng chữ in hoa cho câu lệnh SQL

  try {
    connection = await pool.getConnection(); // Lấy kết nối từ pool

    const [results2] = await connection.query(query2); // Thực hiện truy vấn

    res.json(results2); // Trả về danh sách giảng viên mời
  } catch (error) {
    console.error("Error fetching GVM list:", error);
    res.status(500).json({ message: "Internal Server Error" }); // Xử lý lỗi
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getClassInfoGvm,
  getGvm,
};
