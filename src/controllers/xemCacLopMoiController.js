const XLSX = require("xlsx");
const fs = require("fs");
require("dotenv").config();
const path = require("path");
const { getEnvironmentData } = require("worker_threads");
const createPoolConnection = require("../config/databasePool");

const KhoaCheckAll = async (req, Dot, KiHoc, NamHoc) => {
  const isKhoa = req.session.isKhoa;
  let kq = ""; // Biến để lưu kết quả
  let connection;

  try {
    const query = `SELECT MaPhongBan FROM phongban where isKhoa = 1`;
    connection = await createPoolConnection();
    const [results, fields] = await connection.query(query);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const innerQuery = `SELECT KhoaDuyet FROM quychuan WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?`;
      const [check, innerFields] = await connection.query(innerQuery, [
        MaPhongBan,
        Dot,
        KiHoc,
        NamHoc,
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

const DaoTaoCheckAll = async (req, Dot, KiHoc, NamHoc) => {
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
        FROM quychuan 
        WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?
      `;
      const connection = await createPoolConnection();

      try {
        const [check] = await connection.query(queryDuyet, [
          MaPhongBan,
          Dot,
          KiHoc,
          NamHoc,
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
const TaiChinhCheckAll = async (req, Dot, KiHoc, NamHoc) => {
  let kq = ""; // Biến để lưu kết quả

  const connection = await createPoolConnection();

  try {
    const query = `SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`;
    const [results, fields] = await connection.query(query);

    // Chọn theo từng phòng ban
    for (let i = 0; i < results.length; i++) {
      const MaPhongBan = results[i].MaPhongBan;

      const checkQuery = `
        SELECT TaiChinhDuyet FROM quychuan 
        WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?`;
      const [check, checkFields] = await connection.query(checkQuery, [
        MaPhongBan,
        Dot,
        KiHoc,
        NamHoc,
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

// mới
const renderInfo = async (req, res) => {
  const role = req.session.role;
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;
  console.log("Mã phòng ban = ", MaPhongBan);

  const { Dot, Ki, Nam } = req.body; // Lấy giá trị Dot, Ki, Nam từ body của yêu cầu
  const tableName = process.env.DB_TABLE_QC;
  const MoiGiang = 1;

  // Xác định query SQL dựa trên isKhoa
  const query =
    isKhoa == 1
      ? `SELECT * FROM ${tableName} WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND Khoa = ? AND MoiGiang = ?;`
      : `SELECT * FROM ${tableName} WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND MoiGiang = ?;`;

  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Gọi các hàm kiểm tra
    const check = await KhoaCheckAll(req, Dot, Ki, Nam);
    const DaoTaoCheck = await DaoTaoCheckAll(req, Dot, Ki, Nam);
    const TaiChinhCheck = await TaiChinhCheckAll(req, Dot, Ki, Nam);

    // Thực hiện truy vấn với tham số an toàn
    const [results] = await connection.query(
      query,
      isKhoa == 0
        ? [Dot, Ki, Nam, MoiGiang]
        : [Dot, Ki, Nam, MaPhongBan, MoiGiang]
    );

    // Kiểm tra kết quả truy vấn
    if (results.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    // Trả về kết quả và các giá trị check
    return res.status(200).json({
      results: results,
      check: check,
      DaoTaoCheck: DaoTaoCheck,
      TaiChinhCheck: TaiChinhCheck,
    });
  } catch (error) {
    console.error("Error executing query:", error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    connection.release(); // Trả kết nối về pool sau khi hoàn tất
  }
};

module.exports = {
  renderInfo,
  //chenNgay,
};
