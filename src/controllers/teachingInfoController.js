const XLSX = require("xlsx");
const fs = require("fs");
require("dotenv").config();
const path = require("path");
const { getEnvironmentData } = require("worker_threads");
const createConnection = require("../config/databaseAsync");
const createPoolConnection = require("../config/databasePool");

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

// const DaoTaoCheckAll = async (req, Dot, KiHoc, NamHoc) => {
//   let kq = ""; // Biến để lưu kết quả

//   const query = ` SELECT MaPhongBan FROM phongban where isKhoa = 1 `;
//   const connection1 = await createConnection();
//   const [results, fields] = await connection1.query(query);

//   // Chọn theo từng phòng ban
//   for (let i = 0; i < results.length; i++) {
//     const MaPhongBan = results[i].MaPhongBan;

//     const query = ` SELECT DaoTaoDuyet FROM quychuan where Khoa = ? and Dot = ? and KiHoc = ? and NamHoc = ?`;
//     const connection = await createConnection();
//     const [check, fields] = await connection.query(query, [
//       MaPhongBan,
//       Dot,
//       KiHoc,
//       NamHoc,
//     ]);

//     let checkAll = true;
//     for (let j = 0; j < check.length; j++) {
//       if (check[j].DaoTaoDuyet == 0) {
//         checkAll = false;
//         break;
//       }
//     }
//     if (checkAll == true) {
//       kq += MaPhongBan + ",";
//     }
//   }

//   return kq;
// };

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

const renderInfoWithValueKhoa = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body; // Lấy giá trị Khoa, Dot, Ki, Nam từ body của yêu cầu
  const tableName = process.env.DB_TABLE_QC; // Bảng cần truy vấn
  let query = ""; // Khởi tạo query

  // Gọi hàm KhoaCheckAll để kiểm tra điều kiện duyệt
  const kq = await KhoaCheckAll(req, Dot, Ki, Nam);

  // Kiểm tra nếu "TAICHINH" không có trong kết quả, trả về thông báo chưa duyệt

  // if (!kq.includes("TAICHINH")) {
  //   return res
  //     .status(403)
  //     .json({ message: "Quy chuẩn chưa được duyệt bởi Tài chính" });
  // }

  // Xác định query SQL với điều kiện WHERE cho Khoa, Dot, Ki, Nam
  query = `
    SELECT * FROM ${tableName} 
    WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?`;

  console.log({ Khoa, Dot, Ki, Nam }); // Log the incoming request parameters for debugging

  // Lấy connection từ pool hoặc createConnection
  connection.query(
    query,
    [Khoa, Dot, Ki, Nam], // Truyền các tham số an toàn vào query
    (error, results) => {
      if (error) {
        // Trả về lỗi nếu có vấn đề trong truy vấn SQL
        return res.status(500).json({ error: "Lỗi truy vấn" });
      }

      if (results.length === 0) {
        // Trả về thông báo nếu không tìm thấy dữ liệu
        return res.status(404).json({ message: "Không có dữ liệu" });
      }

      // Trả về kết quả truy vấn dưới dạng JSON
      return res.status(200).json({
        results, // Trả về kết quả từ query
      });
    }
  );
};

// cũ
// const renderInfo = async (req, res) => {
//   const role = req.session.role;
//   const isKhoa = req.session.isKhoa;
//   const MaPhongBan = req.session.MaPhongBan;
//   console.log("Mã phòng ban = ", MaPhongBan);

//   const { Dot, Ki, Nam } = req.body; // Lấy giá trị khoa, dot, ki từ body của yêu cầu
//   const tableName = process.env.DB_TABLE_QC;
//   let query = "";
//   console.log(Dot, Ki, Nam);

//   if (isKhoa == 1) {
//     query = `SELECT * FROM ${tableName}
//     WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND Khoa = ?;`;
//   }
//   // Xây dựng câu truy vấn SQL sử dụng các tham số
//   if (isKhoa == 0) {
//     query = `
//       SELECT * FROM ${tableName}
//       WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?;
//     `;
//   }

//   // Gọi hàm KhoaCheckAll để kiểm tra
//   const check = await KhoaCheckAll(req, Dot, Ki, Nam);
//   const DaoTaoCheck = await DaoTaoCheckAll(req, Dot, Ki, Nam);
//   const TaiChinhCheck = await TaiChinhCheckAll(req, Dot, Ki, Nam);

//   // Thực thi câu truy vấn với các tham số an toàn
//   connection.query(
//     query,
//     isKhoa == 0 ? [Dot, Ki, Nam] : [Dot, Ki, Nam, MaPhongBan],
//     (error, results) => {
//       if (error) {
//         return res.status(500).json({ error: "Internal server error" });
//       }

//       if (results.length === 0) {
//         return res.status(404).json({ message: "No data found" });
//       }

//       // Trả về kết quả tương ứng với đợt, kì, năm và thêm check
//       return res.status(200).json({
//         results: results,
//         check: check,
//         DaoTaoCheck: DaoTaoCheck,
//         TaiChinhCheck: TaiChinhCheck,
//       }); // Trả về kết quả tương ứng với đợt, kì, năm và check
//     }
//   );
// };

