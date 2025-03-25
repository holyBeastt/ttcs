//const { require } = require("app-root-path");
const express = require("express");
//const connection = require("../config/database");
const createPoolConnection = require("../config/databasePool");

const router = express.Router();

//Lấy danh sách giảng viên mời để show chi tiết

const getClassInfoGvm = async (req, res) => {
  res.render("classInfoGvm.ejs");
};

const getClassInfoGvmData = async (req, res) => {
  const MaPhongBan = req.session.MaPhongBan;
  const isKhoa = req.session.isKhoa;
  const { dot, ki, nam, department, he_dao_tao } = req.body; // Nhận dữ liệu lọc từ client

  let connection; // Khai báo biến connection

  let query = `
  WITH 
  phuLucSauDH AS (
      SELECT DISTINCT
          TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) AS GiangVien, 
          qc.TenLop AS Lop, 
          ROUND(qc.QuyChuan * 0.3, 2) AS SoTiet, -- Làm tròn 2 chữ số sau dấu phẩy
          qc.LopHocPhan AS TenHocPhan, 
          qc.KiHoc AS HocKy,
          qc.SoTinChi,
          gv.id_Gvm,
          gv.HocVi, 
          gv.HSL,
          qc.NgayBatDau, 
          qc.NgayKetThuc,
          gv.DiaChi,
          qc.Dot,
          qc.KiHoc,
          qc.NamHoc,
          qc.Khoa,
          qc.he_dao_tao
      FROM quychuan qc
      JOIN gvmoi gv 
          ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen -- Bỏ khoảng trắng dư thừa
      WHERE qc.GiaoVienGiangDay LIKE '%,%'
  ),
  phuLucDH AS (
      SELECT DISTINCT
          TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) AS GiangVien, 
          qc.TenLop AS Lop, 
          qc.QuyChuan AS SoTiet, 
          qc.LopHocPhan AS TenHocPhan, 
          qc.KiHoc AS HocKy,
          qc.SoTinChi,
          gv.id_Gvm,
          gv.HocVi, 
          gv.HSL,
          qc.NgayBatDau, 
          qc.NgayKetThuc,
          gv.DiaChi,
          qc.Dot,
          qc.KiHoc,
          qc.NamHoc,
          qc.Khoa,   
          qc.he_dao_tao
      FROM quychuan qc
      JOIN gvmoi gv 
          ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) = gv.HoTen
      WHERE qc.MoiGiang = 1 AND qc.GiaoVienGiangDay NOT LIKE '%,%'
  ),
  table_ALL AS (
      SELECT * FROM phuLucSauDH
      UNION
      SELECT * FROM phuLucDH
  )

  SELECT * FROM table_ALL WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?
  `;

  // Thêm điều kiện lọc theo hệ đào tạo nếu không phải "ALL"
  if (he_dao_tao !== 'ALL') {
    query += ` AND he_dao_tao = ?`;
  }

  // Thêm điều kiện lọc theo khoa
  if (isKhoa == 0) {
    if (department != "ALL") {
      query += ` AND Khoa LIKE '%${department}%'`;
    }
  } else {
    query += ` AND Khoa LIKE '%${MaPhongBan}%'`;
  }

  try {
    connection = await createPoolConnection();
    const queryParams = [dot, ki, nam];
    if (he_dao_tao !== 'ALL') {
      queryParams.push(he_dao_tao);
    }
    
    const [results, fields] = await connection.query(query, queryParams);

    // Nhóm các môn học theo giảng viên
    const groupedByTeacher = results.reduce((acc, current) => {
      const teacher = current.GiangVien;
      if (!acc[teacher]) {
        acc[teacher] = [];
      }
      acc[teacher].push(current);
      return acc;
    }, {});

    // Trả về dữ liệu nhóm theo giảng viên dưới dạng JSON
    res.json(groupedByTeacher);
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
  getClassInfoGvmData,
};
