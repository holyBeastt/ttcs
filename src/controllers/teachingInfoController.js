const XLSX = require("xlsx");
const fs = require("fs");
require("dotenv").config();
const path = require("path");
const { getEnvironmentData } = require("worker_threads");
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

  // Gọi hàm KhoaCheckAll để kiểm tra điều kiện duyệt
  //const kq = await KhoaCheckAll(req, Dot, Ki, Nam);

  // Kiểm tra nếu "TAICHINH" không có trong kết quả, trả về thông báo chưa duyệt
  // if (!kq.includes("TAICHINH")) {
  //   return res.status(403).json({ message: "Quy chuẩn chưa được duyệt bởi Tài chính" });
  // }

  // Xác định query SQL với điều kiện WHERE cho Khoa, Dot, Ki, Nam
  const query = `
    SELECT * FROM ${tableName} 
    WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ?`;

  console.log({ Khoa, Dot, Ki, Nam }); // Log các tham số để kiểm tra

  let connection;
  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Thực hiện truy vấn với kết nối đã lấy từ pool và truyền tham số an toàn
    const [results] = await connection.query(query, [Khoa, Dot, Ki, Nam]);

    if (results.length === 0) {
      // Trả về thông báo nếu không tìm thấy dữ liệu
      return res.status(404).json({ message: "Không có dữ liệu" });
    }

    // Trả về kết quả truy vấn dưới dạng JSON
    return res.status(200).json({
      results, // Trả về kết quả từ query
    });
  } catch (error) {
    // Xử lý lỗi trong trường hợp truy vấn thất bại
    console.error(error);
    return res.status(500).json({ error: "Lỗi truy vấn" });
  } finally {
    // Đảm bảo giải phóng kết nối khi xong
    if (connection) connection.release();
  }
};

// const totalNumberOfPeriods = async (connection, data) => {
//   try {
//     const [gvmList] = await connection.query("SELECT * FROM gvmoi");
//     const [coHuuList] = await connection.query("SELECT * FROM nhanvien");

//     let tongTietMoiGiang = 0;
//     let tongTietCoHuu = 0;
//     let tongTietAll = 0;

//     const tongTietDetail = {};
//     const detailMoiGiang = {};
//     const detailCoHuu = {};

//     // Hàm xác định loại giảng viên và gắn hậu tố
//     const getLabel = (ten, type) => {
//       const tenTrim = ten.trim();

//       let isMoi, isCoHuu;
//       if (type == 1) {
//         isMoi = gvmList.some((gv) => gv.HoTen?.trim() === tenTrim);
//       } else {
//         isCoHuu = coHuuList.some((gv) => gv.TenNhanVien?.trim() === tenTrim);
//       }

//       if (isMoi) return `${tenTrim} - Giảng viên mời`;
//       if (isCoHuu) return `${tenTrim} - Cơ hữu`;
//       return tenTrim; // không xác định
//     };

//     // Tính tổng tiết cho từng giảng viên
//     data.forEach((row) => {
//       const giangVien = row.GiaoVienGiangDay;
//       if (!giangVien) return;

//       if (giangVien.includes(",")) {
//         const [gv1, gv2] = giangVien.split(",").map((gv) => gv.trim());
//         const gv1Label = getLabel(gv1, 0);
//         const gv2Label = getLabel(gv2, row.MoiGiang);

//         tongTietDetail[gv1Label] =
//           (tongTietDetail[gv1Label] || 0) + row.QuyChuan * 0.3;
//         tongTietDetail[gv2Label] =
//           (tongTietDetail[gv2Label] || 0) + row.QuyChuan * 0.7;
//       } else {
//         const gvLabel = getLabel(giangVien, row.MoiGiang);
//         tongTietDetail[gvLabel] = (tongTietDetail[gvLabel] || 0) + row.QuyChuan;
//       }
//     });

//     // Phân loại lại để thống kê chi tiết
//     for (const tenGV in tongTietDetail) {
//       const tiet = tongTietDetail[tenGV];
//       tongTietAll += tiet;

