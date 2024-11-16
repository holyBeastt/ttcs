const XLSX = require("xlsx");
const fs = require("fs");
require("dotenv").config();
const path = require("path");
const connection = require("../controllers/connectDB");
const createPoolConnection = require("../config/databasePool");
const pool = require("../config/Pool");
const { json, query } = require("express");
const gvms = require("../services/gvmServices");
const nhanviens = require("../services/nhanvienServices");
const { isNull } = require("util");

// convert file excel sang file quy chuẩn
const convertExcelToJSON = (filePath) => {
  try {
    // console.log("Chuẩn bị convert dữ liệu quy chuẩn");
    // Đọc tệp Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Lấy tên của bảng tính đầu tiên
    const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]); // Chuyển bảng tính thành JSON

    fs.unlinkSync(filePath); // Xóa tệp sau khi xử lý

    const data = worksheet;

    // Lấy tiêu đề từ đối tượng đầu tiên (dòng đầu tiên)
    const header = data[0];
    const keys = Object.keys(header);
    const dataObjects = data.slice(1); // Tách phần dữ liệu (bỏ qua dòng tiêu đề)

    // Tạo danh sách các đối tượng JSON với các khóa từ tiêu đề
    const jsonObjects = dataObjects.map((values) => {
      return keys.reduce((acc, key) => {
        // Nếu không có giá trị cho key, gán giá trị là 0
        acc[header[key]] = values[key] !== undefined ? values[key] : 0;
        return acc;
      }, {});
    });

    // console.log("Chuẩn bị validate dữ liệu quy chuẩn");
    validate(jsonObjects);
    console.log("Convert file quy chuẩn thành công");
    return jsonObjects;
  } catch (err) {
    // Xử lý lỗi nếu có
    throw new Error("Cannot read file!: " + err.message);
  }
};

// hàm thẩm định giá trị của dữ liệu từ file quy chuẩn
const validate = (data) => {
  // Kiểm tra nếu dữ liệu trống
  if (!data || data.length === 0) {
    throw new Error("Dữ liệu đầu vào không hợp lệ: Dữ liệu trống");
  }

  // Duyệt qua từng đối tượng trong dữ liệu
  for (let i = 0; i < data.length; i++) {
    const record = data[i];

    // Duyệt qua từng key trong đối tượng
    Object.keys(record).forEach((key) => {
      // Trim giá trị và kiểm tra nếu nó là chuỗi rỗng hoặc undefined, null
      if (
        record[key] === null ||
        record[key] === undefined ||
        String(record[key]).trim() === ""
      ) {
        record[key] = 0; // Gán giá trị là 0 nếu không hợp lệ
      } else {
        // Nếu không rỗng, trim giá trị (nếu cần)
        record[key] = String(record[key]).trim();
      }
    });
  }

  // console.log("Dữ liệu đã được validate và chỉnh sửa");
  return data;
};