// Hàm lấy tất cả tên giảng viên từ cơ sở dữ liệu

// mới
const renderInfo = async (req, res) => {
  const role = req.session.role;
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;
  console.log("Mã phòng ban = ", MaPhongBan);

  if (typeof MaPhongBan === 'undefined') {
    console.log("ok");
    return res.status(500).json({ error: "Vui lòng đăng nhập lại!" });
  }

  const { Dot, Ki, Nam } = req.body; // Lấy giá trị Dot, Ki, Nam từ body của yêu cầu
  const tableName = process.env.DB_TABLE_QC;
  let query = "";

  console.log(Dot, Ki, Nam);

  // Xác định query SQL dựa trên isKhoa
  if (isKhoa == 1) {
    query = `SELECT * FROM ${tableName} WHERE Dot = ? AND KiHoc = ? AND NamHoc = ? AND Khoa = ?;`;
  } else {
    query = `SELECT * FROM ${tableName} WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?;`;
  }

  // Gọi các hàm kiểm tra
  const check = await KhoaCheckAll(req, Dot, Ki, Nam);
  const DaoTaoCheck = await DaoTaoCheckAll(req, Dot, Ki, Nam);
  const TaiChinhCheck = await TaiChinhCheckAll(req, Dot, Ki, Nam);

  const connection = await createConnection(); // Tạo kết nối cơ sở dữ liệu

  try {
    // Thực hiện truy vấn với tham số an toàn
    const [results] = await connection.query(
      query,
      isKhoa == 0 ? [Dot, Ki, Nam] : [Dot, Ki, Nam, MaPhongBan]
    );

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
    // Xử lý lỗi trong trường hợp truy vấn thất bại
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    await connection.end(); // Đảm bảo đóng kết nối sau khi hoàn tất
  }
};

// const getNameGV = (req, res) => {
//   let connection = createPoolConnection();

//   // Truy vấn để lấy danh sách giảng viên mời
//   const query = "SELECT DISTINCT TenNhanVien,MaPhongBan FROM nhanvien;";

//   connection.query(query, (error, results) => {
//     if (error) {
//       return res.status(500).json({ error: "Internal server error" });
//     }

//     if (results.length === 0) {
//       return res.status(404).json({ message: "No teachers found" });
//     }

//     // Lấy đầy đủ tên giảng viên từ cột HoTen và trả về kết quả
//     return res.status(200).json(results);
//   });
// };