//       if (tenGV.includes("Giảng viên mời")) {
//         tongTietMoiGiang += tiet;
//         detailMoiGiang[tenGV] = tiet;
//       } else if (tenGV.includes("Cơ hữu")) {
//         tongTietCoHuu += tiet;
//         detailCoHuu[tenGV] = tiet;
//       }
//     }

//     return {
//       tongTietMoiGiang,
//       tongTietCoHuu,
//       tongTietAll,
//       tongTietDetail,
//       detailMoiGiang,
//       detailCoHuu,
//     };
//   } catch (error) {
//     console.error("Lỗi khi xử lý:", error);
//   } finally {
//     if (connection) connection.release();
//   }
// };

// mới

const totalNumberOfPeriods = async (connection, data) => {
  try {
    const [gvmList] = await connection.query("SELECT * FROM gvmoi");
    const [coHuuList] = await connection.query("SELECT * FROM nhanvien");

    let tongTietMoiGiang = 0;
    let tongTietCoHuu = 0;
    let tongTietAll = 0;

    const tongTietDetail = {};
    const detailMoiGiang = {};
    const detailCoHuu = {};

    // Hàm xác định loại giảng viên và gắn hậu tố
    const getLabel = (ten, type) => {
      const tenTrim = ten.trim();

      let isMoi, isCoHuu;
      if (type == 1) {
        isMoi = gvmList.some((gv) => gv.HoTen?.trim() === tenTrim);
      } else {
        isCoHuu = coHuuList.some((gv) => gv.TenNhanVien?.trim() === tenTrim);
      }

      if (isMoi) return `${tenTrim} - Giảng viên mời`;
      if (isCoHuu) return `${tenTrim} - Cơ hữu`;
      return tenTrim; // không xác định
    };

    // Tính tổng tiết cho từng giảng viên
    data.forEach((row) => {
      const giangVien = row.GiaoVienGiangDay;
      if (!giangVien) return;

      // Chuyển đổi QuyChuan sang số và xử lý null/undefined
      const quyChuan = parseFloat(row.QuyChuan) || 0;

      if (giangVien.includes(",")) {
        const [gv1, gv2] = giangVien.split(",").map((gv) => gv.trim());
        const gv1Label = getLabel(gv1, 0);
        const gv2Label = getLabel(gv2, row.MoiGiang);

        // Đảm bảo phép cộng số học
        tongTietDetail[gv1Label] =
          (parseFloat(tongTietDetail[gv1Label]) || 0) + quyChuan * 0.3;
        tongTietDetail[gv2Label] =
          (parseFloat(tongTietDetail[gv2Label]) || 0) + quyChuan * 0.7;
      } else {
        const gvLabel = getLabel(giangVien, row.MoiGiang);
        tongTietDetail[gvLabel] =
          (parseFloat(tongTietDetail[gvLabel]) || 0) + quyChuan;
      }
    }); // Phân loại lại để thống kê chi tiết
    for (const tenGV in tongTietDetail) {
      const tiet = parseFloat(tongTietDetail[tenGV]) || 0;
      tongTietAll += tiet;

      gvInfo = tachTenVaLoai(tenGV);

      if (gvInfo.loai && gvInfo.loai.includes("giảng viên mời")) {
        tongTietMoiGiang += tiet;
        detailMoiGiang[gvInfo.ten] = tiet;
      } else if (gvInfo.loai && gvInfo.loai.includes("cơ hữu")) {
        tongTietCoHuu += tiet;
        detailCoHuu[gvInfo.ten] = tiet;
      }
    }

    // Làm tròn kết quả để tránh lỗi floating point
    return {
      tongTietMoiGiang: Math.round(tongTietMoiGiang * 100) / 100,
      tongTietCoHuu: Math.round(tongTietCoHuu * 100) / 100,
      tongTietAll: Math.round(tongTietAll * 100) / 100,
      tongTietDetail: Object.fromEntries(
        Object.entries(tongTietDetail).map(([key, value]) => [
          key,
          Math.round((parseFloat(value) || 0) * 100) / 100,
        ])
      ),
      detailMoiGiang: Object.fromEntries(
        Object.entries(detailMoiGiang).map(([key, value]) => [
          key,
          Math.round(value * 100) / 100,
        ])
      ),
      detailCoHuu: Object.fromEntries(
        Object.entries(detailCoHuu).map(([key, value]) => [
          key,
          Math.round(value * 100) / 100,
        ])
      ),
    };
  } catch (error) {
    console.error("Lỗi khi xử lý:", error);
  } finally {
    if (connection) connection.release();
  }
};

