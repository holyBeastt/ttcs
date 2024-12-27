const XLSX = require("xlsx");
const fs = require("fs");
require("dotenv").config();
const path = require("path");
const connection = require("../controllers/connectDB"); // Giả định rằng bạn đã cấu hình kết nối ở đây
const createPoolConnection = require("../config/databasePool");

let tableTam = process.env.DB_TABLE_TAM;
let tableQC = process.env.DB_TABLE_QC;

const getTableQC = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body;

  console.log("Lấy dữ liệu bảng tạm Khoa Đợt Kì Năm:", Khoa, Dot, Ki, Nam);

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    let query;
    const queryParams = [];

    // Xây dựng truy vấn dựa vào giá trị của Khoa
    if (Khoa !== "ALL") {
      query = `SELECT * FROM ${tableQC} WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?`;
      queryParams.push(Khoa, Dot, Ki, Nam);
    } else {
      query = `SELECT * FROM ${tableQC} WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?`;
      queryParams.push(Dot, Ki, Nam);
    }

    // Thực hiện truy vấn
    const results = await connection.execute(query, queryParams);

    // Trả về kết quả dưới dạng JSON
    res.json(results[0]); // results[0] chứa dữ liệu trả về
  } catch (error) {
    console.error("Lỗi trong hàm getTableQC:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

const getTableTam = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body;

  console.log("Lấy dữ liệu bảng tạm Khoa Đợt Kì Năm:", Khoa, Dot, Ki, Nam);

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    let query;
    const queryParams = [];

    // Xây dựng truy vấn dựa vào giá trị của Khoa
    if (Khoa !== "ALL") {
      query = `SELECT * FROM ${tableTam} WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?`;
      queryParams.push(Khoa, Dot, Ki, Nam);
    } else {
      query = `SELECT * FROM ${tableTam} WHERE Dot = ? AND Ki = ? AND Nam = ?`;
      queryParams.push(Dot, Ki, Nam);
    }

    // Thực hiện truy vấn
    const [results] = await connection.execute(query, queryParams);

    // Trả về kết quả dưới dạng JSON
    res.json(results); // results chứa dữ liệu trả về
  } catch (error) {
    console.error("Lỗi trong hàm getTableTam:", error);
    res
      .status(500)
      .json({ message: "Không thể truy xuất dữ liệu từ cơ sở dữ liệu." });
  } finally {
    if (connection) connection.release(); // Trả lại kết nối cho pool
  }
};

const getBoMon2 = async (req, res) => {
  // Câu truy vấn lấy tất cả dữ liệu từ hai bảng
  const query1 = "SELECT HoTen, MonGiangDayChinh FROM `gvmoi`";
  const query2 = "SELECT TenNhanVien AS HoTen, MonGiangDayChinh FROM `nhanvien`";

  try {
    // Thực hiện truy vấn đầu tiên
    const results1 = await new Promise((resolve, reject) => {
      connection.query(query1, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // Thực hiện truy vấn thứ hai
    const results2 = await new Promise((resolve, reject) => {
      connection.query(query2, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    // Gộp kết quả từ hai bảng với cấu trúc khóa đồng nhất
    const combinedResults = [
      ...results1.map((item) => ({
        HoTen: item.HoTen.trim(), // Đảm bảo dữ liệu có định dạng nhất quán
        MonGiangDayChinh: item.MonGiangDayChinh,
      })),
      ...results2.map((item) => ({
        HoTen: item.HoTen.trim(),
        MonGiangDayChinh: item.MonGiangDayChinh,
      })),
    ];

    // Phản hồi lại client với dữ liệu
    res.status(200).json(combinedResults);
  } catch (error) {
    console.error("Error fetching lecturer data:", error);
    res.status(500).json(error.message);
  }
};


// Xuất các hàm để sử dụng
module.exports = { getTableQC, getTableTam, getBoMon2 };