// kiểm tra tồn tại dữ liệu cũ ( tránh trường hợp import 2 file quy chuẩn bị trùng )
const checkDataQC = async (req, res) => {
  const tableName = process.env.DB_TABLE_QC; // Lấy tên bảng từ biến môi trường
  const { Dot, Ki, Nam } = req.body; // Lấy các giá trị từ body request

  // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
  const queryCheck = `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE Dot = ? AND Ki = ? AND Nam = ?) AS exist;`;

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool
    const [results] = await connection.query(queryCheck, [Dot, Ki, Nam]); // Thực hiện truy vấn
    const exist = results[0].exist === 1;

    if (exist) {
      return res
        .status(200)
        .json({ message: "Dữ liệu đã tồn tại trong hệ thống." });
    } else {
      return res
        .status(404)
        .json({ message: "Dữ liệu không tồn tại trong hệ thống." });
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra file import:", err);
    return res.status(500).json({ error: "Lỗi kiểm tra cơ sở dữ liệu" });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// tách dữ liệu từ Lớp Học Phần trong file quy chuẩn
function tachLopHocPhan(chuoi) {
  // Kiểm tra đầu vào
  if (typeof chuoi !== "string" || chuoi.trim() === "") {
    return {
      TenLop: "",
      HocKi: null,
      NamHoc: null,
      Lop: "",
    };
  }

  // Sử dụng biểu thức chính quy để tách chuỗi
  const regex = /^(.*?)(?:\s*\((.*?)\))?-(\d+)-(\d+)\s*\((.*?)\)$/; // Tách các phần
  const match = chuoi.match(regex);

  if (!match) {
    // Trường hợp không khớp với định dạng
    const regexFallback = /^(.*?)(?:\s*\((.*?)\))?$/; // Trường hợp không có học kỳ và năm
    const fallbackMatch = chuoi.match(regexFallback);
    if (fallbackMatch) {
      const tenHP = fallbackMatch[1].trim(); // Tên học phần
      const Lop = fallbackMatch[2] ? fallbackMatch[2].trim() : ""; // Lớp
      return {
        TenLop: tenHP,
        HocKi: null, // Thay đổi giá trị mặc định
        NamHoc: null, // Thay đổi giá trị mặc định
        Lop,
      };
    }

    return {
      TenLop: "",
      HocKi: null,
      NamHoc: null,
      Lop: "",
    };
  }

  // Lấy các thông tin từ kết quả match
  const tenHP = match[1].trim(); // Tên học phần
  const HocKi = match[3] ? match[3].trim() : null; // Học kỳ
  const namHoc = match[4].trim(); // Năm học kèm lớp
  const NamHoc = "20" + namHoc; // Tạo năm học từ phần thứ ba
  const Lop = match[5] ? match[5].trim() : ""; // Lớp

  return {
    TenLop: tenHP,
    HocKi,
    NamHoc,
    Lop,
  };
}

// tách dữ liệu từ Giảng viên TKB trong file quy chuẩn
function tachGiaoVien(giaoVienInput) {
  // null
  if (!giaoVienInput) {
    return [{ MoiGiang: false, GiaoVienGiangDay: "" }];
  }
  // trường hợp có không có ( gvm )
  else if (!giaoVienInput.includes("gvm")) {
    const gvmKeyword1 = "( gvm )"; // Từ khóa cho giảng viên mời
    const gvmKeyword2 = "Giảng viên mời"; // Từ khóa cho giảng viên mời

    // Nếu chuỗi đầu vào rỗng, trả về giá trị mặc định
    if (!giaoVienInput || giaoVienInput.trim() === "") {
      return [{ MoiGiang: false, GiaoVienGiangDay: "" }];
    }

    // Kiểm tra xem có giảng viên mời hay không
    const isGuestLecturer =
      giaoVienInput.toLowerCase().includes(gvmKeyword1.toLowerCase()) ||
      giaoVienInput.toLowerCase().includes(gvmKeyword2.toLowerCase());

    // Nếu có giảng viên mời, trả về giá trị mặc định
    if (isGuestLecturer) {
      return [{ MoiGiang: true, GiaoVienGiangDay: "" }];
    }

    // Tách tên giảng viên từ chuỗi
    const titleRegex = /(PGS\.?|( gvm )\.?|TS\.?|PGS\.? TS\.?)\s*/gi; // Biểu thức chính quy để loại bỏ danh hiệu gồm PGS. TS. PGS. TS. ( gvm )

    // Xóa danh hiệu khỏi chuỗi nhưng giữ lại phần còn lại
    const cleanedInput = giaoVienInput.replace(titleRegex, "").trim();

    // Tách tên giảng viên bằng cả dấu phẩy và dấu chấm phẩy
    const lecturers = cleanedInput
      .split(/[,;(]\s*/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    // Nếu không có giảng viên, trả về giá trị mặc định
    if (lecturers.length === 0) {
      return [{ MoiGiang: false, GiaoVienGiangDay: "" }];
    }

    // Tạo mảng kết quả chứa thông tin giảng viên
    return [
      {
        MoiGiang: false, // Không có giảng viên mời
        GiaoVienGiangDay: lecturers[0], // Lấy tên giảng viên đầu tiên
      },
    ];
  } else {
    // Tách tên giảng viên từ chuỗi
    const titleRegex = /(PGS\.?|( gvm )\.?|TS\.?|PGS\.? TS\.?)\s*/gi; // Biểu thức chính quy để loại bỏ danh hiệu gồm PGS. TS. PGS. TS. ( gvm )

    // Xóa danh hiệu khỏi chuỗi nhưng giữ lại phần còn lại
    const cleanedInput = giaoVienInput.replace(titleRegex, "").trim();

    // Tách tên giảng viên bằng cả dấu phẩy và dấu chấm phẩy
    const lecturers = cleanedInput
      .split(/[,;(]\s*/)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    // Nếu không có giảng viên, trả về giá trị mặc định
    if (lecturers.length === 0) {
      return [{ MoiGiang: false, GiaoVienGiangDay: "" }];
    }

    // Tạo mảng kết quả chứa thông tin giảng viên
    return [
      {
        MoiGiang: true, // Có giảng viên mời
        GiaoVienGiangDay: lecturers[0], // Lấy tên giảng viên đầu tiên
      },
    ];
  }
}

// gộp dữ liệu giảng viên có trong DB và file quy chuẩn để có dữ liệu giảng viên giảng dạy
// const duLieuGiangVienGiangDay = async (jsonData) => {
//   // Gọi hàm tongHopDuLieuGiangVien để lấy dữ liệu giảng viên từ cơ sở dữ liệu
//   const tongHopGiangVien = await tongHopDuLieuGiangVien();

//   // Khởi tạo mảng giangVienGiangDay để lưu kết quả giảng viên giảng dạy
//   const giangVienGiangDay = [];

//   // Duyệt qua từng phần tử trong jsonData
//   for (const item of jsonData) {
//     // Lấy giá trị của key GiaoVien từ item và tách thông tin giảng viên
//     const giaoVienInput = item.GiaoVien;
//     const tenGiaoVienList = tachGiaoVien(giaoVienInput);

//     // Duyệt qua từng tên giảng viên trong tenGiaoVienList để so sánh với tongHopGiangVien
//     for (const { GiaoVienGiangDay: tenGiaoVien } of tenGiaoVienList) {
//       const giangVienFound = tongHopGiangVien.find(
//         (gv) => gv.HoTen.trim() === tenGiaoVien.trim()
//       );

//       // Nếu tìm thấy giảng viên có tên trùng, thêm vào giangVienGiangDay
//       if (giangVienFound) {
//         giangVienGiangDay.push({
//           HoTen: giangVienFound.HoTen.trim(),
//           MonGiangDayChinh: giangVienFound.MonGiangDayChinh,
//         });
//       }
//     }
//   }

//   return giangVienGiangDay; // Trả về mảng giảng viên giảng dạy đã tìm được
// };

const duLieuGiangVienGiangDay = async (jsonData) => {
  // Gọi hàm tongHopDuLieuGiangVien để lấy dữ liệu giảng viên từ cơ sở dữ liệu
  const tongHopGiangVien = await tongHopDuLieuGiangVien();

  // Khởi tạo mảng giangVienGiangDay để lưu kết quả giảng viên giảng dạy
  const giangVienGiangDay = [];

  // Duyệt qua từng phần tử trong jsonData
  for (const item of jsonData) {
    // Lấy giá trị của key GiaoVien từ item và tách thông tin giảng viên
    const giaoVienInput = item.GiaoVien;
    const tenGiaoVienList = tachGiaoVien(giaoVienInput);

    // Duyệt qua từng tên giảng viên trong tenGiaoVienList để so sánh với tongHopGiangVien
    for (const { GiaoVienGiangDay: tenGiaoVien } of tenGiaoVienList) {
      const giangVienFound = tongHopGiangVien.find(
        (gv) => gv.HoTen.trim() === tenGiaoVien.trim()
      );

      // Nếu tìm thấy giảng viên có tên trùng, thêm vào giangVienGiangDay
      if (giangVienFound) {
        giangVienGiangDay.push({
          HoTen: giangVienFound.HoTen.trim(),
          MonGiangDayChinh: giangVienFound.MonGiangDayChinh,
        });
      }
    }
  }

  return giangVienGiangDay; // Trả về mảng giảng viên giảng dạy đã tìm được
};

// lấy dữ liệu giảng viên mời và giảng viên cơ hữu trong DB
// const tongHopDuLieuGiangVien = async () => {
//   // Truy vấn lấy dữ liệu từ bảng gvmoi
//   const query1 =
//     "SELECT HoTen, MonGiangDayChinh FROM gvmoi";

//   // Truy vấn lấy dữ liệu từ bảng nhanvien
//   const query2 =
//     "SELECT TenNhanVien AS HoTen, MonGiangDayChinh FROM nhanvien";

//   const connection = await createPoolConnection(); // Tạo kết nối từ pool
//   // Thực hiện các truy vấn cho tất cả giảng viên trong 2 bảng
//   const [results1] = await connection.execute(query1);
//   const [results2] = await connection.execute(query2);
//   const allResults = results1.concat(results2);

//   connection.release();
//   return allResults.length > 0 ? allResults : [];

// };
const tongHopDuLieuGiangVien = async () => {
  const connection = await createPoolConnection(); // Tạo kết nối từ pool

  try {
    // Thực hiện hai truy vấn song song bằng Promise.all
    const [results1, results2] = await Promise.all([
      connection.execute("SELECT HoTen, MonGiangDayChinh FROM gvmoi"),
      connection.execute(
        "SELECT TenNhanVien AS HoTen, MonGiangDayChinh FROM nhanvien"
      ),
    ]);

    // Kết hợp kết quả từ hai truy vấn thành một mảng duy nhất
    const allResults = results1[0].concat(results2[0]);

    return allResults;
  } catch (error) {
    console.error("Error while fetching lecturer data:", error);
    return []; // Trả về mảng rỗng nếu có lỗi
  } finally {
    connection.release(); // Giải phóng kết nối sau khi hoàn thành
  }
};

// lưu file quy chuẩn vào bảng quychuan
// const importTableQC = async (jsonData) => {
//   const tableName = process.env.DB_TABLE_QC; // Giả sử biến này có giá trị là "quychuan"

//   const dataGiangVien = await duLieuGiangVienGiangDay(jsonData);
//   console.log(dataGiangVien);

//   const queryInsert = `INSERT INTO ${tableName} (
//     Khoa,
//     Dot,
//     KiHoc,
//     NamHoc,
//     GiaoVien,
//     GiaoVienGiangDay,
//     MoiGiang,
//     SoTinChi,
//     MaHocPhan,
//     LopHocPhan,
//     TenLop,
//     BoMon,
//     LL,
//     SoTietCTDT,
//     HeSoT7CN,
//     SoSinhVien,
//     HeSoLopDong,
//     QuyChuan,
//     GhiChu
//   ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

//   const insertPromises = jsonData.flatMap((item) => {
//     const { TenLop, HocKi, NamHoc, Lop } = tachLopHocPhan(item["LopHocPhan"]);
//     const giangVienArray = tachGiaoVien(item["GiaoVien"]);

//     return giangVienArray.map(async ({ MoiGiang, GiaoVienGiangDay }) => {
//       const connection = await createPoolConnection(); // Tạo kết nối từ pool

//       try {
//         const boMonFound = dataGiangVien.find(
//           (dataGiangVien) => dataGiangVien.HoTen === GiaoVienGiangDay
//         );
//         const giangVien = boMonFound ? boMonFound.HoTen : null; // Sử dụng null thay cho ""
//         const monGiangDayChinh = boMonFound ? boMonFound.MonGiangDayChinh : null; // Sử dụng null thay cho ""

//         const values = [
//           item["Khoa"] || null,
//           item["Dot"] || null,
//           item["Ki"] || null,
//           item["Nam"] || null,
//           item["GiaoVien"] || null,
//           giangVien,
//           MoiGiang || null,
//           item["SoTinChi"] || null,
//           item["MaHocPhan"] || null,
//           TenLop || null,
//           Lop || null,
//           monGiangDayChinh,
//           item["LL"] || null,
//           item["SoTietCTDT"] || null,
//           item["HeSoT7CN"] || null,
//           item["SoSinhVien"] || null,
//           item["HeSoLopDong"] || null,
//           item["QuyChuan"] || null,
//           item["GhiChu"] || null,
//         ];

//         await connection.execute(queryInsert, values); // Sử dụng execute thay vì query

//       } catch (err) {
//         console.error("Error:", err);
//         throw err;
//       } finally {
//         connection.release(); // Giải phóng kết nối
//       }
//     });
//   });

//   let results = false;

//   try {
//     await Promise.all(insertPromises);

//     // Chạy câu lệnh UPDATE sau khi INSERT thành công
//     const queryUpdate = `UPDATE ${tableName} SET MaHocPhan = CONCAT(Khoa, id);`;

//     const connection = await createPoolConnection(); // Tạo kết nối từ pool

//     try {
//       // Sử dụng trực tiếp await với connection.execute
//       await connection.execute(queryUpdate);  // Không cần bọc trong new Promise nữa
//       results = true; // Cập nhật thành công
//     } catch (err) {
//       console.error("Error while updating:", err);
//     } finally {
//       connection.release(); // Giải phóng kết nối sau khi thực thi
//     }

//   } catch (error) {
//     console.error("Error:", error);
//   }

//   return results;
// };
const importTableQC = async (jsonData) => {
  const tableName = process.env.DB_TABLE_QC; // Giả sử biến này có giá trị là "quychuan"

  const dataGiangVien = await duLieuGiangVienGiangDay(jsonData);
  console.log(dataGiangVien);

  // Câu lệnh INSERT với các cột cần thiết
  const queryInsert = `INSERT INTO ${tableName} (
    Khoa,
    Dot,
    KiHoc,
    NamHoc,
    GiaoVien,
    GiaoVienGiangDay,
    MoiGiang,
    SoTinChi,
    MaHocPhan,
    LopHocPhan,
    TenLop,
    BoMon,
    LL,
    SoTietCTDT,
    HeSoT7CN,
    SoSinhVien,
    HeSoLopDong,
    QuyChuan,
    GhiChu
  ) VALUES ?;`; // Dấu '?' cho phép chèn nhiều giá trị một lần

  // Mảng để lưu tất cả giá trị cần chèn
  const allValues = [];

  // Chuẩn bị dữ liệu cho mỗi item trong jsonData
  jsonData.forEach((item) => {
    const { TenLop, HocKi, NamHoc, Lop } = tachLopHocPhan(item["LopHocPhan"]);
    const giangVienArray = tachGiaoVien(item["GiaoVien"]);

    // Với mỗi giảng viên, thêm giá trị vào mảng allValues
    giangVienArray.forEach(({ MoiGiang, GiaoVienGiangDay }) => {
      const boMonFound = dataGiangVien.find(
        (dataGiangVien) =>
          dataGiangVien.HoTen.trim() === GiaoVienGiangDay.trim()
      );
      const giangVien = boMonFound ? boMonFound.HoTen : null;
      const monGiangDayChinh = boMonFound ? boMonFound.MonGiangDayChinh : null;

      allValues.push([
        item["Khoa"] || null,
        item["Dot"] || null,
        item["Ki"] || null,
        item["Nam"] || null,
        item["GiaoVien"] || null,
        giangVien,
        MoiGiang || null,
        item["SoTinChi"] || null,
        item["MaHocPhan"] || null,
        TenLop || null,
        Lop || null,
        monGiangDayChinh,
        item["LL"] || null,
        item["SoTietCTDT"] || null,
        item["HeSoT7CN"] || null,
        item["SoSinhVien"] || null,
        item["HeSoLopDong"] || null,
        item["QuyChuan"] || null,
        item["GhiChu"] || null,
      ]);
    });
  });

  // Tạo kết nối và thực hiện truy vấn chèn hàng loạt
  const connection = await createPoolConnection();

  let results = false;

  try {
    // Thực hiện chèn tất cả giá trị cùng lúc
    await connection.query(queryInsert, [allValues]);
    results = true;

    // Thực hiện cập nhật sau khi chèn
    const queryUpdate = `UPDATE ${tableName} SET MaHocPhan = CONCAT(Khoa, id);`;
    await connection.execute(queryUpdate);
  } catch (error) {
    console.error("Error while inserting data:", error);
  } finally {
    connection.release();
  }

  return results;
};

//
const updateBanHanh = async (req, res) => {
  let connection;
  try {
    const NamHoc = req.params;
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu lệnh SQL để cập nhật trangthai
    const query1 = `UPDATE namhoc SET trangthai = ?`;
    const [result1] = await connection.query(query1, [0]);

    const query2 = `UPDATE namhoc SET trangthai = ? WHERE NamHoc = ?`;
    const [result2] = await connection.query(query2, [1, NamHoc.NamHoc]);
    // cập nhật bảng kì
    const query3 = `UPDATE ki SET trangthai = ?`;
    const [result3] = await connection.query(query3, [0]);

    const query4 = `UPDATE ki SET trangthai = ? WHERE value = ?`;
    const [result4] = await connection.query(query4, [1, NamHoc.Ki]);

    //update bảng đợt

    const query5 = `UPDATE dot SET trangthai = ?`;
    const [result5] = await connection.query(query5, [0]);

    const query6 = `UPDATE dot SET trangthai = ? WHERE value = ?`;
    const [result6] = await connection.query(query6, [1, NamHoc.Dot]);

    // Kiểm tra nếu không có dòng nào bị ảnh hưởng
    if (result2.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy năm học để cập nhật.",
      });
    }

    res.json({ success: true, message: "Cập nhật trạng thái thành công." });
  } catch (error) {
    console.error("Lỗi khi cập nhật dữ liệu:", error);
    res
      .status(500)
      .json({ success: false, message: "Cập nhật thất bại, lỗi server." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

const importTableTam = async (jsonData) => {
  const tableName = process.env.DB_TABLE_TAM; // Giả sử biến này có giá trị là "quychuan"

  // Tạo câu lệnh INSERT động
  const query = `
    INSERT INTO ${tableName} (
      Khoa,
      Dot,
      Ki,
      Nam,
      GiaoVien, 
      SoTinChi, 
      LopHocPhan, 
      LL, 
      SoTietCTDT, 
      HeSoT7CN, 
      SoSinhVien, 
      HeSoLopDong, 
      QuyChuan
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;

  const insertPromises = jsonData.map(async (item) => {
    const connection = await createPoolConnection(); // Lấy kết nối từ pool
    try {
      const values = [
        item["Khoa"],
        item["Dot"],
        item["Ki"],
        item["Nam"],
        item["Giáo Viên"],
        item["Số TC"],
        item["Lớp học phần"],
        item["Số tiết lên lớp giờ HC"],
        item["Số tiết theo CTĐT"],
        item["Hệ số lên lớp ngoài giờ HC/ Thạc sĩ/ Tiến sĩ"],
        item["Số SV"],
        item["Hệ số lớp đông"],
        item["QC"],
      ];
      await connection.query(query, values);
    } catch (err) {
      console.error("Error:", err);
      throw err;
    } finally {
      connection.release(); // Giải phóng kết nối sau khi hoàn thành
    }
  });

  let results = false;
  try {
    await Promise.all(insertPromises); // Thực hiện tất cả các truy vấn song song
    results = true;
  } catch (error) {
    console.error("Error:", error);
  }

  console.log("Thêm file quy chuẩn vào bảng Tam thành công");
  return results;
};

const getIdUserByTeacherName = async (teacherName) => {
  const connection = await createPoolConnection(); // Lấy kết nối từ pool
  return new Promise((resolve, reject) => {
    const query = `SELECT id_User FROM nhanvien WHERE TenNhanVien = '${teacherName}'`;

    connection.query(query, (err, results) => {
      connection.release(); // Giải phóng kết nối sau khi truy vấn xong

      if (err) {
        console.error("Lỗi khi truy vấn bảng nhanvien:", err);
        reject(err);
        return;
      }

      if (results.length === 0) {
        resolve(null); // Không tìm thấy
      } else {
        resolve(results[0].id_User); // Trả về id_User của Giảng viên
      }
    });
  });
};

const importJSONToDB = async (jsonData) => {
  const tableLopName = "lop"; // Tên bảng lop
  const tableHocPhanName = "hocphan"; // Tên bảng hocphan
  const tableGiangDayName = "giangday"; // Tên bảng giangday

  // Các cột cho bảng lop
  const columnMaLop = "MaLop"; // Mã lớp
  const columnTenLop = "TenLop"; // Tên lớp
  const columnSoSinhVien = "SoSinhVien"; // Số sinh viên
  const columnNam = "NamHoc"; // Năm học
  const columnHocKi = "HocKi"; // Học kỳ
  const columnHeSoSV = "HeSoSV"; // Hệ số sinh viên

  // Các cột cho bảng hocphan
  const columnMaHocPhan = "MaHocPhan"; // Mã học phần
  const columnTenHocPhan = "TenHocPhan"; // Tên học phần
  const columnDVHT = "DVHT"; // Số tín chỉ

  // Các cột cho bảng giangday
  const columnIdUser = "id_User"; // ID Giảng viên
  const columnMaHocPhanGiangDay = "MaHocPhan"; // Mã học phần
  const columnMaLopGiangDay = "MaLop"; // Mã lớp
  const columnIdGVM = "Id_Gvm"; // ID giảng viên mời
  const columnGiaoVien = "GiaoVien"; // Tên Giảng viên
  const columnLenLop = "LenLop"; // LL
  const columnHeSoT7CN = "HeSoT7CN"; // Hệ số T7/CN
  const columnSoTietCTDT = "SoTietCTDT"; // Số tiết CTĐT

  let index = 1;

  const insertPromises = jsonData.map(async (item) => {
    const chuoi = item["Lớp học phần"];
    const { TenLop, HocKi, NamHoc, Lop } = tachLopHocPhan(chuoi);
    const tenGv = item["Giáo Viên"];
    const id_User = await getIdUserByTeacherName(tenGv); // Chờ lấy id_User

    if (id_User != null) {
      const connection = await createPoolConnection(); // Lấy kết nối từ pool

      const insertLopPromise = new Promise((resolve, reject) => {
        const queryLop = `INSERT INTO ${tableLopName} 
          (${columnMaLop}, ${columnTenLop}, ${columnSoSinhVien}, ${columnNam}, ${columnHocKi}, ${columnHeSoSV}) 
          VALUES (?, ?, ?, ?, ?, ?)`;

        connection.query(
          queryLop,
          [index, TenLop, item["Số SV"], NamHoc, HocKi, item["Hệ số lớp đông"]],
          (err, results) => {
            if (err) {
              console.error("Lỗi khi thêm vào bảng lop:", err);
              reject(err);
              return;
            }
            resolve(results);
          }
        );
      });

      const insertHocPhanPromise = new Promise((resolve, reject) => {
        const queryHocPhan = `INSERT INTO ${tableHocPhanName} 
          (${columnMaHocPhan}, ${columnTenHocPhan}, ${columnDVHT}) 
          VALUES (?, ?, ?)`;

        connection.query(
          queryHocPhan,
          [index, TenLop, item["Số TC"]],
          (err, results) => {
            if (err) {
              console.error("Lỗi khi thêm vào bảng hocphan:", err);
              reject(err);
              return;
            }
            resolve(results);
          }
        );
      });

      const insertGiangDayPromise = new Promise((resolve, reject) => {
        const queryGiangDay = `INSERT INTO ${tableGiangDayName} 
          (${columnIdUser}, ${columnMaHocPhanGiangDay}, ${columnMaLopGiangDay}, ${columnIdGVM}, ${columnGiaoVien}, ${columnLenLop}, ${columnHeSoT7CN}, ${columnSoTietCTDT}) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        connection.query(
          queryGiangDay,
          [
            id_User,
            index,
            index,
            index,
            item["Giáo Viên"],
            item["LL"],
            item["Hệ số T7/CN"],
            item["Số tiết CTĐT"],
          ],
          (err, results) => {
            if (err) {
              console.error("Lỗi khi thêm vào bảng giangday:", err);
              reject(err);
              return;
            }
            resolve(results);
          }
        );
      });

      index++;
      await Promise.all([
        insertLopPromise,
        insertHocPhanPromise,
        insertGiangDayPromise,
      ]);
      connection.release(); // Giải phóng kết nối sau khi tất cả truy vấn đã hoàn thành
    }
  });

  try {
    await Promise.all(insertPromises);
    return true;
  } catch (error) {
    console.error("Lỗi tổng quát:", error);
    return false;
  }
};

const handleUploadAndRender = async (req, res) => {
  const filePath = path.join(__dirname, "../../uploads", req.file.filename);

  // Chuyển đổi file Excel sang JSON
  const jsonResult = convertExcelToJSON(filePath);

  // render bảng
  res.send(jsonResult);
};

const checkFile = async (req, res) => {
  console.log("Thực hiện kiểm tra dữ liệu trong bảng Tam");
  const tableName = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  const { Khoa, Dot, Ki, Nam } = req.body;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu truy vấn kiểm tra sự tồn tại của giá trị Khoa trong bảng
    const queryCheck = `SELECT EXISTS(SELECT 1 FROM ${tableName} WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?) AS exist;`;

    // Thực hiện truy vấn
    const [results] = await connection.query(queryCheck, [Khoa, Dot, Ki, Nam]);

    // Kết quả trả về từ cơ sở dữ liệu
    const exist = results[0].exist === 1; // True nếu tồn tại, False nếu không tồn tại

    if (exist) {
      return res.status(200).json({
        message: "Dữ liệu đã tồn tại trong cơ sở dữ liệu",
        exists: true,
      });
    } else {
      return res.status(200).json({
        message: "Dữ liệu không tồn tại trong cơ sở dữ liệu",
        exists: false,
      });
    }
  } catch (err) {
    console.error("Lỗi khi kiểm tra file import:", err);
    return res.status(500).json({ error: "Lỗi kiểm tra cơ sở dữ liệu" });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

const deleteFile = async (req, res) => {
  const tableName = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  const { Khoa, Dot, Ki, Nam } = req.body;

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Query SQL để xóa row
    const sql = `DELETE FROM ${tableName} WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?`;

    // Thực hiện truy vấn
    const [results] = await connection.query(sql, [Khoa, Dot, Ki, Nam]);

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Không tìm thấy dữ liệu" });
    }

    console.log(
      "Xóa dữ liệu bảng Tam ( trường hợp khi tại dữ liệu cũ ) thành công"
    );
    return res.status(200).json({ message: "Xóa thành công" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Lỗi truy vấn", error: err });
  } finally {
    if (connection) connection.release(); // Trả kết nối về pool
  }
};

// const updateChecked = async (req, res) => {
//   const role = req.session.role;

//   const duyet = process.env.DUYET;

//   const tableName = process.env.DB_TABLE_QC; // Giả sử biến này có giá trị là "quychuan"

//   if (role == duyet) {
//     const jsonData = req.body; // Lấy dữ liệu từ req.body

//     // Tạo mảng các Promise cho từng item trong jsonData
//     const updatePromises = jsonData.map((item) => {
//       return new Promise((resolve, reject) => {
//         const {
//           Khoa,
//           Dot,
//           KiHoc,
//           NamHoc,
//           GiaoVien,
//           GiaoVienGiangDay,
//           MoiGiang,
//           SoTinChi,
//           MaHocPhan,
//           LopHocPhan,
//           TenLop,
//           BoMon,
//           LL,
//           SoTietCTDT,
//           HeSoT7CN,
//           SoSinhVien,
//           HeSoLopDong,
//           QuyChuan,
//           GhiChu,
//           KhoaDuyet,
//           DaoTaoDuyet,
//           TaiChinhDuyet,
//           NgayBatDau,
//           NgayKetThuc,
//         } = item;
//         const ID = item.ID;
//         // Xây dựng câu lệnh cập nhật
//         const queryUpdate = `
//          UPDATE ${tableName}
// SET
//     Khoa = ?,
//     Dot = ?,
//     KiHoc = ?,
//     NamHoc = ?,
//     GiaoVien = ?,
//     GiaoVienGiangDay = ?,
//     MoiGiang = ?,
//     SoTinChi = ?,
//     MaHocPhan = ?,
//     LopHocPhan = ?,
//     TenLop = ?,
//     BoMon = ?,
//     LL = ?,
//     SoTietCTDT = ?,
//     HeSoT7CN = ?,
//     SoSinhVien = ?,
//     HeSoLopDong = ?,
//     QuyChuan = ?,
//     GhiChu = ?,
//     KhoaDuyet = ?,
//     DaoTaoDuyet = ?,
//     TaiChinhDuyet = ?,
//     NgayBatDau = ?,
//     NgayKetThuc = ?
// WHERE ID = ${ID}
// AND (KhoaDuyet = FALSE OR DaoTaoDuyet = FALSE OR TaiChinhDuyet = FALSE);  -- Điều kiện cập nhật
//         `;

//         // Tạo mảng các giá trị tương ứng với câu lệnh
//         const values = [
//           Khoa,
//           Dot,
//           KiHoc,
//           NamHoc,
//           GiaoVien,
//           GiaoVienGiangDay,
//           MoiGiang,
//           SoTinChi,
//           MaHocPhan,
//           LopHocPhan,
//           TenLop,
//           BoMon,
//           LL,
//           SoTietCTDT,
//           HeSoT7CN,
//           SoSinhVien,
//           HeSoLopDong,
//           QuyChuan,
//           GhiChu,
//           KhoaDuyet,
//           DaoTaoDuyet,
//           TaiChinhDuyet,
//           NgayBatDau,
//           NgayKetThuc,
//         ];

//         // console.log(values[0]);

//         // Thực hiện truy vấn cập nhật
//         connection.query(queryUpdate, values, (err, results) => {
//           if (err) {
//             console.error("Error:", err);
//             reject(err);
//             return;
//           }
//           resolve(results);
//         });
//       });
//     });

//     try {
//       await Promise.all(updatePromises);
//       console.log("Cập nhật thành công");
//       res.status(200).json({ message: "Cập nhật thành công" });
//     } catch (error) {
//       console.error("Lỗi cập nhật:", error);
//       res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//     }
//   } else {
//     res
//       .status(403)
//       .json({ error: "Bạn không có quyền thực hiện hành động này" });
//   }
// };

const updateChecked = async (req, res) => {
  const role = req.session.role;
  const duyet = process.env.DUYET;
  const tableName = process.env.DB_TABLE_QC;

  if (role == duyet) {
    const jsonData = req.body;

    let connection;

    try {
      // Lấy kết nối từ createPoolConnection
      connection = await createPoolConnection();

      // Tạo mảng các Promise cho từng item trong jsonData
      const updatePromises = jsonData.map((item) => {
        return new Promise((resolve, reject) => {
          const {
            Khoa,
            Dot,
            KiHoc,
            NamHoc,
            GiaoVien,
            GiaoVienGiangDay,
            MoiGiang,
            SoTinChi,
            MaHocPhan,
            LopHocPhan,
            TenLop,
            BoMon,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            GhiChu,
            KhoaDuyet,
            DaoTaoDuyet,
            TaiChinhDuyet,
            NgayBatDau,
            NgayKetThuc,
          } = item;
          const ID = item.ID;

          // Xây dựng câu lệnh cập nhật
          const queryUpdate = `
            UPDATE ${tableName}
            SET 
              Khoa = ?, 
              Dot = ?, 
              KiHoc = ?, 
              NamHoc = ?, 
              GiaoVien = ?, 
              GiaoVienGiangDay = ?, 
              MoiGiang = ?, 
              SoTinChi = ?, 
              MaHocPhan = ?, 
              LopHocPhan = ?, 
              TenLop = ?, 
              BoMon = ?, 
              LL = ?, 
              SoTietCTDT = ?, 
              HeSoT7CN = ?, 
              SoSinhVien = ?, 
              HeSoLopDong = ?, 
              QuyChuan = ?, 
              GhiChu = ?,
              KhoaDuyet = ?,
              DaoTaoDuyet = ?,
              TaiChinhDuyet = ?,
              NgayBatDau = ?,
              NgayKetThuc = ?
            WHERE ID = ?
              AND (KhoaDuyet = FALSE OR DaoTaoDuyet = FALSE OR TaiChinhDuyet = FALSE);
          `;

          // Tạo mảng các giá trị tương ứng với câu lệnh
          const values = [
            Khoa,
            Dot,
            KiHoc,
            NamHoc,
            GiaoVien,
            GiaoVienGiangDay,
            MoiGiang,
            SoTinChi,
            MaHocPhan,
            LopHocPhan,
            TenLop,
            BoMon,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            GhiChu,
            KhoaDuyet,
            DaoTaoDuyet,
            TaiChinhDuyet,
            NgayBatDau,
            NgayKetThuc,
            ID,
          ];

          // Thực hiện truy vấn cập nhật
          connection.query(queryUpdate, values, (err, results) => {
            if (err) {
              console.error("Error:", err);
              reject(err);
              return;
            }
            resolve(results);
          });
        });
      });

      // Chờ tất cả các truy vấn cập nhật hoàn tất
      await Promise.all(updatePromises);
      console.log("Duyệt thành công");
      res.status(200).json({ message: "Cập nhật thành công" });
    } catch (error) {
      console.error("Lỗi cập nhật:", error);
      res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
    } finally {
      if (connection) connection.release(); // Trả kết nối về pool
    }
  } else {
    res
      .status(403)
      .json({ error: "Bạn không có quyền thực hiện hành động này" });
  }
};

const updateDateAll = async (req, res) => {
  const tableName = process.env.DB_TABLE_QC;
  const jsonData = req.body;

  let connection;

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Duyệt qua từng phần tử trong jsonData
    for (let item of jsonData) {
      const { ID, NgayBatDau, NgayKetThuc } = item;

      // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
      const updateQuery = `
        UPDATE ${tableName}
        SET 
          NgayBatDau = ?,
          NgayKetThuc = ?
        WHERE ID = ?
      `;

      const updateValues = [NgayBatDau, NgayKetThuc, ID];

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

const updateQC = async (req, res) => {
  const role = req.session.role;
  const duyet = process.env.DUYET;
  const tableName = process.env.DB_TABLE_QC;
  const jsonData = req.body;

  let connection;

  try {
    // Lấy kết nối từ createPoolConnection
    connection = await createPoolConnection();

    // Biến để lưu các ID đã hoàn thiện
    let completedIDs = [];

    // Duyệt qua từng phần tử trong jsonData
    for (let item of jsonData) {
      const {
        ID,
        Khoa,
        Dot,
        KiHoc,
        NamHoc,
        GiaoVien,
        GiaoVienGiangDay,
        MoiGiang,
        SoTinChi,
        MaHocPhan,
        LopHocPhan,
        TenLop,
        BoMon,
        LL,
        SoTietCTDT,
        HeSoT7CN,
        SoSinhVien,
        HeSoLopDong,
        QuyChuan,
        GhiChu,
        KhoaDuyet,
        DaoTaoDuyet,
        TaiChinhDuyet,
        NgayBatDau,
        NgayKetThuc,
      } = item;

      if (KhoaDuyet == 1) {
        if (!GiaoVienGiangDay || GiaoVienGiangDay.length === 0) {
          return res.status(200).json({
            message: `Lớp học phần ${LopHocPhan} (${TenLop}) chưa được điền giảng viên`,
          });
        }
      }

      // Truy vấn kiểm tra nếu bản ghi đã được duyệt đầy đủ
      const approvalQuery = `SELECT KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet FROM ${tableName} WHERE ID = ?`;
      const approvalResult = await connection.query(approvalQuery, [ID]);

      // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
      const updateQuery = `
        UPDATE ${tableName}
        SET 
          Khoa = ?, 
          Dot = ?, 
          KiHoc = ?, 
          NamHoc = ?, 
          GiaoVien = ?, 
          GiaoVienGiangDay = ?, 
          MoiGiang = ?, 
          SoTinChi = ?, 
          MaHocPhan = ?, 
          LopHocPhan = ?, 
          TenLop = ?, 
          BoMon = ?, 
          LL = ?, 
          SoTietCTDT = ?, 
          HeSoT7CN = ?, 
          SoSinhVien = ?, 
          HeSoLopDong = ?, 
          QuyChuan = ?, 
          GhiChu = ?,
          KhoaDuyet = ?,
          DaoTaoDuyet = ?,
          TaiChinhDuyet = ?,
          NgayBatDau = ?,
          NgayKetThuc = ?
        WHERE ID = ?
      `;

      const updateValues = [
        Khoa,
        Dot,
        KiHoc,
        NamHoc,
        GiaoVien,
        GiaoVienGiangDay,
        MoiGiang,
        SoTinChi,
        MaHocPhan,
        LopHocPhan,
        TenLop,
        BoMon,
        LL,
        SoTietCTDT,
        HeSoT7CN,
        SoSinhVien,
        HeSoLopDong,
        QuyChuan,
        GhiChu,
        KhoaDuyet,
        DaoTaoDuyet,
        TaiChinhDuyet,
        isNaN(new Date(NgayBatDau).getTime()) ? null : NgayBatDau,
        isNaN(new Date(NgayKetThuc).getTime()) ? null : NgayKetThuc,
        ID,
      ];

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

const capNhatTen_BoMon = async (req, res) => {
  // console.log("Đang xử lý yêu cầu cập nhật...");

  // Nhận dữ liệu từ client
  const { GiaoVienGiangDay, BoMon, ID } = req.body;

  // Kiểm tra dữ liệu đầu vào
  if (!ID || !GiaoVienGiangDay || !BoMon) {
    return res
      .status(400)
      .json({ message: "ID, GiaoVienGiangDay và BoMon là bắt buộc!" });
  }

  let connection;

  try {
    // Lấy kết nối từ pool
    connection = await createPoolConnection();

    // Câu lệnh SQL để cập nhật dữ liệu
    const sql = `
      UPDATE quychuan
      SET GiaoVienGiangDay = ?, BoMon = ?
      WHERE ID = ?
    `;
    const values = [GiaoVienGiangDay, BoMon, ID];

    // Thực thi truy vấn
    const [result] = await connection.execute(sql, values);

    // Kiểm tra xem có dòng nào được cập nhật không
    if (result.affectedRows > 0) {
      return res.status(200).json({ message: "Cập nhật thành công!" });
    } else {
      return res
        .status(404)
        .json({ message: "Không tìm thấy giảng viên với ID này!" });
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật giảng viên:", error);
    return res.status(500).json({ message: "Có lỗi xảy ra khi cập nhật!" });
  } finally {
    // Trả kết nối về pool sau khi xử lý xong
    if (connection) {
      connection.release(); // Release kết nối lại về pool
    }
  }
};

// const updateQC = async (req, res) => {
//   const role = req.session.role;
//   const duyet = process.env.DUYET;

//   const tableName = process.env.DB_TABLE_QC; // Giả sử biến này có giá trị là "quychuan"
//   const jsonData = req.body; // Lấy dữ liệu từ req.body

//   //console.log("jsson = ", jsonData);
//   // Hàm trợ giúp để promisify connection.query
//   const queryAsync = (query, values) => {
//     return new Promise((resolve, reject) => {
//       connection.query(query, values, (err, results) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve(results);
//         }
//       });
//     });
//   };

//   try {
//     // Biến để lưu các ID đã hoàn thiện
//     let completedIDs = [];

//     // Duyệt qua từng phần tử trong jsonData
//     for (let item of jsonData) {
//       const {
//         ID,
//         Khoa,
//         Dot,
//         KiHoc,
//         NamHoc,
//         GiaoVien,
//         GiaoVienGiangDay,
//         MoiGiang,
//         SoTinChi,
//         MaHocPhan,
//         LopHocPhan,
//         TenLop,
//         BoMon,
//         LL,
//         SoTietCTDT,
//         HeSoT7CN,
//         SoSinhVien,
//         HeSoLopDong,
//         QuyChuan,
//         GhiChu,
//         KhoaDuyet,
//         DaoTaoDuyet,
//         TaiChinhDuyet,
//         NgayBatDau,
//         NgayKetThuc,
//       } = item;

//       if (KhoaDuyet == 1) {
//         if (GiaoVienGiangDay.length == 0) {
//           return res.status(200).json({
//             message: `Lớp học phần ${LopHocPhan} (${TenLop}) chưa được điền giảng viên`,
//           });
//         }
//       }

//       // Truy vấn kiểm tra nếu bản ghi đã được duyệt đầy đủ
//       const approvalQuery = `SELECT KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet FROM ${tableName} WHERE ID = ?`;
//       const approvalResult = await queryAsync(approvalQuery, [ID]);

//       // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
//       const updateQuery = `
//         UPDATE ${tableName}
//         SET
//           Khoa = ?,
//           Dot = ?,
//           KiHoc = ?,
//           NamHoc = ?,
//           GiaoVien = ?,
//           GiaoVienGiangDay = ?,
//           MoiGiang = ?,
//           SoTinChi = ?,
//           MaHocPhan = ?,
//           LopHocPhan = ?,
//           TenLop = ?,
//           BoMon = ?,
//           LL = ?,
//           SoTietCTDT = ?,
//           HeSoT7CN = ?,
//           SoSinhVien = ?,
//           HeSoLopDong = ?,
//           QuyChuan = ?,
//           GhiChu = ?,
//           KhoaDuyet = ?,
//           DaoTaoDuyet = ?,
//           TaiChinhDuyet = ?,
//           NgayBatDau = ?,
//           NgayKetThuc = ?
//         WHERE ID = ?
//       `;
//       //          AND (KhoaDuyet = 0 OR DaoTaoDuyet = 0 OR TaiChinhDuyet = 0)

//       const updateValues = [
//         Khoa,
//         Dot,
//         KiHoc,
//         NamHoc,
//         GiaoVien,
//         GiaoVienGiangDay,
//         MoiGiang,
//         SoTinChi,
//         MaHocPhan,
//         LopHocPhan,
//         TenLop,
//         BoMon,
//         LL,
//         SoTietCTDT,
//         HeSoT7CN,
//         SoSinhVien,
//         HeSoLopDong,
//         QuyChuan,
//         GhiChu,
//         KhoaDuyet,
//         DaoTaoDuyet,
//         TaiChinhDuyet,
//         NgayBatDau,
//         NgayKetThuc,
//         ID,
//       ];

//       await queryAsync(updateQuery, updateValues);
//     }

//     // Trả về thông báo cho các ID đã hoàn thiện
//     // if (completedIDs.length == 0) {
//     //   //completedIDs.length > 0
//     //   return res.status(200).json({
//     //     message: "Dữ liệu đã hoàn thiện, không thể cập nhật",
//     //   });
//     // }

//     // Nếu tất cả cập nhật thành công
//     res.status(200).json({ message: "Cập nhật thành công" });
//   } catch (error) {
//     console.error("Lỗi cập nhật:", error);
//     res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
//   }
// };

// Phòng ban duyệt - teching info2
const phongBanDuyet = async (req, res) => {
  const role = req.session.role;
  const duyet = process.env.DUYET;

  const tableName = process.env.DB_TABLE_QC; // Giả sử biến này có giá trị là "quychuan"
  const jsonData = req.body; // Lấy dữ liệu từ req.body

  // Lấy kết nối từ pool
  const connection = await createPoolConnection();

  try {
    // Duyệt qua từng phần tử trong jsonData
    for (let item of jsonData) {
      const { ID, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet } = item;

      // Nếu chưa duyệt đầy đủ, tiến hành cập nhật
      const updateQuery = `
        UPDATE ${tableName}
        SET 
          KhoaDuyet = ?,
          DaoTaoDuyet = ?,
          TaiChinhDuyet = ?
        WHERE ID = ?
      `;

      const updateValues = [KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet, ID];

      await connection.query(updateQuery, updateValues);
    }

    // Nếu tất cả cập nhật thành công
    res.status(200).json({ message: "Cập nhật thành công" });
  } catch (error) {
    console.error("Lỗi cập nhật:", error);
    res.status(500).json({ error: "Có lỗi xảy ra khi cập nhật dữ liệu" });
  } finally {
    connection.release(); // Trả kết nối về pool sau khi hoàn tất
  }
};

const getDanhXung = (gioiTinh) => {
  return gioiTinh === "Nam" ? "Ông" : gioiTinh === "Nữ" ? "Bà" : "";
};

// const getGvmId = async (HoTen) => {
//   const query = "SELECT id_Gvm FROM `gvmoi` WHERE HoTen = ?";
//   const [rows] = await connection.promise().query(query, [HoTen]);

//   return rows[0].id_Gvm;
// };

const getGvmId = async (HoTen) => {
  const query = "SELECT id_Gvm FROM `gvmoi` WHERE HoTen = ?";

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool
    const [rows] = await connection.query(query, [HoTen]); // Thực hiện truy vấn
    return rows.length > 0 ? rows[0].id_Gvm : null; // Trả về id_Gvm hoặc null nếu không tìm thấy
  } catch (error) {
    console.error("Lỗi khi lấy id giảng viên mời:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Trả lại kết nối về pool
  }
};

// const getNhanvienId = async (HoTen) => {
//   const query = "SELECT id_User FROM `nhanvien` WHERE TenNhanVien = ?";
//   const [rows] = await connection.promise().query(query, [HoTen]);

//   return rows[0].id_User;
// };

const getNhanvienId = async (HoTen) => {
  const query = "SELECT id_User FROM `nhanvien` WHERE TenNhanVien = ?";

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool
    const [rows] = await connection.query(query, [HoTen]); // Thực hiện truy vấn
    return rows.length > 0 ? rows[0].id_User : null; // Trả về id_User hoặc null nếu không tìm thấy
  } catch (error) {
    console.error("Lỗi khi lấy id nhân viên:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Trả lại kết nối về pool
  }
};

// const hocPhanDaTonTai = async (TenHocPhan) => {
//   const query = `SELECT TenHocPhan FROM hocphan WHERE LOWER(REPLACE(TRIM(TenHocPhan), '  ', ' ')) = LOWER(REPLACE(TRIM(?), '  ', ' '))`;
//   const [rows] = await connection.promise().query(query, [TenHocPhan]);

//   return rows.length > 0; // Nếu có ít nhất một kết quả, môn học đã tồn tại
// };

const hocPhanDaTonTai = async (TenHocPhan) => {
  const query = `
    SELECT TenHocPhan 
    FROM hocphan 
    WHERE LOWER(REPLACE(TRIM(TenHocPhan), '  ', ' ')) = LOWER(REPLACE(TRIM(?), '  ', ' '))
  `;

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool
    const [rows] = await connection.query(query, [TenHocPhan]); // Thực hiện truy vấn
    return rows.length > 0; // Kiểm tra xem học phần có tồn tại hay không
  } catch (error) {
    console.error("Lỗi khi kiểm tra học phần:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Trả lại kết nối về pool
  }
};

// const themHocPhan = async (TenHocPhan, DVHT, Khoa) => {
//   const query = `
//     INSERT INTO hocphan (TenHocPhan, DVHT, Khoa)
//     VALUES (?, ?, ?)
//   `;
//   const values = [TenHocPhan, DVHT, Khoa];

//   await connection.promise().query(query, values);
// };

const themHocPhan = async (TenHocPhan, DVHT, Khoa) => {
  const query = `
    INSERT INTO hocphan (TenHocPhan, DVHT, Khoa)
    VALUES (?, ?, ?)
  `;
  const values = [TenHocPhan, DVHT, Khoa];

  let connection;
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool
    await connection.query(query, values); // Thực hiện truy vấn
  } catch (error) {
    console.error("Lỗi khi thêm học phần:", error);
    throw error;
  } finally {
    if (connection) connection.release(); // Trả lại kết nối về pool
  }
};

// Xét xem đã duyệt hết chưa để lưu
const TaiChinhCheckAll = async (Dot, KiHoc, NamHoc) => {
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

      if (checkAll === true && check.length > 0) {
        kq += MaPhongBan + ",";
      }
    }
  } finally {
    if (connection) connection.release();
  }

  return kq;
};

// Tạo biến toàn cục để kiểm tra xem đã lưu hết dữ liệu chưa
//let tmp = 0;

// const updateAllTeachingInfo = async (req, res) => {
//   // const query2 = `
//   //     SELECT
//   //       qc.*,
//   //       gvmoi.*,
//   //       SUM(qc.QuyChuan) AS TongSoTiet,
//   //       SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) AS TenGiangVien
//   //     FROM quychuan qc
//   //     JOIN gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
//   //     WHERE qc.DaLuu = 0
//   //     GROUP BY gvmoi.HoTen;
//   //   `;
//   const query2 = `
// SELECT
//     qc.*,
//     gvmoi.*,
//     SUM(qc.QuyChuan) AS TongSoTiet,
//     MIN(qc.NgayBatDau) AS NgayBatDau,
//     MAX(qc.NgayKetThuc) AS NgayKetThuc
// FROM
//     quychuan qc
// JOIN
//     gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
// WHERE
//     qc.DaLuu = 0
// GROUP BY
//     gvmoi.HoTen;

// `;
//   try {
//     const [dataJoin] = await connection.promise().query(query2);

//     // Kiểm tra xem có dữ liệu không
//     if (!dataJoin || dataJoin.length === 0) {
//       return {
//         success: false,
//         message: "Không có dữ liệu để chèn.",
//       };
//     }

//     const firstItem = dataJoin[0]; // Lấy phần tử đầu tiên

//     // Lấy các thuộc tính Dot, Ki, Nam từ phần tử đầu tiên
//     const dot = firstItem.Dot; // Lấy thuộc tính Dot
//     const ki = firstItem.KiHoc; // Lấy thuộc tính Ki
//     const nam = firstItem.NamHoc; // Lấy thuộc tính Nam

//     const daDuyetHet = await TaiChinhCheckAll(dot, ki, nam);
//     const daDuyetHetArray = daDuyetHet.split(","); // Chuyển đổi thành mảng

//     // Chuẩn bị dữ liệu để chèn từng loạt
//     //const insertValues = dataJoin.map((item) => {
//     const insertValues = await Promise.all(
//       dataJoin
//         .filter(
//           (item) =>
//             item.TaiChinhDuyet != 0 &&
//             item.DaLuu == 0 &&
//             daDuyetHetArray.includes(item.Khoa) // Kiểm tra sự tồn tại trong mảng
//         ) // Loại bỏ các mục có TaiChinhDuyet = 0
//         .map(async (item) => {
//           const {
//             ID,
//             id_Gvm,
//             DienThoai,
//             Email,
//             MaSoThue,
//             HoTen,
//             NgaySinh,
//             HocVi,
//             ChucVu,
//             HSL,
//             CCCD,
//             NgayCapCCCD,
//             NoiCapCCCD,
//             DiaChi,
//             STK,
//             NganHang,
//             NgayBatDau,
//             NgayKetThuc,
//             KiHoc,
//             TongSoTiet, // Lấy cột tổng số tiết đã tính từ SQL
//             QuyChuan,
//             Dot,
//             NamHoc,
//             MaPhongBan,
//             KhoaDuyet,
//             DaoTaoDuyet,
//             TaiChinhDuyet,
//             GioiTinh,
//           } = item;

//           req.session.tmp++;

//           const DanhXung = getDanhXung(GioiTinh);
//           // const getDanhXung = (GioiTinh) => {
//           //   return GioiTinh === "Nam" ? "Ông" : GioiTinh === "Nữ" ? "Bà" : "";
//           // };
//           let SoTiet = TongSoTiet || 0; // Nếu QuyChuan không có thì để 0
//           let SoTien = (TongSoTiet || 0) * 1000000; // Tính toán số tiền
//           let TruThue = 0; // Giả định không thu thuế
//           let MaBoMon = 0; // Giá trị mặc định là 0

//           return [
//             id_Gvm,
//             DienThoai,
//             Email,
//             MaSoThue,
//             DanhXung,
//             HoTen,
//             NgaySinh,
//             HocVi,
//             ChucVu,
//             HSL,
//             CCCD,
//             NgayCapCCCD,
//             NoiCapCCCD,
//             DiaChi,
//             STK,
//             NganHang,
//             NgayBatDau,
//             NgayKetThuc,
//             KiHoc,
//             SoTiet,
//             SoTien,
//             TruThue,
//             Dot,
//             NamHoc,
//             MaPhongBan,
//             MaBoMon,
//             KhoaDuyet,
//             DaoTaoDuyet,
//             TaiChinhDuyet,
//           ];
//         })
//     );

//     // Kiểm tra xem insertValues có rỗng không
//     if (
//       insertValues.length === 0 ||
//       insertValues.some((row) => row.length === 0)
//     ) {
//       return {
//         success: false,
//         message: "Không có dữ liệu hợp lệ để chèn.",
//       };
//     }

//     // Định nghĩa câu lệnh chèn
//     const queryInsert = `
//       INSERT INTO hopdonggvmoi (
//         id_Gvm, DienThoai, Email, MaSoThue, DanhXung, HoTen, NgaySinh, HocVi, ChucVu, HSL, CCCD, NgayCap, NoiCapCCCD,
//         DiaChi, STK, NganHang, NgayBatDau, NgayKetThuc, KiHoc, SoTiet, SoTien, TruThue,
//         Dot, NamHoc, MaPhongBan, MaBoMon, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet
//       ) VALUES ?;
//     `;

//     // Thực hiện câu lệnh chèn
//     await connection.promise().query(queryInsert, [insertValues]);

//     // Trả về kết quả thành công
//     return { success: true, message: "Dữ liệu đã được chèn thành công!" };
//   } catch (err) {
//     console.error("Lỗi:", err.message); // Ghi lại lỗi để gỡ lỗi
//     return {
//       success: false,
//       message: "Đã xảy ra lỗi trong quá trình lưu hợp đồng",
//     };
//   }
// };

const updateAllTeachingInfo = async (req, res) => {
  const { dot, ki, namHoc } = req.body;
  console.log("Dữ liệu Đợt Kì Năm từ client :", dot, ki, namHoc);

  const query2 = `
    SELECT
        qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
        gvmoi.id_Gvm, gvmoi.DienThoai, gvmoi.Email, gvmoi.MaSoThue, gvmoi.HoTen, gvmoi.NgaySinh,
        gvmoi.HocVi, gvmoi.ChucVu, gvmoi.HSL, gvmoi.CCCD, gvmoi.NgayCapCCCD, gvmoi.NoiCapCCCD,
        gvmoi.DiaChi, gvmoi.STK, gvmoi.NganHang, gvmoi.MaPhongBan, gvmoi.GioiTinh,
        SUM(qc.QuyChuan) AS TongSoTiet,
        MIN(qc.NgayBatDau) AS NgayBatDau,
        MAX(qc.NgayKetThuc) AS NgayKetThuc
    FROM
        quychuan qc
    JOIN
        gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
    WHERE
        qc.DaLuu = 0 AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ?
    GROUP BY
        qc.Dot, qc.KiHoc, qc.NamHoc, qc.KhoaDuyet, qc.DaoTaoDuyet, qc.TaiChinhDuyet, qc.DaLuu,
        gvmoi.id_Gvm, gvmoi.DienThoai, gvmoi.Email, gvmoi.MaSoThue, gvmoi.HoTen, gvmoi.NgaySinh,
        gvmoi.HocVi, gvmoi.ChucVu, gvmoi.HSL, gvmoi.CCCD, gvmoi.NgayCapCCCD, gvmoi.NoiCapCCCD,
        gvmoi.DiaChi, gvmoi.STK, gvmoi.NganHang, gvmoi.MaPhongBan, gvmoi.GioiTinh;
    `;

  const value = [dot, ki, namHoc];

  try {
    const [dataJoin] = await pool.query(query2, value);

    // Kiểm tra xem có dữ liệu không
    if (!dataJoin || dataJoin.length === 0) {
      console.log("Không có dữ liệu hợp đồng");
      return {
        success: false,
        message: "Không có dữ liệu để chèn.",
      };
    }

    const daDuyetHet = await TaiChinhCheckAll(dot, ki, namHoc);
    const daDuyetHetArray = daDuyetHet.split(","); // Chuyển đổi thành mảng

    // Chuẩn bị dữ liệu để chèn từng loạt
    //const insertValues = dataJoin.map((item) => {
    const insertValues = await Promise.all(
      dataJoin
        .filter(
          (item) =>
            item.TaiChinhDuyet != 0 &&
            item.DaLuu == 0 &&
            daDuyetHetArray.includes(item.MaPhongBan) // Kiểm tra sự tồn tại trong mảng
        ) // Loại bỏ các mục có TaiChinhDuyet = 0
        .map(async (item) => {
          const {
            id_Gvm,
            DienThoai,
            Email,
            MaSoThue,
            HoTen,
            NgaySinh,
            HocVi,
            ChucVu,
            HSL,
            CCCD,
            NgayCapCCCD,
            NoiCapCCCD,
            DiaChi,
            STK,
            NganHang,
            NgayBatDau,
            NgayKetThuc,
            KiHoc,
            TongSoTiet, // Lấy cột tổng số tiết đã tính từ SQL
            QuyChuan,
            Dot,
            NamHoc,
            MaPhongBan,
            KhoaDuyet,
            DaoTaoDuyet,
            TaiChinhDuyet,
            GioiTinh,
          } = item;

          req.session.tmp++;

          const DanhXung = getDanhXung(GioiTinh);
          // const getDanhXung = (GioiTinh) => {
          //   return GioiTinh === "Nam" ? "Ông" : GioiTinh === "Nữ" ? "Bà" : "";
          // };
          let SoTiet = TongSoTiet || 0; // Nếu QuyChuan không có thì để 0
          let SoTien = (TongSoTiet || 0) * 1000000; // Tính toán số tiền
          let TruThue = 0; // Giả định không thu thuế
          let MaBoMon = 0; // Giá trị mặc định là 0

          return [
            id_Gvm,
            DienThoai,
            Email,
            MaSoThue,
            DanhXung,
            HoTen,
            NgaySinh,
            HocVi,
            ChucVu,
            HSL,
            CCCD,
            NgayCapCCCD,
            NoiCapCCCD,
            DiaChi,
            STK,
            NganHang,
            NgayBatDau,
            NgayKetThuc,
            KiHoc,
            SoTiet,
            SoTien,
            TruThue,
            Dot,
            NamHoc,
            MaPhongBan,
            MaBoMon,
            KhoaDuyet,
            DaoTaoDuyet,
            TaiChinhDuyet,
          ];
        })
    );

    // Kiểm tra xem insertValues có rỗng không
    // if (
    //   insertValues.length === 0 ||
    //   insertValues.some((row) => row.length === 0)
    // ) {
    //   return {
    //     success: false,
    //     message: "Không có dữ liệu hợp lệ để chèn.",
    //   };
    // }

    // Định nghĩa câu lệnh chèn
    const queryInsert = `
      INSERT INTO hopdonggvmoi (
        id_Gvm, DienThoai, Email, MaSoThue, DanhXung, HoTen, NgaySinh, HocVi, ChucVu, HSL, CCCD, NgayCap, NoiCapCCCD,
        DiaChi, STK, NganHang, NgayBatDau, NgayKetThuc, KiHoc, SoTiet, SoTien, TruThue,
        Dot, NamHoc, MaPhongBan, MaBoMon, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet
      ) VALUES ?;
    `;

    // Thực hiện câu lệnh chèn
    if (insertValues.length > 0) {
      await pool.query(queryInsert, [insertValues]);
    }

    // Trả về kết quả thành công
    return { success: true, message: "Dữ liệu đã được chèn thành công!" };
  } catch (err) {
    console.error("Lỗi:", err.message); // Ghi lại lỗi để gỡ lỗi
    return {
      success: false,
      message: "Đã xảy ra lỗi trong quá trình lưu hợp đồng",
    };
  }
};

// const updateAllTeachingInfo = async (req, res) => {
//   // const query2 = `
//   //     SELECT
//   //       qc.*,
//   //       gvmoi.*,
//   //       SUM(qc.QuyChuan) AS TongSoTiet,
//   //       SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) AS TenGiangVien
//   //     FROM quychuan qc
//   //     JOIN gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
//   //     WHERE qc.DaLuu = 0
//   //     GROUP BY gvmoi.HoTen;
//   //   `;
//   const query2 = `
// SELECT
//     qc.*,
//     gvmoi.*,
//     SUM(qc.QuyChuan) AS TongSoTiet,
//     MIN(qc.NgayBatDau) AS NgayBatDau,
//     MAX(qc.NgayKetThuc) AS NgayKetThuc
// FROM
//     quychuan qc
// JOIN
//     gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
// WHERE
//     qc.DaLuu = 0
// GROUP BY
//     gvmoi.HoTen;

// `;
//   try {
//     const [dataJoin] = await connection.promise().query(query2);

//     // Kiểm tra xem có dữ liệu không
//     if (!dataJoin || dataJoin.length === 0) {
//       return {
//         success: false,
//         message: "Không có dữ liệu để chèn.",
//       };
//     }

//     const firstItem = dataJoin[0]; // Lấy phần tử đầu tiên

//     // Lấy các thuộc tính Dot, Ki, Nam từ phần tử đầu tiên
//     const dot = firstItem.Dot; // Lấy thuộc tính Dot
//     const ki = firstItem.KiHoc; // Lấy thuộc tính Ki
//     const nam = firstItem.NamHoc; // Lấy thuộc tính Nam

//     const daDuyetHet = await TaiChinhCheckAll(dot, ki, nam);
//     const daDuyetHetArray = daDuyetHet.split(","); // Chuyển đổi thành mảng

//     // Chuẩn bị dữ liệu để chèn từng loạt
//     //const insertValues = dataJoin.map((item) => {
//     const insertValues = await Promise.all(
//       dataJoin
//         .filter(
//           (item) =>
//             item.TaiChinhDuyet != 0 &&
//             item.DaLuu == 0 &&
//             daDuyetHetArray.includes(item.Khoa) // Kiểm tra sự tồn tại trong mảng
//         ) // Loại bỏ các mục có TaiChinhDuyet = 0
//         .map(async (item) => {
//           const {
//             ID,
//             id_Gvm,
//             DienThoai,
//             Email,
//             MaSoThue,
//             HoTen,
//             NgaySinh,
//             HocVi,
//             ChucVu,
//             HSL,
//             CCCD,
//             NgayCapCCCD,
//             NoiCapCCCD,
//             DiaChi,
//             STK,
//             NganHang,
//             NgayBatDau,
//             NgayKetThuc,
//             KiHoc,
//             TongSoTiet, // Lấy cột tổng số tiết đã tính từ SQL
//             QuyChuan,
//             Dot,
//             NamHoc,
//             MaPhongBan,
//             KhoaDuyet,
//             DaoTaoDuyet,
//             TaiChinhDuyet,
//             GioiTinh,
//           } = item;

//           req.session.tmp++;

//           const DanhXung = getDanhXung(GioiTinh);
//           // const getDanhXung = (GioiTinh) => {
//           //   return GioiTinh === "Nam" ? "Ông" : GioiTinh === "Nữ" ? "Bà" : "";
//           // };
//           let SoTiet = TongSoTiet || 0; // Nếu QuyChuan không có thì để 0
//           let SoTien = (TongSoTiet || 0) * 1000000; // Tính toán số tiền
//           let TruThue = 0; // Giả định không thu thuế
//           let MaBoMon = 0; // Giá trị mặc định là 0

//           return [
//             id_Gvm,
//             DienThoai,
//             Email,
//             MaSoThue,
//             DanhXung,
//             HoTen,
//             NgaySinh,
//             HocVi,
//             ChucVu,
//             HSL,
//             CCCD,
//             NgayCapCCCD,
//             NoiCapCCCD,
//             DiaChi,
//             STK,
//             NganHang,
//             NgayBatDau,
//             NgayKetThuc,
//             KiHoc,
//             SoTiet,
//             SoTien,
//             TruThue,
//             Dot,
//             NamHoc,
//             MaPhongBan,
//             MaBoMon,
//             KhoaDuyet,
//             DaoTaoDuyet,
//             TaiChinhDuyet,
//           ];
//         })
//     );

//     // Kiểm tra xem insertValues có rỗng không
//     if (
//       insertValues.length === 0 ||
//       insertValues.some((row) => row.length === 0)
//     ) {
//       return {
//         success: false,
//         message: "Không có dữ liệu hợp lệ để chèn.",
//       };
//     }

//     // Định nghĩa câu lệnh chèn
//     const queryInsert = `
//       INSERT INTO hopdonggvmoi (
//         id_Gvm, DienThoai, Email, MaSoThue, DanhXung, HoTen, NgaySinh, HocVi, ChucVu, HSL, CCCD, NgayCap, NoiCapCCCD,
//         DiaChi, STK, NganHang, NgayBatDau, NgayKetThuc, KiHoc, SoTiet, SoTien, TruThue,
//         Dot, NamHoc, MaPhongBan, MaBoMon, KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet
//       ) VALUES ?;
//     `;

//     // Thực hiện câu lệnh chèn
//     await connection.promise().query(queryInsert, [insertValues]);

//     // Trả về kết quả thành công
//     return { success: true, message: "Dữ liệu đã được chèn thành công!" };
//   } catch (err) {
//     console.error("Lỗi:", err.message); // Ghi lại lỗi để gỡ lỗi
//     return {
//       success: false,
//       message: "Đã xảy ra lỗi trong quá trình lưu hợp đồng",
//     };
//   }
// };

const getGvmList = async (req, res) => {
  const query = `SELECT * FROM gvmoi`;

  try {
    const [data] = await pool.query(query);
    return data;
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình lấy dữ liệu." });
  }
};

const getNvList = async (req, res) => {
  const query = `SELECT * FROM nhanvien`;

  try {
    const [data] = await pool.query(query);
    return data;
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình lấy dữ liệu." });
  }
};

const getHocPhanList = async (req, res) => {
  const query = `SELECT TenHocPhan FROM hocphan`;

  try {
    const [data] = await pool.query(query);
    return data;
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Đã xảy ra lỗi trong quá trình lấy dữ liệu." });
  }
};

const insertGiangDay = async (
  req,
  res,
  gvmList,
  hocPhanList,
  daDuyetHetArray
) => {
  const { dot, ki, namHoc } = req.body;

  const query2 = `
    SELECT
      qc.*, 
      gvmoi.*, 
      SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) AS TenGiangVien
    FROM quychuan qc
    JOIN gvmoi ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gvmoi.HoTen
    WHERE 
    qc.DaLuu = 0 AND Dot = ? AND KiHoc = ? AND NamHoc = ?
  `;

  const value = [dot, ki, namHoc];

  try {
    const [dataJoin] = await pool.query(query2, value);

    // const daDuyetHet = await TaiChinhCheckAll(dot, ki, namHoc);
    // const daDuyetHetArray = daDuyetHet.split(","); // Chuyển đổi thành mảng

    // Chuẩn bị dữ liệu để chèn từng loạt
    const insertValues = await Promise.all(
      dataJoin
        .filter(
          (item) =>
            item.TaiChinhDuyet != 0 &&
            item.DaLuu == 0 &&
            daDuyetHetArray.includes(item.Khoa)
        ) // Bỏ qua các mục có TaiChinhDuyet = 0
        .map(async (item) => {
          const {
            ID,
            Khoa,
            MoiGiang,
            SoTinChi,
            LopHocPhan,
            GiaoVien,
            GiaoVienGiangDay,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            KiHoc,
            NamHoc,
            MaHocPhan,
            TenLop,
            Dot,
          } = item;

          req.session.tmp++;

          const TenHocPhan = LopHocPhan;
          const gv1 = GiaoVienGiangDay ? GiaoVienGiangDay.split(" - ") : [];
          let gv = gv1[0];
          let id_Gvm = 1;
          let id_User = 1;

          // Tạo giá trị cho Mã Học Phần
          const maHocPhan = item.MaHocPhan || 0; // Nếu MaHocPhan là null hoặc undefined thì thay bằng 0

          // Dùng forEach để duyệt qua mảng và Lấy id_Gvm khi giảng viên mới giảng
          gvmList.forEach((giangVien) => {
            if (giangVien.HoTen === gv1[0]) {
              id_Gvm = giangVien.id_Gvm; // Gán id
            }
          });

          // console.log("id = ", id_Gvm);

          const exists = hocPhanList.some(
            (hocPhan) => hocPhan.TenHocPhan === TenHocPhan
          )
            ? 1
            : 0;

          if (exists == 0) {
            await themHocPhan(TenHocPhan, SoTinChi, Khoa);
          }

          // Trả về mảng các giá trị đã chờ để đưa vào câu INSERT
          return [
            gv,
            SoTinChi,
            TenHocPhan,
            id_User,
            id_Gvm,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            KiHoc,
            NamHoc,
            maHocPhan,
            TenLop,
            Dot,
            Khoa,
          ];
        })
    );

    // Kiểm tra xem có dữ liệu để chèn không
    if (insertValues.length === 0) {
      return { success: false, message: "Không có dữ liệu để chèn!" };
    }

    // Định nghĩa câu lệnh chèn
    const queryInsert = `
      INSERT INTO giangday (
        GiangVien, SoTC, TenHocPhan, id_User, id_Gvm, LenLop, SoTietCTDT, HeSoT7CN, SoSV, HeSoLopDong, 
        QuyChuan, HocKy, NamHoc, MaHocPhan, Lop, Dot, Khoa
      ) VALUES ?;
    `;

    // Thực hiện câu lệnh chèn
    await pool.query(queryInsert, [insertValues]);
    // Trả về kết quả thành công
    return { success: true, message: "Dữ liệu đã được chèn thành công!" };
  } catch (err) {
    console.error(err); // Ghi lại lỗi để gỡ lỗi
    return {
      success: false,
      message: "Đã xảy ra lỗi trong quá trình thêm dl vào giảng dạy",
    };
  }
};

const insertGiangDay2 = async (
  req,
  res,
  nvList,
  hocPhanList,
  daDuyetHetArray
) => {
  const { dot, ki, namHoc } = req.body;

  const query2 = `
    SELECT
      qc.*,
      nhanvien.*,
      SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) AS TenGiangVien
    FROM quychuan qc
    JOIN nhanvien ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = nhanvien.TenNhanVien
    WHERE 
    qc.DaLuu = 0 AND Dot = ? AND KiHoc = ? AND NamHoc = ?
  `;

  const value = [dot, ki, namHoc];
  try {
    const [dataJoin] = await pool.query(query2, value);

    // Chuẩn bị dữ liệu để chèn từng loạt
    const insertValues = await Promise.all(
      dataJoin
        .filter(
          (item) =>
            item.TaiChinhDuyet != 0 &&
            item.DaLuu == 0 &&
            daDuyetHetArray.includes(item.Khoa)
        ) // Bỏ qua các mục có TaiChinhDuyet = 0
        .map(async (item) => {
          //dataJoin.map(async (item) => {
          const {
            ID,
            Khoa,
            MoiGiang,
            SoTinChi,
            LopHocPhan,
            GiaoVien,
            GiaoVienGiangDay,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            KiHoc,
            NamHoc,
            MaHocPhan,
            TenLop,
            Dot,
          } = item;

          req.session.tmp++;

          const TenHocPhan = LopHocPhan;

          const gv1 = GiaoVienGiangDay ? GiaoVienGiangDay.split(" - ") : [];
          let gv = gv1[0];
          let id_Gvm = 1;
          let id_User = 1;

          // Tạo giá trị cho Mã Học Phần
          const maHocPhan = item.MaHocPhan || 0; // Nếu MaHocPhan là null hoặc undefined thì thay bằng 0

          // Dùng forEach để duyệt qua mảng và Lấy id_Gvm khi giảng viên mới giảng
          nvList.forEach((giangVien) => {
            if (giangVien.HoTen === gv1[0]) {
              id_User = giangVien.id_User; // Gán id
            }
          });

          const exists = hocPhanList.some(
            (hocPhan) => hocPhan.TenHocPhan === TenHocPhan
          )
            ? 1
            : 0;

          //const exists = await hocPhanDaTonTai(TenHocPhan);
          // console.log("Học phần đã tồn tại:", exists); // In ra giá trị tồn tại

          if (exists == 0) {
            await themHocPhan(TenHocPhan, SoTinChi, Khoa);
          }

          // Trả về mảng các giá trị đã chờ để đưa vào câu INSERT
          return [
            gv,
            SoTinChi,
            TenHocPhan,
            id_User,
            id_Gvm,
            LL,
            SoTietCTDT,
            HeSoT7CN,
            SoSinhVien,
            HeSoLopDong,
            QuyChuan,
            KiHoc,
            NamHoc,
            maHocPhan,
            TenLop,
            Dot,
            Khoa,
          ];
        })
    );

    // Kiểm tra xem có dữ liệu để chèn không
    if (insertValues.length === 0) {
      return { success: false, message: "Không có dữ liệu để chèn!" };
    }

    // Định nghĩa câu lệnh chèn
    const queryInsert = `
      INSERT INTO giangday (
        GiangVien, SoTC, TenHocPhan, id_User, id_Gvm, LenLop, SoTietCTDT, HeSoT7CN, SoSV, HeSoLopDong, 
        QuyChuan, HocKy, NamHoc, MaHocPhan, Lop, Dot, Khoa
      ) VALUES ?;
    `;

    // Thực hiện câu lệnh chèn
    await pool.query(queryInsert, [insertValues]);
    // Trả về kết quả thành công
    return { success: true, message: "Dữ liệu đã được chèn thành công!" };
  } catch (err) {
    console.error(err); // Ghi lại lỗi để gỡ lỗi
    return {
      success: false,
      message: "Đã xảy ra lỗi trong quá trình cập nhật thông tin.",
    };
  }
};

const submitData2 = async (req, res) => {
  try {
    const gvmList = await getGvmList(req, res);
    const nvList = await getNvList(req, res);
    const hocPhanList = await getHocPhanList(req, res);
    const { dot, ki, namHoc } = req.body;
    const daDuyetHet = await TaiChinhCheckAll(dot, ki, namHoc);
    const daDuyetHetArray = daDuyetHet.split(",").filter((item) => item !== ""); // Chuyển đổi thành mảng và loại bỏ phần tử rỗng

    // Thực hiện các cập nhật và thêm dữ liệu song song
    const [updateResult, update2, insertResult] = await Promise.all([
      updateAllTeachingInfo(req, res),
      insertGiangDay2(req, res, nvList, hocPhanList, daDuyetHetArray),
      insertGiangDay(req, res, gvmList, hocPhanList, daDuyetHetArray),
    ]);

    if (req.session.tmp == 0) {
      req.session.tmp = 0;
      return res.json({ message: "Dữ liệu đã được cập nhật đầy đủ" });
    } else {
      const DaLuu = 1;
      const placeholders = daDuyetHetArray.map(() => "?").join(", ");
      const updateQuery = `UPDATE quychuan SET DaLuu = ? WHERE Khoa IN (${placeholders});`;
      await pool.query(updateQuery, [DaLuu, ...daDuyetHetArray]);
    }

    // Đặt lại giá trị cho req.session.tmp
    req.session.tmp = 0;

    // Chỉ trả về dữ liệu
    res.json({
      message: "Lưu dữ liệu thành công",
      updateResult,
      update2,
      insertResult,
    });
  } catch (err) {
    console.error("Lỗi không xác định:", err);
    return res.status(500).json({ error: "Đã xảy ra lỗi không xác định." });
  }
};

module.exports = {
  handleUploadAndRender,
  importJSONToDB,
  importTableQC,
  importTableTam,
  checkFile,
  deleteFile,
  updateChecked,
  updateAllTeachingInfo,
  submitData2,
  updateQC,
  capNhatTen_BoMon,
  checkDataQC,
  phongBanDuyet,
  updateBanHanh,
  updateDateAll,
};
