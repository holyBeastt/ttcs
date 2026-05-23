const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

const router = express.Router();

// Cấu hình multer để lưu file tạm thời trong thư mục 'uploads'
const upload = multer({
  dest: "uploads/", // Đường dẫn thư mục lưu trữ file
});

const getLogin = (req, res) => {
  res.render("login.ejs");
};

const getIndex = (req, res) => {
  res.render("index.ejs");
};

const getImport = (req, res) => {
  res.render("quychuan.themFileQuyChuan.ejs");
};

const getDtaoduyet = (req, res) => {
  res.render("daotaoduyet.ejs");
};

const getlog = (req, res) => {
  res.render("log.ejs");
};
// const getDtaoxemhd = (req, res) => {
//   res.render("maindt.ejs");
// };
const getDtaonhap = (req, res) => {
  res.render("daotaonhap.ejs");
};
const getPhongVP = (req, res) => {
  res.render("mainTC.ejs");
};
const gethomePage = (req, res) => {
  res.render("homepage.ejs");
};
const getHomeMainDaoTao = (req, res) => {
  res.render("maindt.ejs");
};
const getTeachingInfo = (req, res) => {
  res.render("moigiang.thongTinGiangVienSiteKhoa.ejs");
};
const getXemBangQC = (req, res) => {
  res.render("quychuan.bangQuyChuanChinhThuc.ejs");
};

// Khoa
const getMainKhoa = (req, res) => {
  res.render("mainkhoa.ejs");
};
//log
const getthongkemg = (req, res) => {
  res.render("thongkemg.ejs");
};
const getthongkenckh = (req, res) => {
  res.render("thongkenckh.ejs");
};
const getthongkedoan = (req, res) => {
  res.render("thongkedoan.ejs");
};
const getthongtonghop = (req, res) => {
  res.render("thongketonghop.ejs");
};
// Hàm postFile xử lý upload file Excel
const postFile = (req, res) => {
  // Sử dụng multer để upload file
  upload.single("excelFile")(req, res, function (err) {
    // Xử lý file sau khi upload thành công
    console.log(req.file); // Thông tin về file được upload

    // Bạn có thể thực hiện thêm các bước xử lý khác tại đây, ví dụ đọc dữ liệu từ file Excel

    res.send("File uploaded and processed successfully.");
  });
};