const getNameGV = async (req, res) => {
  let connection;

  try {
    connection = await createPoolConnection();

    // Truy vấn để lấy danh sách giảng viên mời
    const query = "SELECT DISTINCT TenNhanVien, MaPhongBan FROM nhanvien;";
    const [results] = await connection.query(query);

    if (results.length === 0) {
      return res.status(404).json({ message: "No teachers found" });
    }

    // Trả về kết quả
    return res.status(200).json(results);
  } catch (error) {
    console.error("Lỗi khi truy vấn danh sách giảng viên:", error);
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// const getKhoaAndNameGvmOfKhoa = async (req, res) => {
//   let connection = createPoolConnection();
//   try {
//     // Truy vấn để lấy tất cả các trường HoTen và MaPhongBan từ bảng gvmoi
//     const gvmResults = await new Promise((resolve, reject) => {
//       const queryGVM = `
//         SELECT gvmoi.HoTen, gvmoi.MaPhongBan
//         FROM gvmoi;
//       `;

//       connection.query(queryGVM, (error, results) => {
//         if (error) {
//           console.error("Lỗi truy vấn cơ sở dữ liệu:", error);
//           return reject(
//             new Error("Không thể truy xuất dữ liệu từ cơ sở dữ liệu.")
//           );
//         }
//         resolve(results); // Trả về kết quả truy vấn
//       });
//     });

//     // Trả về dữ liệu lấy từ bảng gvmoi
//     return res.status(200).json(gvmResults);
//   } catch (error) {
//     console.error("Lỗi trong hàm getKhoaAndNameGvmOfKhoa:", error);
//     return res
//       .status(500)
//       .json({ error: "Đã xảy ra lỗi trong quá trình xử lý dữ liệu." });
//   }
// };

const getKhoaAndNameGvmOfKhoa = async (req, res) => {
  let connection;

  try {
    // Khởi tạo kết nối từ pool
    connection = await createPoolConnection();

    // Truy vấn lấy các trường HoTen và MaPhongBan từ bảng gvmoi
    const queryGVM = `
      SELECT gvmoi.HoTen, gvmoi.MaPhongBan
      FROM gvmoi;
    `;
    const [gvmResults] = await connection.query(queryGVM);

    // Trả về dữ liệu lấy từ bảng gvmoi
    return res.status(200).json(gvmResults);
  } catch (error) {
    console.error("Lỗi trong hàm getKhoaAndNameGvmOfKhoa:", error);
    return res
      .status(500)
      .json({ error: "Đã xảy ra lỗi trong quá trình xử lý dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối khi hoàn tất
  }
};

const getTeachingInfo1 = (req, res) => {
  res.render("teachingInfo.ejs");
};

const getTeachingInfo2 = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();

    // Lấy danh sách phòng ban để lọc
    const qrPhongBan = `select MaPhongBan from phongban where isKhoa = 1`;
    const [phongBanList] = await connection.query(qrPhongBan);

    res.render("teachingInfo2.ejs", {
      phongBanList: phongBanList,
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Internal Server Error");
  } finally {
    if (connection) connection.release(); // Đảm bảo giải phóng kết nối
  }
};

// const getBoMon = async (req, res) => {
//   const MaPhongBan = req.body.MaPhongBan; // Thay vì req.body
//   let connection;

//   if (MaPhongBan != "DAOTAO" && MaPhongBan != "TAICHINH") {
//     try {
//       // Truy vấn để lấy MaPhongBan, MaBoMon, TenBoMon
//       const results = await new Promise((resolve, reject) => {
//         const query = `
//         SELECT
//           bomon.MaPhongBan,
//           bomon.MaBoMon,
//           bomon.TenBoMon
//         FROM
//           bomon
//         WHERE
//           MaPhongBan = '${MaPhongBan}';
//       `;

//         connection.query(query, (error, results) => {
//           if (error) {
//             console.error("Lỗi truy vấn cơ sở dữ liệu:", error);
//             return reject(
//               new Error("Không thể truy xuất dữ liệu từ cơ sở dữ liệu.")
//             );
//           }
//           resolve(results); // Trả về kết quả truy vấn
//         });
//       });

//       // Trả về dữ liệu lấy từ bảng gvmoi
//       return res.status(200).json(results);
//     } catch (error) {
//       console.error("Lỗi trong hàm getBoMon:", error);
//       return res
//         .status(500)
//         .json({ error: "Đã xảy ra lỗi trong quá trình xử lý dữ liệu." });
//     }
//   } else {
//     try {
//       // Truy vấn để lấy MaPhongBan, MaBoMon, TenBoMon
//       const results = await new Promise((resolve, reject) => {
//         const query = `
//         SELECT bomon.MaPhongBan, bomon.MaBoMon, bomon.TenBoMon
//         FROM bomon;
//       `;

//         connection.query(query, (error, results) => {
//           if (error) {
//             console.error("Lỗi truy vấn cơ sở dữ liệu:", error);
//             return reject(
//               new Error("Không thể truy xuất dữ liệu từ cơ sở dữ liệu.")
//             );
//           }
//           resolve(results); // Trả về kết quả truy vấn
//         });
//       });

//       // Trả về dữ liệu lấy từ bảng gvmoi
//       return res.status(200).json(results);
//     } catch (error) {
//       console.error("Lỗi trong hàm getBoMon:", error);
//       return res
//         .status(500)
//         .json({ error: "Đã xảy ra lỗi trong quá trình xử lý dữ liệu." });
//     }
//   }
// };

const getBoMon = async (req, res) => {
  const MaPhongBan = req.body.MaPhongBan;
  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Xác định truy vấn dựa vào MaPhongBan
    let query;
    if (MaPhongBan !== "DAOTAO" && MaPhongBan !== "TAICHINH") {
      query = `
        SELECT 
          bomon.MaPhongBan, 
          bomon.MaBoMon, 
          bomon.TenBoMon
        FROM 
          bomon
        WHERE 
          MaPhongBan = ?;
      `;
    } else {
      query = `
        SELECT 
          bomon.MaPhongBan, 
          bomon.MaBoMon, 
          bomon.TenBoMon
        FROM 
          bomon;
      `;
    }

    // Thực hiện truy vấn với kết nối
    const [results] = await connection.query(
      query,
      MaPhongBan !== "DAOTAO" && MaPhongBan !== "TAICHINH" ? [MaPhongBan] : []
    );

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
const SaveNote = async (req, res) => {
  let connection = await createPoolConnection();
  try {
    const { id, ghiChu, deadline } = req.body;
    const HoanThanh = false;
    console.log(id, ghiChu, deadline, HoanThanh);

    const query = `
        UPDATE quychuan 
        SET GhiChu = ?, Deadline = ?, HoanThanh = ?
        WHERE ID = ?
      `;
    await connection.query(query, [ghiChu, deadline, HoanThanh, id]);
    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu vào bảng quychuan:", error);
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

    console.log(id, ghiChu, mGhiChu, deadline, HoanThanh);
    const query = `
          UPDATE quychuan 
          SET GhiChu = ?, Deadline = ?, HoanThanh = ? 
          WHERE ID = ?
      `;
      await connection.query(query, [mGhiChu, deadline, HoanThanh, id]);
    res.json({ success: true, message: "Ghi chú đã được lưu thành công" });
  } catch (error) {
    console.error("Lỗi khi lưu dữ liệu vào bảng quychuan:", error);
    return res
      .status(500)
      .json({ success: false, message: "Lỗi khi lưu ghi chú" });
  }
};

module.exports = {
  renderInfo,
  getNameGV,
  getKhoaAndNameGvmOfKhoa,
  getTeachingInfo1,
  getTeachingInfo2,
  renderInfoWithValueKhoa,
  getBoMon,
  SaveNote,
  DoneNote,
};