function tachTenVaLoai(tenGoc) {
  const match = tenGoc.match(/^(.+?)\s*-\s*(Giảng viên mời|Cơ hữu)/i);
  if (match) {
    return {
      ten: match[1].trim(),
      loai: match[2].trim().toLowerCase(),
    };
  } else {
    return {
      ten: tenGoc.trim(),
      loai: null,
    };
  }
}

const renderInfo = async (req, res) => {
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;

  const { Dot, Ki, Nam } = req.body; // Lấy giá trị Dot, Ki, Nam từ body của yêu cầu
  const tableName = process.env.DB_TABLE_QC;
  let query = "";

  console.log(
    "Phòng ban " +
      MaPhongBan +
      ` vừa lấy dữ liệu thông tin giảng dạy các lớp đợt ${Dot} kì ${Ki} năm ${Nam}`
  );

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

  const connection = await createPoolConnection(); // Tạo kết nối cơ sở dữ liệu

  try {
    // Thực hiện truy vấn với tham số an toàn
    const [results] = await connection.query(
      query,
      isKhoa == 0 ? [Dot, Ki, Nam] : [Dot, Ki, Nam, MaPhongBan]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "No data found" });
    }

    const tongTiet = await totalNumberOfPeriods(connection, results);

    // Trả về kết quả và các giá trị check
    return res.status(200).json({
      results: results,
      check: check,
      DaoTaoCheck: DaoTaoCheck,
      VPCheck: TaiChinhCheck,
      tongTiet,
    });
  } catch (error) {
    // Xử lý lỗi trong trường hợp truy vấn thất bại
    return res.status(500).json({ error: "Internal server error" });
  } finally {
    if (connection) connection.release();
  }
};

const getNameGV = async (req, res) => {
  let connection;

  try {
    connection = await createPoolConnection();

    // Truy vấn để lấy danh sách giảng viên mời
    const query =
      "SELECT DISTINCT TenNhanVien, MaPhongBan FROM nhanvien where TinhTrangGiangDay != 0";
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
      FROM gvmoi
      WHERE gvmoi.TinhTrangGiangDay = 1;
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

    res.render("teachingInfo2.ejs");
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
  const isKhoa = req.session.isKhoa;
  const MaPhongBan = req.session.MaPhongBan;
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
    let params = [];
    if (isKhoa == 1) {
      query += " WHERE MaPhongBan = ?";
      params.push(MaPhongBan);
    }

    // Thực hiện truy vấn với kết nối
    const [results] = await connection.query(query, params);

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

const getKhoaList = async (req, res) => {
  let connection;

  try {
    // Tạo kết nối từ pool
    connection = await createPoolConnection();

    // Xác định truy vấn dựa vào MaPhongBan
    const query = `select MaPhongBan, TenPhongBan from phongban where isKhoa = 1`;

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

const SaveNote = async (req, res) => {
  let connection = await createPoolConnection();
  try {
    const { id, ghiChu, deadline } = req.body;
    const HoanThanh = false;
    const deadlineValue = deadline || null; // Nếu deadline rỗng, sẽ gán null

    console.log(id, ghiChu, deadline, HoanThanh);

    const query = `
        UPDATE quychuan 
        SET GhiChu = ?, Deadline = ?, HoanThanh = ?
        WHERE ID = ?
      `;
    await connection.query(query, [ghiChu, deadlineValue, HoanThanh, id]);
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
    const deadlineValue = deadline || null; // Nếu deadline rỗng, sẽ gán null

    console.log(id, ghiChu, mGhiChu, deadline, HoanThanh);
    const query = `
          UPDATE quychuan 
          SET GhiChu = ?, Deadline = ?, HoanThanh = ? 
          WHERE ID = ?
      `;
    await connection.query(query, [mGhiChu, deadlineValue, HoanThanh, id]);
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
  getKhoaList,
};