// Controller dùng chung
const getBoMonShared = async (req, res) => {
  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Xác định truy vấn dựa vào MaPhongBan
    let query = `
      SELECT 
        bomon.MaPhongBan, 
        bomon.MaBoMon, 
        bomon.TenBoMon
      FROM 
        bomon
  `;

    // Thực hiện truy vấn với kết nối
    const [results] = await connection.query(query);

    // Trả về kết quả truy vấn
    return res.status(200).json(results);
  } catch (error) {
    console.error("Lỗi trong hàm getBoMon:", error);
    return res
      .status(500)
      .json({ error: "Đã xảy ra lỗi trong quá trình xử lý dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối khi hoàn thành
  }
};

const getPhongBanInfoShared = async (req, res) => {
  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Xác định truy vấn dựa vào MaPhongBan
    let query = `
      SELECT id, TenPhongBan, MaPhongBan from phongban
      where isKhoa = 1`;

    // Thực hiện truy vấn với kết nối
    const [results] = await connection.query(query);

    // Trả về kết quả truy vấn
    return res.status(200).json(results);
  } catch (error) {
    console.error("Lỗi trong hàm getBoMon:", error);
    return res
      .status(500)
      .json({ error: "Đã xảy ra lỗi trong quá trình xử lý dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối khi hoàn thành
  }
};

const getFacultyCodeList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = "SELECT MaPhongBan FROM `phongban` where isKhoa = 1";
    const [result] = await connection.query(query);
    res.json({
      success: true,
      MaPhongBan: result,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getFacultyNameList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = "SELECT TenPhongBan FROM `phongban` where isKhoa = 1";
    const [result] = await connection.query(query);
    res.json({
      success: true,
      TenPhongBan: result,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

const getStudentCourseList = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = "SELECT ten_khoa, phongban_id FROM `khoa_sinh_vien`";
    const [result] = await connection.query(query);
    res.json({
      success: true,
      KhoaSinhVien: result,
    });
  } catch (error) {
    console.error("Lỗi: ", error);
    res.status(500).send("Đã có lỗi xảy ra");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// Helper trích xuất tiền tố chữ cái (ví dụ: A20C8 -> A)
function extractPrefix(classCode) {
  const match = String(classCode || "").match(/^[A-Za-z]+/);
  return match ? match[0] : "";
}

// Helper trích xuất nội dung ngoặc đơn (ví dụ: Môn A (A20C8) -> A20C8)
function getFirstParenthesesContent(str) {
  const match = String(str || "").match(/\(([^)]+)\)/);
  return match ? match[1] : null;
}

const detectHeDaoTaoShared = async (req, res) => {
  const { classNames } = req.body; // Mảng các chuỗi tên lớp học phần cần kiểm tra

  if (!classNames || !Array.isArray(classNames)) {
    return res.status(400).json({ error: "classNames phải là một mảng các chuỗi." });
  }

  let connection;
  try {
    connection = await createPoolConnection();

    // 1. Truy vấn duy nhất 1 lần lấy toàn bộ bảng cấu hình đã join với hệ đào tạo
    const query = `
      SELECT 
        k.viet_tat,
        k.he_so,
        h.id AS he_dao_tao_id,
        h.he_dao_tao AS ten_he_dao_tao
      FROM kitubatdau k
      LEFT JOIN he_dao_tao h ON CAST(k.gia_tri_so_sanh AS UNSIGNED) = h.id;
    `;
    const [configs] = await connection.query(query);

    // 2. Chuyển thành Map trong RAM để tra cứu O(1)
    const mappingMap = new Map();
    for (const item of configs) {
      if (item.viet_tat) {
        mappingMap.set(item.viet_tat.toUpperCase().trim(), {
          heDaoTaoId: item.he_dao_tao_id,
          tenHeDaoTao: item.ten_he_dao_tao,
          heSo: item.he_so
        });
      }
    }

    // 3. Duyệt danh sách đầu vào và so sánh O(1) trong bộ nhớ
    const results = classNames.map(name => {
      const classCode = getFirstParenthesesContent(name) || "";
      const prefix = extractPrefix(classCode).toUpperCase().trim();

      if (mappingMap.has(prefix)) {
        return {
          input: name,
          matched: true,
          ...mappingMap.get(prefix)
        };
      }

      // Giá trị mặc định nếu không trùng khớp tiền tố nào
      return {
        input: name,
        matched: false,
        heDaoTaoId: 1,
        tenHeDaoTao: "ĐH Đóng học phí",
        heSo: 1.00
      };
    });

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("Lỗi trong detectHeDaoTaoShared:", error);
    return res.status(500).json({ error: "Lỗi hệ thống khi xử lý đối chiếu." });
  } finally {
    if (connection) connection.release();
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  gethomePage,
  getLogin,
  getIndex,
  getImport,
  getDtaoduyet,
  //getDtaoxemhd,
  getDtaonhap,
  getPhongVP,
  postFile,
  getHomeMainDaoTao,
  getTeachingInfo,
  getXemBangQC,
  // Khoa
  getMainKhoa,
  getlog,
  // Lấy role
  //thong ke
  getthongkemg,
  getthongkenckh,
  getthongkedoan,
  getthongtonghop,

  // Controller chung
  getBoMonShared,
  getPhongBanInfoShared,
  getFacultyCodeList,
  getFacultyNameList,
  getStudentCourseList,
  detectHeDaoTaoShared,
};
