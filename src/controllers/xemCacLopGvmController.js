//const { require } = require("app-root-path");
const express = require("express");
//const connection = require("../config/database");
const createConnection = require("../config/databaseAsync");
const createPoolConnection = require("../config/databasePool");

const router = express.Router();

const getClassInfoGvm = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    // Lấy danh sách phòng ban để lọc
    const qrPhongBan = `select MaPhongBan from phongban where isKhoa = 1`;
    const [phongBanList] = await connection.query(qrPhongBan);

    res.render("xemCacLopGvm.ejs", {
      phongBanList: phongBanList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Hàm tách chuỗi - giữ nguyên
function tachChuoi(chuoi) {
  const parts = chuoi.split("-");
  const tenHP = parts[0].trim();
  const HocKi = parts[1] ? parts[1].trim() : "";
  const namHocLop = parts[2] ? parts[2].split("(")[0].trim() : "";
  const NamHoc = "20" + namHocLop.substring(0, 2).trim();
  const LopMatch = chuoi.match(/\(([^)]+)\)/);
  const Lop = LopMatch ? LopMatch[1] : "";
  return {
    TenLop: tenHP,
    HocKi: HocKi,
    NamHoc,
    Lop,
  };
}

// Hàm tách lớp chính và phân lớp (nếu có)
function extractClassSuffix(lop) {
  const match = lop.match(/([A-Z\d]+)(\.\d+)?/); // Tìm lớp chính và phân lớp (.1, .2,...)
  if (match) {
    return {
      baseClass: match[1], // Lớp chính (ví dụ: A18C604)
      suffix: match[2] || "", // Phân lớp (.1, .2,...)
    };
  }
  return { baseClass: lop, suffix: "" }; // Nếu không có phân lớp
}

// Hàm gộp các học phần trùng
function handleDuplicateCourses(firstCourse, courses) {
  const totalLL = courses.reduce((sum, course) => sum + course.LL, 0);
  const totalSoTietCTDT = courses.reduce(
    (sum, course) => sum + course.SoTietCTDT,
    0
  );
  const totalQuyChuan = courses.reduce(
    (sum, course) => sum + course.QuyChuan,
    0
  );

  return {
    ...firstCourse,
    LL: totalLL,
    SoTietCTDT: totalSoTietCTDT,
    QuyChuan: totalQuyChuan,
  };
}

const renderInfo = (req, res) => {
  const role = req.session.role;
  const { Dot, Ki, Nam } = req.body; // Lấy giá trị khoa, dot, ki từ body của yêu cầu
  const tableName = process.env.DB_TABLE_QC;
  let query = "";

  const roleDaoTaoALL = process.env.DAOTAO_ALL;
  const roleTaiChinhALL = process.env.TAICHINH_ALL;

  console.log("daotaoall ", roleDaoTaoALL);

  const roleCNTTAll = process.env.CNTT_ALL;
  const roleATTTAll = process.env.ATTT_ALL;
  const roleDTVTAll = process.env.DTVT_ALL;

  // const roleDaoTaoThiHanh = process.env.THIHANH;
  const roleCNTTThiHanh = process.env.CNTT_THIHANH;
  const roleATTTThiHanh = process.env.ATTT_THIHANH;
  const roleDTVTThiHanh = process.env.DTVT_THIHANH;

  const roleDaoTaoXem = process.env.DAOTAO_XEM;
  const roleTaiChinhXem = process.env.TAICHINH_XEM;
  const roleCNTTXem = process.env.CNTT_XEM;
  const roleATTTXem = process.env.ATTT_XEM;
  const roleDTVTXem = process.env.DTVT_XEM;

  // Xây dựng câu truy vấn SQL sử dụng các tham số
  if (
    role == roleDaoTaoALL ||
    role == roleDaoTaoXem ||
    role == roleTaiChinhALL ||
    role == roleTaiChinhXem
  ) {
    query = `
    SELECT * FROM ${tableName}
    WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?;
  `;
  } else if (
    role == roleCNTTAll ||
    role == roleCNTTThiHanh ||
    role == roleCNTTXem
  ) {
    query = `
    SELECT * FROM ${tableName}
    WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND Khoa = 'CNTT';
  `;
  } else if (
    role == roleATTTAll ||
    role == roleATTTThiHanh ||
    role == roleATTTXem
  ) {
    query = `
    SELECT * FROM ${tableName}
    WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND Khoa = 'ATTT';
  `;
  } else if (
    role == roleDTVTAll ||
    role == roleDTVTThiHanh ||
    role == roleDTVTXem
  ) {
    query = `
    SELECT * FROM ${tableName}
    WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND Khoa = 'DTVT';
  `;
  }

  // Thực thi câu truy vấn với các tham số an toàn
  connection.query(query, [Dot, Ki, Nam], (error, results) => {
    if (error) {
      return res.status(500).json({ error: "Internal server error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }
    return res.status(200).json(results); // Trả về kết quả tương ứng với đợt, kì, năm
  });
};

// Hàm lấy tất cả tên giảng viên từ cơ sở dữ liệu
const getNameGV = (req, res) => {
  // Truy vấn để lấy danh sách giảng viên mời
  const query = "SELECT DISTINCT TenNhanVien,MaPhongBan FROM nhanvien;";

  connection.query(query, (error, results) => {
    if (error) {
      return res.status(500).json({ error: "Internal server error" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No teachers found" });
    }

    // Lấy đầy đủ tên giảng viên từ cột HoTen và trả về kết quả
    return res.status(200).json(results);
  });
};

const getKhoaAndNameGvmOfKhoa = async (req, res) => {
  try {
    // Truy vấn để lấy tất cả các trường HoTen và MaPhongBan từ bảng gvmoi
    const gvmResults = await new Promise((resolve, reject) => {
      const queryGVM = `
        SELECT gvmoi.HoTen, gvmoi.MaPhongBan
        FROM gvmoi;
      `;

      connection.query(queryGVM, (error, results) => {
        if (error) {
          console.error("Lỗi truy vấn cơ sở dữ liệu:", error);
          return reject(
            new Error("Không thể truy xuất dữ liệu từ cơ sở dữ liệu.")
          );
        }
        resolve(results); // Trả về kết quả truy vấn
      });
    });

    // Trả về dữ liệu lấy từ bảng gvmoi
    return res.status(200).json(gvmResults);
  } catch (error) {
    console.error("Lỗi trong hàm getKhoaAndNameGvmOfKhoa:", error);
    return res
      .status(500)
      .json({ error: "Đã xảy ra lỗi trong quá trình xử lý dữ liệu." });
  }
};

module.exports = { getClassInfoGvm };
